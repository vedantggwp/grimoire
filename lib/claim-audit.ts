/**
 * Claim-entailment audit (issue #48 — the compile-side half of the G1
 * provenance guarantee).
 *
 * The fetch ladder (#20) guarantees the *capture* is faithful to the page.
 * Nothing guaranteed that an article's *prose* is entailed by what was
 * captured — so a compile could state a statistic its own cited sources never
 * contain (the ACON "95%+" fabrication that shipped in the first live
 * self-update). This module scans compiled article prose for two high-signal
 * claim classes and checks each against the raw captures the article cites:
 *
 *   - statistics  — percentages and numeric ranges (`95%`, `26–54%`, `+10.6%`)
 *   - quoted spans — multi-word text in double quotes, which asserts a verbatim
 *                    lift from a source
 *
 * Design deliberately favors precision over recall: a gate that cries wolf gets
 * ignored. Bare integers, years, list counts, headings, code, and wikilink
 * targets are NOT treated as claims. Every flagged claim is surfaced for human
 * review (compile summary + `claim-audit.json` + the update digest) rather than
 * hard-failing the build, because number-presence at v1 precision still has
 * some false positives and legacy/hand-authored wikis run through the same path.
 *
 * Three verdicts, not two:
 *   - supported     — the claim's text is present in a cited capture
 *   - unsupported   — a decisive check was possible and the claim was absent
 *   - unverifiable  — no capture could decisively confirm or deny it
 *
 * The unsupported/unverifiable split is fidelity-aware. After the public scrub,
 * many captures are trimmed *excerpts*: a quote missing from an excerpt is not a
 * fabrication, just an un-archived span. So a quoted span is only ever
 * "unsupported" when checked against a `full`-fidelity capture; against
 * excerpts a miss is "unverifiable". Statistics are compact, rare, and
 * high-stakes, so they are checked against *any* capture — which is what makes
 * an `extract`-fidelity article's fabricated percentage catchable.
 */

import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { join } from 'node:path';

import matter from 'gray-matter';

import { normalizeUrl } from './source-ledger.js';
import type { RawSourceFidelity } from './compile.js';

export type ClaimKind = 'statistic' | 'quote';

/**
 * - supported    — the claim's text is present in a cited capture
 * - unsupported  — absent from a capture complete enough to be decisive
 *                  (a `full`-fidelity capture archives the whole source, so
 *                  absence is proof). Loud.
 * - review       — a statistic absent from an *excerpt* capture whose numeric
 *                  region is nonetheless archived (a sibling statistic in the
 *                  same article WAS found). Suspicious but not decisive — the
 *                  human spot-check bucket. This is the ACON "95%+" case.
 * - unverifiable — absent with no way to conclude: an excerpt that doesn't
 *                  archive the relevant region, or no capture at all.
 */
export type ClaimVerdict = 'supported' | 'unsupported' | 'review' | 'unverifiable';

export interface Claim {
  readonly kind: ClaimKind;
  /** The claim text as it appears in the article (original, for display). */
  readonly text: string;
  /** A short window of surrounding prose to help a reviewer locate it. */
  readonly context: string;
}

export interface ClaimAuditEntry extends Claim {
  readonly verdict: ClaimVerdict;
}

export interface ArticleClaimAudit {
  readonly slug: string;
  readonly claims: readonly ClaimAuditEntry[];
}

export interface UnsupportedClaim {
  readonly slug: string;
  readonly kind: ClaimKind;
  readonly text: string;
  readonly context: string;
}

export interface ClaimAuditSummary {
  readonly articlesAudited: number;
  readonly claimsChecked: number;
  readonly supported: number;
  readonly unsupported: number;
  readonly review: number;
  readonly unverifiable: number;
  readonly articlesFlagged: number;
}

export interface ClaimAuditReport {
  readonly summary: ClaimAuditSummary;
  /** Decisively absent from a complete capture — treat as defects. */
  readonly unsupported: readonly UnsupportedClaim[];
  /** Statistics whose siblings are archived but which are themselves absent —
   * the human spot-check list (the ACON bucket). */
  readonly review: readonly UnsupportedClaim[];
}

/** A cited source's captured text plus the fidelity it was captured at. */
interface CaptureText {
  readonly text: string;
  readonly fidelity: RawSourceFidelity;
}

// --- Normalization ---------------------------------------------------------

/**
 * Canonicalize text so that trivially-different renderings of the same claim
 * compare equal: smart quotes → straight, all dash variants → hyphen, the word
 * "percent" → "%", digit-group commas removed (200,000 → 200000), whitespace
 * collapsed, lowercased. Applied identically to needle and haystack.
 */
export function normalizeForMatch(input: string): string {
  return input
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[‒–—―−]/g, '-')
    .replace(/\bper\s?cent\b/gi, '%')
    .replace(/\bpercent\b/gi, '%')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * A number token stripped to its comparable core: dashes unified, spaces around
 * a range removed, a trailing `+`/`~`/leading sign dropped for the presence
 * check ("95%+" and "95 %" both reduce to "95%"; "26 – 54%" to "26-54%").
 */
function normalizeStatToken(token: string): string {
  return token
    .replace(/[‒–—―−]/g, '-')
    .replace(/[+~]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// --- Claim extraction ------------------------------------------------------

/**
 * Strip spans a claim scanner must never read as prose: fenced code blocks,
 * inline code, wikilink targets, and markdown link URLs. Replaced with spaces
 * (not removed) so surrounding offsets and word boundaries survive.
 */
function stripNonProse(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/\]\([^)]*\)/g, '] ');
}

/** Lines that are headings or frontmatter fences contribute no claims. */
function proseLines(body: string): string {
  return body
    .split('\n')
    .filter(line => !/^\s{0,3}#{1,6}\s/.test(line))
    .join('\n');
}

const PERCENT_PATTERN =
  /[+~]?\d[\d.]*\s*(?:[‒–—―−-]\s*\d[\d.]*\s*)?%\+?/g;

const YEAR_ONLY = /^(?:19|20)\d{2}$/;

function contextWindow(source: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(source.length, index + length + 40);
  return source
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the high-signal claims from an article body: percentages/ranges and
 * multi-word double-quoted spans. Code, wikilinks, link URLs, and headings are
 * excluded. De-duplicated by (kind, normalized-text) so a figure repeated in
 * prose and a results list is audited once.
 */
export function extractClaims(body: string): readonly Claim[] {
  const scannable = stripNonProse(proseLines(body));
  const claims: Claim[] = [];
  const seen = new Set<string>();

  const push = (kind: ClaimKind, text: string, index: number, len: number) => {
    const key = `${kind}::${normalizeForMatch(text)}`;
    if (seen.has(key)) return;
    seen.add(key);
    claims.push({ kind, text: text.trim(), context: contextWindow(scannable, index, len) });
  };

  for (const m of scannable.matchAll(PERCENT_PATTERN)) {
    push('statistic', m[0], m.index ?? 0, m[0].length);
  }

  // Multi-word quoted spans. Straight or smart double quotes; must contain a
  // space (single words are scare-quotes / jargon, not verbatim lifts) and be
  // long enough to be a meaningful attribution.
  const QUOTE_PATTERN = /["“]([^"“”]{15,400})["”]/g;
  for (const m of scannable.matchAll(QUOTE_PATTERN)) {
    const inner = m[1].trim();
    if (!inner.includes(' ')) continue;
    if (YEAR_ONLY.test(inner)) continue;
    push('quote', inner, m.index ?? 0, m[0].length);
  }

  return claims;
}

// --- Entailment check ------------------------------------------------------

/** Article-level context every claim in one article is judged against. */
export interface EntailmentContext {
  /** Concatenated text of every cited capture, any fidelity. */
  readonly anyHaystack: string;
  /** At least one cited capture is `full` fidelity (whole source archived). */
  readonly hasFullCapture: boolean;
  /** At least one cited capture exists at all. */
  readonly hasAnyCapture: boolean;
  /**
   * At least one *statistic* in this article was found verbatim in the
   * captures — evidence the source's numeric region is archived, so a missing
   * sibling statistic is suspicious rather than merely un-captured.
   */
  readonly siblingStatHit: boolean;
}

/** True when the claim's text is present in the captures. */
export function claimIsPresent(claim: Claim, anyHaystack: string): boolean {
  const needle =
    claim.kind === 'statistic' ? normalizeStatToken(claim.text) : normalizeForMatch(claim.text);
  return needle.length > 0 && anyHaystack.includes(needle);
}

/**
 * Verdict for one claim. A present claim is `supported`. An absent claim is
 * decisively `unsupported` only against a `full` capture; an absent statistic
 * whose siblings are archived is `review` (spot-check); everything else absent
 * is `unverifiable`.
 */
export function classifyClaim(claim: Claim, ctx: EntailmentContext): ClaimVerdict {
  if (!ctx.hasAnyCapture) return 'unverifiable';
  if (claimIsPresent(claim, ctx.anyHaystack)) return 'supported';
  if (ctx.hasFullCapture) return 'unsupported';
  if (claim.kind === 'statistic' && ctx.siblingStatHit) return 'review';
  return 'unverifiable';
}

// --- Raw-capture text index ------------------------------------------------

function collectRawFiles(dir: string): readonly string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRawFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function parseRawFidelity(value: unknown): RawSourceFidelity {
  if (value === 'full' || value === 'extract' || value === 'failed') return value;
  return 'unknown';
}

/**
 * Map every raw capture's normalized `source_url` to its captured body text and
 * fidelity. On a duplicate URL the higher-fidelity, longer capture wins so the
 * entailment check runs against the most complete archive available.
 */
export function buildRawSourceTextIndex(
  workspaceDir: string,
): ReadonlyMap<string, CaptureText> {
  const byUrl = new Map<string, CaptureText>();
  const rank: Record<RawSourceFidelity, number> = {
    full: 3,
    extract: 2,
    failed: 1,
    unknown: 0,
  };

  for (const filePath of collectRawFiles(join(workspaceDir, 'raw'))) {
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
    const data = parsed.data ?? {};
    const sourceUrl = typeof data.source_url === 'string' ? data.source_url : null;
    if (!sourceUrl) continue;

    const url = normalizeUrl(sourceUrl);
    const fidelity = parseRawFidelity(data.fidelity);
    const text = normalizeForMatch(parsed.content);
    const candidate: CaptureText = { text, fidelity };

    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, candidate);
      continue;
    }
    const better =
      rank[fidelity] > rank[existing.fidelity] ||
      (rank[fidelity] === rank[existing.fidelity] && text.length > existing.text.length);
    if (better) byUrl.set(url, candidate);
  }

  return byUrl;
}

// --- Article audit ---------------------------------------------------------

export interface AuditableArticle {
  readonly slug: string;
  readonly body: string;
  readonly sources: readonly { readonly url: string }[];
}

/** Audit one article's claims against its cited captures. */
export function auditArticleClaims(
  article: AuditableArticle,
  rawTextByUrl: ReadonlyMap<string, CaptureText>,
): ArticleClaimAudit {
  const captures = article.sources
    .map(s => rawTextByUrl.get(normalizeUrl(s.url)))
    .filter((c): c is CaptureText => c !== undefined);

  const anyHaystack = captures.map(c => c.text).join('\n');
  const extracted = extractClaims(article.body);

  // A statistic sibling-hit means the source's numeric region is archived, so
  // classification of *absent* statistics must know this up front.
  const siblingStatHit = extracted.some(
    c => c.kind === 'statistic' && claimIsPresent(c, anyHaystack),
  );

  const ctx: EntailmentContext = {
    anyHaystack,
    hasAnyCapture: captures.length > 0,
    hasFullCapture: captures.some(c => c.fidelity === 'full'),
    siblingStatHit,
  };

  const claims = extracted.map(claim => ({ ...claim, verdict: classifyClaim(claim, ctx) }));
  return { slug: article.slug, claims };
}

/** Aggregate per-article audits into the report written to claim-audit.json. */
export function buildClaimAuditReport(
  audits: readonly ArticleClaimAudit[],
): ClaimAuditReport {
  let supported = 0;
  let unsupported = 0;
  let review = 0;
  let unverifiable = 0;
  let claimsChecked = 0;
  let articlesFlagged = 0;
  const unsupportedList: UnsupportedClaim[] = [];
  const reviewList: UnsupportedClaim[] = [];

  for (const audit of audits) {
    let articleFlagged = false;
    for (const claim of audit.claims) {
      claimsChecked += 1;
      const entry: UnsupportedClaim = {
        slug: audit.slug,
        kind: claim.kind,
        text: claim.text,
        context: claim.context,
      };
      if (claim.verdict === 'supported') supported += 1;
      else if (claim.verdict === 'unverifiable') unverifiable += 1;
      else if (claim.verdict === 'review') {
        review += 1;
        reviewList.push(entry);
        articleFlagged = true;
      } else {
        unsupported += 1;
        unsupportedList.push(entry);
        articleFlagged = true;
      }
    }
    if (articleFlagged) articlesFlagged += 1;
  }

  return {
    summary: {
      articlesAudited: audits.length,
      claimsChecked,
      supported,
      unsupported,
      review,
      unverifiable,
      articlesFlagged,
    },
    unsupported: unsupportedList,
    review: reviewList,
  };
}

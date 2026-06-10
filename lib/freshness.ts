/**
 * freshness — Per-article staleness tiers
 *
 * Computes how current each content article is, against the policy's
 * staleness windows. `checked:` (last verified against sources) beats
 * `updated:` (last edit); articles with no parseable date are `unknown`
 * rather than stale, so legacy workspaces are never spammed with warnings.
 * Emitted to wiki/.compile/freshness.json on every compile; rendered by
 * present (badges, gaps lens) and exposed by serve (coverage gaps).
 */

import { SUPPORT_SLUGS } from './support-slugs.js';
import { normalizeUrl } from './source-ledger.js';
import type { SourceLedger } from './source-ledger.js';
import type { UpdatePolicy } from './update-policy.js';

export type FreshnessTier = 'fresh' | 'aging' | 'stale' | 'evergreen' | 'unknown';

export interface FreshnessArticleInput {
  readonly slug: string;
  readonly title: string;
  readonly updated?: string | null;
  readonly checked?: string | null;
  readonly evergreen?: boolean;
  readonly sources?: readonly { readonly url: string }[];
}

export interface ArticleFreshness {
  readonly slug: string;
  readonly title: string;
  readonly updated: string | null;
  readonly checked: string | null;
  /** max(updated, checked) — the date freshness is judged from. */
  readonly effectiveDate: string | null;
  readonly ageDays: number | null;
  readonly tier: FreshnessTier;
  /** Newest `collected:` date among this article's archived sources. */
  readonly newestSourceCollected: string | null;
}

export interface FreshnessReport {
  readonly generatedAt: string;
  readonly policy: {
    readonly freshDays: number;
    readonly agingDays: number;
    readonly source: 'defaults' | 'file';
  };
  readonly articles: readonly ArticleFreshness[];
  readonly summary: Readonly<Record<FreshnessTier, number>>;
}

const MS_PER_DAY = 86_400_000;

function maxDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

function ageInDays(isoDate: string, now: Date): number | null {
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / MS_PER_DAY));
}

function tierFor(
  evergreen: boolean,
  ageDays: number | null,
  windows: UpdatePolicy['staleness'],
): FreshnessTier {
  if (evergreen) return 'evergreen';
  if (ageDays === null) return 'unknown';
  if (ageDays <= windows.freshDays) return 'fresh';
  if (ageDays <= windows.agingDays) return 'aging';
  return 'stale';
}

function newestSourceCollected(
  sources: readonly { readonly url: string }[],
  ledger: SourceLedger,
): string | null {
  const dates = sources
    .map(source => ledger.rawCollectedByUrl[normalizeUrl(source.url)])
    .filter((date): date is string => typeof date === 'string');
  return dates.length > 0 ? [...dates].sort().at(-1) ?? null : null;
}

export function buildFreshnessReport(
  notes: readonly FreshnessArticleInput[],
  ledger: SourceLedger,
  policy: UpdatePolicy,
  now: Date = new Date(),
): FreshnessReport {
  const articles = notes
    .filter(note => !SUPPORT_SLUGS.has(note.slug))
    .map((note): ArticleFreshness => {
      const updated = note.updated ?? null;
      const checked = note.checked ?? null;
      const effectiveDate = maxDate(updated, checked);
      const ageDays = effectiveDate ? ageInDays(effectiveDate, now) : null;

      return {
        slug: note.slug,
        title: note.title,
        updated,
        checked,
        effectiveDate,
        ageDays,
        tier: tierFor(note.evergreen === true, ageDays, policy.staleness),
        newestSourceCollected: newestSourceCollected(note.sources ?? [], ledger),
      };
    });

  const summary: Record<FreshnessTier, number> = {
    fresh: 0,
    aging: 0,
    stale: 0,
    evergreen: 0,
    unknown: 0,
  };
  for (const article of articles) {
    summary[article.tier] += 1;
  }

  return {
    generatedAt: now.toISOString(),
    policy: {
      freshDays: policy.staleness.freshDays,
      agingDays: policy.staleness.agingDays,
      source: policy.source,
    },
    articles,
    summary,
  };
}

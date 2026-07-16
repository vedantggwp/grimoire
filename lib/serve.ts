/** serve — MCP server exposing a Grimoire wiki as a queryable knowledge engine. */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { importSearchIndex, searchNotes, type SearchIndex, type SerializedSearchIndex } from 'papyr-core';
import { shortTopic } from './short-topic.js';
import type { FreshnessReport } from './freshness.js';

// --- Types ---

type ArticleSourceFidelity = 'full' | 'mixed' | 'degraded' | 'unknown';

interface NoteManifestEntry {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly wordCount: number;
  readonly readingTime: number;
  readonly linksTo: readonly string[];
  readonly headings: readonly { level: number; text: string }[];
  readonly confidence: string;
  readonly sources: readonly { url: string; title: string }[];
  readonly sourceFidelity?: ArticleSourceFidelity;
  readonly unknownSourceCount?: number;
}

interface GraphData {
  readonly nodes: Record<string, unknown>;
  readonly edges: readonly { source: string; target: string }[];
  readonly backlinks: Record<string, readonly string[]>;
  readonly orphans: readonly string[];
}

interface AnalyticsData {
  readonly basic: {
    readonly totalNotes: number;
    readonly totalWords: number;
    readonly contentArticles?: number;
    readonly supportPages?: number;
  };
  readonly content: { readonly wordDistribution: { readonly median: number } };
  readonly tags: { readonly tagDistribution: Record<string, number> };
}

interface AuditData { readonly orphanedLinks: Record<string, readonly string[]> }
interface SchemaInfo {
  readonly topic: string;
  readonly scopeIn: string;
  readonly scopeOut: string;
}

const DEGRADED_FIDELITY_WARNING =
  'Fidelity warning: this article was compiled from degraded raw source capture; verify against sources.';

function sourceFidelityOf(note: NoteManifestEntry | undefined): ArticleSourceFidelity {
  return note?.sourceFidelity ?? 'unknown';
}

function fidelityWarningFor(note: NoteManifestEntry | undefined): string {
  return sourceFidelityOf(note) === 'degraded' ? DEGRADED_FIDELITY_WARNING : '';
}

function appendFidelityWarning(text: string, note: NoteManifestEntry | undefined): string {
  const warning = fidelityWarningFor(note);
  return warning ? `${text}\n\n_${warning}_` : text;
}

export interface WikiData {
  readonly notes: readonly NoteManifestEntry[];
  readonly graph: GraphData;
  readonly analytics: AnalyticsData;
  readonly audit: AuditData;
  // searchIndex is null when compile's search-index export failed. Handlers
  // must check and fall back to substring search over the notes manifest.
  readonly searchIndex: SearchIndex | null;
  // freshness is null on workspaces compiled before v0.4.0 — handlers must
  // degrade to the legacy output when absent.
  readonly freshness: FreshnessReport | null;
  readonly overviewContent: string;
  readonly schemaInfo: SchemaInfo;
  readonly wikiDir: string;
}

// --- Data loading ---

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

function extractDomainBlock(content: string): string {
  const lines = content.replace(/\r/g, '').split('\n');
  const domainStart = lines.findIndex(line => /^##\s+Domain\s*$/i.test(line));
  const sectionLines = domainStart === -1 ? lines : lines.slice(domainStart + 1);
  const domainSectionLines: string[] = [];

  for (const line of sectionLines) {
    if (domainSectionLines.length > 0 && (/^##\s/.test(line) || /^---\s*$/.test(line))) {
      break;
    }
    domainSectionLines.push(line);
  }

  const domainSection = domainSectionLines.join('\n');
  const fencedBlock = domainSection.match(/```(?:yaml)?\s*\n([\s\S]*?)\n```/);
  if (fencedBlock) {
    return fencedBlock[1];
  }

  const blockLines: string[] = [];
  let inBlock = false;

  for (const line of domainSection.split('\n')) {
    if (!inBlock) {
      if (/^[a-z0-9_-]+:\s*/i.test(line)) {
        inBlock = true;
        blockLines.push(line);
      }
      continue;
    }

    if (line.trim() === '') break;
    blockLines.push(line);
  }

  return blockLines.join('\n');
}

function normalizeSchemaValue(raw: string): string {
  const value = raw
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('\'') && value.endsWith('\''))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function extractFieldBlock(content: string, field: string): string | null {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = content.replace(/\r/g, '').split('\n');
  const fieldPattern = new RegExp(`^${escapedField}:\\s*(.*)$`, 'i');
  const topLevelFieldPattern = /^[a-z0-9_-]+:\s*/i;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(fieldPattern);
    if (!match) continue;

    const collected = [match[1]];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (topLevelFieldPattern.test(lines[j])) break;
      collected.push(lines[j]);
    }
    return normalizeSchemaValue(collected.join('\n'));
  }

  return null;
}

function extractScopeValue(scopeBlock: string | null, field: 'in' | 'out'): string {
  if (!scopeBlock) return '';

  const lines = scopeBlock.replace(/\r/g, '').split('\n');
  const fieldPattern = new RegExp(`^\\s*${field}:\\s*(.*)$`, 'i');
  const siblingPattern = /^(\s*)(in|out):\s*/i;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(fieldPattern);
    if (!match) continue;

    const collected = [match[1]];
    for (let j = i + 1; j < lines.length; j += 1) {
      const sibling = lines[j].match(siblingPattern);
      if (sibling && sibling[2].toLowerCase() !== field) break;
      collected.push(lines[j]);
    }
    return normalizeSchemaValue(collected.join('\n'));
  }

  const legacyMatch = scopeBlock.match(
    /^IN\s*[—-]?\s*([\s\S]*?)^\s*OUT\s*[—-]?\s*([\s\S]*?)$/im,
  );
  if (legacyMatch) {
    return normalizeSchemaValue(field === 'in' ? legacyMatch[1] : legacyMatch[2]);
  }

  return '';
}

// Parse the nested YAML domain block from SCHEMA.md.
// Canonical shape (enforced by the init template):
//   topic: "..."
//   scope:
//     in: "..."
//     out: "..."
export function parseSchemamd(content: string): SchemaInfo {
  const domainBlock = extractDomainBlock(content);
  const topic = extractFieldBlock(domainBlock, 'topic');
  const scopeBlock = extractFieldBlock(domainBlock, 'scope');
  return {
    topic: topic ?? 'Unknown',
    scopeIn: extractScopeValue(scopeBlock, 'in'),
    scopeOut: extractScopeValue(scopeBlock, 'out'),
  };
}

export function loadWikiData(workspacePath: string): WikiData {
  const absPath = resolve(workspacePath);
  const wikiDir = join(absPath, 'wiki');
  const compileDir = join(wikiDir, '.compile');

  if (!existsSync(compileDir)) {
    throw new Error(`Compile directory not found: ${compileDir}. Run /grimoire:compile first.`);
  }

  const SUPPORT_PAGES = new Set(['index', 'overview', 'log']);
  const allNotes = readJsonFile<NoteManifestEntry[]>(join(compileDir, 'notes.json'));
  // Filter out support pages (index, overview, log) — they're navigators, not content articles.
  const notes = allNotes.filter((n) => !SUPPORT_PAGES.has(n.slug));
  const graph = readJsonFile<GraphData>(join(compileDir, 'graph.json'));
  const analytics = readJsonFile<AnalyticsData>(join(compileDir, 'analytics.json'));

  // Search index may have failed to export during compile (papyr-core can
  // occasionally throw on unusual content). Don't crash the server — fall
  // back to a notes-backed substring search so retrieval still works.
  let searchIndex: SearchIndex | null = null;
  try {
    const searchSerialized = readJsonFile<SerializedSearchIndex & { error?: string }>(
      join(compileDir, 'search-index.json'),
    );
    if ('error' in searchSerialized && searchSerialized.error) {
      process.stderr.write(
        `serve: warning — search-index export failed during compile (${searchSerialized.error}). Falling back to substring search. Re-run /grimoire:compile to restore full-text search.\n`,
      );
    } else {
      searchIndex = importSearchIndex(searchSerialized as SerializedSearchIndex);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `serve: warning — could not load search-index.json (${msg}). Falling back to substring search.\n`,
    );
  }

  const freshnessPath = join(compileDir, 'freshness.json');
  let freshness: FreshnessReport | null = null;
  if (existsSync(freshnessPath)) {
    try {
      freshness = readJsonFile<FreshnessReport>(freshnessPath);
    } catch {
      freshness = null;
    }
  }

  const auditPath = join(compileDir, 'audit.json');
  const audit = existsSync(auditPath)
    ? readJsonFile<AuditData>(auditPath)
    : { orphanedLinks: {} };

  const overviewPath = join(wikiDir, 'overview.md');
  const overviewContent = existsSync(overviewPath)
    ? readFileSync(overviewPath, 'utf-8')
    : '';

  const schemaPath = join(absPath, 'SCHEMA.md');
  const schemaContent = existsSync(schemaPath)
    ? readFileSync(schemaPath, 'utf-8')
    : '';
  const schemaInfo = parseSchemamd(schemaContent);

  return {
    notes,
    graph,
    analytics,
    audit,
    searchIndex,
    freshness,
    overviewContent,
    schemaInfo,
    wikiDir,
  };
}

// --- Tool handlers (exported for testing) ---

function readArticle(wikiDir: string, slug: string): string | null {
  // Validate slug to prevent path traversal
  if (!/^[a-zA-Z0-9/_-]+$/.test(slug)) return null;

  const directPath = join(wikiDir, `${slug}.md`);
  if (existsSync(directPath)) {
    return readFileSync(directPath, 'utf-8');
  }

  // Search subdirectories for taxonomy-organized wikis
  const entries = readdirSync(wikiDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const subPath = join(wikiDir, entry.name, `${slug}.md`);
      if (existsSync(subPath)) {
        return readFileSync(subPath, 'utf-8');
      }
    }
  }

  return null;
}

function extractExcerpt(markdown: string, maxLength: number = 500): string {
  const lines = markdown.split('\n');
  const bodyLines = lines.filter(
    (line) => !line.startsWith('#') && !line.startsWith('---') && line.trim().length > 0
  );
  const body = bodyLines.join('\n').trim();
  return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'who', 'where', 'when', 'why', 'how', 'which',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can',
  'of', 'for', 'to', 'in', 'on', 'at', 'by', 'through', 'into', 'via',
  'with', 'from', 'as', 'and', 'or', 'but', 'about', 'tell', 'me',
  'you', 'your', 'it', 'its', 'if', 'then', 'than', 'that', 'this',
  'those', 'these', 'both', 'all', 'one', 'more', 'plus', 'same',
  'old', 'new', 'only', 'must', 'because', 'not', 'no', 'yes',
  'give', 'get', 'set', 'use', 'using', 'used', 'name', 'names',
  'answer', 'call', 'calls', 'run', 'runs', 'running', 'team',
]);

const GENERIC_RANKING_TERMS = new Set([
  'agent', 'sdk', 'claude', 'code', 'tool', 'tools', 'query', 'question',
  'prompt', 'model', 'models', 'data', 'file', 'files', 'type', 'field',
  'fields', 'entry', 'entries', 'option', 'options', 'value', 'values',
  'default', 'behavior', 'change', 'changes',
]);

export const grimoireQueryInputSchema = z
  .object({
    query: z.string().optional().describe('The question to answer'),
  })
  .catchall(z.unknown())
  .superRefine((args, ctx) => {
    const question = (args as Record<string, unknown>).question;
    if (args.query === undefined && typeof question !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'Expected query or question',
      });
    }
  });

export function normalizeQueryInput(args: z.infer<typeof grimoireQueryInputSchema>): string {
  if (typeof args.query === 'string') return args.query;
  const question = (args as Record<string, unknown>).question;
  return typeof question === 'string' ? question : '';
}

export function parseQueryInput(args: unknown): string {
  return normalizeQueryInput(grimoireQueryInputSchema.parse(args));
}

// Shared hit shape so the fallback path can substitute for papyr-core's SearchResult.
interface SearchHit {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly score: number;
}

export interface SalientTerm {
  readonly raw: string;
  readonly normalized: string;
  readonly variants: readonly string[];
  readonly code: boolean;
}

export interface RankedArticle extends SearchHit {
  readonly bestHeading?: string;
  readonly evidenceScore: number;
  readonly matchedTerms: readonly string[];
}

interface ArticleCorpusEntry {
  readonly note: NoteManifestEntry;
  readonly markdown: string;
  readonly body: string;
  readonly fullText: string;
  readonly phraseText: string;
}

// Substring search over the notes manifest. Used when the FlexSearch index is
// unavailable (compile's export failed or the file is corrupt). Deterministic,
// no external dependencies — token-efficient but lower quality than FlexSearch.
function substringSearch(query: string, data: WikiData, limit: number): SearchHit[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const keywords = q.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const needles = keywords.length > 0 ? keywords : [q];

  const scored: SearchHit[] = [];
  for (const note of data.notes) {
    const haystack = `${note.title} ${note.summary} ${note.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const needle of needles) {
      if (note.title.toLowerCase().includes(needle)) score += 3;
      else if (note.summary.toLowerCase().includes(needle)) score += 2;
      else if (haystack.includes(needle)) score += 1;
    }
    if (score > 0) {
      scored.push({
        slug: note.slug,
        title: note.title,
        excerpt: note.summary || `${note.title} — ${note.tags.join(', ')}`,
        score,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function searchWithFallback(query: string, data: WikiData, limit: number): readonly SearchHit[] {
  // If the search index failed to load, use substring search over notes.
  if (data.searchIndex === null) {
    return substringSearch(query, data, limit);
  }

  // First try: exact query as-is
  let hits = searchNotes(query, data.searchIndex, { limit });
  if (hits.length > 0) return hits;

  // Second try: strip stop words, keep only significant terms
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (keywords.length > 0) {
    const keywordQuery = keywords.join(' ');
    hits = searchNotes(keywordQuery, data.searchIndex, { limit });
    if (hits.length > 0) return hits;

    // Third try: search each significant term individually and merge
    const seen = new Set<string>();
    const merged: typeof hits = [];
    for (const kw of keywords) {
      const kwHits = searchNotes(kw, data.searchIndex, { limit });
      for (const hit of kwHits) {
        if (!seen.has(hit.slug)) {
          seen.add(hit.slug);
          merged.push(hit);
          if (merged.length >= limit) break;
        }
      }
      if (merged.length >= limit) break;
    }
    if (merged.length > 0) return merged;
  }

  // Last resort: substring search over the manifest. Catches cases where
  // FlexSearch tokenization misses content that a simple text scan would hit.
  return substringSearch(query, data, limit);
}

function normalizeRankingToken(raw: string): string {
  return raw
    .trim()
    .replace(/\(\)$/g, '')
    .replace(/^['"`]+|['"`]+$/g, '')
    .toLowerCase();
}

function isCodeLikeToken(raw: string): boolean {
  return (
    /[a-z][A-Z]/.test(raw) ||
    /[A-Z0-9_]{2,}/.test(raw) ||
    /[_./:-]/.test(raw) ||
    /\(\)$/.test(raw) ||
    /\d/.test(raw)
  );
}

function tokenVariants(raw: string, code: boolean): readonly string[] {
  const normalized = normalizeRankingToken(raw);
  const variants = new Set<string>([normalized]);

  if (!code) {
    if (normalized.endsWith('s') && normalized.length > 4) variants.add(normalized.slice(0, -1));
    if (normalized.endsWith('ing') && normalized.length > 6) variants.add(normalized.slice(0, -3));
    if (normalized.endsWith('ed') && normalized.length > 5) variants.add(normalized.slice(0, -2));
    if (normalized.length > 4) {
      variants.add(`${normalized}s`);
      variants.add(`${normalized}ing`);
      variants.add(`${normalized}ed`);
    }
  }

  if (normalized.includes('-')) {
    for (const part of normalized.split('-')) variants.add(part);
  }
  if (normalized.includes('_')) {
    for (const part of normalized.split('_')) variants.add(part);
  }

  return [...variants].filter((variant) => variant.length > 2 || /[\d[\]]/.test(variant));
}

export function extractSalientTerms(query: string): readonly SalientTerm[] {
  const tokenPattern =
    /[A-Za-z0-9]+(?:[-_./:][A-Za-z0-9]+)+|[A-Za-z_][A-Za-z0-9_]*(?:\(\))?|\[\]|\d+(?:\.\d+)*/g;
  const seen = new Set<string>();
  const terms: SalientTerm[] = [];

  for (const match of query.matchAll(tokenPattern)) {
    const raw = match[0];
    const normalized = normalizeRankingToken(raw);
    const code = isCodeLikeToken(raw);
    if (!code && (normalized.length < 3 || STOP_WORDS.has(normalized))) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    terms.push({
      raw,
      normalized,
      variants: tokenVariants(raw, code),
      code,
    });
  }

  return terms;
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?---\s*/, '');
}

function normalizePhraseText(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[`"'()[\]{}:;,.!?/\\]+/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textIncludesVariant(text: string, variant: string): boolean {
  if (variant.length === 0) return false;
  if (/[^a-z0-9]/.test(variant)) return text.includes(variant);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(variant)}($|[^a-z0-9])`).test(text);
}

function termMatchesText(term: SalientTerm, text: string): boolean {
  return term.variants.some((variant) => textIncludesVariant(text, variant));
}

function buildArticleCorpus(data: WikiData): readonly ArticleCorpusEntry[] {
  return data.notes.map((note) => {
    const markdown = readArticle(data.wikiDir, note.slug) ?? '';
    const body = stripFrontmatter(markdown);
    const fullText = [
      note.title,
      note.summary,
      note.tags.join(' '),
      note.headings.map((h) => h.text).join(' '),
      body,
    ].join(' ').toLowerCase();

    return {
      note,
      markdown,
      body,
      fullText,
      phraseText: normalizePhraseText(fullText),
    };
  });
}

function computeTermIdf(
  terms: readonly SalientTerm[],
  corpusTexts: readonly string[],
): ReadonlyMap<string, number> {
  const idf = new Map<string, number>();
  const total = corpusTexts.length;

  for (const term of terms) {
    let docFreq = 0;
    for (const text of corpusTexts) {
      if (termMatchesText(term, text)) docFreq += 1;
    }
    idf.set(term.normalized, Math.log((total + 1) / (docFreq + 1)) + 1);
  }

  return idf;
}

function termWeight(term: SalientTerm, idf: ReadonlyMap<string, number>): number {
  const rarity = idf.get(term.normalized) ?? 1;
  const genericPenalty = GENERIC_RANKING_TERMS.has(term.normalized) ? 0.25 : 1;
  const codeBoost = term.code ? 1.35 : 1;
  return rarity * genericPenalty * codeBoost;
}

function requiredCodeTerms(terms: readonly SalientTerm[]): readonly SalientTerm[] {
  return terms.filter((term) =>
    term.code &&
    term.normalized.length >= 6 &&
    !GENERIC_RANKING_TERMS.has(term.normalized) &&
    !['query', 'bash', 'write', 'edit', 'read', 'skill'].includes(term.normalized)
  );
}

function extractQueryPhrases(query: string): readonly string[] {
  const words = normalizePhraseText(query)
    .split(/\s+/)
    .filter((word) =>
      word.length > 2 &&
      !STOP_WORDS.has(word) &&
      !['does', 'which', 'what', 'why', 'how'].includes(word)
    );
  const phrases = new Set<string>();

  for (let size = 2; size <= 4; size += 1) {
    for (let i = 0; i <= words.length - size; i += 1) {
      const phrase = words.slice(i, i + size).join(' ');
      if (phrase.length >= 7) phrases.add(phrase);
    }
  }

  return [...phrases];
}

function scorePhraseMatches(
  query: string,
  fields: readonly { text: string; phraseText: string; weight: number }[],
): number {
  let score = 0;
  for (const phrase of extractQueryPhrases(query)) {
    for (const field of fields) {
      if (field.phraseText.includes(phrase)) score += field.weight;
    }
  }
  return score;
}

function scoreTermProximity(
  body: string,
  terms: readonly SalientTerm[],
): number {
  const rareTerms = terms.filter((term) => !GENERIC_RANKING_TERMS.has(term.normalized));
  if (
    rareTerms.length === 2 &&
    rareTerms.every((term) => termMatchesText(term, body))
  ) {
    return 14;
  }
  if (rareTerms.length < 3) return 0;

  let best = 0;
  for (let i = 0; i < body.length; i += 120) {
    const window = body.slice(i, i + 280);
    let matches = 0;
    for (const term of rareTerms) {
      if (termMatchesText(term, window)) matches += 1;
    }
    best = Math.max(best, matches);
  }

  return best >= 3 ? best * 8 : 0;
}

function bestMatchingSectionHeading(
  query: string,
  markdown: string,
  terms: readonly SalientTerm[],
  idf: ReadonlyMap<string, number>,
): string | undefined {
  const sections = splitSectionsByH2(stripFrontmatter(markdown));
  if (sections.length === 0) return undefined;

  let best: { heading: string; score: number } | null = null;
  for (const section of sections) {
    const heading = section.heading.toLowerCase();
    const content = section.content.toLowerCase();
    let score = scorePhraseMatches(query, [
      { text: heading, phraseText: normalizePhraseText(heading), weight: 10 },
      { text: content, phraseText: normalizePhraseText(content), weight: 4 },
    ]);

    for (const term of terms) {
      const weight = termWeight(term, idf);
      if (termMatchesText(term, heading)) score += 8 * weight;
      if (termMatchesText(term, content)) score += 2 * weight;
    }

    if (best === null || score > best.score) {
      best = { heading: section.heading, score };
    }
  }

  return best && best.score > 0 ? best.heading : undefined;
}

function scoreCorpusArticle(
  query: string,
  entry: ArticleCorpusEntry,
  terms: readonly SalientTerm[],
  idf: ReadonlyMap<string, number>,
  flexBonus: number,
): RankedArticle {
  const note = entry.note;
  const title = note.title.toLowerCase();
  const summary = note.summary.toLowerCase();
  const tags = note.tags.join(' ').toLowerCase();
  const headings = note.headings.map((h) => h.text).join(' ').toLowerCase();
  const body = entry.body.toLowerCase();
  const fields = [
    { name: 'title', text: title, phraseText: normalizePhraseText(title), weight: 18, evidence: false },
    { name: 'summary', text: summary, phraseText: normalizePhraseText(summary), weight: 13, evidence: true },
    { name: 'tags', text: tags, phraseText: normalizePhraseText(tags), weight: 16, evidence: false },
    { name: 'headings', text: headings, phraseText: normalizePhraseText(headings), weight: 9, evidence: true },
    { name: 'body', text: body, phraseText: normalizePhraseText(body), weight: 2.4, evidence: true },
  ] as const;

  let score = flexBonus;
  let evidenceScore = 0;
  const matchedTerms = new Set<string>();

  for (const field of fields) {
    for (const term of terms) {
      if (!termMatchesText(term, field.text)) continue;
      const value = field.weight * termWeight(term, idf);
      score += value;
      if (field.evidence) evidenceScore += value;
      matchedTerms.add(term.normalized);
    }
  }

  for (const term of requiredCodeTerms(terms)) {
    if (!textIncludesVariant(body, term.normalized)) continue;
    const value = 14 * termWeight(term, idf);
    score += value;
    evidenceScore += value;
  }

  const phraseScore = scorePhraseMatches(query, fields);
  const proximityScore = scoreTermProximity(body, terms);
  score += phraseScore + proximityScore;
  evidenceScore += phraseScore + proximityScore;

  const bestHeading = bestMatchingSectionHeading(query, entry.markdown, terms, idf);

  return {
    slug: note.slug,
    title: note.title,
    excerpt: note.summary || `${note.title} - ${note.tags.join(', ')}`,
    score: Number(score.toFixed(3)),
    evidenceScore: Number(evidenceScore.toFixed(3)),
    matchedTerms: [...matchedTerms].sort(),
    bestHeading,
  };
}

export function scoreArticleForQuery(
  query: string,
  note: NoteManifestEntry,
  markdown: string,
  corpusTexts: readonly string[] = [markdown],
): RankedArticle {
  const terms = extractSalientTerms(query);
  const body = stripFrontmatter(markdown);
  const fullText = [
    note.title,
    note.summary,
    note.tags.join(' '),
    note.headings.map((h) => h.text).join(' '),
    body,
  ].join(' ').toLowerCase();
  const entry: ArticleCorpusEntry = {
    note,
    markdown,
    body,
    fullText,
    phraseText: normalizePhraseText(fullText),
  };
  const idf = computeTermIdf(terms, corpusTexts.map((text) => text.toLowerCase()));
  return scoreCorpusArticle(query, entry, terms, idf, 0);
}

export interface AbstentionThresholdStats {
  readonly robustScoreZ: number;
  readonly corpusSupportRatio: number;
  readonly topSupportedCoverageRatio: number;
  readonly supportedTermCount: number;
  readonly articleCount: number;
  readonly topEvidenceScore: number;
}

// Eight articles leaves seven peer scores after excluding the top hit; below that, robust-MAD estimates are too quantized.
const MIN_STATISTICAL_ARTICLE_COUNT = 8;
// Three-MAD robust z is the standard outlier bar; it rejects ordinary high scorers without assuming a normal score distribution.
const MIN_ROBUST_SCORE_Z = 3;
// A 1.5 robust-z is a one-sided high-score signal for dense corpora when the top hit covers essentially all supported terms.
const MIN_CLEAR_COVERAGE_ROBUST_Z = 1.5;
// Ninety-five percent supported-term coverage leaves only rounding/tokenization residue, so dense-corpus z can be lower.
const MIN_CLEAR_TOP_COVERAGE = 0.95;
// Below two-fifths of weighted salient-term mass in the corpus, the query is mostly outside the wiki rather than under-ranked.
const MIN_CORPUS_SUPPORT_RATIO = 0.4;
// Four-fifths corpus support means missing top coverage is article mismatch, not domain mismatch.
const HIGH_CORPUS_SUPPORT_RATIO = 0.8;
// With high corpus support, the top article must cover a weighted majority plus a small tokenization-noise margin.
const MIN_HIGH_SUPPORT_TOP_COVERAGE = 0.53;
// With partial corpus support, the top article must still carry nearly half of the supported signal to be useful.
const MIN_PARTIAL_SUPPORT_TOP_COVERAGE = 0.45;
// For one- or two-concept searches, matching one supported concept is enough when the score is already a 3-MAD outlier.
const MIN_SHORT_QUERY_TOP_COVERAGE = 0.34;
// For one- or two-concept small-wiki searches, one supported concept can be enough when absolute evidence is present.
const MIN_SMALL_CORPUS_SHORT_QUERY_TOP_COVERAGE = 0.34;
// Half coverage keeps three-plus-term small-wiki searches on a weighted-majority evidence bar.
const MIN_SMALL_CORPUS_TOP_COVERAGE = 0.5;
// A single specific body-term contributes 2.4 evidence, admitting true one-article starts while rejecting zero-evidence hits.
const MIN_SMALL_CORPUS_EVIDENCE_SCORE = 2.4;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function robustZScore(value: number, distribution: readonly number[]): number {
  if (distribution.length === 0) return 0;

  const center = median(distribution);
  const absoluteDeviations = distribution.map((score) => Math.abs(score - center));
  const mad = median(absoluteDeviations);
  if (mad > 0) {
    return (0.6745 * (value - center)) / mad;
  }

  const mean = distribution.reduce((sum, score) => sum + score, 0) / distribution.length;
  const variance = distribution.reduce((sum, score) => sum + ((score - mean) ** 2), 0) /
    distribution.length;
  const standardDeviation = Math.sqrt(variance);
  if (standardDeviation > 0) return (value - mean) / standardDeviation;
  return value > center ? Number.POSITIVE_INFINITY : 0;
}

function confidenceTerms(terms: readonly SalientTerm[]): readonly SalientTerm[] {
  const specific = terms.filter((term) => !GENERIC_RANKING_TERMS.has(term.normalized));
  return specific.length > 0 ? specific : terms;
}

function totalTermWeight(
  terms: readonly SalientTerm[],
  idf: ReadonlyMap<string, number>,
): number {
  return terms.reduce((sum, term) => sum + termWeight(term, idf), 0);
}

function termHasCorpusSupport(
  term: SalientTerm,
  corpus: readonly ArticleCorpusEntry[],
): boolean {
  if (term.code) {
    return corpus.some((entry) => textIncludesVariant(entry.fullText, term.normalized));
  }
  return corpus.some((entry) => termMatchesText(term, entry.fullText));
}

function topHitSupportsTermExactly(
  term: SalientTerm,
  top: RankedArticle,
  corpus: readonly ArticleCorpusEntry[],
): boolean {
  if (!term.code) return top.matchedTerms.includes(term.normalized);

  const topEntry = corpus.find((entry) => entry.note.slug === top.slug);
  return topEntry ? textIncludesVariant(topEntry.fullText, term.normalized) : false;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function computeAbstentionThresholdStats(
  terms: readonly SalientTerm[],
  corpus: readonly ArticleCorpusEntry[],
  idf: ReadonlyMap<string, number>,
  ranked: readonly RankedArticle[],
): AbstentionThresholdStats {
  const [top] = ranked;
  if (!top) {
    return {
      robustScoreZ: 0,
      corpusSupportRatio: 0,
      topSupportedCoverageRatio: 0,
      supportedTermCount: 0,
      articleCount: ranked.length,
      topEvidenceScore: 0,
    };
  }

  const consideredTerms = confidenceTerms(terms);
  const totalWeight = totalTermWeight(consideredTerms, idf);
  const corpusSupportedTerms = consideredTerms.filter((term) => termHasCorpusSupport(term, corpus));
  const corpusSupportedWeight = totalTermWeight(corpusSupportedTerms, idf);
  const topSupportedTerms = corpusSupportedTerms.filter((term) =>
    topHitSupportsTermExactly(term, top, corpus)
  );
  const topSupportedWeight = totalTermWeight(topSupportedTerms, idf);

  return {
    robustScoreZ: robustZScore(top.score, ranked.slice(1).map((hit) => hit.score)),
    corpusSupportRatio: ratio(corpusSupportedWeight, totalWeight),
    topSupportedCoverageRatio: ratio(topSupportedWeight, corpusSupportedWeight),
    supportedTermCount: corpusSupportedTerms.length,
    articleCount: ranked.length,
    topEvidenceScore: top.evidenceScore,
  };
}

export function passesAbstentionThreshold(stats: AbstentionThresholdStats): boolean {
  if (stats.corpusSupportRatio < MIN_CORPUS_SUPPORT_RATIO) return false;

  if (stats.articleCount < MIN_STATISTICAL_ARTICLE_COUNT) {
    const requiredCoverage = stats.supportedTermCount <= 2
      ? MIN_SMALL_CORPUS_SHORT_QUERY_TOP_COVERAGE
      : MIN_SMALL_CORPUS_TOP_COVERAGE;
    return (
      stats.topSupportedCoverageRatio >= requiredCoverage &&
      stats.topEvidenceScore >= MIN_SMALL_CORPUS_EVIDENCE_SCORE
    );
  }

  if (
    stats.robustScoreZ >= MIN_CLEAR_COVERAGE_ROBUST_Z &&
    stats.corpusSupportRatio >= HIGH_CORPUS_SUPPORT_RATIO &&
    stats.topSupportedCoverageRatio >= MIN_CLEAR_TOP_COVERAGE
  ) {
    return true;
  }

  if (stats.robustScoreZ < MIN_ROBUST_SCORE_Z) return false;

  if (
    stats.supportedTermCount <= 2 &&
    stats.topSupportedCoverageRatio >= MIN_SHORT_QUERY_TOP_COVERAGE
  ) {
    return true;
  }

  const requiredCoverage = stats.corpusSupportRatio >= HIGH_CORPUS_SUPPORT_RATIO
    ? MIN_HIGH_SUPPORT_TOP_COVERAGE
    : MIN_PARTIAL_SUPPORT_TOP_COVERAGE;
  return stats.topSupportedCoverageRatio >= requiredCoverage;
}

export function rankArticlesForQuery(
  query: string,
  data: WikiData,
  limit: number = 10,
): readonly RankedArticle[] {
  const terms = extractSalientTerms(query);
  if (terms.length === 0) return [];

  const corpus = buildArticleCorpus(data);
  const idf = computeTermIdf(terms, corpus.map((entry) => entry.fullText));
  const flexHits = searchWithFallback(query, data, Math.max(20, data.notes.length));
  const flexBonusBySlug = new Map<string, number>();
  flexHits.forEach((hit, index) => {
    flexBonusBySlug.set(hit.slug, Math.max(0, 12 - index));
  });

  const ranked = corpus
    .map((entry) =>
      scoreCorpusArticle(
        query,
        entry,
        terms,
        idf,
        flexBonusBySlug.get(entry.note.slug) ?? 0,
      )
    )
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  if (!passesAbstentionThreshold(computeAbstentionThresholdStats(terms, corpus, idf, ranked))) {
    return [];
  }

  return ranked
    .filter((hit) => hit.score > 0 && hit.evidenceScore > 0)
    .slice(0, limit);
}

export function handleQuery(query: string, data: WikiData): string {
  const hits = rankArticlesForQuery(query, data, 3);

  if (hits.length === 0) {
    return `No results found with confidence for "${query}" in the ${shortTopic(data.schemaInfo.topic)} knowledge base. Use grimoire_list_topics to inspect covered articles.`;
  }

  const topHits = hits.slice(0, 3);
  const notesBySlug = new Map(data.notes.map((n) => [n.slug, n]));

  // Prefer the one-line summary (token-efficient routing signal) over a
  // body excerpt. Fall back to excerpt if the article has no summary yet.
  const sections = topHits.map((hit) => {
    const note = notesBySlug.get(hit.slug);
    const summary = note?.summary?.trim() ?? '';
    const warning = fidelityWarningFor(note);
    const warningLine = warning ? `\n\n_${warning}_` : '';
    const sectionLine = hit.bestHeading
      ? `\n\nBest section: "${hit.bestHeading}" (\`grimoire_get_section(slug: "${hit.slug}", heading: "${hit.bestHeading}")\`).`
      : '';
    if (summary) {
      return `### ${hit.title} (${hit.slug})\n\n${summary}${sectionLine}\n\n_Fetch full article via \`grimoire_get_article(slug: "${hit.slug}")\`, or a specific section via \`grimoire_get_section\`._${warningLine}`;
    }
    // Legacy fallback: article predates the summary field.
    const content = readArticle(data.wikiDir, hit.slug);
    const excerpt = content ? extractExcerpt(content) : hit.excerpt;
    return `### ${hit.title} (${hit.slug})\n\n${excerpt}${sectionLine}${warningLine}`;
  });

  return [
    `## Results for: "${query}"`,
    `Knowledge base: ${shortTopic(data.schemaInfo.topic)}`,
    '',
    ...sections,
    '',
    `---`,
    `Sources: ${topHits.map((h) => h.slug).join(', ')}`,
  ].join('\n');
}

export function handleListTopics(data: WikiData): string {
  const tagCounts: Record<string, number> = {};
  for (const note of data.notes) {
    for (const tag of note.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const sorted = Object.entries(tagCounts).sort(([, a], [, b]) => b - a);
  const tagLines = sorted.map(([tag, count]) => `- **${tag}**: ${count} article(s)`);

  // Article index with one-line summaries. This is the routing table an
  // LLM client uses to decide which articles to pull in full — structurally
  // equivalent to Karpathy's LLM-wiki routing pattern.
  const articleLines = data.notes.map((n) => {
    const summary = n.summary?.trim() || '_(no summary)_';
    return `- **${n.title}** (\`${n.slug}\`) — ${summary}`;
  });

  return [
    `## Topics in: ${shortTopic(data.schemaInfo.topic)}`,
    `Total articles: ${data.notes.length}`,
    `Total tags: ${sorted.length}`,
    '',
    '### Articles',
    '',
    ...articleLines,
    '',
    '### Tags',
    '',
    ...tagLines,
  ].join('\n');
}

// Threshold above which get_article (in "auto" mode) returns a summary
// envelope instead of the full article body. Well under Claude Code's 25k-token
// tool response cap, generous enough that typical wiki articles pass through.
const LARGE_ARTICLE_CHARS = 15_000;

export type GetArticleMode = 'auto' | 'summary' | 'full';

export function handleGetArticle(
  slug: string,
  data: WikiData,
  mode: GetArticleMode = 'auto',
): string {
  const content = readArticle(data.wikiDir, slug);
  if (content === null) {
    const preview = data.notes.slice(0, 10).map((n) => n.slug).join(', ');
    const more = data.notes.length > 10 ? ` (+${data.notes.length - 10} more)` : '';
    return `Article not found: "${slug}". Available slugs: ${preview}${more}`;
  }

  const note = data.notes.find((n) => n.slug === slug);

  const effectiveMode: GetArticleMode =
    mode === 'full' ? 'full'
      : mode === 'summary' ? 'summary'
        : content.length > LARGE_ARTICLE_CHARS ? 'summary' : 'full';

  if (effectiveMode === 'full') {
    return appendFidelityWarning(content, note);
  }

  // Summary envelope: let the LLM client decide whether to fetch the full
  // article or a specific section without paying the full-article token cost.
  const title = note?.title ?? slug;
  const summary = note?.summary?.trim() ?? '';
  const h2Headings = (note?.headings ?? []).filter((h) => h.level === 2);
  const approxTokens = Math.round(content.length / 4);
  const sizeKB = (content.length / 1024).toFixed(1);

  const lines: string[] = [`# ${title}`, ''];
  if (summary) lines.push(`**Summary:** ${summary}`, '');
  lines.push(
    `_Article is ${sizeKB}KB (≈${approxTokens} tokens). This is a summary envelope to save context. Use \`grimoire_get_section(slug: "${slug}", heading: "...")\` to fetch a specific section, or \`grimoire_get_article(slug: "${slug}", mode: "full")\` to get the complete article._`,
    '',
    '## Sections',
    '',
  );
  if (h2Headings.length > 0) {
    for (const h of h2Headings) lines.push(`- ${h.text}`);
  } else {
    lines.push('_(no H2 sections detected)_');
  }

  return appendFidelityWarning(lines.join('\n'), note);
}

// Split an article body into sections keyed by H2 heading. Markdown-native,
// no HTML parsing required — mirrors the quiz module's splitByH2 but works
// directly on the markdown source so get_section returns raw markdown.
function splitSectionsByH2(body: string): Array<{ heading: string; content: string }> {
  const lines = body.split('\n');
  const parts: Array<{ heading: string; content: string[] }> = [];
  let current: { heading: string; content: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (current) parts.push(current);
      current = { heading: h2[1].trim(), content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) parts.push(current);

  return parts.map((p) => ({
    heading: p.heading,
    content: p.content.join('\n').trim(),
  }));
}

export function handleGetSection(slug: string, heading: string, data: WikiData): string {
  const content = readArticle(data.wikiDir, slug);
  if (content === null) {
    return `Article not found: "${slug}". Use \`grimoire_list_topics\` to see available articles.`;
  }

  // Strip frontmatter so we only scan the body.
  const body = content.replace(/^---[\s\S]*?---\s*/, '');
  const sections = splitSectionsByH2(body);

  if (sections.length === 0) {
    return `Article "${slug}" has no H2 sections. Fetch the full article via \`grimoire_get_article(slug: "${slug}", mode: "full")\`.`;
  }

  const target = heading.trim().toLowerCase();
  const match = sections.find((s) => s.heading.toLowerCase() === target);

  if (!match) {
    const available = sections.map((s) => `- ${s.heading}`).join('\n');
    return [
      `Section "${heading}" not found in article "${slug}".`,
      '',
      'Available sections:',
      available,
    ].join('\n');
  }

  const note = data.notes.find((n) => n.slug === slug);
  const title = note?.title ?? slug;

  return [
    `# ${title}`,
    '',
    `## ${match.heading}`,
    '',
    match.content,
    '',
    '---',
    `_Section of \`${slug}\`. Use \`grimoire_get_article(slug: "${slug}", mode: "full")\` for the complete article._`,
  ].join('\n');
}

export function handleOpenQuestions(data: WikiData): string {
  const { overviewContent } = data;
  if (!overviewContent) {
    return 'No overview.md found — cannot extract open questions.';
  }

  const openQStart = overviewContent.indexOf('## Open Questions');
  if (openQStart === -1) {
    return 'No "## Open Questions" section found in overview.md.';
  }

  const afterStart = overviewContent.slice(openQStart + '## Open Questions'.length);
  const nextHeading = afterStart.indexOf('\n## ');
  const section = nextHeading === -1 ? afterStart : afterStart.slice(0, nextHeading);

  const bullets = section
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.trim());

  if (bullets.length === 0) {
    return 'Open Questions section exists but contains no items.';
  }

  return [
    `## Open Questions (${bullets.length})`,
    '',
    ...bullets,
  ].join('\n');
}

export function handleCoverageGaps(data: WikiData): string {
  const gaps: string[] = [];

  // 1. Tags with only 1 article
  const tagCounts: Record<string, string[]> = {};
  for (const note of data.notes) {
    for (const tag of note.tags) {
      const existing = tagCounts[tag] ?? [];
      tagCounts[tag] = [...existing, note.slug];
    }
  }

  const thinTags = Object.entries(tagCounts)
    .filter(([, slugs]) => slugs.length === 1)
    .map(([tag, slugs]) => `- [THIN TAG] "${tag}" has only 1 article: ${slugs[0]}`);

  if (thinTags.length > 0) {
    gaps.push('### Thin Tags (single article)', '', ...thinTags);
  }

  // 2. Articles with word count below 50% of median
  const median = data.analytics.content.wordDistribution.median;
  const threshold = median * 0.5;
  const thinArticles = data.notes
    .filter((n) => n.wordCount < threshold)
    .map((n) => `- [THIN ARTICLE] "${n.title}" (${n.slug}): ${n.wordCount} words (median: ${median})`);

  if (thinArticles.length > 0) {
    gaps.push('', '### Thin Articles (below 50% of median word count)', '', ...thinArticles);
  }

  // 3. Orphaned links — topics referenced but without their own article
  const orphanedLinks = data.audit.orphanedLinks;
  const orphanEntries = Object.entries(orphanedLinks).flatMap(([source, targets]) =>
    targets.map((target) => `- [MISSING ARTICLE] "${target}" referenced from ${source}`)
  );

  if (orphanEntries.length > 0) {
    gaps.push('', '### Missing Articles (orphaned links)', '', ...orphanEntries);
  }

  // 4. Articles whose cited raw captures failed. Mixed/extract captures are
  // visible on the generated site; failed captures are coverage-blocking.
  const degradedEntries = data.notes
    .filter(note => sourceFidelityOf(note) === 'degraded')
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(note => `- [DEGRADED SOURCE] "${note.title}" (${note.slug}): raw capture failed; retry source capture before relying on claims`);

  if (degradedEntries.length > 0) {
    gaps.push('', '### Degraded Source Fidelity', '', ...degradedEntries);
  }

  // 5. Articles whose provenance cannot be tracked. This is distinct from
  // degraded capture: no warning is added to retrieval responses, but wiki
  // health should still show that provenance is not known.
  const unknownEntries = data.notes
    .filter(note => sourceFidelityOf(note) === 'unknown')
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(note => `- [UNTRACKED PROVENANCE] "${note.title}" (${note.slug}): cited source fidelity is unknown`);

  if (unknownEntries.length > 0) {
    gaps.push('', '### Untracked Provenance', '', ...unknownEntries);
  }

  // 6. Articles past their staleness window (freshness.json, v0.4.0+).
  // Workspaces compiled before v0.4.0 have no freshness report — degrade to
  // the legacy output silently.
  const staleEntries: string[] = [];
  if (data.freshness) {
    const byTier = (tier: 'stale' | 'aging') =>
      data.freshness!.articles
        .filter((a) => a.tier === tier)
        .sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

    for (const article of byTier('stale')) {
      staleEntries.push(
        `- [STALE] "${article.title}" (${article.slug}): ${article.ageDays} days since last verified (${article.checked ? `checked ${article.checked}` : `updated ${article.updated}`})`,
      );
    }
    for (const article of byTier('aging')) {
      staleEntries.push(
        `- [AGING] "${article.title}" (${article.slug}): ${article.ageDays} days since last verified (${article.checked ? `checked ${article.checked}` : `updated ${article.updated}`})`,
      );
    }

    if (staleEntries.length > 0) {
      gaps.push(
        '',
        `### Stale Articles (freshness policy: ${data.freshness.policy.freshDays}/${data.freshness.policy.agingDays} days)`,
        '',
        ...staleEntries,
      );
    }
  }

  if (gaps.length === 0) {
    return 'No coverage gaps detected.';
  }

  const totalGaps =
    thinTags.length +
    thinArticles.length +
    orphanEntries.length +
    degradedEntries.length +
    unknownEntries.length +
    staleEntries.length;
  return [
    `## Coverage Gaps (${totalGaps} issues)`,
    '',
    ...gaps,
  ].join('\n');
}

export function handleSearch(
  query: string,
  limit: number,
  data: WikiData,
): string {
  const hits = rankArticlesForQuery(query, data, limit);

  if (hits.length === 0) {
    return `No results for "${query}".`;
  }

  const lines = hits.map(
    (hit) => {
      const section = hit.bestHeading ? ` Best section: "${hit.bestHeading}".` : '';
      return `- **${hit.title}** (${hit.slug}) — score: ${hit.score}.${section}\n  ${hit.excerpt}`;
    }
  );

  return [
    `## Search: "${query}" (${hits.length} results)`,
    '',
    ...lines,
  ].join('\n');
}

// --- MCP server setup ---

function createServer(data: WikiData): McpServer {
  const server = new McpServer(
    { name: 'grimoire', version: '0.5.2' },
    {
      instructions: `Grimoire is a curated knowledge base about "${shortTopic(data.schemaInfo.topic)}". Routing pattern for efficient retrieval:\n1. Call grimoire_list_topics first to see all articles with summaries\n2. Use grimoire_get_article(slug) for a specific article\n3. Use grimoire_get_section(slug, heading) for just one section (most token-efficient)\nFor questions: grimoire_query. For keyword search: grimoire_search.\nPrefer get_section over get_article when you know which section you need.`,
    },
  );

  server.registerTool(
    'grimoire_query',
    {
      description: 'Answer a natural-language question by finding the most relevant articles. Returns top-3 matches with summaries and slugs for deeper retrieval. Use this FIRST for factual questions. For keyword search, use grimoire_search instead.',
      inputSchema: grimoireQueryInputSchema,
    },
    async (args) => ({
      content: [{ type: 'text' as const, text: handleQuery(normalizeQueryInput(args), data) }],
    }),
  );

  server.tool(
    'grimoire_list_topics',
    'Get the routing table: every article slug, title, and one-line summary, plus tag categories with counts. Call this FIRST in a new session to understand what the wiki covers — summaries let you decide which articles to fetch without wasting tokens.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleListTopics(data) }],
    }),
  );

  server.tool(
    'grimoire_get_article',
    'Retrieve a specific wiki article by slug. Large articles (>15KB) return a summary envelope by default to save tokens — pass mode:"full" to force the complete markdown, or use grimoire_get_section to fetch a single section.',
    {
      slug: z.string().describe('The article slug (e.g. "react-fundamentals")'),
      mode: z
        .enum(['auto', 'summary', 'full'])
        .optional()
        .describe('Response mode. "auto" (default): return full content if small, summary envelope if large. "summary": always return summary + section list. "full": always return complete markdown.'),
    },
    async ({ slug, mode }) => ({
      content: [{ type: 'text' as const, text: handleGetArticle(slug, data, mode ?? 'auto') }],
    }),
  );

  server.tool(
    'grimoire_get_section',
    'Retrieve a specific section of an article (matched by H2 heading, case-insensitive). Use this instead of grimoire_get_article when you only need one part — token-efficient retrieval for large articles.',
    {
      slug: z.string().describe('The article slug (e.g. "react-fundamentals")'),
      heading: z.string().describe('The H2 section heading to fetch (e.g. "Overview", "Key Capabilities"). Case-insensitive exact match.'),
    },
    async ({ slug, heading }) => ({
      content: [{ type: 'text' as const, text: handleGetSection(slug, heading, data) }],
    }),
  );

  server.tool(
    'grimoire_open_questions',
    'List unresolved research questions extracted from the wiki overview. Use when asking what is still unknown, what needs more research, or where the knowledge base has gaps.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleOpenQuestions(data) }],
    }),
  );

  server.tool(
    'grimoire_coverage_gaps',
    'Identify structural weaknesses: tags with only one article, articles below median word count, topics referenced but not yet written, degraded raw-source fidelity, untracked provenance, plus articles past their staleness window. Use when asking about wiki health, what to write next, or what needs re-verification.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleCoverageGaps(data) }],
    }),
  );

  server.tool(
    'grimoire_search',
    'Keyword search across all article titles, summaries, tags, and body text. Returns scored results with excerpts. Use for specific terms to look up. For natural-language questions, prefer grimoire_query which adds synthesis.',
    {
      query: z.string().describe('The search query'),
      limit: z.number().optional().describe('Max results (default 10)'),
    },
    async ({ query, limit }) => ({
      content: [{ type: 'text' as const, text: handleSearch(query, limit ?? 10, data) }],
    }),
  );

  return server;
}

// --- CLI entrypoint ---

async function main(): Promise<void> {
  const workspacePath = process.argv[2];
  if (!workspacePath) {
    process.stderr.write('Usage: node dist/serve.js <workspace-path>\n');
    process.exit(1);
  }

  try {
    const data = loadWikiData(workspacePath);
    const server = createServer(data);

    process.stderr.write(
      `serve: loaded ${data.notes.length} articles from "${shortTopic(data.schemaInfo.topic)}"\n`,
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write('serve: MCP server running on stdio\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`serve: fatal — ${message}\n`);
    process.exit(1);
  }
}

// Only run when executed directly (not when imported by tests)
const isDirect = process.argv[1]?.endsWith('/serve.ts') || process.argv[1]?.endsWith('/serve.js');
if (isDirect) { main(); }

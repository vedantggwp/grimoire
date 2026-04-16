/** serve — MCP server exposing a Grimoire wiki as a queryable knowledge engine. */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { importSearchIndex, searchNotes, type SearchIndex, type SerializedSearchIndex } from 'papyr-core';

// --- Types ---

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
}

interface GraphData {
  readonly nodes: Record<string, unknown>;
  readonly edges: readonly { source: string; target: string }[];
  readonly backlinks: Record<string, readonly string[]>;
  readonly orphans: readonly string[];
}

interface AnalyticsData {
  readonly basic: { readonly totalNotes: number; readonly totalWords: number };
  readonly content: { readonly wordDistribution: { readonly median: number } };
  readonly tags: { readonly tagDistribution: Record<string, number> };
}

interface AuditData { readonly orphanedLinks: Record<string, readonly string[]> }
interface SchemaInfo {
  readonly topic: string;
  readonly scopeIn: string;
  readonly scopeOut: string;
}

export interface WikiData {
  readonly notes: readonly NoteManifestEntry[];
  readonly graph: GraphData;
  readonly analytics: AnalyticsData;
  readonly audit: AuditData;
  // searchIndex is null when compile's search-index export failed. Handlers
  // must check and fall back to substring search over the notes manifest.
  readonly searchIndex: SearchIndex | null;
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
  'do', 'does', 'did', 'of', 'for', 'to', 'in', 'on', 'at', 'by',
  'with', 'from', 'as', 'and', 'or', 'but', 'about', 'tell', 'me',
]);

// Shared hit shape so the fallback path can substitute for papyr-core's SearchResult.
interface SearchHit {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly score: number;
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

// Rerank search hits by boosting title and summary matches. FlexSearch's
// default scoring is term-frequency dominated, which biases toward overview
// articles that mention many keywords — not toward articles whose *title*
// or *summary* is specifically about the query. This pass adds a bonus
// for keyword-in-title (strong signal) and keyword-in-summary (medium
// signal) so the LLM-routing path preferentially surfaces the authoritative
// article.
function rerankHits(
  query: string,
  hits: readonly SearchHit[],
  data: WikiData,
): readonly SearchHit[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  if (keywords.length === 0) return hits;

  const notesBySlug = new Map(data.notes.map((n) => [n.slug, n]));

  const rescored = hits.map((hit) => {
    const note = notesBySlug.get(hit.slug);
    const title = (note?.title ?? hit.title).toLowerCase();
    const summary = (note?.summary ?? '').toLowerCase();
    let bonus = 0;
    for (const kw of keywords) {
      if (title.includes(kw)) bonus += 5;
      if (summary.includes(kw)) bonus += 2;
    }
    return { ...hit, score: (hit.score ?? 0) + bonus };
  });

  return [...rescored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function handleQuery(query: string, data: WikiData): string {
  const SUPPORT_PAGES = new Set(['index', 'overview', 'log']);
  // Union FlexSearch + substring search on title/summary/tags, then rerank.
  // FlexSearch catches body-text matches with good tokenization; substring
  // search reliably catches articles whose *title* or *summary* contains the
  // query terms (often the authoritative article on a topic). Together they
  // ensure the routing-critical articles make it into the top-K pool.
  const flexHits = searchWithFallback(query, data, 10);
  const substrHits = substringSearch(query, data, 10);

  const seen = new Set<string>();
  const merged: SearchHit[] = [];
  for (const h of [...flexHits, ...substrHits]) {
    if (!seen.has(h.slug)) {
      seen.add(h.slug);
      merged.push(h);
    }
  }

  // Filter out support pages — they shouldn't appear as answers
  const filtered = merged.filter((h) => !SUPPORT_PAGES.has(h.slug));
  // Rerank for LLM-routing quality (title/summary match dominates body match)
  const hits = rerankHits(query, filtered, data);

  if (hits.length === 0) {
    return `No results found for "${query}" in the ${data.schemaInfo.topic} knowledge base.`;
  }

  const topHits = hits.slice(0, 3);
  const notesBySlug = new Map(data.notes.map((n) => [n.slug, n]));

  // Prefer the one-line summary (token-efficient routing signal) over a
  // body excerpt. Fall back to excerpt if the article has no summary yet.
  const sections = topHits.map((hit) => {
    const note = notesBySlug.get(hit.slug);
    const summary = note?.summary?.trim() ?? '';
    if (summary) {
      return `### ${hit.title} (${hit.slug})\n\n${summary}\n\n_Fetch full article via \`grimoire_get_article(slug: "${hit.slug}")\`, or a specific section via \`grimoire_get_section\`._`;
    }
    // Legacy fallback: article predates the summary field.
    const content = readArticle(data.wikiDir, hit.slug);
    const excerpt = content ? extractExcerpt(content) : hit.excerpt;
    return `### ${hit.title} (${hit.slug})\n\n${excerpt}`;
  });

  return [
    `## Results for: "${query}"`,
    `Knowledge base: ${data.schemaInfo.topic}`,
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
    `## Topics in: ${data.schemaInfo.topic}`,
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

  const effectiveMode: GetArticleMode =
    mode === 'full' ? 'full'
      : mode === 'summary' ? 'summary'
        : content.length > LARGE_ARTICLE_CHARS ? 'summary' : 'full';

  if (effectiveMode === 'full') {
    return content;
  }

  // Summary envelope: let the LLM client decide whether to fetch the full
  // article or a specific section without paying the full-article token cost.
  const note = data.notes.find((n) => n.slug === slug);
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

  return lines.join('\n');
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

  if (gaps.length === 0) {
    return 'No coverage gaps detected.';
  }

  const totalGaps = thinTags.length + thinArticles.length + orphanEntries.length;
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
  const SUPPORT_PAGES = new Set(['index', 'overview', 'log']);
  // Over-fetch so we still have enough results after filtering support pages.
  const rawHits = searchWithFallback(query, data, limit * 2);
  const hits = rawHits.filter((h) => !SUPPORT_PAGES.has(h.slug)).slice(0, limit);

  if (hits.length === 0) {
    return `No results for "${query}".`;
  }

  const lines = hits.map(
    (hit) => `- **${hit.title}** (${hit.slug}) — score: ${hit.score}\n  ${hit.excerpt}`
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
    { name: 'grimoire', version: '0.2.3' },
    {
      instructions: `Grimoire is a curated knowledge base about "${data.schemaInfo.topic}". Routing pattern for efficient retrieval:\n1. Call grimoire_list_topics first to see all articles with summaries\n2. Use grimoire_get_article(slug) for a specific article\n3. Use grimoire_get_section(slug, heading) for just one section (most token-efficient)\nFor questions: grimoire_query. For keyword search: grimoire_search.\nPrefer get_section over get_article when you know which section you need.`,
    },
  );

  server.tool(
    'grimoire_query',
    'Answer a natural-language question by finding the most relevant articles. Returns top-3 matches with summaries and slugs for deeper retrieval. Use this FIRST for factual questions. For keyword search, use grimoire_search instead.',
    { query: z.string().describe('The question to answer') },
    async ({ query }) => ({
      content: [{ type: 'text' as const, text: handleQuery(query, data) }],
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
    'Identify structural weaknesses: tags with only one article, articles below median word count, and topics referenced but not yet written. Use when asking about wiki health or what to write next.',
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
      `serve: loaded ${data.notes.length} articles from "${data.schemaInfo.topic}"\n`,
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

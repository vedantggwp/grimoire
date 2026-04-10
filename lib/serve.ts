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
  readonly tags: readonly string[];
  readonly wordCount: number;
  readonly readingTime: number;
  readonly linksTo: readonly string[];
  readonly headings: readonly { level: number; text: string }[];
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
interface SchemaInfo { readonly topic: string; readonly scope: string }

export interface WikiData {
  readonly notes: readonly NoteManifestEntry[];
  readonly graph: GraphData;
  readonly analytics: AnalyticsData;
  readonly audit: AuditData;
  readonly searchIndex: SearchIndex;
  readonly overviewContent: string;
  readonly schemaInfo: SchemaInfo;
  readonly wikiDir: string;
}

// --- Data loading ---

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

function parseSchemamd(content: string): SchemaInfo {
  const topicMatch = content.match(/topic:\s*"?([^"\n]+)"?/);
  const scopeMatch = content.match(/scope:\s*\n\s*in:\s*"?([^"\n]+)"?/);
  return {
    topic: topicMatch?.[1]?.trim() ?? 'Unknown',
    scope: scopeMatch?.[1]?.trim() ?? 'Unknown',
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
  const searchSerialized = readJsonFile<SerializedSearchIndex & { error?: string }>(join(compileDir, 'search-index.json'));
  if ('error' in searchSerialized && searchSerialized.error) {
    throw new Error(`Search index export failed during compile: ${searchSerialized.error}. Re-run /grimoire:compile.`);
  }
  const searchIndex = importSearchIndex(searchSerialized as SerializedSearchIndex);

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

function searchWithFallback(query: string, data: WikiData, limit: number) {
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
    return merged;
  }

  return [];
}

export function handleQuery(query: string, data: WikiData): string {
  const SUPPORT_PAGES = new Set(['index', 'overview', 'log']);
  const rawHits = searchWithFallback(query, data, 10);
  // Filter out support pages — they shouldn't appear as answers
  const hits = rawHits.filter((h) => !SUPPORT_PAGES.has(h.slug));

  if (hits.length === 0) {
    return `No results found for "${query}" in the ${data.schemaInfo.topic} knowledge base.`;
  }

  const topHits = hits.slice(0, 3);
  const sections = topHits.map((hit) => {
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

  const sorted = Object.entries(tagCounts).sort(
    ([, a], [, b]) => b - a
  );

  const lines = sorted.map(([tag, count]) => `- **${tag}**: ${count} article(s)`);

  return [
    `## Topics in: ${data.schemaInfo.topic}`,
    `Total articles: ${data.notes.length}`,
    `Total tags: ${sorted.length}`,
    '',
    ...lines,
  ].join('\n');
}

export function handleGetArticle(slug: string, data: WikiData): string {
  const content = readArticle(data.wikiDir, slug);
  if (content === null) {
    return `Article not found: "${slug}". Available slugs: ${data.notes.map((n) => n.slug).join(', ')}`;
  }
  return content;
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
  const server = new McpServer({
    name: 'grimoire',
    version: '0.2.1',
  });

  server.tool(
    'grimoire_query',
    'Synthesize an answer about a topic from the wiki\'s curated knowledge base',
    { query: z.string().describe('The question to answer') },
    async ({ query }) => ({
      content: [{ type: 'text' as const, text: handleQuery(query, data) }],
    }),
  );

  server.tool(
    'grimoire_list_topics',
    'List all topics and categories in the knowledge base with article counts',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleListTopics(data) }],
    }),
  );

  server.tool(
    'grimoire_get_article',
    'Retrieve a specific wiki article by slug',
    { slug: z.string().describe('The article slug (e.g. "react-fundamentals")') },
    async ({ slug }) => ({
      content: [{ type: 'text' as const, text: handleGetArticle(slug, data) }],
    }),
  );

  server.tool(
    'grimoire_open_questions',
    'List unresolved questions and areas needing more research',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleOpenQuestions(data) }],
    }),
  );

  server.tool(
    'grimoire_coverage_gaps',
    'Identify topics with thin or missing coverage',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: handleCoverageGaps(data) }],
    }),
  );

  server.tool(
    'grimoire_search',
    'Full-text search across all wiki articles',
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

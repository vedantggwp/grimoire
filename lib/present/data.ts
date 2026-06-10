/**
 * present — Data loader
 *
 * Reads compile artifacts, wiki markdown, and SCHEMA.md
 * to produce a unified SiteData object for mode generators.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseMarkdown } from 'papyr-core';
import slugify from 'slugify';
import { z } from 'zod';
import type {
  SiteData,
  ArticleData,
  GraphData,
  GraphNodeData,
  GraphEdgeData,
  LogEntry,
} from './types.js';
import { SUPPORT_SLUGS, SUPPORT_FILES } from '../support-slugs.js';
import { esc as escapeHtml } from './esc.js';

// --- Helpers ---

function readJSON(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\n*/, '');
}

// Strip the leading <h1>…</h1> from rendered article HTML. Articles keep their
// own `# Title` in markdown so they stand alone outside the site, but the
// rendered page template already emits a single <h1>, so we avoid duplication.
function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, '');
}

// Slugs MUST be derived exactly the way papyr-core derives them for files
// with a path: basename without extension, slugified lower/strict. Compile's
// notes.json is the article manifest; any drift between the two derivations
// makes present silently drop articles (issue #1 — nested taxonomy
// directories rendered 0 articles because present used the relative path).
export function slugLikePapyr(relPath: string): string {
  const filename = relPath.split('/').pop() || relPath;
  const basename = filename.replace(/\.(md|markdown)$/i, '');
  return slugify(basename, { lower: true, strict: true });
}

// Some authors repeat the frontmatter `title:` as an `## Title` first line,
// which renders the title twice in read mode (issue #6). Strip the leading
// <h2> only when it slug-matches the title, so legitimate first sections
// survive.
export function stripDuplicateTitleH2(
  html: string,
  title: string,
): { readonly html: string; readonly stripped: boolean } {
  const match = html.match(/^\s*<h2[^>]*>([\s\S]*?)<\/h2>\s*/);
  if (!match) return { html, stripped: false };

  const headingText = match[1].replace(/<[^>]+>/g, '').trim();
  const matchesTitle =
    headingText.length > 0 &&
    slugify(headingText, { lower: true, strict: true }) ===
      slugify(title, { lower: true, strict: true });

  if (!matchesTitle) return { html, stripped: false };
  return { html: html.slice(match[0].length), stripped: true };
}

function withoutDuplicateTitleHeading(
  headings: readonly { level: number; text: string }[],
  title: string,
): readonly { level: number; text: string }[] {
  const titleSlug = slugify(title, { lower: true, strict: true });
  const idx = headings.findIndex(
    h => h.level === 2 && slugify(h.text, { lower: true, strict: true }) === titleSlug,
  );
  return idx === -1
    ? headings
    : [...headings.slice(0, idx), ...headings.slice(idx + 1)];
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
    .filter(line => line.length > 0)
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

function stripNewClass(attrs: string): string {
  return attrs.replace(/\sclass="([^"]*)"/, (_match, classValue: string) => {
    const classes = classValue
      .split(/\s+/)
      .filter(Boolean)
      .filter(cls => cls !== 'new');

    return classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
  });
}

// Legacy href forms from earlier directory conventions (issue #8). Both are
// rewritten to the in-page `#{slug}` route the site actually serves.
const LEGACY_LINK_PATTERNS: readonly RegExp[] = [
  /<a([^>]*?)href="#\/note\/([^"#]+)(?:#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g,
  /<a([^>]*?)href="\/client-config\/([^"#]+)(?:#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g,
];

const LEGACY_LINK_SURVIVOR = /href="(?:#\/note\/|\/client-config\/)/;

export function resolveWikilinks(html: string, slugToTitle: ReadonlyMap<string, string>): string {
  const rewrite = (
    _match: string,
    beforeHref: string,
    slug: string,
    afterHref: string,
    innerHtml: string,
  ): string => {
    const knownTitle = slugToTitle.get(slug);
    const attrs = knownTitle
      ? stripNewClass(`${beforeHref}href="#${slug}" data-wikilink-slug="${slug}"${afterHref}`)
      : `${beforeHref}href="#${slug}" data-wikilink-slug="${slug}"${afterHref}`;
    const text = innerHtml.trim() === slug && knownTitle ? escapeHtml(knownTitle) : innerHtml;
    return `<a${attrs}>${text}</a>`;
  };

  return LEGACY_LINK_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, rewrite),
    html,
  );
}

export const ArticleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()),
  html: z.string(),
  wordCount: z.number(),
  readingTime: z.number(),
  linksTo: z.array(z.string()),
  headings: z.array(z.object({ level: z.number(), text: z.string() })),
  confidence: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string() })),
});

export function validateArticleData(article: unknown, slug: string): ArticleData | null {
  const parsed = ArticleSchema.safeParse(article);
  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map(issue => `${issue.path.join('.') || 'article'} ${issue.message}`)
    .join('; ');
  console.warn(`[present] Skipping article ${slug}: ${issues}`);
  return null;
}

function parseLogEntries(logMd: string): readonly LogEntry[] {
  const entries: LogEntry[] = [];
  const regex = /^## (\d{4}-\d{2}-\d{2}) — (.+)$/gm;
  let match = regex.exec(logMd);

  while (match !== null) {
    const date = match[1];
    const action = match[2];
    const startIdx = match.index + match[0].length;

    // Find next heading or end of string
    const nextHeading = logMd.indexOf('\n## ', startIdx);
    const sectionEnd = nextHeading === -1 ? logMd.length : nextHeading;
    const section = logMd.slice(startIdx, sectionEnd);

    const details = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- '))
      .map(l => l.slice(2));

    entries.push({ date, action, details });
    match = regex.exec(logMd);
  }

  return entries;
}

// Parse the nested YAML domain block from SCHEMA.md.
// Canonical shape (enforced by the init template):
//   topic: "..."
//   scope:
//     in: "..."
//     out: "..."
//   audience: "..."
// Older workspaces may still have fenced domain blocks or legacy flat scope
// text; we tolerate those while enforcing required topic/audience fields.
export function parseSchema(content: string): SiteData['schema'] {
  const domainBlock = extractDomainBlock(content);
  const topic = extractFieldBlock(domainBlock, 'topic');
  const audience = extractFieldBlock(domainBlock, 'audience');
  const scopeBlock = extractFieldBlock(domainBlock, 'scope');

  if (!topic) {
    throw new Error('SCHEMA.md is missing required field: topic');
  }

  if (!audience) {
    throw new Error('SCHEMA.md is missing required field: audience');
  }

  return {
    topic,
    scope: {
      in: extractScopeValue(scopeBlock, 'in'),
      out: extractScopeValue(scopeBlock, 'out'),
    },
    audience,
  };
}

// --- File discovery (supports taxonomy subdirectories) ---

function collectMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...collectMdFiles(join(dir, entry.name), baseDir));
    } else if (entry.name.endsWith('.md') && !SUPPORT_FILES.has(entry.name)) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

// --- Main loader ---

export async function loadSiteData(workspacePath: string): Promise<SiteData> {
  const wikiDir = join(workspacePath, 'wiki');
  const compileDir = join(wikiDir, '.compile');

  // Load compile artifacts — notes.json is the canonical article manifest,
  // including the frontmatter fields (summary, confidence, sources) that
  // compile.ts extracts directly from each markdown file.
  const notesManifest = readJSON(join(compileDir, 'notes.json')) as Array<{
    slug: string;
    title: string;
    summary: string;
    tags: string[];
    wordCount: number;
    readingTime: number;
    linksTo: string[];
    headings: Array<{ level: number; text: string }>;
    confidence: string;
    sources: Array<{ url: string; title: string }>;
  }>;

  const graphRaw = readJSON(join(compileDir, 'graph.json')) as {
    nodes: Record<string, {
      id: string;
      label: string;
      linkCount: number;
      backlinkCount: number;
      forwardLinkCount: number;
    }>;
    edges: Array<{ source: string; target: string }>;
  };

  const analytics = readJSON(join(compileDir, 'analytics.json'));

  // Load log
  let logEntries: readonly LogEntry[] = [];
  try {
    const logMd = readFileSync(join(wikiDir, 'log.md'), 'utf-8');
    logEntries = parseLogEntries(logMd);
  } catch { /* no log file */ }

  // Load SCHEMA.md
  let schema: SiteData['schema'] = {
    topic: 'Untitled',
    scope: { in: '', out: '' },
    audience: 'general',
  };
  try {
    const schemaMd = readFileSync(join(workspacePath, 'SCHEMA.md'), 'utf-8');
    schema = parseSchema(schemaMd);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  // Build articles by reading wiki/**/*.md (supports subdirectories for
  // taxonomy). Sorted for deterministic builds regardless of readdir order.
  const mdFiles = [...collectMdFiles(wikiDir, wikiDir)].sort();
  const slugToTitle = new Map(notesManifest.map(note => [note.slug, note.title]));

  const articles: ArticleData[] = [];
  const slugToFile = new Map<string, string>();

  for (const filePath of mdFiles) {
    const raw = readFileSync(filePath, 'utf-8');
    const rel = relative(wikiDir, filePath);
    const slug = slugLikePapyr(rel);

    // Two files with the same basename collide on slug inside papyr-core
    // (issue #1, secondary). Keep the first, warn loudly about the rest.
    const collidingFile = slugToFile.get(slug);
    if (collidingFile) {
      console.warn(
        `[present] Slug collision: "${rel}" and "${collidingFile}" both map to "${slug}" — rename one file; skipping "${rel}"`,
      );
      continue;
    }

    const manifest = notesManifest.find(n => n.slug === slug);
    if (!manifest) continue;
    slugToFile.set(slug, rel);

    const parentDir = dirname(rel);
    const category = parentDir === '.' ? undefined : parentDir;

    const parsed = await parseMarkdown(stripFrontmatter(raw), { path: rel });
    const resolvedHtml = resolveWikilinks(parsed.html, slugToTitle);
    const { html: dedupedHtml, stripped } = stripDuplicateTitleH2(
      stripLeadingH1(resolvedHtml),
      manifest.title,
    );

    const article = validateArticleData({
      slug,
      title: manifest.title,
      summary: manifest.summary ?? '',
      tags: manifest.tags,
      html: dedupedHtml,
      wordCount: manifest.wordCount,
      readingTime: manifest.readingTime,
      linksTo: manifest.linksTo,
      headings: stripped
        ? withoutDuplicateTitleHeading(manifest.headings, manifest.title)
        : manifest.headings,
      confidence: manifest.confidence ?? '',
      sources: manifest.sources ?? [],
      ...(category ? { category } : {}),
    }, slug);

    if (!article) continue;
    articles.push(article);
  }

  const knownSlugs = new Set(articles.map(article => article.slug));
  for (const article of articles) {
    for (const target of article.linksTo) {
      if (!knownSlugs.has(target)) {
        console.warn(`[present] Dangling link: ${article.slug} -> ${target} (target not in article set)`);
      }
    }
    if (LEGACY_LINK_SURVIVOR.test(article.html)) {
      console.warn(
        `[present] Legacy link form survived in "${article.slug}" — check the source markdown for /client-config/ or #/note/ hrefs`,
      );
    }
  }

  // Build graph data — exclude support pages from both nodes and edges
  // so graph mode, density stats, and centrality reflect content only.
  const graphNodes: GraphNodeData[] = Object.values(graphRaw.nodes)
    .filter(n => !SUPPORT_SLUGS.has(n.id))
    .map(n => {
      const manifest = notesManifest.find(m => m.slug === n.id);
      return {
        id: n.id,
        label: n.label,
        linkCount: n.linkCount,
        backlinkCount: n.backlinkCount,
        forwardLinkCount: n.forwardLinkCount,
        tags: manifest?.tags ?? [],
        wordCount: manifest?.wordCount ?? 0,
      };
    });

  const graphEdges: GraphEdgeData[] = graphRaw.edges
    .filter(e => !SUPPORT_SLUGS.has(e.source) && !SUPPORT_SLUGS.has(e.target))
    .map(e => ({
      source: e.source,
      target: e.target,
    }));

  const graphData: GraphData = { nodes: graphNodes, edges: graphEdges };

  return { articles, graphData, analytics, logEntries, schema };
}

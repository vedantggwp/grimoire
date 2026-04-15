/**
 * present — Data loader
 *
 * Reads compile artifacts, wiki markdown, and SCHEMA.md
 * to produce a unified SiteData object for mode generators.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseMarkdown } from 'papyr-core';
import type {
  SiteData,
  ArticleData,
  GraphData,
  GraphNodeData,
  GraphEdgeData,
  LogEntry,
} from './types.js';

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
// The regexes are intentionally anchored (^, multiline) and bound the captures
// to the same line so they don't accidentally straddle fields.
function parseSchema(content: string): SiteData['schema'] {
  const topicMatch = content.match(/^topic:\s*"?([^"\n]+?)"?\s*$/m);
  const audienceMatch = content.match(/^audience:\s*"?([^"\n]+?)"?\s*$/m);
  const scopeInMatch = content.match(/^scope:\s*\r?\n\s+in:\s*"?([^"\n]+?)"?\s*$/m);
  const scopeOutMatch = content.match(/^\s+out:\s*"?([^"\n]+?)"?\s*$/m);

  return {
    topic: topicMatch?.[1]?.trim() ?? 'Untitled',
    scope: {
      in: scopeInMatch?.[1]?.trim() ?? '',
      out: scopeOutMatch?.[1]?.trim() ?? '',
    },
    audience: audienceMatch?.[1]?.trim() ?? 'general',
  };
}

// --- File discovery (supports taxonomy subdirectories) ---

const SKIP_FILES = new Set(['log.md', 'index.md', 'overview.md']);

// Slugs that compile emits as graph nodes but are not content articles.
// Must mirror SKIP_FILES minus the `.md` — shared loader + graph filter.
const SUPPORT_SLUGS = new Set(['log', 'index', 'overview']);

function collectMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...collectMdFiles(join(dir, entry.name), baseDir));
    } else if (entry.name.endsWith('.md') && !SKIP_FILES.has(entry.name)) {
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
  } catch { /* no schema */ }

  // Build articles by reading wiki/**/*.md (supports subdirectories for taxonomy)
  const mdFiles = collectMdFiles(wikiDir, wikiDir);

  const articles: ArticleData[] = [];

  for (const filePath of mdFiles) {
    const raw = readFileSync(filePath, 'utf-8');
    const rel = relative(wikiDir, filePath);
    const slug = rel.replace(/\.md$/, '');

    const manifest = notesManifest.find(n => n.slug === slug);
    if (!manifest) continue;

    const parsed = await parseMarkdown(stripFrontmatter(raw), { path: rel });

    articles.push({
      slug,
      title: manifest.title,
      summary: manifest.summary ?? '',
      tags: manifest.tags,
      html: stripLeadingH1(parsed.html),
      wordCount: manifest.wordCount,
      readingTime: manifest.readingTime,
      linksTo: manifest.linksTo,
      headings: manifest.headings,
      confidence: manifest.confidence ?? '',
      sources: manifest.sources ?? [],
    });
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

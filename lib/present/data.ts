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

function parseSchema(content: string): SiteData['schema'] {
  const topicMatch = content.match(/topic:\s*"?([^"\n]+)"?/);
  const audienceMatch = content.match(/audience:\s*"?([^"\n]+)"?/);

  const scopeInMatch = content.match(/in:\s*"?([^"\n]+)"?/);
  const scopeOutMatch = content.match(/out:\s*"?([^"\n]+)"?/);

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

  // Load compile artifacts
  const notesManifest = readJSON(join(compileDir, 'notes.json')) as Array<{
    slug: string;
    title: string;
    tags: string[];
    wordCount: number;
    readingTime: number;
    linksTo: string[];
    headings: Array<{ level: number; text: string }>;
  }>;

  const graphRaw = readJSON(join(compileDir, 'graph.json')) as {
    nodes: Record<string, {
      id: string;
      label: string;
      metadata: Record<string, unknown>;
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
  let schema: SiteData['schema'] = { topic: 'Untitled', scope: {}, audience: 'general' };
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
    const graphNode = graphRaw.nodes[slug];
    const metadata = graphNode?.metadata ?? {};

    articles.push({
      slug,
      title: manifest.title,
      tags: manifest.tags,
      html: parsed.html,
      wordCount: manifest.wordCount,
      readingTime: manifest.readingTime,
      linksTo: manifest.linksTo,
      headings: manifest.headings,
      confidence: String(metadata.confidence ?? ''),
      sources: Array.isArray(metadata.sources)
        ? (metadata.sources as Array<{ url: string; title: string }>)
        : [],
    });
  }

  // Build graph data
  const graphNodes: GraphNodeData[] = Object.values(graphRaw.nodes).map(n => {
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

  const graphEdges: GraphEdgeData[] = graphRaw.edges.map(e => ({
    source: e.source,
    target: e.target,
  }));

  const graphData: GraphData = { nodes: graphNodes, edges: graphEdges };

  return { articles, graphData, analytics, logEntries, schema };
}

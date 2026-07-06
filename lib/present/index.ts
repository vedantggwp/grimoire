/**
 * present — CLI entry point
 *
 * Generates a complete static site from compiled wiki data.
 * Usage: node dist/present.js <workspace-path>
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

import { parseDesignConfig } from './config.js';
import { generateCSS } from './css/index.js';
import { loadSiteData } from './data.js';
import { esc, jsonForScript } from './esc.js';
import { computeHubStats, hubLeadText, recommendedMode, shortTopic } from './hub.js';
import { hubShell } from './html.js';
import { generateReadMode, sortByCentrality } from './modes/read.js';
import { generateArticlePage } from './modes/read-article.js';
import { computeForceLayout } from './layout.js';
import { constellationScript } from './js/constellation.js';
import { countUpScript, tiltScript } from './js/runtime.js';
import { generateGraphMode } from './modes/graph.js';
import { generateSearchMode } from './modes/search.js';
import { generateFeedMode } from './modes/feed.js';
import { generateGapsMode } from './modes/gaps.js';
import { generateQuizMode } from './modes/quiz.js';
import type { SiteData, DesignConfig } from './types.js';

// --- Hub page ---

const MODE_CARDS = [
  { id: 'read', title: 'Read', icon: '📖', desc: 'Articles sorted by graph centrality. Start here for a deep, linear study of the core concepts.', when: 'Deep study of key topics' },
  { id: 'graph', title: 'Graph', icon: '🕸', desc: 'Force-directed knowledge map showing how articles connect.', when: 'Explore connections' },
  { id: 'search', title: 'Search', icon: '🔍', desc: 'Full-text search across all articles and tags.', when: 'Find a concept fast' },
  { id: 'feed', title: 'Feed', icon: '📋', desc: 'Chronological changelog of all activity.', when: 'See what changed' },
  { id: 'gaps', title: 'Gaps', icon: '🔬', desc: 'Coverage gap analysis by topic area.', when: 'Find thin spots' },
  { id: 'quiz', title: 'Quiz', icon: '🧠', desc: 'Flashcard-style study quiz.', when: 'Test understanding' },
] as const;

function generateHub(data: SiteData, config: DesignConfig): string {
  // Issue #9 — hub cards mirror the enabled-modes config; the recommended
  // badge can only land on a mode that actually exists.
  const modes = MODE_CARDS.filter(m => config.modes.includes(m.id));

  const stats = computeHubStats(data);
  const naturalPick = recommendedMode(data);
  const recommended = config.modes.includes(naturalPick as (typeof config.modes)[number])
    ? naturalPick
    : 'read';

  // Top articles by centrality score for the featured-card preview list.
  const topArticles = [...data.articles]
    .map(a => ({
      article: a,
      score: a.linksTo.length + data.articles.filter(x => x.linksTo.includes(a.slug)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.article);

  const cards = modes.map((m, i) => {
    const isFeatured = m.id === recommended;
    const featuredClass = isFeatured ? ' featured' : '';
    const badge = isFeatured ? `\n      <div class="badge">Recommended</div>` : '';
    const preview = isFeatured && topArticles.length > 0
      ? `\n      <ul class="bento-preview">${topArticles
          .map(a => `<li><span class="bento-preview__num">${topArticles.indexOf(a) + 1}</span>${esc(a.title)}</li>`)
          .join('')}</ul>`
      : '';
    return `<a href="${m.id}/index.html" class="bento-card${featuredClass} reveal" style="--reveal-i: ${i}">${badge}
      <span class="icon">${m.icon}</span>
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.desc)}</p>${preview}
      <div class="when">Best for: ${esc(m.when)}</div>
    </a>`;
  }).join('\n    ');

  const statItems = [
    { label: 'articles', value: String(stats.articleCount) },
    { label: 'sources', value: String(stats.sourceCount) },
    {
      label: 'source warnings',
      value: String(stats.sourceWarnings),
      title: 'Articles compiled from partial or failed raw captures.',
    },
    { label: 'tags', value: String(stats.tagCount) },
    { label: 'cross-refs', value: String(stats.crossRefs) },
    {
      label: 'graph density',
      value: stats.density === null ? 'N/A' : `${stats.density}%`,
      title: stats.density === null
        ? 'Density is not meaningful for small corpora (< 10 articles).'
        : '',
    },
  ].map(s => {
    // Pure counts tick up on first view; non-numeric values render plain.
    const numeric = s.value.match(/^(\d+)(%?)$/);
    const strong = numeric
      ? `<strong data-count="${numeric[1]}"${numeric[2] ? ' data-count-suffix="%"' : ''}>${esc(s.value)}</strong>`
      : `<strong>${esc(s.value)}</strong>`;
    return `<div class="hub-stat"${s.title ? ` title="${esc(s.title)}"` : ''}>${strong}${esc(s.label)}</div>`;
  }).join('\n      ');

  const displayName = shortTopic(data.schema.topic);

  // The hero constellation is the wiki's real graph: positions computed at
  // build time (deterministic), drawn as ambient canvas texture at runtime.
  const layoutNodes = computeForceLayout(
    data.graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      weight: n.linkCount + n.backlinkCount + n.wordCount / 2000,
    })),
    data.graphData.edges,
  );
  const hubGraph = jsonForScript({
    nodes: layoutNodes.map(n => ({
      id: n.id,
      label: n.label,
      x: Number(n.x.toFixed(4)),
      y: Number(n.y.toFixed(4)),
      r: Number(n.r.toFixed(4)),
    })),
    edges: data.graphData.edges.map(e => ({ source: e.source, target: e.target })),
  });

  const body = `
<div class="hub-hero">
    <canvas id="constellation" class="hub-hero-canvas" aria-hidden="true"></canvas>
    <div class="hub-hero-content">
    <h1 class="hub-title">${esc(displayName)}</h1>
    <p class="hub-lead">${esc(hubLeadText(data.schema.topic, data.schema.audience))}</p>
    <div class="hub-stats">
      ${statItems}
    </div>
    </div>
  </div>
  <div class="bento">
    ${cards}
  </div>
<script>window.HUB_GRAPH = ${hubGraph};</script>
${constellationScript()}
${countUpScript()}
${tiltScript('.bento-card')}`;

  return hubShell(displayName, body, config, data);
}

// --- File writer ---

interface WrittenFile {
  readonly path: string;
  readonly size: number;
}

function writeFile(filepath: string, content: string): WrittenFile {
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, content, 'utf-8');
  const size = statSync(filepath).size;
  return { path: filepath, size };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Main ---

async function main(): Promise<void> {
  const workspacePath = process.argv[2];
  if (!workspacePath) {
    console.error('Usage: node dist/present.js <workspace-path>');
    process.exit(1);
  }

  const resolved = resolve(workspacePath);

  // Validate
  if (!existsSync(join(resolved, 'SCHEMA.md'))) {
    console.error(`Error: SCHEMA.md not found in ${resolved}`);
    process.exit(1);
  }

  if (!existsSync(join(resolved, 'wiki', '.compile'))) {
    console.error(`Error: wiki/.compile/ not found in ${resolved}. Run the compile step first.`);
    process.exit(1);
  }

  // Parse config
  const configPath = join(resolved, '_config', 'design.md');
  const config = parseDesignConfig(configPath);

  // Load data
  const data = await loadSiteData(resolved);

  // Generate — site/ is fully derived; clear it so deleted articles and
  // disabled modes don't leave stale pages behind.
  const siteDir = join(resolved, 'site');
  rmSync(siteDir, { recursive: true, force: true });
  const files: WrittenFile[] = [];

  // CSS
  files.push(writeFile(join(siteDir, 'assets', 'style.css'), generateCSS(config)));

  // Hub
  files.push(writeFile(join(siteDir, 'index.html'), generateHub(data, config)));

  // Modes — only the ones enabled in the design config (issue #9)
  const generators: Record<string, (d: SiteData, c: DesignConfig) => string> = {
    read: generateReadMode,
    graph: generateGraphMode,
    search: generateSearchMode,
    feed: generateFeedMode,
    gaps: generateGapsMode,
    quiz: generateQuizMode,
  };
  for (const mode of config.modes) {
    const generate = generators[mode];
    if (!generate) continue;
    files.push(writeFile(join(siteDir, mode, 'index.html'), generate(data, config)));
  }

  // Per-article pages (issue #2) — stable, deep-linkable routes under read/
  for (const article of sortByCentrality(data.articles)) {
    files.push(writeFile(
      join(siteDir, 'read', article.slug, 'index.html'),
      generateArticlePage(article, data, config),
    ));
  }

  // Summary
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.error(`\nGenerated ${files.length} files (${formatBytes(totalSize)}) to ${siteDir}\n`);
  for (const f of files) {
    const rel = f.path.replace(siteDir + '/', '');
    console.error(`  ${rel} (${formatBytes(f.size)})`);
  }
}

main().catch(err => {
  console.error('Present failed:', err);
  process.exit(1);
});

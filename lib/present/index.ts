/**
 * present — CLI entry point
 *
 * Generates a complete static site from compiled wiki data.
 * Usage: node dist/present.js <workspace-path>
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

import { parseDesignConfig } from './config.js';
import { generateCSS } from './css.js';
import { loadSiteData } from './data.js';
import { computeHubStats, hubLeadText, recommendedMode } from './hub.js';
import { hubShell } from './html.js';
import { generateReadMode } from './modes/read.js';
import { generateGraphMode } from './modes/graph.js';
import { generateSearchMode } from './modes/search.js';
import { generateFeedMode } from './modes/feed.js';
import { generateGapsMode } from './modes/gaps.js';
import { generateQuizMode } from './modes/quiz.js';
import type { SiteData, DesignConfig } from './types.js';

// --- Hub page ---

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHub(data: SiteData, config: DesignConfig): string {
  const modes = [
    { id: 'read', title: 'Read', icon: '📖', desc: 'Articles sorted by graph centrality. Start here for a deep, linear study of the core concepts.', when: 'Deep study of key topics' },
    { id: 'graph', title: 'Graph', icon: '🕸', desc: 'Force-directed knowledge map showing how articles connect.', when: 'Explore connections' },
    { id: 'search', title: 'Search', icon: '🔍', desc: 'Full-text search across all articles and tags.', when: 'Find a concept fast' },
    { id: 'feed', title: 'Feed', icon: '📋', desc: 'Chronological changelog of all activity.', when: 'See what changed' },
    { id: 'gaps', title: 'Gaps', icon: '🔬', desc: 'Coverage gap analysis by topic area.', when: 'Find thin spots' },
    { id: 'quiz', title: 'Quiz', icon: '🧠', desc: 'Flashcard-style study quiz.', when: 'Test understanding' },
  ];

  const stats = computeHubStats(data);
  const recommended = recommendedMode(data);

  // Top articles by centrality score for the featured-card preview list.
  const topArticles = [...data.articles]
    .map(a => ({
      article: a,
      score: a.linksTo.length + data.articles.filter(x => x.linksTo.includes(a.slug)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.article);

  const cards = modes.map(m => {
    const isFeatured = m.id === recommended;
    const featuredClass = isFeatured ? ' featured' : '';
    const badge = isFeatured ? `\n      <div class="badge">Recommended</div>` : '';
    const preview = isFeatured && topArticles.length > 0
      ? `\n      <ul class="bento-preview">${topArticles
          .map(a => `<li><span class="bento-preview__num">${topArticles.indexOf(a) + 1}</span>${esc(a.title)}</li>`)
          .join('')}</ul>`
      : '';
    return `<a href="${m.id}/index.html" class="bento-card${featuredClass}">${badge}
      <span class="icon">${m.icon}</span>
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.desc)}</p>${preview}
      <div class="when">Best for: ${esc(m.when)}</div>
    </a>`;
  }).join('\n    ');

  const statItems = [
    { label: 'articles', value: String(stats.articleCount) },
    { label: 'sources', value: String(stats.sourceCount) },
    { label: 'tags', value: String(stats.tagCount) },
    { label: 'cross-refs', value: String(stats.crossRefs) },
    {
      label: 'graph density',
      value: stats.density === null ? 'N/A' : `${stats.density}%`,
      title: stats.density === null
        ? 'Density is not meaningful for small corpora (< 10 articles).'
        : '',
    },
  ].map(s =>
    `<div class="hub-stat"${s.title ? ` title="${esc(s.title)}"` : ''}><strong>${esc(s.value)}</strong>${esc(s.label)}</div>`
  ).join('\n      ');

  // Hub leads with the subtitle, not a duplicate of the topic name.
  // The topic name already lives in the nav brand, so we skip the H1 here
  // and let the "in-scope" line act as the orientation text for the page.
  const body = `
<div class="hub-hero">
    <p class="hub-lead">${esc(hubLeadText(data.schema.scope.in))}</p>
    <div class="hub-stats">
      ${statItems}
    </div>
  </div>
  <div class="bento">
    ${cards}
  </div>`;

  return hubShell(data.schema.topic, body, config, data);
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

  // Generate
  const siteDir = join(resolved, 'site');
  const files: WrittenFile[] = [];

  // CSS
  files.push(writeFile(join(siteDir, 'assets', 'style.css'), generateCSS(config)));

  // Hub
  files.push(writeFile(join(siteDir, 'index.html'), generateHub(data, config)));

  // Modes
  files.push(writeFile(join(siteDir, 'read', 'index.html'), generateReadMode(data, config)));
  files.push(writeFile(join(siteDir, 'graph', 'index.html'), generateGraphMode(data, config)));
  files.push(writeFile(join(siteDir, 'search', 'index.html'), generateSearchMode(data, config)));
  files.push(writeFile(join(siteDir, 'feed', 'index.html'), generateFeedMode(data, config)));
  files.push(writeFile(join(siteDir, 'gaps', 'index.html'), generateGapsMode(data, config)));
  files.push(writeFile(join(siteDir, 'quiz', 'index.html'), generateQuizMode(data, config)));

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

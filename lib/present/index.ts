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
    { id: 'read', title: 'Read', desc: 'Linear reading view sorted by centrality' },
    { id: 'graph', title: 'Graph', desc: 'Force-directed knowledge graph' },
    { id: 'search', title: 'Search', desc: 'Full-text search across all articles' },
    { id: 'feed', title: 'Feed', desc: 'Chronological changelog timeline' },
    { id: 'gaps', title: 'Gaps', desc: 'Coverage gap analysis by tag' },
    { id: 'quiz', title: 'Quiz', desc: 'Flashcard quiz from article sections' },
  ];

  const cards = modes.map(m =>
    `<a href="${m.id}/" class="card" style="text-decoration:none;color:inherit">
      <h2 style="font-size:var(--text-lg);margin-bottom:var(--space-2)">${esc(m.title)}</h2>
      <p style="color:var(--color-muted);font-size:var(--text-sm)">${esc(m.desc)}</p>
    </a>`
  ).join('\n    ');

  const body = `
<div style="padding:var(--space-8) 0">
  <div class="content-column" style="text-align:center;margin-bottom:var(--space-8)">
    <h1 style="margin-bottom:var(--space-2)">${esc(data.schema.topic)}</h1>
    <p style="color:var(--color-muted)">${data.articles.length} articles &middot; ${esc(String(data.schema.audience))} level</p>
  </div>
  <div class="grid grid--3">
    ${cards}
  </div>
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

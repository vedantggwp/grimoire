import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadSiteData,
  resolveWikilinks,
  slugLikePapyr,
  stripDuplicateTitleH2,
  validateArticleData,
} from '../lib/present/data.js';

const NESTED_WORKSPACE = join(__dirname, 'fixtures/nested-wiki');
const NESTED_COMPILE_DIR = join(NESTED_WORKSPACE, 'wiki', '.compile');
const COMPILE_SCRIPT = join(__dirname, '../lib/compile.ts');
const TSX_RUNNER = 'node --import tsx/esm';

describe('present data validation', () => {
  it('skips invalid articles with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = validateArticleData({
      slug: 'missing-title',
      title: '',
      summary: '',
      tags: [],
      html: '<p>Body</p>',
      wordCount: 100,
      readingTime: 1,
      linksTo: [],
      headings: [],
      confidence: 'P1',
      sources: [],
    }, 'missing-title');

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[present] Skipping article missing-title:'),
    );

    warn.mockRestore();
  });
});

describe('slug derivation matches papyr-core (issue #1)', () => {
  it('derives the slug from the basename, not the relative path', () => {
    expect(slugLikePapyr('standards/quality.md')).toBe('quality');
    expect(slugLikePapyr('quality.md')).toBe('quality');
    expect(slugLikePapyr('deep/nested/dir/some-article.md')).toBe('some-article');
  });

  it('slugifies the basename lower/strict like papyr-core', () => {
    expect(slugLikePapyr('Composition Patterns.md')).toBe('composition-patterns');
    expect(slugLikePapyr('guides/API Design (v2).md')).toBe('api-design-v2');
    expect(slugLikePapyr('notes.markdown')).toBe('notes');
  });
});

describe('duplicate title h2 stripping (issue #6)', () => {
  it('strips a leading h2 that matches the title', () => {
    const html = '<h2>Quality Standards</h2>\n<p>Body text.</p>';
    const result = stripDuplicateTitleH2(html, 'Quality Standards');
    expect(result.stripped).toBe(true);
    expect(result.html).toBe('<p>Body text.</p>');
  });

  it('matches by slug, tolerating case and punctuation differences', () => {
    const html = '<h2 id="x">quality standards</h2><p>Body.</p>';
    const result = stripDuplicateTitleH2(html, 'Quality Standards');
    expect(result.stripped).toBe(true);
  });

  it('keeps a leading h2 that is a real section heading', () => {
    const html = '<h2>Overview</h2>\n<p>Body text.</p>';
    const result = stripDuplicateTitleH2(html, 'Quality Standards');
    expect(result.stripped).toBe(false);
    expect(result.html).toBe(html);
  });

  it('does nothing when content does not start with an h2', () => {
    const html = '<p>Intro.</p><h2>Quality Standards</h2>';
    const result = stripDuplicateTitleH2(html, 'Quality Standards');
    expect(result.stripped).toBe(false);
    expect(result.html).toBe(html);
  });
});

describe('legacy link rewriting (issue #8)', () => {
  const titles = new Map([['build-log', 'Build Log']]);

  it('rewrites /client-config/{slug} hrefs to in-page anchors', () => {
    const html = '<a href="/client-config/build-log">Build Log</a>';
    const result = resolveWikilinks(html, titles);
    expect(result).toContain('href="#build-log"');
    expect(result).toContain('data-wikilink-slug="build-log"');
    expect(result).not.toContain('/client-config/');
  });

  it('still rewrites papyr #/note/{slug} hrefs', () => {
    const html = '<a href="#/note/build-log">build-log</a>';
    const result = resolveWikilinks(html, titles);
    expect(result).toContain('href="#build-log"');
    expect(result).toContain('>Build Log</a>');
  });

  it('leaves ordinary external links untouched', () => {
    const html = '<a href="https://example.com/client-config/build-log">x</a>';
    expect(resolveWikilinks(html, titles)).toBe(html);
  });
});

describe('nested taxonomy directories (issue #1 integration)', () => {
  beforeAll(() => {
    if (existsSync(NESTED_COMPILE_DIR)) {
      rmSync(NESTED_COMPILE_DIR, { recursive: true });
    }
    execSync(`${TSX_RUNNER} ${COMPILE_SCRIPT} ${NESTED_WORKSPACE}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    if (existsSync(NESTED_COMPILE_DIR)) {
      rmSync(NESTED_COMPILE_DIR, { recursive: true });
    }
  });

  it('loads every article, including those in taxonomy subdirectories', async () => {
    const data = await loadSiteData(NESTED_WORKSPACE);
    const slugs = data.articles.map(a => a.slug).sort();
    expect(slugs).toEqual(['getting-started', 'quality']);
  });

  it('records the taxonomy directory as the article category', async () => {
    const data = await loadSiteData(NESTED_WORKSPACE);
    const nested = data.articles.find(a => a.slug === 'quality');
    const flat = data.articles.find(a => a.slug === 'getting-started');
    expect(nested?.category).toBe('standards');
    expect(flat?.category).toBeUndefined();
  });

  it('strips the duplicated title h2 from the nested article body', async () => {
    const data = await loadSiteData(NESTED_WORKSPACE);
    const nested = data.articles.find(a => a.slug === 'quality');
    expect(nested).toBeDefined();
    expect(nested!.html).not.toContain('<h2>Quality Standards</h2>');
    expect(nested!.html).toContain('Review Gates');
    // The level-1 entry is the title itself and stays; only the duplicated
    // level-2 heading is dropped so the TOC matches the rendered body.
    expect(
      nested!.headings.filter(h => h.level === 2 && h.text === 'Quality Standards'),
    ).toHaveLength(0);
    expect(
      nested!.headings.filter(h => h.level === 2).map(h => h.text),
    ).toEqual(['Review Gates']);
  });

  it('rewrites legacy /client-config/ links during load', async () => {
    const data = await loadSiteData(NESTED_WORKSPACE);
    const flat = data.articles.find(a => a.slug === 'getting-started');
    expect(flat).toBeDefined();
    expect(flat!.html).not.toContain('/client-config/');
    expect(flat!.html).toContain('href="#build-log"');
  });
});

describe('slug collisions across taxonomy directories', () => {
  let workspace: string;

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'grimoire-collision-'));
    const wikiDir = join(workspace, 'wiki');
    const compileDir = join(wikiDir, '.compile');
    mkdirSync(join(wikiDir, 'build-guides'), { recursive: true });
    mkdirSync(join(wikiDir, 'checklists'), { recursive: true });
    mkdirSync(compileDir, { recursive: true });

    writeFileSync(join(workspace, 'SCHEMA.md'), [
      '# Schema',
      '',
      'topic: "Collision Test"',
      'scope:',
      '  in: "x"',
      '  out: "y"',
      'audience: "general"',
    ].join('\n'));

    const article = (title: string) => [
      '---',
      `title: "${title}"`,
      'summary: "s"',
      'tags: [t]',
      'confidence: P1',
      '---',
      '',
      `# ${title}`,
      '',
      '## Overview',
      '',
      'Body.',
    ].join('\n');

    writeFileSync(join(wikiDir, 'build-guides', 'peer-review.md'), article('Peer Review'));
    writeFileSync(join(wikiDir, 'checklists', 'peer-review.md'), article('Peer Review'));

    writeFileSync(join(compileDir, 'notes.json'), JSON.stringify([{
      slug: 'peer-review',
      title: 'Peer Review',
      summary: 's',
      tags: ['t'],
      wordCount: 10,
      readingTime: 1,
      linksTo: [],
      headings: [{ level: 2, text: 'Overview' }],
      confidence: 'P1',
      sources: [],
    }]));
    writeFileSync(join(compileDir, 'graph.json'), JSON.stringify({ nodes: {}, edges: [] }));
    writeFileSync(join(compileDir, 'analytics.json'), JSON.stringify({}));
  });

  afterAll(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('keeps the first file, skips the collider, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = await loadSiteData(workspace);

    expect(data.articles).toHaveLength(1);
    expect(data.articles[0].slug).toBe('peer-review');
    expect(data.articles[0].category).toBe('build-guides');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Slug collision'));

    warn.mockRestore();
  });
});

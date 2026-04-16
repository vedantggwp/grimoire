import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE = join(__dirname, 'fixtures/sample-wiki');
const SITE_DIR = join(WORKSPACE, 'site');
const WIKI_DIR = join(WORKSPACE, 'wiki');
const COMPILE_DIR = join(WIKI_DIR, '.compile');
const PRESENT_SCRIPT = join(__dirname, '../lib/present/index.ts');
const COMPILE_SCRIPT = join(__dirname, '../lib/compile.ts');
const TSX_RUNNER = 'node --import tsx/esm';

function readSiteFile(relativePath: string): string {
  return readFileSync(join(SITE_DIR, relativePath), 'utf-8');
}

describe('present', () => {
  beforeAll(() => {
    // Always rebuild compile artifacts (other tests may have cleaned them)
    execSync(`${TSX_RUNNER} ${COMPILE_SCRIPT} ${WIKI_DIR}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });

    // Clean previous site output
    if (existsSync(SITE_DIR)) {
      rmSync(SITE_DIR, { recursive: true });
    }

    // Run the present script
    execSync(`${TSX_RUNNER} ${PRESENT_SCRIPT} ${WORKSPACE}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    if (existsSync(SITE_DIR)) {
      rmSync(SITE_DIR, { recursive: true });
    }
  });

  describe('output files', () => {
    it('creates all expected files', () => {
      const expected = [
        'index.html',
        'assets/style.css',
        'read/index.html',
        'graph/index.html',
        'search/index.html',
        'feed/index.html',
        'gaps/index.html',
        'quiz/index.html',
      ];
      for (const file of expected) {
        expect(existsSync(join(SITE_DIR, file)), `Missing: ${file}`).toBe(true);
      }
    });
  });

  describe('HTML validity', () => {
    it('all HTML files start with DOCTYPE', () => {
      const htmlFiles = [
        'index.html',
        'read/index.html',
        'graph/index.html',
        'search/index.html',
        'feed/index.html',
        'gaps/index.html',
        'quiz/index.html',
      ];
      for (const file of htmlFiles) {
        const content = readSiteFile(file);
        expect(content.startsWith('<!DOCTYPE html>'), `${file} missing DOCTYPE`).toBe(true);
      }
    });

    it('all HTML files contain html, head, and body tags', () => {
      const htmlFiles = ['index.html', 'read/index.html', 'graph/index.html'];
      for (const file of htmlFiles) {
        const content = readSiteFile(file);
        expect(content).toContain('<html lang="en">');
        expect(content).toContain('<head>');
        expect(content).toContain('<body');
        expect(content).toContain('</html>');
      }
    });

    it('all HTML files include viewport meta tag', () => {
      const content = readSiteFile('read/index.html');
      expect(content).toContain('name="viewport"');
      expect(content).toContain('width=device-width');
    });
  });

  describe('CSS', () => {
    it('includes Google Fonts import', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain("@import url('https://fonts.googleapis.com/css2");
      expect(css).toContain('Playfair');
    });

    it('includes CSS reset', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('box-sizing: border-box');
    });

    it('defines light mode custom properties', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('--color-bg:');
      expect(css).toContain('--color-accent:');
      expect(css).toContain('--color-success:');
    });

    it('defines dark mode custom properties', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('prefers-color-scheme: dark');
      expect(css).toContain('.theme-dark');
    });

    it('includes layout variables', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('--container-max:');
      expect(css).toContain('--radius-md:');
      expect(css).toContain('--nav-height: 56px;');
    });

    it('includes easing variable', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('--ease:');
    });

    it('positions read-progress with the nav-height variable', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('top: var(--nav-height, 56px);');
      expect(css).toContain('right: 0;');
    });

    it('includes print styles', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('@media print');
    });

    it('includes reduced motion styles', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('prefers-reduced-motion: reduce');
    });

    it('includes responsive breakpoints', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('max-width: 1023px');
      expect(css).toContain('max-width: 767px');
    });
  });

  describe('hub page', () => {
    it('shows the topic title', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('Modern Web Frameworks');
    });

    it('links to all 6 modes', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('href="read/index.html"');
      expect(html).toContain('href="graph/index.html"');
      expect(html).toContain('href="search/index.html"');
      expect(html).toContain('href="feed/index.html"');
      expect(html).toContain('href="gaps/index.html"');
      expect(html).toContain('href="quiz/index.html"');
    });

    it('includes theme toggle', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('id="theme-toggle"');
      expect(html).toContain('localStorage');
    });

    it('uses relative CSS path', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('href="assets/style.css"');
    });

    it('includes footer with Built with Grimoire', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('Built with Grimoire');
    });

    it('shows N/A for graph density on small corpora', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('<strong>N/A</strong>graph density');
      expect(html).toContain('Density is not meaningful for small corpora');
    });
  });

  describe('read mode', () => {
    it('contains article content', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('React Fundamentals');
      expect(html).toContain('Vue Reactivity System');
    });

    it('has table of contents', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('read-sidebar');
      expect(html).toContain('read-toc-right');
    });

    it('has progress bar', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('read-progress');
    });

    it('renders the progress bar outside main', () => {
      const html = readSiteFile('read/index.html');
      const progressIndex = html.indexOf('<div class="read-progress" id="read-progress"></div>');
      const mainIndex = html.indexOf('<main id="main" class="container">');
      expect(progressIndex).toBeGreaterThan(-1);
      expect(mainIndex).toBeGreaterThan(-1);
      expect(progressIndex).toBeLessThan(mainIndex);
    });

    it('has next/previous navigation', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('&larr;');
      expect(html).toContain('&rarr;');
    });

    it('rewrites wikilinks away from papyr SPA routes', () => {
      const html = readSiteFile('read/index.html');
      expect(html).not.toContain('href="#/note/');
      expect(html).toContain('data-wikilink-slug="vue-reactivity"');
      expect(html).toContain('href="#vue-reactivity"');
    });

    it('keeps only genuine orphan wikilinks marked as new', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('<a class="internal" href="#vue-reactivity" data-wikilink-slug="vue-reactivity">Vue Reactivity System</a>');
      expect(html).toContain('<a class="internal new" href="#nonexistent-article" data-wikilink-slug="nonexistent-article">nonexistent-article</a>');
    });

    it('handles article hashes and internal wikilink clicks in the read-mode script', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain("window.history.replaceState(null, '', '#' + slug);");
      expect(html).toContain("a[data-wikilink-slug]");
    });

    it('uses relative CSS path for subpage', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('href="../assets/style.css"');
    });
  });

  describe('graph mode', () => {
    it('inlines d3 — no CDN, no network dependency', () => {
      const html = readSiteFile('graph/index.html');
      // Must NOT load d3 from any CDN
      expect(html).not.toContain('cdn.jsdelivr.net');
      expect(html).not.toContain('unpkg.com');
      expect(html).not.toContain("from 'https://");
      expect(html).not.toContain('src="https://');
      // The inlined d3 UMD bundle's banner is our fingerprint for "it's embedded"
      expect(html).toContain('Copyright 2010-2023 Mike Bostock');
    });

    it('embeds graph data inline', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('window.GRAPH_DATA');
    });

    it('has SVG canvas', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('<svg id="graph-svg"');
    });

    it('has tag filter buttons', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('tag-btn');
    });

    it('has detail panel', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('id="graph-panel"');
      expect(html).toContain('id="panel-title"');
    });
  });

  describe('search mode', () => {
    it('has search input', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain('id="search-input"');
      expect(html).toContain('type="search"');
    });

    it('embeds articles data for indexing', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain('window.SEARCH_ARTICLES');
    });

    it('implements debounced search in vanilla JS', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain('setTimeout');
      // The debounce closes with a numeric literal ≥100ms — pinning the exact
      // value made this test brittle when the UX cadence was tuned.
      expect(/},\s*(1[0-9]{2}|[2-9][0-9]{2}|[0-9]{4})\s*\)/.test(html)).toBe(true);
    });
  });

  describe('feed mode', () => {
    it('shows changelog entries', () => {
      const html = readSiteFile('feed/index.html');
      expect(html).toContain('Apr 1, 2026');
      expect(html).toContain('React Documentation');
    });

    it('has timeline structure', () => {
      const html = readSiteFile('feed/index.html');
      expect(html).toContain('feed-timeline');
      expect(html).toContain('feed-entry');
    });

    it('most recent entries first', () => {
      const html = readSiteFile('feed/index.html');
      const idx03 = html.indexOf('Apr 3, 2026');
      const idx01 = html.indexOf('Apr 1, 2026');
      expect(idx03).toBeLessThan(idx01);
    });
  });

  describe('gaps mode', () => {
    it('shows tag data in the treemap payload', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('reactivity');
      expect(html).toContain('articles');
      // New D3 treemap embeds tag data in a window global that the
      // client-side script reads into d3.hierarchy.
      expect(html).toContain('window.GAPS_DATA');
    });

    it('uses the D3 treemap container and legend', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('class="treemap-container"');
      expect(html).toContain('class="gaps-legend"');
    });

    it('classifies coverage tiers in the payload', () => {
      const html = readSiteFile('gaps/index.html');
      // The serialized cells include a tier per tag — at least one should
      // be full/partial/thin/missing for a non-empty sample wiki.
      const hasTier = /"tier":"(full|partial|thin|missing)"/.test(html);
      expect(hasTier).toBe(true);
    });
  });

  describe('quiz mode', () => {
    it('embeds flashcard data', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('window.QUIZ_CARDS');
    });

    it('has Anki-style quiz UI elements', () => {
      const html = readSiteFile('quiz/index.html');
      // New Anki-style reveal: question + hidden answer + show button.
      // Replaced the 3D flip card (id="flashcard"/"card-front"/"card-back").
      expect(html).toContain('id="quiz-card"');
      expect(html).toContain('id="quiz-question"');
      expect(html).toContain('id="quiz-answer"');
      expect(html).toContain('id="btn-show"');
    });

    it('has got-it and review buttons', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('id="btn-got-it"');
      expect(html).toContain('id="btn-review"');
    });

    it('includes shuffle logic', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('shuffle');
    });

    // Regression test for 2026-04-10 dry-run bug #1
    // extractSentences previously used `/[^.!?]+[.!?]+/g` which required
    // terminal punctuation — bullet-list sections (Key Capabilities,
    // Limitations) returned zero matches and produced no flashcards.
    // Fix: fallback chain (sentence → dash/newline/semicolon split → truncate).
    it('generates cards from bullet-list sections without terminal punctuation', () => {
      const html = readSiteFile('quiz/index.html');
      const match = html.match(/window\.QUIZ_CARDS = (\[.*?\]);/s);
      expect(match, 'QUIZ_CARDS not found in HTML').not.toBeNull();

      const cards = JSON.parse(match![1]) as Array<{ front: string; back: string }>;

      // Sanity: the fixture should produce multiple cards across articles and headings.
      expect(cards.length).toBeGreaterThan(3);

      // Every card must have non-empty back content — the bug manifested as
      // empty backs when extractSentences returned [].
      for (const card of cards) {
        expect(card.back.length, `Empty back for "${card.front}"`).toBeGreaterThan(0);
      }

      // Specifically: there MUST be cards derived from bullet-list sections.
      // The fixture has "Key Capabilities" sections in react-fundamentals, vue-reactivity,
      // and svelte-compilation — all bullet lists with no terminal punctuation.
      const keyCapCards = cards.filter(c => c.front.toLowerCase().includes('key capabilities'));
      expect(keyCapCards.length, 'No cards generated from Key Capabilities bullet sections').toBeGreaterThan(0);

      // Their backs must contain substantive content, not empty strings.
      for (const card of keyCapCards) {
        expect(card.back.length).toBeGreaterThan(20);
      }
    });
  });

  describe('no hardcoded colors in HTML body', () => {
    it('read mode has no hex colors outside script/style/head', () => {
      const html = readSiteFile('read/index.html');
      const bodyOnly = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '');

      const hexPattern = /#[0-9a-fA-F]{6}/g;
      const matches = bodyOnly.match(hexPattern) ?? [];
      expect(matches, 'Found hardcoded hex colors in HTML body').toEqual([]);
    });
  });
});

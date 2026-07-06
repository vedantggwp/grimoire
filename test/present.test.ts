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
        // motion/density classes are applied at generation time (v0.4.0)
        expect(content).toContain('<html lang="en" class="motion-subtle density-comfortable">');
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
    it('loads Google Fonts via <link>, not a CSS @import', () => {
      // Fonts load once through the <head> link; the old @import inside the
      // stylesheet double-fetched on the slower CSS path.
      const css = readSiteFile('assets/style.css');
      expect(css).not.toContain('@import');
      expect(css).toContain('Playfair');

      const html = readSiteFile('read/index.html');
      expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2');
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
      expect(css).toContain('#80f1f0');
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

    it('styles the feed empty state', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('.feed-empty');
      expect(css).toContain('font-style: italic;');
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
      expect(css).toContain('max-width: 1024px');
      expect(css).not.toContain('max-width: 1023px');
      expect(css).toContain('max-width: 767px');
    });

    it('adds an overflow cue to the nav tabs', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%)');
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

    it('renders featured card without inline grid-row override', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('class="bento-card featured reveal"');
      expect(html).not.toContain('style="grid-row:');
    });

    // v0.4.0 hub showcase
    it('embeds the real knowledge graph for the constellation hero', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('id="constellation"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('window.HUB_GRAPH = {"nodes":[');
      expect(html).toContain('"edges":[');
      expect(html).toContain('GRIMOIRE_MOTION_OK');
    });

    it('count-up stats carry data-count only for numeric values', () => {
      const html = readSiteFile('index.html');
      expect(html).toMatch(/<strong data-count="\d+">\d+<\/strong>articles/);
      // N/A density stays plain
      expect(html).toContain('<strong>N/A</strong>graph density');
    });

    it('runs the motion runtime before body content', () => {
      const html = readSiteFile('index.html');
      const runtimeIdx = html.indexOf("root.classList.add('js')");
      const heroIdx = html.indexOf('hub-hero');
      expect(runtimeIdx).toBeGreaterThan(-1);
      expect(runtimeIdx).toBeLessThan(heroIdx);
    });
  });

  describe('read mode — index page', () => {
    it('lists every article as a real link with summaries', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('React Fundamentals');
      expect(html).toContain('Vue Reactivity System');
      expect(html).toContain('href="vue-reactivity/index.html"');
      expect(html).toContain('class="summary"');
    });

    it('redirects legacy hash deep-links to the article page', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain("window.location.replace('./' + hash + '/index.html')");
    });

    it('offers a continue-reading pickup for returning readers', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('grimoire-last-read');
      expect(html).toContain('id="read-continue"');
    });

    it('uses relative CSS path for subpage', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('href="../assets/style.css"');
    });
  });

  describe('read mode — article pages (issue #2)', () => {
    it('writes one page per article', () => {
      expect(existsSync(join(SITE_DIR, 'read/vue-reactivity/index.html'))).toBe(true);
      expect(existsSync(join(SITE_DIR, 'read/react-fundamentals/index.html'))).toBe(true);
    });

    it('renders the full article shell at depth 2', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain('href="../../assets/style.css"');
      expect(html).toContain('read-sidebar');
      expect(html).toContain('read-progress');
      expect(html).toContain('<h1 style="view-transition-name: vta-vue-reactivity">Vue Reactivity System</h1>');
    });

    it('marks the current article in the sidebar', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('href="../vue-reactivity/index.html" aria-current="page"');
    });

    it('has real prev/next links in centrality order', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toMatch(/<a href="\.\.\/[a-z-]+\/index\.html" class="btn read-nav-btn" rel="(prev|next)">/);
    });

    it('rewrites known wikilinks to real article routes', () => {
      const html = readSiteFile('read/react-fundamentals/index.html');
      expect(html).not.toContain('href="#/note/');
      expect(html).toContain('href="../vue-reactivity/index.html" data-wikilink-slug="vue-reactivity"');
    });

    it('keeps unresolved wikilinks inert and marked new', () => {
      const html = readSiteFile('read/react-fundamentals/index.html');
      expect(html).toContain('class="internal new"');
      expect(html).toContain('data-wikilink-slug="nonexistent-article" role="link" aria-disabled="true"');
    });

    it('tracks the last-read article for the index pickup', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain("localStorage.setItem('grimoire-last-read'");
    });

    // Phase 3d — reading experience
    it('renders a backlinks panel on linked-to articles', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain('class="article-backlinks"');
      expect(html).toContain('Linked from');
    });

    it('renders a numbered sources section with domains', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain('id="sources"');
      expect(html).toContain('class="article-sources__domain"');
      expect(html).toContain('href="#sources" class="source-count"');
    });

    it('embeds page-local link previews and the popover script', () => {
      const html = readSiteFile('read/react-fundamentals/index.html');
      expect(html).toContain('window.LINK_PREVIEWS = {');
      expect(html).toContain('"vue-reactivity"');
      expect(html).toContain('link-preview');
    });

    it('shows a freshness badge on aging articles, none on evergreen', () => {
      // vue-reactivity: updated 2026-04-01, never fresh again → badge stays.
      const vue = readSiteFile('read/vue-reactivity/index.html');
      expect(vue).toContain('freshness-badge');
      // signals-pattern is evergreen: true in the fixture.
      const signals = readSiteFile('read/signals-pattern/index.html');
      expect(signals).not.toContain('freshness-badge');
    });

    it('builds the sliding TOC marker', () => {
      const html = readSiteFile('read/vue-reactivity/index.html');
      expect(html).toContain('read-toc-marker');
    });
  });

  describe('graph mode — v0.4.0 upgrades', () => {
    it('colors nodes from the palette categorical ramp, not a d3 scheme', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain("'var(--cat-' + idx + ')'");
      // The d3 bundle itself contains the identifier — assert the page no
      // longer USES the hardcoded scheme.
      expect(html).not.toContain('d3.scaleOrdinal(d3.schemeTableau10)');
    });

    it('embeds warm-start seed positions per node', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('"seedX":');
      expect(html).toContain('"seedY":');
    });

    it('has focus mode, cluster hulls, and a panel Read link', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('applyFocus');
      expect(html).toContain('id="graph-hull-toggle"');
      expect(html).toContain("'../read/' + d.id + '/index.html'");
      expect(html).toContain('Open in Read');
    });
  });

  describe('search mode — v0.4.0 upgrades', () => {
    it('supports keyboard result navigation', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain('aria-activedescendant');
      expect(html).toContain('kbd-active');
      expect(html).toContain('ArrowDown');
    });

    it('search results navigate to per-article routes on click', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain(".closest('.search-result[data-slug]')");
      expect(html).toContain("'../read/' + row.dataset.slug + '/index.html'");
    });

    it('offers tag-pill recovery on empty results', () => {
      const html = readSiteFile('search/index.html');
      expect(html).toContain('search-recover-tag');
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

    it('caps label collision width and truncates long labels in the graph script', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain("Math.min(280, (d.label || '').length * 6.5)");
      expect(html).toContain("var chargeStrength = nodes.length <= 6 ? -600");
      expect(html).toContain("lbl.length > 40 ? lbl.slice(0, 38) + '…' : lbl");
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

    it('renders update-run digests as stat-chip cards', () => {
      // The fixture log contains a structured update-run entry (the format
      // pinned in skills/update/SKILL.md Step 9).
      const html = readSiteFile('feed/index.html');
      expect(html).toContain('feed-entry--digest');
      expect(html).toContain('feed-digest__chip');
      expect(html).toContain('<strong>+2</strong> sources');
      expect(html).toContain('update run</span>');
    });
  });

  describe('gaps mode', () => {
    it('renders server-side treemap cells with percent geometry — no d3', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('reactivity');
      expect(html).toMatch(/class="treemap-cell treemap-cell--(full|partial|thin)/);
      expect(html).toMatch(/style="left:[\d.]+%;top:[\d.]+%;width:[\d.]+%;height:[\d.]+%/);
      // The d3 bundle is gone from this page (it was ~270KB of the old one).
      expect(html).not.toContain('Mike Bostock');
      expect(html).not.toContain('window.GAPS_DATA');
    });

    it('cells are keyboard-focusable with descriptive labels', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('tabindex="0"');
      expect(html).toMatch(/aria-label="[^"]+ — (full|partial|thin) coverage/);
    });

    it('uses the treemap container and legend', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('class="treemap-container"');
      expect(html).toContain('class="gaps-legend"');
    });

    it('offers the freshness lens when the report exists', () => {
      // The sample fixture compiles with freshness.json (v0.4.0+), so the
      // lens toggle and second legend must be present.
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('id="gaps-lens"');
      expect(html).toContain('data-lens="freshness"');
      expect(html).toContain('data-legend="freshness"');
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

    it('renders real 3D flip faces with streak rewards', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('id="quiz-card3d"');
      expect(html).toContain('quiz-face--front');
      expect(html).toContain('quiz-face--back');
      expect(html).toContain('id="quiz-streak"');
      expect(html).toContain('id="quiz-burst"');
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

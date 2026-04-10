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

function readSiteFile(relativePath: string): string {
  return readFileSync(join(SITE_DIR, relativePath), 'utf-8');
}

describe('present', () => {
  beforeAll(() => {
    // Always rebuild compile artifacts (other tests may have cleaned them)
    execSync(`npx tsx ${COMPILE_SCRIPT} ${WIKI_DIR}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });

    // Clean previous site output
    if (existsSync(SITE_DIR)) {
      rmSync(SITE_DIR, { recursive: true });
    }

    // Run the present script
    execSync(`npx tsx ${PRESENT_SCRIPT} ${WORKSPACE}`, {
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

    it('includes spacing scale variables', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('--space-1:');
      expect(css).toContain('--space-12:');
    });

    it('includes motion variables', () => {
      const css = readSiteFile('assets/style.css');
      expect(css).toContain('--transition-fast:');
      expect(css).toContain('--transition-normal:');
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
      expect(css).toContain('min-width: 640px');
      expect(css).toContain('min-width: 768px');
      expect(css).toContain('min-width: 1024px');
      expect(css).toContain('min-width: 1280px');
    });
  });

  describe('hub page', () => {
    it('shows the topic title', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('Modern Web Frameworks');
    });

    it('links to all 6 modes', () => {
      const html = readSiteFile('index.html');
      expect(html).toContain('href="read/"');
      expect(html).toContain('href="graph/"');
      expect(html).toContain('href="search/"');
      expect(html).toContain('href="feed/"');
      expect(html).toContain('href="gaps/"');
      expect(html).toContain('href="quiz/"');
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
  });

  describe('read mode', () => {
    it('contains article content', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('React Fundamentals');
      expect(html).toContain('Vue Reactivity System');
    });

    it('has table of contents', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('id="toc"');
      expect(html).toContain('toc__link');
    });

    it('has progress bar', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('read-progress');
    });

    it('has next/previous navigation', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('&larr;');
      expect(html).toContain('&rarr;');
    });

    it('uses relative CSS path for subpage', () => {
      const html = readSiteFile('read/index.html');
      expect(html).toContain('href="../assets/style.css"');
    });
  });

  describe('graph mode', () => {
    it('loads d3 from CDN', () => {
      const html = readSiteFile('graph/index.html');
      expect(html).toContain('cdn.jsdelivr.net/npm/d3@7');
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
      expect(html).toContain('graph-tag-filter');
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
      expect(html).toContain('300');
    });
  });

  describe('feed mode', () => {
    it('shows changelog entries', () => {
      const html = readSiteFile('feed/index.html');
      expect(html).toContain('2026-04-01');
      expect(html).toContain('React Documentation');
    });

    it('has timeline structure', () => {
      const html = readSiteFile('feed/index.html');
      expect(html).toContain('timeline-entry');
    });

    it('most recent entries first', () => {
      const html = readSiteFile('feed/index.html');
      const idx03 = html.indexOf('2026-04-03');
      const idx01 = html.indexOf('2026-04-01');
      expect(idx03).toBeLessThan(idx01);
    });
  });

  describe('gaps mode', () => {
    it('shows tag-based cards', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('reactivity');
      expect(html).toContain('articles');
      expect(html).toContain('words');
    });

    it('uses grid layout', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('grid grid--3');
    });

    it('identifies tags needing expansion', () => {
      const html = readSiteFile('gaps/index.html');
      expect(html).toContain('Needs expansion');
    });
  });

  describe('quiz mode', () => {
    it('embeds flashcard data', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('window.QUIZ_CARDS');
    });

    it('has flashcard UI elements', () => {
      const html = readSiteFile('quiz/index.html');
      expect(html).toContain('id="flashcard"');
      expect(html).toContain('id="card-front"');
      expect(html).toContain('id="card-back"');
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

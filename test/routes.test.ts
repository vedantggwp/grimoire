import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIXTURE = join(__dirname, 'fixtures/sample-wiki');
const PRESENT_SCRIPT = join(__dirname, '../lib/present/index.ts');
const COMPILE_SCRIPT = join(__dirname, '../lib/compile.ts');
const TSX_RUNNER = 'node --import tsx/esm';

// Routes + mode-disabling behaviors that need their own workspace so the
// main present suite's fixture config stays untouched.
describe('present routes — disabled modes (issue #9)', () => {
  let workspace: string;

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'grimoire-routes-'));
    cpSync(FIXTURE, workspace, { recursive: true });
    writeFileSync(join(workspace, '_config', 'design.md'), [
      '---',
      'palette: midnight-teal',
      'typography: editorial',
      'modes: read, search',
      '---',
    ].join('\n'));

    execSync(`${TSX_RUNNER} ${COMPILE_SCRIPT} ${workspace}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
    execSync(`${TSX_RUNNER} ${PRESENT_SCRIPT} ${workspace}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('generates only the enabled modes', () => {
    const site = join(workspace, 'site');
    expect(existsSync(join(site, 'read', 'index.html'))).toBe(true);
    expect(existsSync(join(site, 'search', 'index.html'))).toBe(true);
    expect(existsSync(join(site, 'graph'))).toBe(false);
    expect(existsSync(join(site, 'feed'))).toBe(false);
    expect(existsSync(join(site, 'gaps'))).toBe(false);
    expect(existsSync(join(site, 'quiz'))).toBe(false);
  });

  it('filters the nav and hub cards to enabled modes', () => {
    const hub = readFileSync(join(workspace, 'site', 'index.html'), 'utf-8');
    expect(hub).toContain('href="read/index.html"');
    expect(hub).toContain('href="search/index.html"');
    expect(hub).not.toContain('href="graph/index.html"');
    expect(hub).not.toContain('href="quiz/index.html"');

    const read = readFileSync(join(workspace, 'site', 'read', 'index.html'), 'utf-8');
    expect(read).not.toContain('>Graph</a>');
    expect(read).not.toContain('>Quiz</a>');
  });

  it('still writes per-article pages under read/', () => {
    expect(
      existsSync(join(workspace, 'site', 'read', 'vue-reactivity', 'index.html')),
    ).toBe(true);
  });

  it('article pages link nav tabs with depth-2 prefixes', () => {
    const html = readFileSync(
      join(workspace, 'site', 'read', 'vue-reactivity', 'index.html'),
      'utf-8',
    );
    expect(html).toContain('href="../../search/index.html"');
    expect(html).toContain('href="../../index.html" class="brand"');
  });
});

describe('present routes — view transitions', () => {
  it('declares cross-document view transitions behind reduced-motion', async () => {
    const { generateCSS } = await import('../lib/present/css/index.js');
    const { DEFAULT_CONFIG } = await import('../lib/present/config.js');
    const css = generateCSS(DEFAULT_CONFIG);

    expect(css).toContain('@view-transition');
    expect(css).toContain('navigation: auto');
    expect(css).toContain('::view-transition-old(root)');
    expect(css).toContain('view-transition-name: vt-brand');
    // The whole block sits inside the no-preference media query.
    const mediaIdx = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    const vtIdx = css.indexOf('@view-transition');
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(vtIdx).toBeGreaterThan(mediaIdx);
  });

  it('omits view transitions and reveal states entirely for motion: none', async () => {
    const { generateCSS } = await import('../lib/present/css/index.js');
    const { DEFAULT_CONFIG } = await import('../lib/present/config.js');
    const css = generateCSS({ ...DEFAULT_CONFIG, motion: 'none' });
    expect(css).not.toContain('@view-transition');
    expect(css).not.toContain('html.js.motion-'); // reveal utility absent
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});

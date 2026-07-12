import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync as readFixtureFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { runResearchCli } from '../lib/research-cli.js';

const fixtureDir = fileURLToPath(new URL('fixtures/providers/', import.meta.url));

function fixture(name: string): string {
  return readFixtureFile(join(fixtureDir, name), 'utf8');
}

describe('research CLI', () => {
  it('writes fetch captures with fidelity frontmatter to stdout', async () => {
    let stdout = '';
    const code = await runResearchCli(['fetch', 'https://docs.example.com/sdk/overview'], {
      now: new Date('2026-07-10T12:00:00Z'),
      stdout: text => { stdout += text; },
      fetchImpl: async (url) => {
        if (url.endsWith('.md')) {
          return new Response(fixture('markdown-doc.md'), {
            headers: { 'content-type': 'text/markdown' },
          });
        }
        return new Response('missing', { status: 404 });
      },
    });

    expect(code).toBe(0);
    expect(stdout).toContain('source_url: "https://docs.example.com/sdk/overview"');
    expect(stdout).toContain('fidelity: full');
    expect(stdout).toContain('method: md-variant');
    expect(stdout).toContain('# Agent SDK Overview');
  });

  it('writes fetch captures to --out files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'grimoire-research-cli-'));
    try {
      const out = join(dir, 'capture.md');
      const code = await runResearchCli(['fetch', 'https://docs.example.com/sdk/overview', '--out', out], {
        fetchImpl: async (url) => {
          if (url.endsWith('.md')) return new Response(fixture('markdown-doc.md'));
          return new Response('missing', { status: 404 });
        },
      });

      expect(code).toBe(0);
      expect(readFileSync(out, 'utf8')).toContain('method: md-variant');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes search results as JSON lines', async () => {
    let stdout = '';
    const code = await runResearchCli(['search', 'provider', 'spine'], {
      stdout: text => { stdout += text; },
      fetchImpl: async () => new Response(fixture('duckduckgo.html'), {
        headers: { 'content-type': 'text/html' },
      }),
    });

    expect(code).toBe(0);
    const lines = stdout.trim().split('\n').map(line => JSON.parse(line));
    expect(lines.map(line => line.url)).toEqual([
      'https://example.com/docs?id=1',
      'https://blog.example.org/post',
    ]);
  });

  it('writes [] for genuine empty search results', async () => {
    let stdout = '';
    let stderr = '';
    const code = await runResearchCli(['search', 'provider', 'spine'], {
      stdout: text => { stdout += text; },
      stderr: text => { stderr += text; },
      fetchImpl: async () => new Response('<html><body>No results found.</body></html>'),
    });

    expect(code).toBe(0);
    expect(stdout).toBe('[]\n');
    expect(stderr).toBe('');
  });

  it('writes structured search errors to stderr and exits nonzero', async () => {
    let stdout = '';
    let stderr = '';
    const code = await runResearchCli(['search', 'provider', 'spine'], {
      stdout: text => { stdout += text; },
      stderr: text => { stderr += text; },
      fetchImpl: async () => new Response('<html><body>Anomaly detected. Verify you are human.</body></html>'),
    });

    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(JSON.parse(stderr)).toEqual({
      error: {
        code: 'blocked',
        message: 'DuckDuckGo returned an anomaly or CAPTCHA page',
      },
    });
  });

  it('returns usage errors for invalid args', async () => {
    let stderr = '';
    const code = await runResearchCli(['fetch'], {
      stderr: text => { stderr += text; },
    });

    expect(code).toBe(64);
    expect(stderr).toContain('node dist/research.js fetch <url>');
  });

  it('requires a path after --out', async () => {
    let stderr = '';
    const code = await runResearchCli(['fetch', 'https://example.com', '--out'], {
      stderr: text => { stderr += text; },
    });

    expect(code).toBe(64);
    expect(stderr).toContain('node dist/research.js fetch <url>');
  });
});

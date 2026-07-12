import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDuckDuckGoHtml, searchWeb } from '../lib/providers/search.js';

const fixtureDir = fileURLToPath(new URL('fixtures/providers/', import.meta.url));

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8');
}

describe('parseDuckDuckGoHtml', () => {
  it('parses results, unwraps uddg redirects, dedupes, and decodes snippets', () => {
    const results = parseDuckDuckGoHtml(fixture('duckduckgo.html'));

    expect(results).toEqual([
      {
        url: 'https://example.com/docs?id=1',
        title: 'Example Docs',
        snippet: 'Official documentation for the provider spine.',
      },
      {
        url: 'https://blog.example.org/post',
        title: 'Provider article',
        snippet: 'A long-form article with & entity decoding.',
      },
    ]);
  });

  it('caps results', () => {
    expect(parseDuckDuckGoHtml(fixture('duckduckgo.html'), 1)).toHaveLength(1);
  });

  it('rejects unsafe uddg schemes', () => {
    const results = parseDuckDuckGoHtml(`
      <a class="result__a" href="/l/?uddg=data%3Atext%2Fhtml%2Cowned">Unsafe result</a>
      <div class="result__snippet">Should be ignored.</div>
      <a class="result__a" href="/l/?uddg=file%3A%2F%2F%2Fetc%2Fpasswd">File result</a>
    `);

    expect(results).toEqual([]);
  });

  it('clamps out-of-range and surrogate numeric entities', () => {
    const results = parseDuckDuckGoHtml(`
      <a class="result__a" href="https://example.com/entity">Entity &#x110000; &#55296;</a>
      <div class="result__snippet">Snippet &#x110000;.</div>
    `);

    expect(results[0]).toMatchObject({
      title: 'Entity \uFFFD \uFFFD',
      snippet: 'Snippet \uFFFD.',
    });
  });
});

describe('searchWeb', () => {
  it('queries DuckDuckGo HTML and parses results', async () => {
    let requested = '';
    const search = await searchWeb('provider spine', {
      fetchImpl: async (url) => {
        requested = url;
        return new Response(fixture('duckduckgo.html'), {
          headers: { 'content-type': 'text/html' },
        });
      },
    });

    expect(requested).toBe('https://html.duckduckgo.com/html/?q=provider%20spine');
    expect(search.ok).toBe(true);
    expect(search.results.map(result => result.title)).toEqual(['Example Docs', 'Provider article']);
  });

  it('returns a structured HTTP error for non-ok statuses', async () => {
    const search = await searchWeb('provider spine', {
      fetchImpl: async () => new Response('blocked', { status: 403 }),
    });

    expect(search).toEqual({
      ok: false,
      results: [],
      error: {
        code: 'http',
        status: 403,
        message: 'DuckDuckGo returned HTTP 403',
      },
    });
  });

  it('returns a structured network error for thrown failures', async () => {
    const search = await searchWeb('provider spine', {
      fetchImpl: async () => {
        throw new Error('socket closed');
      },
    });

    expect(search.ok).toBe(false);
    if (!search.ok) {
      expect(search.error).toMatchObject({ code: 'network', message: 'socket closed' });
    }
  });

  it('distinguishes DuckDuckGo anomaly pages from genuine empty results', async () => {
    const blocked = await searchWeb('provider spine', {
      fetchImpl: async () => new Response('<html><body>Anomaly detected. Verify you are human.</body></html>'),
    });
    const empty = await searchWeb('provider spine', {
      fetchImpl: async () => new Response('<html><body>No results found.</body></html>'),
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('blocked');
    expect(empty).toEqual({ ok: true, results: [] });
  });
});

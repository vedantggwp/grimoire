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
});

describe('searchWeb', () => {
  it('queries DuckDuckGo HTML and parses results', async () => {
    let requested = '';
    const results = await searchWeb('provider spine', {
      fetchImpl: async (url) => {
        requested = url;
        return new Response(fixture('duckduckgo.html'), {
          headers: { 'content-type': 'text/html' },
        });
      },
    });

    expect(requested).toBe('https://html.duckduckgo.com/html/?q=provider%20spine');
    expect(results.map(result => result.title)).toEqual(['Example Docs', 'Provider article']);
  });

  it('returns an empty list when blocked', async () => {
    const results = await searchWeb('provider spine', {
      fetchImpl: async () => new Response('blocked', { status: 403 }),
    });

    expect(results).toEqual([]);
  });
});

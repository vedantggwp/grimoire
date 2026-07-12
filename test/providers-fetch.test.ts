import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractMarkdownFromHtml, fetchSource } from '../lib/providers/fetch.js';

const fixtureDir = fileURLToPath(new URL('fixtures/providers/', import.meta.url));

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8');
}

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'text/plain',
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  });
}

function acceptHeader(init?: RequestInit): string {
  return new Headers(init?.headers).get('accept') ?? '';
}

describe('fetchSource verbatim ladder', () => {
  it('does not build an md variant for an origin-root URL', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://docs.example.com/', {
      fetchImpl: async (url, init) => {
        calls.push(url);
        if (acceptHeader(init).includes('text/markdown')) {
          return response('missing', { status: 404 });
        }
        return response(fixture('docs-page.html'), { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(calls[0]).toBe('https://docs.example.com/');
    expect(calls).not.toContain('https://docs.example.com.md');
    expect(result.method).toBe('html-extract');
  });

  it('adds md variants to the pathname without mangling query strings', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://docs.example.com/sdk/overview?tab=js', {
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === 'https://docs.example.com/sdk/overview.md?tab=js') {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response('missing', { status: 404 });
      },
    });

    expect(calls[0]).toBe('https://docs.example.com/sdk/overview.md?tab=js');
    expect(calls[0]).not.toContain('tab=js.md');
    expect(result.method).toBe('md-variant');
  });

  it('adds md variants for normal page paths', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://docs.example.com/sdk/guide', {
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === 'https://docs.example.com/sdk/guide.md') {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response('missing', { status: 404 });
      },
    });

    expect(calls[0]).toBe('https://docs.example.com/sdk/guide.md');
    expect(result.method).toBe('md-variant');
  });

  it('accepts a markdown URL variant as full fidelity', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://docs.example.com/sdk/overview/', {
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === 'https://docs.example.com/sdk/overview.md') {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response('missing', { status: 404 });
      },
    });

    expect(calls[0]).toBe('https://docs.example.com/sdk/overview.md');
    expect(result.fidelity).toBe('full');
    expect(result.method).toBe('md-variant');
    expect(result.text).toContain('# Agent SDK Overview');
  });

  it('does not accept site-wide llms.txt as page content', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://docs.example.com/sdk/reject', {
      fetchImpl: async (url, init) => {
        calls.push(url);
        if (url.endsWith('.md')) return response('missing', { status: 404 });
        if (url.endsWith('/llms.txt') || url.endsWith('/llms-full.txt')) {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        if (acceptHeader(init).includes('text/markdown')) return response('missing', { status: 404 });
        return response(fixture('docs-page.html'), { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(calls.some(url => url.endsWith('/llms.txt') || url.endsWith('/llms-full.txt'))).toBe(false);
    expect(result.method).toBe('html-extract');
  });

  it('rejects weak markdown variants before falling back to HTML extract', async () => {
    const result = await fetchSource('https://docs.example.com/sdk/reject', {
      fetchImpl: async (url, init) => {
        if (url.endsWith('.md')) return response(fixture('plain-no-heading.txt'));
        if (url.endsWith('/llms.txt') || url.endsWith('/llms-full.txt')) {
          return response('missing', { status: 404 });
        }
        if (acceptHeader(init).includes('text/markdown')) {
          return response(fixture('plain-no-heading.txt'));
        }
        return response(fixture('docs-page.html'), { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(result.fidelity).toBe('extract');
    expect(result.method).toBe('html-extract');
    expect(result.text).toContain('# Provider Spine');
    expect(result.text).not.toContain('Product navigation');
    expect(result.meta.attempts.some(a => a.method === 'md-variant' && !a.accepted)).toBe(true);
    expect(result.meta.attempts.some(a => a.method === 'content-negotiation' && !a.accepted)).toBe(true);
  });

  it('accepts content-negotiated markdown as full fidelity', async () => {
    const result = await fetchSource('https://example.com/reference', {
      fetchImpl: async (url, init) => {
        if (url.endsWith('.md')) return response('missing', { status: 404 });
        if (acceptHeader(init).includes('text/markdown')) {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response(fixture('docs-page.html'), { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(result.fidelity).toBe('full');
    expect(result.method).toBe('content-negotiation');
  });

  it('marks client-rendered shells as failed', async () => {
    const result = await fetchSource('https://app.example.com/shell', {
      fetchImpl: async (url, init) => {
        if (url.endsWith('.md')) return response('missing', { status: 404 });
        if (acceptHeader(init).includes('text/markdown')) return response('missing', { status: 404 });
        return response(fixture('js-shell.html'), { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(result.fidelity).toBe('failed');
    expect(result.method).toBe('failed');
    expect(result.meta.attempts.at(-1)?.method).toBe('html-extract');
  });

  it('rewrites GitHub blob URLs to raw.githubusercontent.com', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://github.com/acme/project/blob/main/README.md', {
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === 'https://raw.githubusercontent.com/acme/project/main/README.md') {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response('missing', { status: 404 });
      },
    });

    expect(calls).toContain('https://raw.githubusercontent.com/acme/project/main/README.md');
    expect(result.fidelity).toBe('full');
    expect(result.method).toBe('github-raw');
  });

  it('uses the GitHub README API path for repo roots', async () => {
    const result = await fetchSource('https://github.com/acme/project', {
      fetchImpl: async (url) => {
        if (url === 'https://api.github.com/repos/acme/project/readme') {
          return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
        }
        return response('missing', { status: 404 });
      },
    });

    expect(result.fidelity).toBe('full');
    expect(result.method).toBe('github-readme');
  });
});

describe('extractMarkdownFromHtml', () => {
  it('extracts main content with headings, code, and links', () => {
    const markdown = extractMarkdownFromHtml(fixture('docs-page.html'));

    expect(markdown).toContain('# Provider Spine');
    expect(markdown).toContain('```');
    expect(markdown).toContain('[reference page](https://example.com/reference)');
    expect(markdown).not.toContain('Footer should not appear');
  });

  it('extracts article content independently of main tags', () => {
    const markdown = extractMarkdownFromHtml(fixture('article-page.html'));

    expect(markdown).toContain('# Why source fidelity matters');
    expect(markdown).toContain('## Operational rule');
    expect(markdown).not.toContain('Related stories');
  });

  it('clamps out-of-range and surrogate numeric entities to replacement characters', () => {
    const markdown = extractMarkdownFromHtml('<main><h1>Entities</h1><p>&#x110000; and &#55296; survive.</p></main>');

    expect(markdown).toContain('\uFFFD and \uFFFD survive.');
  });
});

describe('fetchSource redirect and resource hardening', () => {
  it('rejects cross-scheme redirects before fetching the target', async () => {
    const calls: string[] = [];
    const result = await fetchSource('https://example.com/page', {
      fetchImpl: async (url) => {
        calls.push(url);
        return new Response('', {
          status: 302,
          headers: { location: 'data:text/plain,owned' },
        });
      },
    });

    expect(calls.every(url => url.startsWith('https://example.com/'))).toBe(true);
    expect(result.fidelity).toBe('failed');
    expect(result.meta.attempts[0]?.error).toContain('unsupported redirect scheme: data:');
  });

  it('respects the redirect limit', async () => {
    const result = await fetchSource('https://example.com/page', {
      redirectLimit: 1,
      fetchImpl: async (url) => new Response('', {
        status: 302,
        headers: {
          location: url.endsWith('/one') ? 'https://example.com/two' : 'https://example.com/one',
        },
      }),
    });

    expect(result.fidelity).toBe('failed');
    expect(result.meta.attempts[0]?.error).toContain('redirect limit exceeded (1)');
  });

  it('uses one abort signal across a redirect chain', async () => {
    const signals: (AbortSignal | null | undefined)[] = [];
    const result = await fetchSource('https://example.com/page', {
      fetchImpl: async (url, init) => {
        signals.push(init?.signal);
        if (url === 'https://example.com/page.md') {
          return new Response('', {
            status: 302,
            headers: { location: 'https://example.com/final.md' },
          });
        }
        return response(fixture('markdown-doc.md'), { headers: { 'content-type': 'text/markdown' } });
      },
    });

    expect(result.method).toBe('md-variant');
    expect(signals).toHaveLength(2);
    expect(signals[1]).toBe(signals[0]);
  });

  it('cancels the response reader when the size cap is exceeded', async () => {
    let cancelCount = 0;

    const result = await fetchSource('https://example.com/page', {
      maxBytes: 1,
      fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        },
        cancel() {
          cancelCount += 1;
        },
      }), {
        headers: { 'content-type': 'text/markdown' },
      }),
    });

    expect(cancelCount).toBeGreaterThan(0);
    expect(result.fidelity).toBe('failed');
    expect(result.meta.attempts[0]?.error).toContain('response exceeded max size');
  });
});

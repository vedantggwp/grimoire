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
});

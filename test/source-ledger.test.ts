import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildSourceLedger,
  normalizeFrontmatterDate,
  normalizeUrl,
} from '../lib/source-ledger.js';

describe('normalizeUrl', () => {
  it.each([
    ['https://www.example.com/page', 'https://example.com/page'],
    ['https://example.com/page/', 'https://example.com/page'],
    ['https://example.com/page#section', 'https://example.com/page'],
    ['https://example.com/page?utm_source=x&utm_medium=y', 'https://example.com/page'],
    ['https://example.com/page?id=2&utm_source=x', 'https://example.com/page?id=2'],
    ['https://EXAMPLE.com/Page', 'https://example.com/Page'],
    ['https://example.com/', 'https://example.com'],
    ['https://example.com', 'https://example.com'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it('passes through unparseable strings trimmed', () => {
    expect(normalizeUrl('  not a url  ')).toBe('not a url');
  });
});

describe('normalizeFrontmatterDate', () => {
  it('handles quoted string dates', () => {
    expect(normalizeFrontmatterDate('2026-01-15')).toBe('2026-01-15');
    expect(normalizeFrontmatterDate('2026-01-15T12:00:00Z')).toBe('2026-01-15');
  });

  it('handles unquoted YAML dates parsed as Date objects', () => {
    expect(normalizeFrontmatterDate(new Date('2026-01-15T00:00:00Z'))).toBe('2026-01-15');
  });

  it('rejects garbage', () => {
    expect(normalizeFrontmatterDate('soon')).toBeNull();
    expect(normalizeFrontmatterDate(42)).toBeNull();
    expect(normalizeFrontmatterDate(undefined)).toBeNull();
    expect(normalizeFrontmatterDate(new Date('invalid'))).toBeNull();
  });
});

describe('buildSourceLedger', () => {
  let workspace: string;

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'grimoire-ledger-'));
    mkdirSync(join(workspace, 'raw', 'frameworks'), { recursive: true });
    mkdirSync(join(workspace, 'wiki'), { recursive: true });

    // Spec table shape (| # | URL | Title | Type | Tier | Status |)
    writeFileSync(join(workspace, 'approved-sources.md'), [
      '# Approved Sources: Test',
      '',
      '| # | URL | Title | Type | Tier | Status |',
      '|---|-----|-------|------|------|--------|',
      '| 1 | https://www.example.com/docs/ | Docs | documentation | P0 | ingested |',
      '| 2 | https://example.com/blog?utm_source=feed | Blog | article | P1 | pending |',
      '',
      'Legacy shape below (different columns):',
      '| 3 | https://old.example.com/guide | approved | P0 | guide-article |',
    ].join('\n'));

    writeFileSync(join(workspace, 'raw', 'frameworks', '2026-01-15-docs.md'), [
      '---',
      'source_url: "https://www.example.com/docs"',
      'collected: 2026-01-15',
      'title: "Docs"',
      '---',
      '',
      'Raw content.',
    ].join('\n'));

    writeFileSync(join(workspace, 'wiki', 'log.md'), [
      '# Log',
      '',
      '## 2026-02-20 — Compiled',
      '- Fixes applied: 2',
      '',
      '## 2026-01-15 — Ingested: Docs',
      '- Source: https://www.example.com/docs',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('extracts URLs from any approved-sources table shape, normalized and deduped', () => {
    const ledger = buildSourceLedger(workspace);
    expect(ledger.knownUrls).toContain('https://example.com/docs');
    expect(ledger.knownUrls).toContain('https://example.com/blog');
    expect(ledger.knownUrls).toContain('https://old.example.com/guide');
    // www + trailing slash variant in approved-sources and raw frontmatter
    // collapse to one normalized entry.
    expect(ledger.knownUrls.filter(u => u.endsWith('/docs'))).toHaveLength(1);
  });

  it('maps normalized raw source URLs to their collected dates', () => {
    const ledger = buildSourceLedger(workspace);
    expect(ledger.rawCollectedByUrl['https://example.com/docs']).toBe('2026-01-15');
  });

  it('derives lastUpdate from the max of raw collected dates and log headers', () => {
    const ledger = buildSourceLedger(workspace);
    expect(ledger.lastUpdate).toBe('2026-02-20');
  });

  it('returns an empty ledger for a workspace with no source history', () => {
    const empty = mkdtempSync(join(tmpdir(), 'grimoire-empty-'));
    try {
      const ledger = buildSourceLedger(empty);
      expect(ledger.knownUrls).toEqual([]);
      expect(ledger.lastUpdate).toBeNull();
      expect(ledger.rawCollectedByUrl).toEqual({});
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

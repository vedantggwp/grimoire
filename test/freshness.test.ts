import { describe, expect, it } from 'vitest';

import { buildFreshnessReport } from '../lib/freshness.js';
import { DEFAULT_UPDATE_POLICY } from '../lib/update-policy.js';
import type { SourceLedger } from '../lib/source-ledger.js';

const NOW = new Date('2026-06-10T12:00:00Z');

const EMPTY_LEDGER: SourceLedger = {
  knownUrls: [],
  lastUpdate: null,
  rawCollectedByUrl: {},
};

function daysAgo(days: number): string {
  const date = new Date(NOW.getTime() - days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function report(articles: Parameters<typeof buildFreshnessReport>[0], ledger = EMPTY_LEDGER) {
  return buildFreshnessReport(articles, ledger, DEFAULT_UPDATE_POLICY, NOW);
}

describe('freshness tiers', () => {
  it.each([
    [29, 'fresh'],
    [30, 'fresh'],
    [31, 'aging'],
    [89, 'aging'],
    [90, 'aging'],
    [91, 'stale'],
  ])('%i days old → %s (default 30/90 windows)', (age, tier) => {
    const result = report([{ slug: 'a', title: 'A', updated: daysAgo(age) }]);
    expect(result.articles[0].tier).toBe(tier);
    expect(result.articles[0].ageDays).toBe(age);
  });

  it('checked beats updated as the effective date', () => {
    const result = report([
      { slug: 'a', title: 'A', updated: daysAgo(200), checked: daysAgo(5) },
    ]);
    expect(result.articles[0].tier).toBe('fresh');
    expect(result.articles[0].effectiveDate).toBe(daysAgo(5));
  });

  it('evergreen overrides any age', () => {
    const result = report([
      { slug: 'a', title: 'A', updated: daysAgo(500), evergreen: true },
    ]);
    expect(result.articles[0].tier).toBe('evergreen');
  });

  it('missing dates are unknown, never stale', () => {
    const result = report([{ slug: 'a', title: 'A' }]);
    expect(result.articles[0].tier).toBe('unknown');
    expect(result.articles[0].ageDays).toBeNull();
  });

  it('filters support pages out of the report', () => {
    const result = report([
      { slug: 'index', title: 'Index', updated: daysAgo(1) },
      { slug: 'overview', title: 'Overview', updated: daysAgo(1) },
      { slug: 'log', title: 'Log', updated: daysAgo(1) },
      { slug: 'real', title: 'Real', updated: daysAgo(1) },
    ]);
    expect(result.articles.map(a => a.slug)).toEqual(['real']);
  });

  it('summary counts every tier and sums to the article count', () => {
    const result = report([
      { slug: 'a', title: 'A', updated: daysAgo(5) },
      { slug: 'b', title: 'B', updated: daysAgo(50) },
      { slug: 'c', title: 'C', updated: daysAgo(120) },
      { slug: 'd', title: 'D', evergreen: true },
      { slug: 'e', title: 'E' },
    ]);
    expect(result.summary).toEqual({ fresh: 1, aging: 1, stale: 1, evergreen: 1, unknown: 1 });
  });

  it('resolves newestSourceCollected via normalized ledger lookup', () => {
    const ledger: SourceLedger = {
      knownUrls: ['https://example.com/a', 'https://example.com/b'],
      lastUpdate: '2026-03-01',
      rawCollectedByUrl: {
        'https://example.com/a': '2026-01-10',
        'https://example.com/b': '2026-03-01',
      },
    };
    const result = report([
      {
        slug: 'x',
        title: 'X',
        updated: daysAgo(10),
        sources: [
          { url: 'https://www.example.com/a/' },
          { url: 'https://example.com/b' },
        ],
      },
    ], ledger);
    expect(result.articles[0].newestSourceCollected).toBe('2026-03-01');
  });

  it('records the policy windows and source in the report header', () => {
    const result = report([]);
    expect(result.policy).toEqual({ freshDays: 30, agingDays: 90, source: 'defaults' });
    expect(result.generatedAt).toBe(NOW.toISOString());
  });
});

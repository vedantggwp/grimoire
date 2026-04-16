import { describe, expect, it } from 'vitest';

import { computeDensityRatio, computeHubStats, hubLeadText, recommendedMode } from '../lib/present/hub.js';
import type { SiteData } from '../lib/present/types.js';

function makeSiteData(overrides: Partial<SiteData> = {}): SiteData {
  return {
    articles: [],
    graphData: { nodes: [], edges: [] },
    analytics: {},
    logEntries: [],
    schema: {
      topic: 'Test Topic',
      scope: { in: '', out: '' },
      audience: 'general',
    },
    ...overrides,
  };
}

describe('present hub helpers', () => {
  it('deduplicates sourceCount by URL', () => {
    const data = makeSiteData({
      articles: [
        {
          slug: 'alpha',
          title: 'Alpha',
          summary: '',
          tags: ['one'],
          html: '<p>Alpha</p>',
          wordCount: 100,
          readingTime: 1,
          linksTo: ['beta'],
          headings: [],
          confidence: 'P0',
          sources: [
            { url: 'https://example.com/shared', title: 'Shared' },
            { url: 'https://example.com/alpha', title: 'Alpha Source' },
          ],
        },
        {
          slug: 'beta',
          title: 'Beta',
          summary: '',
          tags: ['two'],
          html: '<p>Beta</p>',
          wordCount: 120,
          readingTime: 1,
          linksTo: ['alpha'],
          headings: [],
          confidence: 'P1',
          sources: [
            { url: 'https://example.com/shared', title: 'Shared' },
            { url: 'https://example.com/beta', title: 'Beta Source' },
          ],
        },
      ],
      graphData: {
        nodes: [{ id: 'alpha', label: 'Alpha', linkCount: 1, backlinkCount: 1, forwardLinkCount: 1, tags: ['one'], wordCount: 100 }, { id: 'beta', label: 'Beta', linkCount: 1, backlinkCount: 1, forwardLinkCount: 1, tags: ['two'], wordCount: 120 }],
        edges: [{ source: 'alpha', target: 'beta' }, { source: 'beta', target: 'alpha' }],
      },
    });

    expect(computeHubStats(data).sourceCount).toBe(3);
  });

  it('treats density as not meaningful for small corpora', () => {
    const data = makeSiteData({
      articles: Array.from({ length: 4 }, (_, index) => ({
        slug: `article-${index}`,
        title: `Article ${index}`,
        summary: '',
        tags: [`tag-${index}`],
        html: '<p>Body</p>',
        wordCount: 100,
        readingTime: 1,
        linksTo: [],
        headings: [],
        confidence: 'P1',
        sources: [],
      })),
      graphData: {
        nodes: Array.from({ length: 4 }, (_, index) => ({
          id: `article-${index}`,
          label: `Article ${index}`,
          linkCount: 1,
          backlinkCount: 1,
          forwardLinkCount: 1,
          tags: [`tag-${index}`],
          wordCount: 100,
        })),
        edges: [
          { source: 'article-0', target: 'article-1' },
          { source: 'article-1', target: 'article-0' },
          { source: 'article-1', target: 'article-2' },
        ],
      },
    });

    expect(computeHubStats(data).density).toBeNull();
  });

  it('uses the same deduplicated density formula for recommendations', () => {
    const denseData = makeSiteData({
      articles: Array.from({ length: 8 }, (_, index) => ({
        slug: `node-${index}`,
        title: `Node ${index}`,
        summary: '',
        tags: ['shared'],
        html: '<p>Node</p>',
        wordCount: 100,
        readingTime: 1,
        linksTo: [],
        headings: [],
        confidence: 'P0',
        sources: [],
      })),
      graphData: {
        nodes: Array.from({ length: 8 }, (_, index) => ({
          id: `node-${index}`,
          label: `Node ${index}`,
          linkCount: 1,
          backlinkCount: 1,
          forwardLinkCount: 1,
          tags: ['shared'],
          wordCount: 100,
        })),
        edges: [
          { source: 'node-0', target: 'node-1' },
          { source: 'node-1', target: 'node-0' },
          { source: 'node-0', target: 'node-2' },
          { source: 'node-2', target: 'node-0' },
          { source: 'node-0', target: 'node-3' },
          { source: 'node-3', target: 'node-0' },
          { source: 'node-1', target: 'node-2' },
          { source: 'node-2', target: 'node-1' },
          { source: 'node-1', target: 'node-3' },
          { source: 'node-3', target: 'node-1' },
        ],
      },
    });

    expect(computeDensityRatio(denseData.graphData)).toBeGreaterThan(0.14);
    expect(recommendedMode(denseData)).toBe('read');

    const graphRecommended = makeSiteData({
      ...denseData,
      graphData: {
        ...denseData.graphData,
        edges: [
          ...denseData.graphData.edges,
          { source: 'node-2', target: 'node-3' },
          { source: 'node-3', target: 'node-2' },
          { source: 'node-4', target: 'node-5' },
          { source: 'node-5', target: 'node-4' },
          { source: 'node-4', target: 'node-6' },
          { source: 'node-6', target: 'node-4' },
          { source: 'node-4', target: 'node-7' },
          { source: 'node-7', target: 'node-4' },
          { source: 'node-5', target: 'node-6' },
          { source: 'node-6', target: 'node-5' },
        ],
      },
    });

    expect(computeDensityRatio(graphRecommended.graphData)).toBeGreaterThan(0.3);
    expect(recommendedMode(graphRecommended)).toBe('graph');
  });

  it('falls back to a non-empty hub lead', () => {
    expect(hubLeadText('')).toBe('Welcome to this knowledge base.');
    expect(hubLeadText('Explicit scope')).toBe('Explicit scope');
  });
});

import { describe, expect, it } from 'vitest';

import { sortByCentrality as sortReadByCentrality } from '../lib/present/modes/read.js';
import { buildTagCloud, sortByCentrality as sortSearchByCentrality } from '../lib/present/modes/search.js';
import type { ArticleData } from '../lib/present/types.js';

function article(slug: string, linksTo: readonly string[]): ArticleData {
  return {
    slug,
    title: slug,
    summary: '',
    tags: [],
    html: '<p></p>',
    wordCount: 100,
    readingTime: 1,
    linksTo,
    headings: [],
    confidence: 'P1',
    sources: [],
  };
}

describe('present mode helpers', () => {
  it('sortByCentrality is stable for read mode when scores tie', () => {
    const articles = [
      article('beta', ['alpha']),
      article('alpha', ['beta']),
      article('gamma', []),
    ];

    expect(sortReadByCentrality(articles).map(entry => entry.slug)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('sortByCentrality is stable for search mode when scores tie', () => {
    const articles = [
      article('beta', ['alpha']),
      article('alpha', ['beta']),
      article('gamma', []),
    ];

    expect(sortSearchByCentrality(articles).map(entry => entry.slug)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('shows all tags for small corpora up to the 40-tag ceiling', () => {
    const articles = Array.from({ length: 6 }, (_, index) => ({
      ...article(`article-${index}`, []),
      tags: Array.from({ length: 5 }, (__unused, tagIndex) => `tag-${index * 5 + tagIndex}`),
    }));

    const cloud = buildTagCloud(articles);
    expect((cloud.match(/class="search-tag-pill"/g) ?? []).length).toBe(30);
  });
});

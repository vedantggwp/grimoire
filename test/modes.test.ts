import { describe, expect, it } from 'vitest';

import { sortByCentrality as sortReadByCentrality } from '../lib/present/modes/read.js';
import { sortByCentrality as sortSearchByCentrality } from '../lib/present/modes/search.js';
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
});

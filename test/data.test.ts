import { describe, expect, it, vi } from 'vitest';

import { validateArticleData } from '../lib/present/data.js';

describe('present data validation', () => {
  it('skips invalid articles with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = validateArticleData({
      slug: 'missing-title',
      title: '',
      summary: '',
      tags: [],
      html: '<p>Body</p>',
      wordCount: 100,
      readingTime: 1,
      linksTo: [],
      headings: [],
      confidence: 'P1',
      sources: [],
    }, 'missing-title');

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[present] Skipping article missing-title:'),
    );

    warn.mockRestore();
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadWikiData,
  handleQuery,
  handleListTopics,
  handleGetArticle,
  handleOpenQuestions,
  handleCoverageGaps,
  handleSearch,
  type WikiData,
} from '../lib/serve.js';

const FIXTURES_DIR = join(__dirname, 'fixtures/sample-wiki');
const WIKI_DIR = join(FIXTURES_DIR, 'wiki');
const COMPILE_DIR = join(WIKI_DIR, '.compile');
const COMPILE_SCRIPT = join(__dirname, '../lib/compile.ts');

let data: WikiData;

describe('serve', () => {
  beforeAll(() => {
    // Ensure compile output exists
    if (!existsSync(join(COMPILE_DIR, 'notes.json'))) {
      execSync(`npx tsx ${COMPILE_SCRIPT} ${WIKI_DIR}`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        timeout: 30000,
      });
    }

    data = loadWikiData(FIXTURES_DIR);
  });

  describe('loadWikiData', () => {
    it('loads all required data from the fixture workspace', () => {
      expect(data.notes).toBeDefined();
      expect(data.notes.length).toBeGreaterThan(0);
      expect(data.graph).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(data.searchIndex).toBeDefined();
      expect(data.overviewContent).toBeTruthy();
      expect(data.wikiDir).toBe(WIKI_DIR);
    });

    it('parses schema info from SCHEMA.md', () => {
      expect(data.schemaInfo.topic).toBe('Modern Web Frameworks');
    });

    it('throws when compile directory is missing', () => {
      expect(() => loadWikiData('/nonexistent/path')).toThrow(
        /Compile directory not found/,
      );
    });
  });

  describe('handleQuery', () => {
    it('returns article excerpts for a known topic', () => {
      const result = handleQuery('react', data);
      expect(result).toContain('Results for');
      expect(result).toContain('react');
    });

    it('returns no-results message for unknown query', () => {
      const result = handleQuery('xyzzy_nonexistent_term_42', data);
      expect(result).toContain('No results found');
    });
  });

  describe('handleListTopics', () => {
    it('returns tag counts and totals', () => {
      const result = handleListTopics(data);
      expect(result).toContain('Topics in:');
      expect(result).toContain('Total articles:');
      expect(result).toContain('reactivity');
    });

    it('lists correct total article count', () => {
      const result = handleListTopics(data);
      expect(result).toContain(`Total articles: ${data.notes.length}`);
    });
  });

  describe('handleGetArticle', () => {
    it('retrieves an existing article by slug', () => {
      const result = handleGetArticle('react-fundamentals', data);
      expect(result).toContain('React Fundamentals');
      expect(result).toContain('## Overview');
    });

    it('returns error message for nonexistent slug', () => {
      const result = handleGetArticle('does-not-exist', data);
      expect(result).toContain('Article not found');
      expect(result).toContain('Available slugs');
    });
  });

  describe('handleOpenQuestions', () => {
    it('extracts open questions from overview.md', () => {
      const result = handleOpenQuestions(data);
      expect(result).toContain('Open Questions');
      expect(result).toContain('signals-based reactivity');
      expect(result).toContain('bundle size');
    });

    it('reports count of questions', () => {
      const result = handleOpenQuestions(data);
      expect(result).toContain('(2)');
    });

    it('handles missing overview gracefully', () => {
      const emptyData: WikiData = { ...data, overviewContent: '' };
      const result = handleOpenQuestions(emptyData);
      expect(result).toContain('No overview.md found');
    });

    it('handles overview without open questions section', () => {
      const noQData: WikiData = {
        ...data,
        overviewContent: '# Overview\n\nJust some text.',
      };
      const result = handleOpenQuestions(noQData);
      expect(result).toContain('No "## Open Questions" section found');
    });
  });

  describe('handleCoverageGaps', () => {
    it('detects orphaned links (missing articles)', () => {
      const result = handleCoverageGaps(data);
      expect(result).toContain('nonexistent-article');
      expect(result).toContain('MISSING ARTICLE');
    });

    it('detects thin tags with single article', () => {
      const result = handleCoverageGaps(data);
      // Tags like "jsx", "components", "proxy" each have only 1 article
      expect(result).toContain('THIN TAG');
    });

    it('reports total gap count', () => {
      const result = handleCoverageGaps(data);
      expect(result).toContain('Coverage Gaps');
      expect(result).toMatch(/\(\d+ issues\)/);
    });
  });

  describe('handleSearch', () => {
    it('returns search results for known content', () => {
      const result = handleSearch('react component', 5, data);
      expect(result).toContain('Search:');
      expect(result).toContain('react');
    });

    it('returns no-results message for gibberish', () => {
      const result = handleSearch('xyzzy_nonexistent_42', 5, data);
      expect(result).toContain('No results');
    });

    it('respects the limit parameter', () => {
      const result = handleSearch('reactivity', 2, data);
      // Count the number of result bullets (lines starting with "- **")
      const bulletCount = (result.match(/^- \*\*/gm) ?? []).length;
      expect(bulletCount).toBeLessThanOrEqual(2);
    });
  });
});

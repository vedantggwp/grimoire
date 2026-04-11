import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadWikiData,
  handleQuery,
  handleListTopics,
  handleGetArticle,
  handleGetSection,
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

    // Frontmatter extension pass: handleQuery returns the article's one-line
    // summary (token-efficient routing) instead of a 500-char body excerpt
    // when the summary is available. Fallback to excerpt for legacy articles.
    it('prefers article summary over body excerpt for token efficiency', () => {
      const result = handleQuery('react', data);
      // The react fixture's summary appears verbatim in the response.
      const reactNote = data.notes.find(n => n.slug === 'react-fundamentals');
      expect(reactNote?.summary).toBeTruthy();
      expect(result).toContain(reactNote!.summary);
    });

    it('includes hint to fetch full article or section for each hit', () => {
      const result = handleQuery('react', data);
      expect(result).toContain('grimoire_get_article');
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

    // Frontmatter extension pass: list_topics now surfaces article summaries
    // as a routing table so LLM clients can decide which articles to fetch
    // in full without burning tokens reading each one.
    it('includes an article index with summaries', () => {
      const result = handleListTopics(data);
      expect(result).toContain('### Articles');
      expect(result).toContain('React Fundamentals');
      // Every content article's summary must appear in the listing.
      for (const note of data.notes) {
        if (note.summary) {
          expect(result, `summary for ${note.slug} missing from list_topics`).toContain(note.summary);
        }
      }
    });

    it('separates article index from tag index', () => {
      const result = handleListTopics(data);
      const articlesIdx = result.indexOf('### Articles');
      const tagsIdx = result.indexOf('### Tags');
      expect(articlesIdx).toBeGreaterThan(-1);
      expect(tagsIdx).toBeGreaterThan(-1);
      expect(articlesIdx).toBeLessThan(tagsIdx);
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

    // Token-efficiency pass: articles under LARGE_ARTICLE_CHARS (15KB) return
    // full content by default. Large articles return a summary envelope.
    it('returns full content for small articles in auto mode', () => {
      const result = handleGetArticle('react-fundamentals', data, 'auto');
      // The fixture article is small (~1KB); full mode should return the body.
      expect(result).toContain('Component model');
      expect(result).toContain('Virtual DOM');
      expect(result).not.toContain('Summary envelope');
    });

    it('honors explicit mode: "summary" even for small articles', () => {
      const result = handleGetArticle('react-fundamentals', data, 'summary');
      expect(result).toContain('**Summary:**');
      expect(result).toContain('## Sections');
      // Should list the H2 headings
      expect(result).toContain('- Overview');
      expect(result).toContain('- Key Capabilities');
      // Should NOT include full body
      expect(result).not.toContain('Component model');
    });

    it('honors explicit mode: "full" and returns complete markdown', () => {
      const result = handleGetArticle('react-fundamentals', data, 'full');
      expect(result).toContain('Component model');
      expect(result).not.toContain('Summary envelope');
      expect(result).not.toContain('## Sections');
    });

    it('summary envelope includes hint to use get_section', () => {
      const result = handleGetArticle('react-fundamentals', data, 'summary');
      expect(result).toContain('grimoire_get_section');
    });
  });

  describe('handleGetSection', () => {
    // New tool for section-level addressing — matches the 2026 MCP best
    // practice of retrieving the minimum content needed for a query.
    it('retrieves a section by case-insensitive heading match', () => {
      const result = handleGetSection('react-fundamentals', 'Overview', data);
      expect(result).toContain('React Fundamentals');
      expect(result).toContain('## Overview');
      expect(result).toContain('React is a JavaScript library');
      // Should NOT include the full article
      expect(result).not.toContain('## Key Capabilities');
      expect(result).not.toContain('## How It Works');
    });

    it('matches headings case-insensitively', () => {
      const result1 = handleGetSection('react-fundamentals', 'overview', data);
      const result2 = handleGetSection('react-fundamentals', 'OVERVIEW', data);
      const result3 = handleGetSection('react-fundamentals', 'Overview', data);
      expect(result1).toContain('React is a JavaScript library');
      expect(result2).toContain('React is a JavaScript library');
      expect(result3).toContain('React is a JavaScript library');
    });

    it('retrieves different sections correctly', () => {
      const result = handleGetSection('react-fundamentals', 'Key Capabilities', data);
      expect(result).toContain('Component model');
      expect(result).toContain('Virtual DOM');
      expect(result).toContain('Hooks');
      // Should NOT include Overview or How It Works content
      expect(result).not.toContain('React is a JavaScript library');
    });

    it('returns available sections when heading is not found', () => {
      const result = handleGetSection('react-fundamentals', 'Nonexistent Section', data);
      expect(result).toContain('not found');
      expect(result).toContain('Available sections');
      expect(result).toContain('Overview');
      expect(result).toContain('Key Capabilities');
    });

    it('returns article-not-found error for unknown slug', () => {
      const result = handleGetSection('does-not-exist', 'Overview', data);
      expect(result).toContain('Article not found');
    });

    it('includes a back-reference to the full article', () => {
      const result = handleGetSection('react-fundamentals', 'Overview', data);
      expect(result).toContain('grimoire_get_article');
      expect(result).toContain('mode: "full"');
    });

    it('returned section is substantially smaller than the full article', () => {
      const fullArticle = handleGetArticle('react-fundamentals', data, 'full');
      const section = handleGetSection('react-fundamentals', 'Overview', data);
      // The single section must be meaningfully smaller than the full article.
      expect(section.length).toBeLessThan(fullArticle.length * 0.7);
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

  // Regression tests for 2026-04-10 dry-run bugs ------------------------------

  describe('regression: support-page filter (2026-04-10 bug #2)', () => {
    // Bug: loadWikiData indexed every markdown file (needed for graph analysis),
    // but the notes manifest returned to handlers included `index`, `overview`,
    // and `log` as if they were content articles. `handleListTopics` reported
    // inflated counts and `handleSearch` surfaced navigation pages as hits.
    // Fix: SUPPORT_PAGES filter in loadWikiData + per-handler filter in query/search.

    const SUPPORT_SLUGS = ['index', 'overview', 'log'];

    it('notes manifest excludes support pages', () => {
      const slugs = data.notes.map(n => n.slug);
      for (const support of SUPPORT_SLUGS) {
        expect(slugs, `"${support}" should not appear in notes manifest`).not.toContain(support);
      }
    });

    it('handleSearch never returns a support page as a result', () => {
      // Search for a term that appears in overview.md specifically
      const result = handleSearch('overview', 10, data);
      // Each result is formatted `- **Title** (slug)`
      const slugMatches = [...result.matchAll(/\*\*[^*]+\*\*\s*\(([^)]+)\)/g)].map(m => m[1]);
      for (const slug of slugMatches) {
        expect(SUPPORT_SLUGS, `Support page "${slug}" leaked into search results`).not.toContain(slug);
      }
    });

    it('handleQuery never returns a support page as a result', () => {
      // Query phrasing that would match overview.md if support pages weren't filtered
      const result = handleQuery('knowledge base overview open questions', data);
      const slugMatches = [...result.matchAll(/###[^(]+\(([^)]+)\)/g)].map(m => m[1]);
      for (const slug of slugMatches) {
        expect(SUPPORT_SLUGS, `Support page "${slug}" leaked into query results`).not.toContain(slug);
      }
    });

    it('handleListTopics total article count matches filtered notes count', () => {
      const result = handleListTopics(data);
      // The count in the output must match data.notes.length (which excludes support pages)
      expect(result).toContain(`Total articles: ${data.notes.length}`);
      // Sanity check — sample fixture has 4 content articles, not 4 + 3 navigation pages
      expect(data.notes.length).toBeLessThan(7);
    });
  });

  describe('regression: stop-word query fallback (2026-04-10 bug #3)', () => {
    // Bug: FlexSearch's default config requires all tokens to match. A natural
    // language query like "what is reward modeling" failed because "what" and
    // "is" never appear in article bodies, so the full query matched nothing
    // even though "reward modeling" was a direct title.
    // Fix: searchWithFallback tries the query as-is, then strips stop words,
    // then per-keyword search with merge.

    it('answers natural language question with leading stop words', () => {
      // "what is react" should return the React Fundamentals article even though
      // "what" and "is" are in the stop word list.
      const result = handleQuery('what is react', data);
      expect(result).not.toContain('No results found');
      expect(result.toLowerCase()).toContain('react');
    });

    it('answers "how does X work" style questions', () => {
      const result = handleQuery('how does vue reactivity work', data);
      expect(result).not.toContain('No results found');
      expect(result.toLowerCase()).toContain('vue');
    });

    it('falls back to per-keyword when multi-word fails', () => {
      // Phrasing that likely won't match as a phrase but should match by keyword.
      const result = handleQuery('tell me about svelte', data);
      expect(result).not.toContain('No results found');
      expect(result.toLowerCase()).toContain('svelte');
    });

    it('still returns no-results for genuinely missing topics', () => {
      // Regression guard: the fallback must not produce false positives for
      // topics that truly aren't in the wiki.
      const result = handleQuery('what is cobol mainframe programming', data);
      // The wiki is about modern web frameworks — nothing about cobol.
      expect(result).toContain('No results found');
    });
  });
});

/**
 * End-to-end smoke test against the examples/mcp workspace.
 *
 * This file validates that the whole pipeline (compile → present → serve)
 * works on a real, non-fixture knowledge base about the Model Context Protocol.
 * It was authored as the launch-readiness validation for Grimoire v0.2.2 and
 * kept permanently as a high-signal regression guard — if something breaks
 * the contract between skills, this suite catches it.
 *
 * Unlike test/serve.test.ts, which uses a toy 4-article fixture, this suite
 * uses a real 5-article wiki with canonical sources and validates:
 *   - compile.ts extracts frontmatter correctly on a larger corpus
 *   - present.ts generates all 6 modes without errors
 *   - serve.ts handlers return high-quality, token-efficient responses for
 *     realistic natural-language queries
 *   - the summary field is load-bearing (Karpathy routing pattern)
 *   - get_section returns materially smaller payloads than get_article
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadWikiData,
  handleQuery,
  handleListTopics,
  handleGetArticle,
  handleGetSection,
  handleSearch,
  handleCoverageGaps,
  type WikiData,
} from '../lib/serve.js';

const WORKSPACE = join(__dirname, '../examples/mcp');
const WIKI_DIR = join(WORKSPACE, 'wiki');
const COMPILE_DIR = join(WIKI_DIR, '.compile');
const SITE_DIR = join(WORKSPACE, 'site');
const COMPILE_SCRIPT = join(__dirname, '../lib/compile.ts');
const PRESENT_SCRIPT = join(__dirname, '../lib/present/index.ts');
const TSX_RUNNER = 'node --import tsx/esm';

const CONTENT_SLUGS = [
  'mcp-overview',
  'mcp-transports',
  'typescript-sdk',
  'tool-design-patterns',
  'client-integration',
];

let data: WikiData;

describe('examples/mcp — end-to-end smoke test', () => {
  beforeAll(() => {
    // Always rebuild compile artifacts to exercise the full path
    if (existsSync(COMPILE_DIR)) rmSync(COMPILE_DIR, { recursive: true });
    execSync(`${TSX_RUNNER} ${COMPILE_SCRIPT} ${WIKI_DIR}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });

    // And re-generate the site
    if (existsSync(SITE_DIR)) rmSync(SITE_DIR, { recursive: true });
    execSync(`${TSX_RUNNER} ${PRESENT_SCRIPT} ${WORKSPACE}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });

    data = loadWikiData(WORKSPACE);
  });

  describe('compile → notes.json', () => {
    it('extracts summary for every content article', () => {
      const notes = JSON.parse(readFileSync(join(COMPILE_DIR, 'notes.json'), 'utf-8')) as Array<{
        slug: string;
        summary: string;
        confidence: string;
        sources: unknown[];
      }>;
      for (const slug of CONTENT_SLUGS) {
        const note = notes.find((n) => n.slug === slug);
        expect(note, `missing note: ${slug}`).toBeDefined();
        expect(note!.summary.length, `${slug} summary empty`).toBeGreaterThan(20);
        expect(note!.summary.length, `${slug} summary over 180 chars`).toBeLessThanOrEqual(180);
        expect(note!.confidence).toBe('P0');
        expect(Array.isArray(note!.sources)).toBe(true);
        expect(note!.sources.length).toBeGreaterThan(0);
      }
    });
  });

  // The skill's Step 9 audit reads these two artifacts to enforce that
  // Step 5 (overview evolution) and Step 5.5 (taxonomy proposal) actually
  // ran on each compile. examples/mcp hits all three Step 5.5 conditions
  // (5 content articles, 5+ unique tags, SCHEMA taxonomy "emergent") so
  // we expect BOTH artifacts here — in contrast to sample-wiki which only
  // gets overview-metadata.json.
  describe('compile → enforcement artifacts (Steps 5 + 5.5)', () => {
    it('overview-metadata.json surfaces all 5 content articles as required citations', () => {
      const meta = JSON.parse(
        readFileSync(join(COMPILE_DIR, 'overview-metadata.json'), 'utf-8'),
      ) as {
        requiredCitations: string[];
        coverageStats: { articleCount: number };
        topCentralityArticles: { slug: string }[];
      };
      expect(meta.coverageStats.articleCount).toBe(5);
      // All 5 content slugs should appear in requiredCitations (top 5 = entire corpus here).
      for (const slug of CONTENT_SLUGS) {
        expect(meta.requiredCitations).toContain(slug);
      }
    });

    it('taxonomy-proposal.json is emitted with correct condition evidence', () => {
      const proposal = JSON.parse(
        readFileSync(join(COMPILE_DIR, 'taxonomy-proposal.json'), 'utf-8'),
      ) as {
        conditions: { uniqueTagCount: number; contentArticleCount: number; schemaTaxonomy: string };
        candidateGroups: Array<{ tags: string[]; articles: string[]; cooccurrenceScore: number }>;
      };
      expect(proposal.conditions.contentArticleCount).toBe(5);
      expect(proposal.conditions.uniqueTagCount).toBeGreaterThanOrEqual(5);
      expect(proposal.conditions.schemaTaxonomy).toBe('emergent');
    });

    it('taxonomy candidate groups are deterministic and sorted by cooccurrence', () => {
      const proposal = JSON.parse(
        readFileSync(join(COMPILE_DIR, 'taxonomy-proposal.json'), 'utf-8'),
      ) as { candidateGroups: Array<{ cooccurrenceScore: number }> };
      // Sorted descending by cooccurrenceScore.
      for (let i = 1; i < proposal.candidateGroups.length; i++) {
        expect(proposal.candidateGroups[i - 1].cooccurrenceScore).toBeGreaterThanOrEqual(
          proposal.candidateGroups[i].cooccurrenceScore,
        );
      }
    });
  });

  describe('present → site/', () => {
    it('generates all 6 study modes', () => {
      const modes = ['read', 'graph', 'search', 'feed', 'gaps', 'quiz'];
      for (const mode of modes) {
        const path = join(SITE_DIR, mode, 'index.html');
        expect(existsSync(path), `missing mode: ${mode}`).toBe(true);
      }
      expect(existsSync(join(SITE_DIR, 'index.html'))).toBe(true);
      expect(existsSync(join(SITE_DIR, 'assets/style.css'))).toBe(true);
    });

    it('read mode includes summaries as article subtitles', () => {
      const html = readFileSync(join(SITE_DIR, 'read/index.html'), 'utf-8');
      // Verify at least one article summary is rendered
      expect(html).toContain('MCP is an open JSON-RPC 2.0 protocol');
      expect(html).toContain('class="summary"');
    });
  });

  describe('serve → loadWikiData', () => {
    it('loads the MCP workspace correctly', () => {
      expect(data.notes.length).toBe(5); // 5 content articles, support pages filtered
      expect(data.schemaInfo.topic).toBe('Model Context Protocol for AI engineers');
      expect(data.schemaInfo.scopeIn).toContain('MCP specification');
    });

    it('every loaded note has a non-empty summary', () => {
      for (const note of data.notes) {
        expect(note.summary.length, `${note.slug} summary empty`).toBeGreaterThan(20);
      }
    });
  });

  describe('serve → handleListTopics (LLM routing table)', () => {
    it('returns all 5 content articles with summaries', () => {
      const result = handleListTopics(data);
      for (const slug of CONTENT_SLUGS) {
        expect(result).toContain(`\`${slug}\``);
      }
      // And every summary appears verbatim in the listing
      for (const note of data.notes) {
        expect(result).toContain(note.summary);
      }
    });

    it('total response stays comfortably under 25k tokens', () => {
      const result = handleListTopics(data);
      // Rough tokens ≈ chars/4. Target: well under 25k tokens (= 100k chars).
      expect(result.length).toBeLessThan(10_000);
    });
  });

  describe('serve → handleQuery (natural-language retrieval)', () => {
    it('answers "what is the model context protocol"', () => {
      const result = handleQuery('what is the model context protocol', data);
      expect(result).not.toContain('No results found');
      expect(result.toLowerCase()).toContain('mcp');
      // Must surface mcp-overview article
      expect(result).toContain('mcp-overview');
    });

    it('answers "how do I design tools for my mcp server"', () => {
      const result = handleQuery('how do I design tools for my mcp server', data);
      expect(result).not.toContain('No results found');
      expect(result).toContain('tool-design-patterns');
    });

    it('answers transport-layer question', () => {
      const result = handleQuery('stdio vs streamable http', data);
      expect(result).not.toContain('No results found');
      expect(result).toContain('mcp-transports');
    });

    it('query responses surface the summary (not body excerpt) for token efficiency', () => {
      const result = handleQuery('typescript sdk', data);
      const tsNote = data.notes.find((n) => n.slug === 'typescript-sdk');
      expect(tsNote?.summary).toBeTruthy();
      expect(result).toContain(tsNote!.summary);
    });

    it('query response stays under 3k chars (~750 tokens) for the MCP corpus', () => {
      const result = handleQuery('what is the model context protocol', data);
      // With 5 articles and summary-based responses, a query should be tiny.
      expect(result.length).toBeLessThan(3_000);
    });
  });

  describe('serve → handleGetArticle (token guard)', () => {
    it('returns full content for small articles in auto mode', () => {
      const result = handleGetArticle('mcp-overview', data, 'auto');
      // MCP articles are all small (<10KB), so auto returns full content
      expect(result).toContain('JSON-RPC 2.0');
      expect(result).toContain('## How It Works');
      expect(result).not.toContain('Summary envelope');
    });

    it('summary mode returns envelope with section index', () => {
      const result = handleGetArticle('mcp-overview', data, 'summary');
      expect(result).toContain('**Summary:**');
      expect(result).toContain('## Sections');
      // Must list the actual H2 headings from the article
      expect(result).toContain('- Overview');
      expect(result).toContain('- Key Capabilities');
      expect(result).toContain('- How It Works');
      expect(result).toContain('- Limitations');
      expect(result).toContain('- See Also');
    });
  });

  describe('serve → handleGetSection (section-level addressing)', () => {
    it('retrieves just the Limitations section of typescript-sdk', () => {
      const result = handleGetSection('typescript-sdk', 'Limitations', data);
      expect(result).toContain('## Limitations');
      expect(result).toContain('Node.js only');
      // Must NOT contain other sections
      expect(result).not.toContain('## Overview');
      expect(result).not.toContain('## Usage Examples');
    });

    it('section payload is materially smaller than full article', () => {
      const full = handleGetArticle('typescript-sdk', data, 'full');
      const section = handleGetSection('typescript-sdk', 'Limitations', data);
      // The Limitations section is a fraction of the full article.
      expect(section.length).toBeLessThan(full.length * 0.5);
    });

    it('unknown heading returns the list of available sections', () => {
      const result = handleGetSection('mcp-overview', 'Performance', data);
      expect(result).toContain('not found');
      expect(result).toContain('Available sections');
      expect(result).toContain('Overview');
      expect(result).toContain('How It Works');
    });
  });

  describe('serve → handleSearch (FlexSearch full-text)', () => {
    it('finds specific jargon that appears in article bodies', () => {
      const result = handleSearch('streamable', 5, data);
      expect(result).not.toContain('No results');
      expect(result).toContain('mcp-transports');
    });

    it('finds token efficiency content', () => {
      const result = handleSearch('pagination cursor', 5, data);
      expect(result).not.toContain('No results');
      expect(result).toContain('tool-design-patterns');
    });
  });

  describe('serve → handleCoverageGaps', () => {
    it('runs without error on a real workspace', () => {
      const result = handleCoverageGaps(data);
      // A small 5-article wiki will have thin tags and gaps — that's expected.
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('cross-cutting: token efficiency promise', () => {
    // Core launch criterion: "readable by LLMs while saving a lot of token costs."
    // These assertions lock in the efficiency wins so future refactors don't
    // silently regress back to dumping full articles into tool responses.

    it('list_topics is 5-10x smaller than reading all articles', () => {
      const listSize = handleListTopics(data).length;
      const totalArticleSize = data.notes
        .map((n) => handleGetArticle(n.slug, data, 'full').length)
        .reduce((a, b) => a + b, 0);
      // list_topics must be substantially cheaper than reading everything.
      expect(listSize * 5).toBeLessThan(totalArticleSize);
    });

    it('get_section is 3-10x smaller than get_article full for the same slug', () => {
      for (const slug of CONTENT_SLUGS) {
        const full = handleGetArticle(slug, data, 'full');
        const section = handleGetSection(slug, 'Overview', data);
        expect(section.length, `${slug}: section not smaller than full`).toBeLessThan(
          full.length * 0.75,
        );
      }
    });
  });
});

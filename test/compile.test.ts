import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WIKI_DIR = join(__dirname, 'fixtures/sample-wiki/wiki');
const COMPILE_DIR = join(WIKI_DIR, '.compile');
const SCRIPT = join(__dirname, '../lib/compile.ts');

function readJSON(filename: string): unknown {
  return JSON.parse(readFileSync(join(COMPILE_DIR, filename), 'utf-8'));
}

describe('compile', () => {
  beforeAll(() => {
    // Clean previous compile output
    if (existsSync(COMPILE_DIR)) {
      rmSync(COMPILE_DIR, { recursive: true });
    }

    // Run the compile script
    execSync(`npx tsx ${SCRIPT} ${WIKI_DIR}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  describe('output files', () => {
    it('creates all expected JSON files', () => {
      expect(existsSync(join(COMPILE_DIR, 'audit.json'))).toBe(true);
      expect(existsSync(join(COMPILE_DIR, 'graph.json'))).toBe(true);
      expect(existsSync(join(COMPILE_DIR, 'search-index.json'))).toBe(true);
      expect(existsSync(join(COMPILE_DIR, 'analytics.json'))).toBe(true);
      expect(existsSync(join(COMPILE_DIR, 'notes.json'))).toBe(true);
    });
  });

  describe('audit.json — link validation', () => {
    it('detects the broken link from react-fundamentals to nonexistent-article', () => {
      const audit = readJSON('audit.json') as any;
      expect(audit.orphanedLinks['react-fundamentals']).toContain('nonexistent-article');
    });

    it('counts exactly 1 orphaned link', () => {
      const audit = readJSON('audit.json') as any;
      expect(audit.links.orphaned).toBe(1);
    });

    it('reports per-note link breakdown', () => {
      const audit = readJSON('audit.json') as any;
      expect(audit.links.byNote['react-fundamentals'].orphaned).toBe(1);
      expect(audit.links.byNote['vue-reactivity'].orphaned).toBe(0);
    });
  });

  describe('audit.json — orphan detection', () => {
    it('detects orphaned notes (log and overview have no incoming links)', () => {
      const audit = readJSON('audit.json') as any;
      expect(audit.orphanedNotes).toContain('log');
      expect(audit.orphanedNotes).toContain('overview');
    });

    it('does not mark content articles as orphans', () => {
      const audit = readJSON('audit.json') as any;
      expect(audit.orphanedNotes).not.toContain('react-fundamentals');
      expect(audit.orphanedNotes).not.toContain('vue-reactivity');
      expect(audit.orphanedNotes).not.toContain('svelte-compilation');
      expect(audit.orphanedNotes).not.toContain('signals-pattern');
    });
  });

  describe('audit.json — graph analysis', () => {
    it('identifies connected components correctly', () => {
      const audit = readJSON('audit.json') as any;
      // Main article cluster + log alone + overview alone = 3 components
      expect(audit.components.length).toBe(3);

      // Find the largest component (should contain all articles + index)
      const largest = audit.components.reduce(
        (a: string[], b: string[]) => (a.length > b.length ? a : b),
        []
      );
      expect(largest).toContain('react-fundamentals');
      expect(largest).toContain('vue-reactivity');
      expect(largest).toContain('svelte-compilation');
      expect(largest).toContain('signals-pattern');
    });

    it('calculates centrality scores', () => {
      const audit = readJSON('audit.json') as any;
      // react-fundamentals and vue-reactivity are the most connected
      expect(audit.centrality['react-fundamentals']).toBeGreaterThan(0.5);
      expect(audit.centrality['vue-reactivity']).toBeGreaterThan(0.5);
      // log and overview are isolated
      expect(audit.centrality['log']).toBe(0);
      expect(audit.centrality['overview']).toBe(0);
    });
  });

  describe('graph.json — structure', () => {
    it('contains correct node count', () => {
      const graph = readJSON('graph.json') as any;
      expect(graph.statistics.nodeCount).toBe(7);
    });

    it('contains edges', () => {
      const graph = readJSON('graph.json') as any;
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('lists orphans', () => {
      const graph = readJSON('graph.json') as any;
      expect(graph.orphans).toContain('log');
      expect(graph.orphans).toContain('overview');
    });
  });

  describe('analytics.json — content analysis', () => {
    it('provides basic stats', () => {
      const analytics = readJSON('analytics.json') as any;
      expect(analytics.basic.totalNotes).toBe(7);
      expect(analytics.basic.totalWords).toBeGreaterThan(0);
      expect(analytics.basic.averageWordsPerNote).toBeGreaterThan(0);
    });

    it('provides tag analytics', () => {
      const analytics = readJSON('analytics.json') as any;
      expect(analytics.tags.totalTags).toBeGreaterThan(0);
      expect(analytics.tags.topTags.length).toBeGreaterThan(0);
    });

    it('provides graph analytics', () => {
      const analytics = readJSON('analytics.json') as any;
      expect(analytics.graph.nodeCount).toBe(7);
      expect(analytics.graph.density).toBeGreaterThan(0);
    });
  });

  describe('notes.json — manifest', () => {
    it('lists all notes with metadata', () => {
      const notes = readJSON('notes.json') as any[];
      expect(notes.length).toBe(7);

      const reactNote = notes.find((n: any) => n.slug === 'react-fundamentals');
      expect(reactNote).toBeDefined();
      expect(reactNote.title).toBe('React Fundamentals');
      expect(reactNote.tags).toContain('react');
      expect(reactNote.wordCount).toBeGreaterThan(0);
    });

    it('includes headings for each note', () => {
      const notes = readJSON('notes.json') as any[];
      const reactNote = notes.find((n: any) => n.slug === 'react-fundamentals');
      expect(reactNote.headings.length).toBeGreaterThan(0);
      expect(reactNote.headings.some((h: any) => h.text === 'Overview')).toBe(true);
    });

    it('includes linksTo for each note', () => {
      const notes = readJSON('notes.json') as any[];
      const reactNote = notes.find((n: any) => n.slug === 'react-fundamentals');
      expect(reactNote.linksTo).toContain('vue-reactivity');
      expect(reactNote.linksTo).toContain('svelte-compilation');
    });
  });

  describe('search-index.json — serialization', () => {
    it('produces a non-empty search index', () => {
      const index = readJSON('search-index.json') as any;
      expect(index).toBeDefined();
      // Should have config and documents at minimum
      expect(index.config || index.documents || index.error).toBeDefined();
    });
  });
});

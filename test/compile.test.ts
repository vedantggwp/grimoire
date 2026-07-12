import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WIKI_DIR = join(__dirname, 'fixtures/sample-wiki/wiki');
const COMPILE_DIR = join(WIKI_DIR, '.compile');
const DEGRADED_WORKSPACE = join(__dirname, 'fixtures/degraded-source-wiki');
const DEGRADED_COMPILE_DIR = join(DEGRADED_WORKSPACE, 'wiki/.compile');
const SCRIPT = join(__dirname, '../lib/compile.ts');
const TSX_RUNNER = 'node --import tsx/esm';

function readJSON(filename: string): unknown {
  return JSON.parse(readFileSync(join(COMPILE_DIR, filename), 'utf-8'));
}

function createNoCandidateTaxonomyWorkspace(root: string): void {
  const wikiDir = join(root, 'wiki');
  mkdirSync(wikiDir, { recursive: true });
  mkdirSync(join(wikiDir, '.compile'), { recursive: true });

  writeFileSync(join(root, 'SCHEMA.md'), `# Test Schema

## Domain

\`\`\`
topic: Dogfood Taxonomy Edge
taxonomy: "emergent"
scope:
  in: "Taxonomy proposal regression"
  out: "Production content"
\`\`\`
`, 'utf-8');

  writeFileSync(join(wikiDir, 'index.md'), `# Wiki Index

| Article | Summary |
|---------|---------|
| [[article-one]] | First article |
| [[article-two]] | Second article |
| [[article-three]] | Third article |
| [[article-four]] | Fourth article |
| [[article-five]] | Fifth article |
`, 'utf-8');

  writeFileSync(join(wikiDir, 'overview.md'), `# Overview

## Open Questions

- What categories should emerge?
`, 'utf-8');

  writeFileSync(join(wikiDir, 'log.md'), `# Wiki Log

## 2026-07-06 — Test workspace

- Created for taxonomy proposal regression.
`, 'utf-8');

  const articles = [
    ['article-one', 'Article One', 'alpha'],
    ['article-two', 'Article Two', 'bravo'],
    ['article-three', 'Article Three', 'charlie'],
    ['article-four', 'Article Four', 'delta'],
    ['article-five', 'Article Five', 'echo'],
  ] as const;

  for (const [slug, title, tag] of articles) {
    writeFileSync(join(wikiDir, `${slug}.md`), `---
title: "${title}"
summary: "${title} covers a distinct topic with a unique tag so no taxonomy group can be inferred."
tags: [${tag}]
sources: []
updated: 2026-07-06
confidence: P1
---

# ${title}

## Overview

${title} is intentionally tagged with only ${tag}. The fixture has enough
content articles and enough unique tags to pass the taxonomy proposal gates,
but no pair of tags co-occurs across two articles.
`, 'utf-8');
  }

  writeFileSync(join(wikiDir, '.compile', 'taxonomy-proposal.json'), '{"stale": true}', 'utf-8');
}

function createUnknownFidelityWorkspace(root: string): void {
  const wikiDir = join(root, 'wiki');
  const rawDir = join(root, 'raw', 'legacy');
  mkdirSync(wikiDir, { recursive: true });
  mkdirSync(rawDir, { recursive: true });

  writeFileSync(join(root, 'SCHEMA.md'), `# Test Schema

## Domain

\`\`\`
topic: Legacy Fidelity Wiki
taxonomy: "emergent"
scope:
  in: "Back-compat"
  out: "Production content"
\`\`\`
`, 'utf-8');

  writeFileSync(join(wikiDir, 'index.md'), `# Index

| Article |
|---------|
| [[legacy-article]] |
| [[zero-source]] |
| [[all-unknown]] |
| [[final-url-bridge]] |
| [[duplicate-capture]] |
`, 'utf-8');
  writeFileSync(join(wikiDir, 'overview.md'), '# Overview\n\n## Open Questions\n\n- None.\n', 'utf-8');
  writeFileSync(join(wikiDir, 'log.md'), '# Log\n\n## 2026-07-06 — Legacy fixture\n\n- Created.\n', 'utf-8');

  writeFileSync(join(wikiDir, 'legacy-article.md'), `---
title: "Legacy Article"
summary: "A legacy article whose raw source predates the fidelity frontmatter field and must not show a false warning."
tags: [legacy]
sources:
  - url: "https://example.com/legacy-source"
    title: "Legacy Source"
    accessed: 2026-07-06
updated: 2026-07-06
confidence: P1
---

# Legacy Article

## Overview

Legacy content should compile as full for display while still logging that
fidelity is untracked.
`, 'utf-8');

  writeFileSync(join(wikiDir, 'zero-source.md'), `---
title: "Zero Source"
summary: "An article with no source list must not pretend to have full source fidelity."
tags: [legacy]
sources: []
updated: 2026-07-06
confidence: P2
---

# Zero Source

## Overview

This article has no citations.
`, 'utf-8');

  writeFileSync(join(wikiDir, 'all-unknown.md'), `---
title: "All Unknown"
summary: "An article whose cited source has no matching raw capture must become unknown."
tags: [legacy]
sources:
  - url: "https://example.com/missing-raw-source"
    title: "Missing Raw Source"
    accessed: 2026-07-06
updated: 2026-07-06
confidence: P2
---

# All Unknown

## Overview

This article cites a source that is not present in raw archives.
`, 'utf-8');

  writeFileSync(join(wikiDir, 'final-url-bridge.md'), `---
title: "Final URL Bridge"
summary: "An article citing the post-redirect URL should match raw capture final_url."
tags: [legacy]
sources:
  - url: "https://example.com/docs/final"
    title: "Redirected Docs"
    accessed: 2026-07-06
updated: 2026-07-06
confidence: P1
---

# Final URL Bridge

## Overview

This article cites the final URL produced by source capture redirects.
`, 'utf-8');

  writeFileSync(join(wikiDir, 'duplicate-capture.md'), `---
title: "Duplicate Capture"
summary: "An article with duplicate raw captures should use the best capture fidelity."
tags: [legacy]
sources:
  - url: "https://example.com/duplicate-source"
    title: "Duplicate Source"
    accessed: 2026-07-06
updated: 2026-07-06
confidence: P1
---

# Duplicate Capture

## Overview

This article cites a URL captured more than once.
`, 'utf-8');

  writeFileSync(join(rawDir, '2026-07-06-legacy-source.md'), `---
source_url: "https://example.com/legacy-source"
collected: 2026-07-06
published: 2026-07-06
type: article
author: "Fixture"
title: "Legacy Source"
---

# Legacy Source

Raw content from a pre-v0.5 archive with no fidelity field.
`, 'utf-8');

  writeFileSync(join(rawDir, '2026-07-06-redirected-source.md'), `---
source_url: "https://example.com/docs/original"
final_url: "https://example.com/docs/final"
captured_at: "2026-07-06T10:00:00.000Z"
type: article
author: "Fixture"
title: "Redirected Docs"
fidelity: full
---

# Redirected Docs

Raw content captured after following a redirect.
`, 'utf-8');

  writeFileSync(join(rawDir, '2026-07-05-duplicate-full.md'), `---
source_url: "https://example.com/duplicate-source"
captured_at: "2026-07-05T10:00:00.000Z"
type: article
author: "Fixture"
title: "Duplicate Source Full"
fidelity: full
---

# Duplicate Source

Best raw capture.
`, 'utf-8');

  writeFileSync(join(rawDir, '2026-07-06-duplicate-failed.md'), `---
source_url: "https://example.com/duplicate-source"
captured_at: "2026-07-06T10:00:00.000Z"
type: article
author: "Fixture"
title: "Duplicate Source Failed"
fidelity: failed
---

# Duplicate Source

Later but worse raw capture.
`, 'utf-8');
}

describe('compile', () => {
  beforeAll(() => {
    // Clean previous compile output
    if (existsSync(COMPILE_DIR)) {
      rmSync(COMPILE_DIR, { recursive: true });
    }

    // Run the compile script
    execSync(`${TSX_RUNNER} ${SCRIPT} ${WIKI_DIR}`, {
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
      expect(analytics.basic.contentArticles).toBe(4);
      expect(analytics.basic.supportPages).toBe(3);
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

    // Frontmatter extension pass (2026-04-11): compile.ts extracts summary,
    // confidence, and sources from each article's frontmatter and emits them
    // in notes.json so downstream skills (serve, present) can route and
    // render without fishing fields out of graph.json metadata.
    it('emits frontmatter summary for content articles', () => {
      const notes = readJSON('notes.json') as any[];
      const contentArticles = ['react-fundamentals', 'vue-reactivity', 'svelte-compilation', 'signals-pattern'];
      for (const slug of contentArticles) {
        const note = notes.find((n: any) => n.slug === slug);
        expect(note, `missing note: ${slug}`).toBeDefined();
        expect(typeof note.summary).toBe('string');
        expect(note.summary.length, `${slug} has empty summary`).toBeGreaterThan(20);
        expect(note.summary.length, `${slug} summary exceeds 180 chars`).toBeLessThanOrEqual(180);
      }
    });

    it('emits frontmatter confidence for content articles', () => {
      const notes = readJSON('notes.json') as any[];
      const react = notes.find((n: any) => n.slug === 'react-fundamentals');
      expect(react.confidence).toBe('P0');
      const vue = notes.find((n: any) => n.slug === 'vue-reactivity');
      expect(vue.confidence).toBe('P1');
    });

    it('emits frontmatter sources array for content articles', () => {
      const notes = readJSON('notes.json') as any[];
      const react = notes.find((n: any) => n.slug === 'react-fundamentals');
      expect(Array.isArray(react.sources)).toBe(true);
      expect(react.sources.length).toBeGreaterThan(0);
      expect(react.sources[0].url).toContain('react.dev');
      expect(typeof react.sources[0].title).toBe('string');
    });

    it('emits empty fields gracefully for support pages without frontmatter', () => {
      const notes = readJSON('notes.json') as any[];
      const log = notes.find((n: any) => n.slug === 'log');
      expect(log).toBeDefined();
      // Support pages shouldn't crash the extractor — they get empty fields.
      expect(typeof log.summary).toBe('string');
      expect(typeof log.confidence).toBe('string');
      expect(Array.isArray(log.sources)).toBe(true);
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

  // Enforcement artifacts for the skill's Step 9 audit. overview-metadata.json
  // is always present; taxonomy-proposal.json is conditional on 5+ content
  // articles, 5+ unique tags, and SCHEMA taxonomy != "defined".
  describe('overview-metadata.json — Step 5 enforcement evidence', () => {
    it('is written every run', () => {
      expect(existsSync(join(COMPILE_DIR, 'overview-metadata.json'))).toBe(true);
    });

    it('ranks the top 5 content articles by centrality', () => {
      const meta = readJSON('overview-metadata.json') as any;
      expect(Array.isArray(meta.topCentralityArticles)).toBe(true);
      // sample-wiki has 4 content articles, so the ranked list tops out at 4
      expect(meta.topCentralityArticles.length).toBeGreaterThan(0);
      expect(meta.topCentralityArticles.length).toBeLessThanOrEqual(5);
      for (const entry of meta.topCentralityArticles) {
        expect(typeof entry.slug).toBe('string');
        expect(typeof entry.title).toBe('string');
        expect(typeof entry.centrality).toBe('number');
      }
    });

    it('excludes support pages from centrality ranking', () => {
      const meta = readJSON('overview-metadata.json') as any;
      const slugs = meta.topCentralityArticles.map((e: any) => e.slug);
      expect(slugs).not.toContain('index');
      expect(slugs).not.toContain('log');
      expect(slugs).not.toContain('overview');
    });

    it('emits required-citation slugs the skill audit must find in overview.md', () => {
      const meta = readJSON('overview-metadata.json') as any;
      expect(Array.isArray(meta.requiredCitations)).toBe(true);
      expect(meta.requiredCitations).toEqual(
        meta.topCentralityArticles.map((e: any) => e.slug),
      );
    });

    it('emits coverage stats (articleCount, totalWords, sourceCount, crossRefs)', () => {
      const meta = readJSON('overview-metadata.json') as any;
      expect(meta.coverageStats.articleCount).toBe(4); // 4 content articles in sample-wiki
      expect(meta.coverageStats.contentArticles).toBe(4);
      expect(meta.coverageStats.supportPages).toBe(3);
      expect(meta.coverageStats.totalWords).toBeGreaterThan(0);
      expect(meta.coverageStats.crossRefs).toBeGreaterThan(0);
      expect(typeof meta.coverageStats.componentCount).toBe('number');
      expect(Array.isArray(meta.coverageStats.isolatedContentNotes)).toBe(true);
    });

    it('emits topic clusters based on connected components (support pages filtered)', () => {
      const meta = readJSON('overview-metadata.json') as any;
      expect(Array.isArray(meta.topicClusters)).toBe(true);
      for (const cluster of meta.topicClusters) {
        expect(typeof cluster.componentId).toBe('number');
        expect(Array.isArray(cluster.articles)).toBe(true);
        for (const slug of cluster.articles) {
          expect(['index', 'log', 'overview']).not.toContain(slug);
        }
      }
    });
  });

  describe('taxonomy-proposal.json — Step 5.5 enforcement trigger', () => {
    it('is NOT written when content article count < 5 (sample-wiki has 4)', () => {
      // Sample-wiki has 4 content articles, which is under the Step 5.5
      // threshold. Absence of the file is the signal that conditions were
      // not met — the skill uses this to decide whether to skip silently.
      expect(existsSync(join(COMPILE_DIR, 'taxonomy-proposal.json'))).toBe(false);
    });
  });
});

describe('compile — raw-source fidelity gates', () => {
  let stdout = '';

  beforeAll(() => {
    if (existsSync(DEGRADED_COMPILE_DIR)) {
      rmSync(DEGRADED_COMPILE_DIR, { recursive: true });
    }

    stdout = execSync(`${TSX_RUNNER} ${SCRIPT} ${DEGRADED_WORKSPACE}`, {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    rmSync(DEGRADED_COMPILE_DIR, { recursive: true, force: true });
  });

  it('aggregates per-article sourceFidelity by worst cited raw source', () => {
    const notes = JSON.parse(readFileSync(join(DEGRADED_COMPILE_DIR, 'notes.json'), 'utf-8')) as any[];
    expect(notes.find(n => n.slug === 'full-capture')?.sourceFidelity).toBe('full');
    expect(notes.find(n => n.slug === 'mixed-capture')?.sourceFidelity).toBe('mixed');
    expect(notes.find(n => n.slug === 'degraded-capture')?.sourceFidelity).toBe('degraded');
  });

  it('emits source fidelity summary metadata and compile summary line', () => {
    const overview = JSON.parse(readFileSync(join(DEGRADED_COMPILE_DIR, 'overview-metadata.json'), 'utf-8')) as any;
    expect(overview.sourceFidelity).toMatchObject({
      full: 1,
      mixed: 1,
      degraded: 1,
      unknownSources: 0,
      degradedArticles: ['degraded-capture'],
    });
    expect(stdout).toContain('1 articles on degraded sources');
  });
});

describe('compile — fidelity unknown back-compat', () => {
  const WORKSPACE_DIR = mkdtempSync(join(tmpdir(), 'grimoire-fidelity-unknown-'));
  const WIKI_DIR = join(WORKSPACE_DIR, 'wiki');
  const COMPILE_DIR = join(WIKI_DIR, '.compile');
  let stdout = '';

  beforeAll(() => {
    createUnknownFidelityWorkspace(WORKSPACE_DIR);
    stdout = execSync(`${TSX_RUNNER} ${SCRIPT} ${WORKSPACE_DIR}`, {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    rmSync(WORKSPACE_DIR, { recursive: true, force: true });
  });

  it('treats missing fidelity frontmatter as unknown and logs untracked status', () => {
    const notes = JSON.parse(readFileSync(join(COMPILE_DIR, 'notes.json'), 'utf-8')) as any[];
    expect(notes.find(n => n.slug === 'legacy-article')?.sourceFidelity).toBe('unknown');
    expect(notes.find(n => n.slug === 'legacy-article')?.unknownSourceCount).toBe(1);
    expect(notes.find(n => n.slug === 'zero-source')?.sourceFidelity).toBe('unknown');
    expect(notes.find(n => n.slug === 'zero-source')?.unknownSourceCount).toBe(0);
    expect(notes.find(n => n.slug === 'all-unknown')?.sourceFidelity).toBe('unknown');
    expect(notes.find(n => n.slug === 'all-unknown')?.unknownSourceCount).toBe(1);

    const overview = JSON.parse(readFileSync(join(COMPILE_DIR, 'overview-metadata.json'), 'utf-8')) as any;
    expect(overview.sourceFidelity.degraded).toBe(0);
    expect(overview.sourceFidelity.unknown).toBe(3);
    expect(overview.sourceFidelity.unknownSources).toBe(2);
    expect(overview.sourceFidelity.unknownArticles).toEqual(['all-unknown', 'legacy-article', 'zero-source']);
    expect(stdout).toContain('0 articles on degraded sources');
    expect(stdout).toContain('3 articles with untracked provenance');
    expect(stdout).toContain('fidelity untracked (pre-v0.5 wiki)');
  });

  it('bridges final_url captures and prefers the best duplicate capture', () => {
    const notes = JSON.parse(readFileSync(join(COMPILE_DIR, 'notes.json'), 'utf-8')) as any[];
    expect(notes.find(n => n.slug === 'final-url-bridge')?.sourceFidelity).toBe('full');
    expect(notes.find(n => n.slug === 'duplicate-capture')?.sourceFidelity).toBe('full');
    expect(stdout).toContain('raw source fidelity collision for https://example.com/duplicate-source');
  });
});

// Path auto-detection pass (2026-04-15): compile.ts accepts either a workspace
// root (which contains wiki/) or a wiki directory directly. This block verifies
// that passing the sample-wiki workspace root produces the same .compile/
// artifacts under sample-wiki/wiki/.compile/ as passing sample-wiki/wiki/ did.
describe('compile — workspace root input', () => {
  const WORKSPACE_DIR = join(__dirname, 'fixtures/sample-wiki');

  beforeAll(() => {
    if (existsSync(COMPILE_DIR)) {
      rmSync(COMPILE_DIR, { recursive: true });
    }

    execSync(`${TSX_RUNNER} ${SCRIPT} ${WORKSPACE_DIR}`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  it('auto-detects wiki/ subdirectory and writes .compile/ under workspace/wiki/', () => {
    expect(existsSync(COMPILE_DIR)).toBe(true);
    expect(existsSync(join(COMPILE_DIR, 'notes.json'))).toBe(true);
    expect(existsSync(join(COMPILE_DIR, 'graph.json'))).toBe(true);
    expect(existsSync(join(COMPILE_DIR, 'audit.json'))).toBe(true);
  });

  it('produces identical note count to direct wiki-path invocation', () => {
    const notes = readJSON('notes.json') as any[];
    expect(notes.length).toBe(7);
  });

  it('preserves frontmatter extraction through workspace-path resolution', () => {
    const notes = readJSON('notes.json') as any[];
    const react = notes.find((n: any) => n.slug === 'react-fundamentals');
    expect(react).toBeDefined();
    expect(react.confidence).toBe('P0');
    expect(react.sources.length).toBeGreaterThan(0);
  });
});

describe('compile — dogfood count and taxonomy regressions', () => {
  const WORKSPACE_DIR = mkdtempSync(join(tmpdir(), 'grimoire-dogfood-'));
  const WIKI_DIR = join(WORKSPACE_DIR, 'wiki');
  const COMPILE_DIR = join(WIKI_DIR, '.compile');
  let stdout = '';

  beforeAll(() => {
    createNoCandidateTaxonomyWorkspace(WORKSPACE_DIR);
    stdout = execSync(`${TSX_RUNNER} ${SCRIPT} ${WORKSPACE_DIR}`, {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
  });

  afterAll(() => {
    rmSync(WORKSPACE_DIR, { recursive: true, force: true });
  });

  it('reports content articles and support pages separately in user-facing output and JSON', () => {
    expect(stdout).toContain('Processed 5 content articles and 3 support pages');
    expect(stdout).toContain('Content articles: 5');
    expect(stdout).toContain('Support pages:    3');
    expect(stdout).not.toContain('Processed 8 notes');

    const analytics = JSON.parse(readFileSync(join(COMPILE_DIR, 'analytics.json'), 'utf-8')) as any;
    expect(analytics.basic.totalNotes).toBe(8);
    expect(analytics.basic.contentArticles).toBe(5);
    expect(analytics.basic.supportPages).toBe(3);

    const overview = JSON.parse(readFileSync(join(COMPILE_DIR, 'overview-metadata.json'), 'utf-8')) as any;
    expect(overview.coverageStats.articleCount).toBe(5);
    expect(overview.coverageStats.contentArticles).toBe(5);
    expect(overview.coverageStats.supportPages).toBe(3);
  });

  it('removes stale taxonomy-proposal.json and logs when candidate groups are empty', () => {
    expect(existsSync(join(COMPILE_DIR, 'taxonomy-proposal.json'))).toBe(false);
    expect(stdout).toContain('taxonomy: no candidate groups — no proposal');
  });
});

describe('compile — update-engine artifacts (v0.4.0)', () => {
  // Relies on the main describe's beforeAll having compiled the fixture;
  // vitest runs file-level describes sequentially, and the v0.2.4 block
  // above recompiles from the workspace root either way.
  it('emits freshness.json with per-article tiers and a summary', () => {
    const freshness = readJSON('freshness.json') as any;
    expect(freshness.policy).toMatchObject({ freshDays: 45, agingDays: 120, source: 'file' });
    expect(Array.isArray(freshness.articles)).toBe(true);

    const slugs = freshness.articles.map((a: any) => a.slug);
    expect(slugs).not.toContain('index');
    expect(slugs).not.toContain('overview');
    expect(slugs).not.toContain('log');

    const total = Object.values(freshness.summary as Record<string, number>)
      .reduce((sum, n) => sum + n, 0);
    expect(total).toBe(freshness.articles.length);

    // signals-pattern is marked evergreen: true in the fixture — tier must
    // be time-independent so this suite never rots.
    const evergreen = freshness.articles.find((a: any) => a.slug === 'signals-pattern');
    expect(evergreen.tier).toBe('evergreen');
  });

  it('carries updated/checked/evergreen through the notes manifest', () => {
    const notes = readJSON('notes.json') as any[];
    const vue = notes.find((n) => n.slug === 'vue-reactivity');
    expect(vue.updated).toBe('2026-04-01');
    expect(vue.checked).toBeNull();
    expect(vue.evergreen).toBe(false);

    const signals = notes.find((n) => n.slug === 'signals-pattern');
    expect(signals.evergreen).toBe(true);
  });

  it('emits update-context.json with the resolved policy and source ledger', () => {
    const context = readJSON('update-context.json') as any;
    expect(context.policy.minScore).toBe(14);
    expect(context.policy.maxSourcesPerRun).toBe(4);
    expect(context.policy.watchlist.length).toBe(2);
    expect(context.policy.connectionExclusions).toEqual([
      { a: 'react-fundamentals', b: 'svelte-compilation' },
    ]);

    // approved-sources.md + raw/ frontmatter, normalized and deduped:
    // the www/trailing-slash signals URL and the vue docs URL collapse.
    expect(context.knownUrls).toContain('https://example.com/signals-pattern');
    expect(context.knownUrls).toContain(
      'https://vuejs.org/guide/essentials/reactivity-fundamentals.html',
    );
    expect(context.knownUrls).toContain('https://react.dev/learn');
    expect(context.knownUrlCount).toBe(context.knownUrls.length);

    // raw collected date (2026-01-15) vs whatever the fixture log holds —
    // lastUpdate must be a concrete ISO date either way.
    expect(context.lastUpdate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('emits connection-candidates.json only when candidates exist', () => {
    const candidatesPath = join(COMPILE_DIR, 'connection-candidates.json');
    if (existsSync(candidatesPath)) {
      const candidates = readJSON('connection-candidates.json') as any[];
      expect(candidates.length).toBeGreaterThan(0);
      for (const c of candidates) {
        expect(c.a < c.b).toBe(true);
        expect(c.score).toBeGreaterThan(0);
      }
      // The excluded pair must never be proposed.
      expect(
        candidates.some(
          (c) => c.a === 'react-fundamentals' && c.b === 'svelte-compilation',
        ),
      ).toBe(false);
    }
  });
});

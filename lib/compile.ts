/**
 * compile — Papyr Core orchestration script
 *
 * Runs graph analysis, link validation, search indexing, and analytics
 * against a Grimoire wiki directory. Outputs JSON artifacts to wiki/.compile/
 * for Claude to interpret, fix issues, and write the compile report.
 *
 * Usage: node dist/compile.js <workspace-or-wiki-path>
 *
 * Accepts either a workspace root (containing `wiki/`) or a wiki directory
 * directly. If a workspace root is given, the script auto-resolves the
 * nested `wiki/` subdirectory.
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import matter from 'gray-matter';

import {
  PapyrBuilder,
  validateLinks,
  findOrphanedNotes,
  findOrphanedLinks,
  calculateCentrality,
  getConnectedComponents,
  getGraphStatistics,
  findHubs,
  findAuthorities,
  exportSearchIndex,
  type BuildResult,
  type NoteGraph,
  type GraphNode,
  type GraphLink,
  type ParsedNote,
} from 'papyr-core';

import { SUPPORT_SLUGS } from './support-slugs.js';

// --- CLI ---

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node dist/compile.js <workspace-or-wiki-path>');
  console.error('  Accepts either a grimoire workspace root (containing wiki/)');
  console.error('  or a wiki directory directly.');
  process.exit(1);
}

function resolveWikiDir(argPath: string): string {
  const absolute = resolve(argPath);
  const nestedWiki = join(absolute, 'wiki');
  try {
    if (statSync(nestedWiki).isDirectory()) {
      return nestedWiki;
    }
  } catch {
    // nested wiki/ doesn't exist — fall through and treat argPath as the wiki dir itself
  }
  return absolute;
}

const resolvedWikiDir = resolveWikiDir(inputPath);
const outputDir = join(resolvedWikiDir, '.compile');

// --- Helpers ---

function serializeMap<V>(map: Map<string, V>): Record<string, V> {
  const obj: Record<string, V> = {};
  for (const [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

function serializeSetMap(map: Map<string, Set<string>>): Record<string, string[]> {
  const obj: Record<string, string[]> = {};
  for (const [k, v] of map) {
    obj[k] = [...v];
  }
  return obj;
}

function serializeGraphNodes(nodes: Map<string, GraphNode>): Record<string, GraphNode> {
  const obj: Record<string, GraphNode> = {};
  for (const [k, v] of nodes) {
    obj[k] = v;
  }
  return obj;
}

function writeJSON(filename: string, data: unknown): void {
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✓ ${filename}`);
}

// Extract frontmatter fields we care about directly from the source file.
// We don't rely on papyr-core's internal ParsedNote shape exposing these —
// gray-matter is already a transitive dependency and gives us a stable contract.
interface ArticleFrontmatter {
  readonly summary: string;
  readonly confidence: string;
  readonly sources: readonly { readonly url: string; readonly title: string }[];
}

type SchemaTaxonomy = 'emergent' | 'defined' | 'unknown';

function parseSchemaTaxonomy(workspaceDir: string): SchemaTaxonomy {
  const schemaPath = join(workspaceDir, 'SCHEMA.md');
  try {
    const content = readFileSync(schemaPath, 'utf-8');
    // Look for an explicit `taxonomy: "..."` field anywhere in the file.
    // The schema-template emits this inside a fenced domain block as YAML.
    const match = content.match(/^[ \t]*taxonomy[ \t]*:[ \t]*["']?(\w+)["']?/m);
    if (!match) return 'unknown';
    const value = match[1].toLowerCase();
    if (value === 'emergent') return 'emergent';
    if (value === 'defined') return 'defined';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface NoteManifestEntry {
  readonly slug: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly wordCount: number;
  readonly linksTo: readonly string[];
  readonly sources: readonly { readonly url: string; readonly title: string }[];
}

export interface CandidateTagGroup {
  readonly tags: readonly string[];
  readonly articles: readonly string[];
  readonly cooccurrenceScore: number;
}

export interface TaxonomyProposal {
  readonly generatedAt: string;
  readonly conditions: {
    readonly uniqueTagCount: number;
    readonly contentArticleCount: number;
    readonly schemaTaxonomy: SchemaTaxonomy;
  };
  readonly candidateGroups: readonly CandidateTagGroup[];
  readonly uncategorizedArticles: readonly string[];
}

export interface OverviewMetadata {
  readonly generatedAt: string;
  readonly topCentralityArticles: readonly {
    readonly slug: string;
    readonly title: string;
    readonly centrality: number;
  }[];
  readonly requiredCitations: readonly string[];
  readonly coverageStats: {
    readonly articleCount: number;
    readonly totalWords: number;
    readonly sourceCount: number;
    readonly crossRefs: number;
    readonly componentCount: number;
    readonly isolatedContentNotes: readonly string[];
  };
  readonly topicClusters: readonly {
    readonly componentId: number;
    readonly articles: readonly string[];
  }[];
}

function contentArticles<T extends { slug: string }>(notes: readonly T[]): readonly T[] {
  return notes.filter((n) => !SUPPORT_SLUGS.has(n.slug));
}

// Nested cooccurrence map keyed by (lexSmaller, lexLarger) — avoids
// a string-join encoding that would conflate tags containing the delimiter.
type CooccurMap = Map<string, Map<string, number>>;

function bumpCooccur(cooccur: CooccurMap, a: string, b: string): void {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  let row = cooccur.get(lo);
  if (!row) {
    row = new Map();
    cooccur.set(lo, row);
  }
  row.set(hi, (row.get(hi) ?? 0) + 1);
}

function getCooccur(cooccur: CooccurMap, a: string, b: string): number {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return cooccur.get(lo)?.get(hi) ?? 0;
}

export function buildCandidateGroups(notes: readonly NoteManifestEntry[]): readonly CandidateTagGroup[] {
  // Single pass over articles: build tag→articles index and tag-pair
  // cooccurrence counts in one walk. Replaces O(T²·S) pair enumeration
  // with O(sum_n(tags_n²)).
  const tagToArticles = new Map<string, Set<string>>();
  const cooccur: CooccurMap = new Map();

  for (const n of notes) {
    const uniqueTags = [...new Set(n.tags)];
    for (const t of uniqueTags) {
      let set = tagToArticles.get(t);
      if (!set) {
        set = new Set();
        tagToArticles.set(t, set);
      }
      set.add(n.slug);
    }
    for (let i = 0; i < uniqueTags.length; i++) {
      for (let j = i + 1; j < uniqueTags.length; j++) {
        bumpCooccur(cooccur, uniqueTags[i], uniqueTags[j]);
      }
    }
  }

  // Edge: two tags share ≥ 2 articles. Connected components on this graph
  // become candidate categories.
  const tags = [...tagToArticles.keys()].sort();
  const adj = new Map<string, Set<string>>();
  for (const t of tags) adj.set(t, new Set());
  for (const [lo, row] of cooccur) {
    for (const [hi, count] of row) {
      if (count >= 2) {
        adj.get(lo)!.add(hi);
        adj.get(hi)!.add(lo);
      }
    }
  }

  const visited = new Set<string>();
  const groups: CandidateTagGroup[] = [];

  for (const start of tags) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const queue: string[] = [start];
    while (queue.length > 0) {
      const t = queue.shift()!;
      if (visited.has(t)) continue;
      visited.add(t);
      component.push(t);
      for (const n of adj.get(t) ?? []) if (!visited.has(n)) queue.push(n);
    }
    if (component.length < 2) continue; // singletons go to uncategorized

    const componentTags = component.sort();
    const articlesInGroup = new Set<string>();
    for (const t of componentTags) for (const s of tagToArticles.get(t) ?? []) articlesInGroup.add(s);

    let totalPairs = 0;
    let totalScore = 0;
    for (let i = 0; i < componentTags.length; i++) {
      for (let j = i + 1; j < componentTags.length; j++) {
        totalScore += getCooccur(cooccur, componentTags[i], componentTags[j]);
        totalPairs++;
      }
    }
    const score = totalPairs > 0 ? Number((totalScore / totalPairs).toFixed(2)) : 0;

    groups.push({
      tags: componentTags,
      articles: [...articlesInGroup].sort(),
      cooccurrenceScore: score,
    });
  }

  return groups.sort((a, b) => b.cooccurrenceScore - a.cooccurrenceScore);
}

export function buildTaxonomyProposal(
  notes: readonly NoteManifestEntry[],
  schemaTaxonomy: SchemaTaxonomy,
  now: Date = new Date(),
): TaxonomyProposal | null {
  // Three conditions from skills/compile/SKILL.md Step 5.5. A "defined"
  // taxonomy means the user already committed to categories, so we skip;
  // "unknown" means the schema didn't declare either way, so we proceed on
  // the permissive assumption that a proposal is still useful.
  if (schemaTaxonomy === 'defined') return null;
  const content = contentArticles(notes);
  if (content.length < 5) return null;

  const uniqueTags = new Set<string>();
  for (const n of content) for (const t of n.tags) uniqueTags.add(t);
  if (uniqueTags.size < 5) return null;

  const groups = buildCandidateGroups(content);
  const categorized = new Set<string>();
  for (const g of groups) for (const s of g.articles) categorized.add(s);
  const uncategorized = content.map((n) => n.slug).filter((s) => !categorized.has(s)).sort();

  return {
    generatedAt: now.toISOString(),
    conditions: {
      uniqueTagCount: uniqueTags.size,
      contentArticleCount: content.length,
      schemaTaxonomy,
    },
    candidateGroups: groups,
    uncategorizedArticles: uncategorized,
  };
}

export function buildOverviewMetadata(
  notes: readonly NoteManifestEntry[],
  centrality: ReadonlyMap<string, number>,
  components: readonly string[][],
  crossRefCount: number,
  now: Date = new Date(),
): OverviewMetadata {
  const content = contentArticles(notes);

  const ranked = content
    .map((n) => ({ slug: n.slug, title: n.title, centrality: centrality.get(n.slug) ?? 0 }))
    .sort((a, b) => b.centrality - a.centrality || a.slug.localeCompare(b.slug))
    .slice(0, 5);

  const totalWords = content.reduce((sum, n) => sum + n.wordCount, 0);
  const sourceUrls = new Set<string>();
  for (const n of content) for (const s of n.sources) sourceUrls.add(s.url);
  // Distinct from papyr-core's graph.orphans (which is undirected: no links
  // in OR out). This list is intentionally stricter — zero centrality AND
  // zero outbound links — because the overview narrative should flag
  // articles with no discoverable path, not just missing backlinks.
  const isolatedContentNotes = content
    .filter((n) => (centrality.get(n.slug) ?? 0) === 0 && n.linksTo.length === 0)
    .map((n) => n.slug)
    .sort();

  // Filter support slugs from each component, then derive both the count
  // and the cluster list from the same filtered set so they can't disagree.
  const contentComponents = components.map((comp, idx) => ({
    componentId: idx,
    articles: [...comp].filter((s) => !SUPPORT_SLUGS.has(s)).sort(),
  }));
  const componentCount = contentComponents.filter((c) => c.articles.length > 0).length;
  const topicClusters = contentComponents.filter((c) => c.articles.length > 1);

  return {
    generatedAt: now.toISOString(),
    topCentralityArticles: ranked,
    requiredCitations: ranked.map((r) => r.slug),
    coverageStats: {
      articleCount: content.length,
      totalWords,
      sourceCount: sourceUrls.size,
      crossRefs: crossRefCount,
      componentCount,
      isolatedContentNotes,
    },
    topicClusters,
  };
}

function extractFrontmatter(wikiDir: string, slug: string): ArticleFrontmatter {
  try {
    const filePath = join(wikiDir, `${slug}.md`);
    const raw = readFileSync(filePath, 'utf-8');
    const data = matter(raw).data ?? {};

    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    const confidence = typeof data.confidence === 'string' ? data.confidence.trim() : '';

    const sources: { url: string; title: string }[] = [];
    if (Array.isArray(data.sources)) {
      for (const src of data.sources) {
        if (src && typeof src === 'object' && 'url' in src && 'title' in src) {
          const s = src as { url: unknown; title: unknown };
          if (typeof s.url === 'string' && typeof s.title === 'string') {
            sources.push({ url: s.url, title: s.title });
          }
        }
      }
    }

    return { summary, confidence, sources };
  } catch {
    // File not found or unreadable — emit empty fields, don't fail the build.
    return { summary: '', confidence: '', sources: [] };
  }
}

// --- Main ---

async function compile(): Promise<void> {
  console.log(`\nCompiling wiki: ${resolvedWikiDir}\n`);

  // Step 1: Build with PapyrBuilder
  const builder = new PapyrBuilder({
    sourceDir: resolvedWikiDir,
    outputDir, // PapyrBuilder needs this but we write our own outputs
    patterns: {
      include: ['**/*.md'],
      exclude: ['.compile/**'],
    },
    processing: {
      generateExcerpts: true,
      calculateReadingTime: true,
      extractKeywords: true,
    },
  });

  let result: BuildResult;
  try {
    result = await builder.build();
  } catch (err) {
    console.error('PapyrBuilder.build() failed:', err);
    process.exit(1);
  }

  const { notes, graph, searchIndex, analytics, buildInfo } = result;

  console.log(`Processed ${notes.length} notes in ${buildInfo.duration}ms\n`);

  // Step 2: Ensure output directory
  mkdirSync(outputDir, { recursive: true });

  // Step 3: Link validation
  const linkValidation = validateLinks(notes as ParsedNote[]);

  // Step 4: Graph analysis
  const orphanedNotes = findOrphanedNotes(graph);
  const orphanedLinks = findOrphanedLinks(notes as ParsedNote[]);
  const centrality = calculateCentrality(graph);
  const components = getConnectedComponents(graph);
  const stats = getGraphStatistics(graph);
  const hubs = findHubs(graph);
  const authorities = findAuthorities(graph);

  // Step 5: Write audit.json
  const linksByNote: Record<string, { valid: number; orphaned: number; self: number; duplicate: number }> = {};
  for (const [slug, counts] of linkValidation.linksByNote) {
    linksByNote[slug] = counts;
  }

  writeJSON('audit.json', {
    links: {
      total: linkValidation.totalLinks,
      valid: linkValidation.validLinks,
      orphaned: linkValidation.orphanedLinks,
      self: linkValidation.selfLinks,
      duplicate: linkValidation.duplicateLinks,
      byNote: linksByNote,
    },
    orphanedNotes,
    orphanedLinks: serializeSetMap(orphanedLinks as unknown as Map<string, Set<string>>),
    centrality: serializeMap(centrality),
    components,
    hubs: hubs.map(h => ({ id: h.id, label: h.label, forwardLinkCount: h.forwardLinkCount })),
    authorities: authorities.map(a => ({ id: a.id, label: a.label, backlinkCount: a.backlinkCount })),
    statistics: stats,
  });

  // Step 6: Write graph.json
  writeJSON('graph.json', {
    nodes: serializeGraphNodes(graph.nodes),
    edges: graph.edges,
    backlinks: serializeSetMap(graph.backlinks),
    orphans: [...graph.orphans],
    statistics: stats,
  });

  // Step 7: Write search-index.json
  try {
    const serializedIndex = await exportSearchIndex(searchIndex);
    writeJSON('search-index.json', serializedIndex);
  } catch (err) {
    console.warn('  ⚠ search-index.json export failed:', err);
    writeJSON('search-index.json', { error: 'Export failed', config: searchIndex.config });
  }

  // Step 8: Write analytics.json
  writeJSON('analytics.json', {
    basic: analytics.basic,
    graph: analytics.graph,
    content: analytics.content,
    tags: analytics.tags,
  });

  // Step 9: Write notes manifest (lightweight — slugs, titles, tags, word counts,
  // plus frontmatter fields that downstream skills need for token-efficient
  // routing: summary, confidence, sources).
  const noteManifest = notes.map(n => {
    const fm = extractFrontmatter(resolvedWikiDir, n.slug);
    return {
      slug: n.slug,
      title: n.title,
      summary: fm.summary,
      tags: n.tags,
      wordCount: n.wordCount,
      readingTime: n.readingTime,
      linksTo: n.linksTo,
      headings: n.headings.map(h => ({ level: h.level, text: h.text })),
      confidence: fm.confidence,
      sources: fm.sources,
    };
  });
  writeJSON('notes.json', noteManifest);

  // Step 10 — overview-metadata.json: evidence for the compile skill's Step 5
  // enforcement audit. Emitted every run.
  writeJSON(
    'overview-metadata.json',
    buildOverviewMetadata(noteManifest, centrality, components, linkValidation.validLinks),
  );

  // Step 11 — taxonomy-proposal.json: conditional, only when the skill's
  // Step 5.5 conditions are met. Absence of the file = conditions not met.
  const workspaceDir = dirname(resolvedWikiDir);
  const proposal = buildTaxonomyProposal(noteManifest, parseSchemaTaxonomy(workspaceDir));
  if (proposal) {
    writeJSON('taxonomy-proposal.json', proposal);
  }

  // Summary
  console.log('\nCompile summary:');
  console.log(`  Notes:           ${notes.length}`);
  console.log(`  Links:           ${linkValidation.totalLinks} total, ${linkValidation.orphanedLinks} orphaned`);
  console.log(`  Orphan notes:    ${orphanedNotes.length}`);
  console.log(`  Components:      ${components.length}`);
  console.log(`  Graph density:   ${stats.density.toFixed(3)}`);
  console.log(`  Build time:      ${buildInfo.duration}ms`);
  console.log(`\nOutputs written to: ${outputDir}\n`);
}

compile().catch(err => {
  console.error('Compile failed:', err);
  process.exit(1);
});

/**
 * compile — Papyr Core orchestration script
 *
 * Runs graph analysis, link validation, search indexing, and analytics
 * against a Grimoire wiki directory. Outputs JSON artifacts to wiki/.compile/
 * for Claude to interpret, fix issues, and write the compile report.
 *
 * Usage: node dist/compile.js <wiki-directory-path>
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

// --- CLI ---

const wikiDir = process.argv[2];
if (!wikiDir) {
  console.error('Usage: node dist/compile.js <wiki-directory-path>');
  process.exit(1);
}

const resolvedWikiDir = resolve(wikiDir);
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

  // Step 9: Write notes manifest (lightweight — slugs, titles, tags, word counts)
  const noteManifest = notes.map(n => ({
    slug: n.slug,
    title: n.title,
    tags: n.tags,
    wordCount: n.wordCount,
    readingTime: n.readingTime,
    linksTo: n.linksTo,
    headings: n.headings.map(h => ({ level: h.level, text: h.text })),
  }));
  writeJSON('notes.json', noteManifest);

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

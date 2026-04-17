/**
 * Slugs that compile emits as graph nodes but are not content articles.
 * Structural pages (the index, the changelog, the synthesized overview)
 * must be filtered out of content counts, centrality rankings, and graph
 * views that claim to represent "the articles".
 *
 * Kept in one place so loader filtering, graph filtering, and the compile
 * skill's enforcement logic can't drift apart.
 */

export const SUPPORT_SLUGS: ReadonlySet<string> = new Set(['index', 'log', 'overview']);

export const SUPPORT_FILES: ReadonlySet<string> = new Set(
  [...SUPPORT_SLUGS].map((s) => `${s}.md`),
);

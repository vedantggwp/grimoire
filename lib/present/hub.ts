import type { GraphData, SiteData } from './types.js';

export interface HubStats {
  readonly articleCount: number;
  readonly sourceCount: number;
  readonly tagCount: number;
  readonly crossRefs: number;
  readonly density: number | null;
}

function uniquePairCount(graphData: GraphData): number {
  const uniquePairs = new Set<string>();
  for (const edge of graphData.edges) {
    uniquePairs.add([edge.source, edge.target].sort().join('::'));
  }
  return uniquePairs.size;
}

export function computeDensityRatio(graphData: GraphData): number {
  const nodeCount = graphData.nodes.length;
  if (nodeCount <= 1) return 0;
  const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
  return uniquePairCount(graphData) / maxEdges;
}

export function computeHubStats(data: SiteData): HubStats {
  const sourceUrls = new Set(
    data.articles.flatMap(article => article.sources.map(source => source.url)),
  );
  const tags = new Set(data.articles.flatMap(article => [...article.tags]));
  const crossRefs = uniquePairCount(data.graphData);
  const densityRatio = computeDensityRatio(data.graphData);

  return {
    articleCount: data.articles.length,
    sourceCount: sourceUrls.size,
    tagCount: tags.size,
    crossRefs,
    density: data.articles.length < 10 ? null : Math.min(100, Math.round(densityRatio * 100)),
  };
}

export function recommendedMode(data: SiteData): string {
  if (data.articles.length < 5) return 'read';
  if (data.articles.length >= 8 && computeDensityRatio(data.graphData) > 0.3) return 'graph';
  return 'read';
}

export function hubLeadText(scopeIn: string): string {
  return scopeIn || 'Welcome to this knowledge base.';
}

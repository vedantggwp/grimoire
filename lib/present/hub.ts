import type { GraphData, SiteData } from './types.js';
import { shortTopic } from '../short-topic.js';

export { shortTopic };

export interface HubStats {
  readonly articleCount: number;
  readonly sourceCount: number;
  readonly sourceWarnings: number;
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
    sourceWarnings: data.articles.filter(article => article.sourceFidelity !== 'full').length,
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

// Skill-level audience values read awkwardly when interpolated bare
// ("built for beginner.") — they get the "a … audience" phrasing instead.
const LEVEL_AUDIENCES = new Set([
  'beginner', 'intermediate', 'advanced', 'expert', 'mixed', 'general',
]);

const LEAD_MAX_CHARS = 120;

function capAtWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return `${text.slice(0, cut > 0 ? cut : max)}…`;
}

export function hubLeadText(topic: string, audience: string): string {
  const name = shortTopic(topic);
  const joined = audience.replace(/\s+/g, ' ').trim();
  const stripped = joined.replace(/^(advanced|intermediate|beginner)\s*[—–-]\s*/i, '');
  const firstSentence = stripped.split(/\.\s/)[0].trim();
  // Single-sentence audiences keep their terminal period through the split,
  // which produced "… tooling.." in the rendered lead (issue #7). Strip it
  // before the template adds its own.
  const desc = (firstSentence.length > 0 ? firstSentence : joined.split('—')[0].trim())
    .replace(/[.\s]+$/, '');

  if (desc.length === 0) {
    return `A structured knowledge base about ${name}, built for a general audience.`;
  }

  const capped = capAtWordBoundary(desc, LEAD_MAX_CHARS);

  if (LEVEL_AUDIENCES.has(capped.toLowerCase())) {
    const level = capped.toLowerCase();
    const article = /^[aeiou]/.test(level) ? 'an' : 'a';
    return `A structured knowledge base about ${name}, built for ${article} ${level} audience.`;
  }

  const lower = capped.charAt(0).toLowerCase() + capped.slice(1);
  return `A structured knowledge base about ${name}, built for ${lower}.`;
}

/**
 * present — Gaps mode
 *
 * Coverage gap map showing tag-based content analysis.
 * Cards per tag with word count, article count, thin-coverage indicators.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface TagSummary {
  readonly tag: string;
  readonly articles: readonly ArticleData[];
  readonly totalWords: number;
  readonly needsExpansion: boolean;
  readonly thinArticles: readonly string[];
}

function buildTagSummaries(data: SiteData): readonly TagSummary[] {
  const tagMap = new Map<string, ArticleData[]>();

  for (const article of data.articles) {
    for (const tag of article.tags) {
      const existing = tagMap.get(tag) ?? [];
      tagMap.set(tag, [...existing, article]);
    }
  }

  // Calculate median word count across all articles
  const wordCounts = [...data.articles.map(a => a.wordCount)].sort((a, b) => a - b);
  const median = wordCounts.length > 0
    ? wordCounts[Math.floor(wordCounts.length / 2)]
    : 0;

  return [...tagMap.entries()]
    .map(([tag, articles]) => {
      const totalWords = articles.reduce((sum, a) => sum + a.wordCount, 0);
      const thinArticles = articles
        .filter(a => a.wordCount < median)
        .map(a => a.title);

      return {
        tag,
        articles,
        totalWords,
        needsExpansion: articles.length === 1,
        thinArticles,
      };
    })
    .sort((a, b) => b.totalWords - a.totalWords);
}

function buildGapCard(summary: TagSummary, maxWords: number): string {
  const opacity = maxWords > 0
    ? (0.15 + (summary.totalWords / maxWords) * 0.85).toFixed(2)
    : '0.5';

  const indicators: string[] = [];
  if (summary.needsExpansion) {
    indicators.push('<span style="color:var(--color-warning);font-size:var(--text-xs)">Needs expansion (1 article)</span>');
  }
  if (summary.thinArticles.length > 0) {
    const names = summary.thinArticles.map(n => esc(n)).join(', ');
    indicators.push(`<span style="color:var(--color-error);font-size:var(--text-xs)">Thin coverage: ${names}</span>`);
  }

  const articleList = summary.articles.map(a =>
    `<li style="font-size:var(--text-sm)">${esc(a.title)} <span style="color:var(--color-muted)">(${a.wordCount}w)</span></li>`
  ).join('\n        ');

  return `<div class="gap-card" style="background:color-mix(in srgb, var(--color-accent) ${Math.round(Number(opacity) * 100)}%, var(--color-surface))">
    <h3 style="font-size:var(--text-lg);margin-bottom:var(--space-2)">${esc(summary.tag)}</h3>
    <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-2);font-size:var(--text-sm);color:var(--color-muted)">
      <span>${summary.articles.length} article${summary.articles.length !== 1 ? 's' : ''}</span>
      <span>${summary.totalWords} words</span>
    </div>
    ${indicators.length > 0 ? '<div style="margin-bottom:var(--space-2)">' + indicators.join('<br>') + '</div>' : ''}
    <details>
      <summary style="cursor:pointer;font-size:var(--text-sm);color:var(--color-accent)">Articles</summary>
      <ul style="padding-left:var(--space-4);margin-top:var(--space-2)">
        ${articleList}
      </ul>
    </details>
  </div>`;
}

export function generateGapsMode(data: SiteData, config: DesignConfig): string {
  const summaries = buildTagSummaries(data);
  const maxWords = summaries.length > 0
    ? Math.max(...summaries.map(s => s.totalWords))
    : 1;

  const cards = summaries.length > 0
    ? summaries.map(s => buildGapCard(s, maxWords)).join('\n')
    : '<p style="color:var(--color-muted)">No tagged articles found.</p>';

  const totalArticles = data.articles.length;
  const untagged = data.articles.filter(a => a.tags.length === 0).length;

  const body = `
<div style="padding:var(--space-6) 0">
  <h1 style="margin-bottom:var(--space-2)">Gap Map</h1>
  <p style="color:var(--color-muted);margin-bottom:var(--space-6)">
    ${totalArticles} articles across ${summaries.length} tags${untagged > 0 ? ` (${untagged} untagged)` : ''}
  </p>
  <div class="grid grid--3">
    ${cards}
  </div>
</div>`;

  return pageShell(`${data.schema.topic} — Gaps`, 'gaps', body, config, data);
}

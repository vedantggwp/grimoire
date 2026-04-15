/**
 * present — Gaps mode
 *
 * Coverage treemap: D3-driven hierarchical layout sized by tag weight.
 * Cell area = articles covering that tag × average article word count,
 * so visually important topics get larger cells. Classification tiers:
 *   full (3+ articles) · partial (2) · thin (1) · missing (0)
 *
 * Linear Editorial palette applies color per tier.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';
import { d3MinSource } from './d3-source.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type CellTier = 'full' | 'partial' | 'thin' | 'missing';

interface TagCell {
  readonly tag: string;
  readonly articleCount: number;
  readonly totalWords: number;
  readonly weight: number;
  readonly tier: CellTier;
  readonly articleTitles: readonly string[];
}

function classify(articleCount: number): CellTier {
  if (articleCount === 0) return 'missing';
  if (articleCount === 1) return 'thin';
  if (articleCount === 2) return 'partial';
  return 'full';
}

function buildCells(articles: readonly ArticleData[]): readonly TagCell[] {
  const tagMap = new Map<string, ArticleData[]>();
  for (const article of articles) {
    for (const tag of article.tags) {
      const existing = tagMap.get(tag) ?? [];
      tagMap.set(tag, [...existing, article]);
    }
  }

  const cells: TagCell[] = [];
  for (const [tag, tagged] of tagMap) {
    const totalWords = tagged.reduce((s, a) => s + a.wordCount, 0);
    // Weight rewards both breadth (article count) and depth (words covered).
    // sqrt damps the word-count axis so a single huge article doesn't dwarf
    // everything else.
    const weight = tagged.length * Math.sqrt(Math.max(totalWords, 1));
    cells.push({
      tag,
      articleCount: tagged.length,
      totalWords,
      weight,
      tier: classify(tagged.length),
      articleTitles: tagged.map(a => a.title),
    });
  }

  return cells.sort((a, b) => b.weight - a.weight);
}

function countByTier(cells: readonly TagCell[]): Record<CellTier, number> {
  const counts: Record<CellTier, number> = { full: 0, partial: 0, thin: 0, missing: 0 };
  for (const c of cells) counts[c.tier]++;
  return counts;
}

function gapsScript(): string {
  return `<script>${d3MinSource}</script>
<script>
(function () {
  var data = window.GAPS_DATA;
  if (!data || !data.cells || data.cells.length === 0) return;

  var container = document.getElementById('treemap-container');
  var width = Math.max(container.clientWidth, 320);
  var height = Math.max(container.clientHeight || 0, 480);

  var svg = d3.select('#treemap-svg')
    .attr('viewBox', [0, 0, width, height].join(' '));

  var root = d3.hierarchy({ children: data.cells })
    .sum(function(d) { return d.weight || 0; })
    .sort(function(a, b) { return (b.value || 0) - (a.value || 0); });

  d3.treemap()
    .size([width, height])
    .paddingInner(3)
    .paddingOuter(0)
    .round(true)(root);

  var leaves = root.leaves();

  var cellGroup = svg.selectAll('.treemap-leaf')
    .data(leaves)
    .join('g')
    .attr('class', function(d) { return 'treemap-leaf treemap-leaf--' + d.data.tier; })
    .attr('transform', function(d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; });

  cellGroup.append('rect')
    .attr('width', function(d) { return Math.max(0, d.x1 - d.x0); })
    .attr('height', function(d) { return Math.max(0, d.y1 - d.y0); })
    .attr('rx', 6);

  // Tag name — truncate based on cell width so text stays inside the rect.
  // Empirically ~7px per character at 14px font weight 600.
  function fitText(label, widthPx) {
    var maxChars = Math.max(0, Math.floor((widthPx - 20) / 7));
    if (maxChars <= 0) return '';
    if (label.length <= maxChars) return label;
    if (maxChars <= 2) return '';
    return label.slice(0, maxChars - 1) + '…';
  }

  cellGroup.append('text')
    .attr('class', 'treemap-tag')
    .attr('x', 10)
    .attr('y', 20)
    .text(function(d) {
      var w = d.x1 - d.x0;
      var h = d.y1 - d.y0;
      if (h < 32) return '';
      return fitText(d.data.tag, w);
    });

  // Article count sub-label — only when cell has room for it
  cellGroup.append('text')
    .attr('class', 'treemap-count')
    .attr('x', 10)
    .attr('y', 38)
    .text(function(d) {
      var w = d.x1 - d.x0;
      var h = d.y1 - d.y0;
      if (w < 84 || h < 54) return '';
      return d.data.articleCount === 1
        ? '1 article'
        : d.data.articleCount + ' articles';
    });

  // Tier indicator (small dot at top-right)
  cellGroup.append('circle')
    .attr('class', 'treemap-dot')
    .attr('cx', function(d) { return Math.max(0, d.x1 - d.x0) - 12; })
    .attr('cy', 14)
    .attr('r', 3)
    .style('pointer-events', 'none');

  // Hover — show tooltip with article titles
  var tooltip = document.getElementById('treemap-tooltip');
  cellGroup
    .on('mouseenter', function(e, d) {
      if (!tooltip) return;
      var titles = (d.data.articleTitles || []).slice(0, 5).join(', ');
      tooltip.innerHTML =
        '<strong>' + d.data.tag + '</strong><br>' +
        '<span class="tier-' + d.data.tier + '">' + d.data.tier + '</span> — ' +
        d.data.articleCount + ' article' + (d.data.articleCount === 1 ? '' : 's') +
        (titles ? '<br><em>' + titles + '</em>' : '');
      tooltip.style.display = 'block';
    })
    .on('mousemove', function(e) {
      if (!tooltip) return;
      var rect = container.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
      tooltip.style.top = (e.clientY - rect.top + 14) + 'px';
    })
    .on('mouseleave', function() {
      if (tooltip) tooltip.style.display = 'none';
    });
})();
</script>`;
}

export function generateGapsMode(data: SiteData, config: DesignConfig): string {
  const cells = buildCells(data.articles);
  const tierCounts = countByTier(cells);

  const summaryStats = [
    { label: 'articles', value: String(data.articles.length) },
    { label: 'tags', value: String(cells.length) },
    { label: 'full', value: String(tierCounts.full), tier: 'full' },
    { label: 'partial', value: String(tierCounts.partial), tier: 'partial' },
    { label: 'thin', value: String(tierCounts.thin), tier: 'thin' },
  ];

  const summaryHtml = summaryStats
    .map(s =>
      `<span class="gaps-stat${s.tier ? ' gaps-stat--' + s.tier : ''}">` +
      `<strong>${esc(s.value)}</strong>${esc(s.label)}</span>`,
    )
    .join('');

  const legend = `
  <div class="gaps-legend">
    <span class="gaps-legend__item gaps-legend__item--full"><span class="dot"></span>Full (3+ articles)</span>
    <span class="gaps-legend__item gaps-legend__item--partial"><span class="dot"></span>Partial (2)</span>
    <span class="gaps-legend__item gaps-legend__item--thin"><span class="dot"></span>Thin (1)</span>
    <span class="gaps-legend__item gaps-legend__item--missing"><span class="dot"></span>Missing (0)</span>
  </div>`;

  const gapsDataJSON = JSON.stringify({ cells });

  const body = `
<script>window.GAPS_DATA = ${gapsDataJSON};</script>
<div class="gaps-wrap">
  <div class="gaps-header">
    <h2>Coverage Map</h2>
    <p class="gaps-subtitle">Tag-weighted view of what this knowledge base covers well and where the thin spots are. Cell size reflects article count × depth.</p>
    <div class="gaps-summary">${summaryHtml}</div>
  </div>
  ${legend}
  <div class="treemap-container" id="treemap-container">
    <svg id="treemap-svg"></svg>
    <div class="treemap-tooltip" id="treemap-tooltip"></div>
  </div>
</div>
${gapsScript()}`;

  return pageShell(`${data.schema.topic} — Gaps`, 'gaps', body, config, data);
}

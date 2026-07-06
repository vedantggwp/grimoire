/**
 * present — Gaps mode
 *
 * Coverage treemap, computed at build time (lib/present/layout.ts
 * squarified algorithm) and rendered as absolutely-positioned DOM cells —
 * no d3, ~95% lighter page, and the cells are real focusable elements.
 * Cell area = articles covering that tag × sqrt(words covered). Tiers:
 *   full (3+ articles) · partial (2) · thin (1)
 *
 * When the update engine's freshness report exists, a second lens
 * re-colors the map by per-tag staleness (worst tier among members).
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';
import { squarifiedTreemap } from '../layout.js';
import { esc } from '../esc.js';

type CellTier = 'full' | 'partial' | 'thin' | 'missing';
type FreshTier = 'fresh' | 'aging' | 'stale' | 'evergreen' | 'unknown';

interface TagCell {
  readonly tag: string;
  readonly articleCount: number;
  readonly totalWords: number;
  readonly weight: number;
  readonly tier: CellTier;
  readonly freshness: FreshTier | null;
  readonly articleTitles: readonly string[];
}

function classify(articleCount: number): CellTier {
  if (articleCount === 0) return 'missing';
  if (articleCount === 1) return 'thin';
  if (articleCount === 2) return 'partial';
  return 'full';
}

// Worst freshness wins: a tag with one stale article needs attention even
// if its siblings are fresh.
const FRESHNESS_SEVERITY: readonly FreshTier[] = ['stale', 'aging', 'unknown', 'fresh', 'evergreen'];

function worstFreshness(
  tagged: readonly ArticleData[],
  data: SiteData,
): FreshTier | null {
  if (!data.freshness) return null;
  const tiers = tagged
    .map(a => data.freshness?.bySlug[a.slug]?.tier)
    .filter((t): t is FreshTier => t !== undefined);
  if (tiers.length === 0) return null;
  return FRESHNESS_SEVERITY.find(t => tiers.includes(t)) ?? null;
}

export function buildCells(articles: readonly ArticleData[], data: SiteData): readonly TagCell[] {
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
      freshness: worstFreshness(tagged, data),
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

function buildTreemapCells(cells: readonly TagCell[]): string {
  const rects = squarifiedTreemap(cells.map(c => ({ id: c.tag, value: c.weight })));
  const byTag = new Map(cells.map(c => [c.tag, c]));

  return rects.map((rect, i) => {
    const cell = byTag.get(rect.id);
    if (!cell) return '';

    // Treemap percentages are known at build time, so label visibility is a
    // build-time decision — no resize measurement needed for the common case.
    const showTag = rect.width >= 12 && rect.height >= 8;
    const showCount = rect.width >= 18 && rect.height >= 14;
    const countText = cell.articleCount === 1 ? '1 article' : `${cell.articleCount} articles`;
    const freshClass = cell.freshness ? ` treemap-cell--f-${cell.freshness}` : '';
    const label = `${cell.tag} — ${cell.tier} coverage, ${countText}${cell.freshness ? `, ${cell.freshness}` : ''}`;

    return `<div class="treemap-cell treemap-cell--${cell.tier}${freshClass}" tabindex="0" role="img"
      aria-label="${esc(label)}"
      data-tag="${esc(cell.tag)}" data-tier="${cell.tier}"${cell.freshness ? ` data-freshness="${cell.freshness}"` : ''}
      data-count="${cell.articleCount}" data-titles="${esc(cell.articleTitles.slice(0, 5).join(', '))}"
      style="left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;--reveal-i:${Math.min(i, 12)}">
      ${showTag ? `<span class="treemap-cell__tag">${esc(cell.tag)}</span>` : ''}
      ${showCount ? `<span class="treemap-cell__count">${countText}</span>` : ''}
      <span class="treemap-cell__dot" aria-hidden="true"></span>
    </div>`;
  }).join('\n    ');
}

function gapsScript(): string {
  return `<script>
(function() {
  var board = document.getElementById('treemap-board');
  var tooltip = document.getElementById('treemap-tooltip');
  if (!board || !tooltip) return;

  function fill(cell) {
    var lens = board.classList.contains('lens-freshness');
    var tier = lens && cell.dataset.freshness ? cell.dataset.freshness : cell.dataset.tier;
    tooltip.innerHTML =
      '<strong></strong><br><span class="tier-' + tier + '"></span> — ' +
      cell.dataset.count + ' article' + (cell.dataset.count === '1' ? '' : 's') +
      (cell.dataset.titles ? '<br><em></em>' : '');
    tooltip.querySelector('strong').textContent = cell.dataset.tag;
    tooltip.querySelector('span').textContent = tier;
    var em = tooltip.querySelector('em');
    if (em) em.textContent = cell.dataset.titles;
    tooltip.style.display = 'block';
  }

  board.addEventListener('pointermove', function(e) {
    var cell = e.target.closest('.treemap-cell');
    if (!cell) { tooltip.style.display = 'none'; return; }
    fill(cell);
    var rect = board.getBoundingClientRect();
    tooltip.style.left = Math.min(e.clientX - rect.left + 14, rect.width - 290) + 'px';
    tooltip.style.top = (e.clientY - rect.top + 14) + 'px';
  });
  board.addEventListener('pointerleave', function() { tooltip.style.display = 'none'; });

  // Keyboard: focus shows the tooltip pinned to the cell.
  board.addEventListener('focusin', function(e) {
    var cell = e.target.closest('.treemap-cell');
    if (!cell) return;
    fill(cell);
    tooltip.style.left = cell.style.left;
    tooltip.style.top = 'calc(' + cell.style.top + ' + 28px)';
  });
  board.addEventListener('focusout', function() { tooltip.style.display = 'none'; });

  // Coverage | Freshness lens toggle
  var toggle = document.getElementById('gaps-lens');
  if (toggle) {
    toggle.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-lens]');
      if (!btn) return;
      var lens = btn.dataset.lens;
      board.classList.toggle('lens-freshness', lens === 'freshness');
      toggle.querySelectorAll('button').forEach(function(b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      document.querySelectorAll('[data-legend]').forEach(function(l) {
        l.hidden = l.dataset.legend !== lens;
      });
    });
  }
})();
</script>`;
}

export function generateGapsMode(data: SiteData, config: DesignConfig): string {
  const cells = buildCells(data.articles, data);
  const tierCounts = countByTier(cells);
  const hasFreshness = data.freshness !== null && cells.some(c => c.freshness !== null);

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

  const lensToggle = hasFreshness
    ? `<div class="gaps-lens" id="gaps-lens" role="group" aria-label="Treemap lens">
    <button type="button" data-lens="coverage" class="active" aria-pressed="true">Coverage</button>
    <button type="button" data-lens="freshness" aria-pressed="false">Freshness</button>
  </div>`
    : '';

  const coverageLegend = `
  <div class="gaps-legend" data-legend="coverage">
    <span class="gaps-legend__item gaps-legend__item--full"><span class="dot"></span>Full (3+ articles)</span>
    <span class="gaps-legend__item gaps-legend__item--partial"><span class="dot"></span>Partial (2)</span>
    <span class="gaps-legend__item gaps-legend__item--thin"><span class="dot"></span>Thin (1)</span>
    <span class="gaps-legend__item gaps-legend__item--missing"><span class="dot"></span>Missing (0)</span>
  </div>`;

  const freshnessLegend = hasFreshness
    ? `
  <div class="gaps-legend" data-legend="freshness" hidden>
    <span class="gaps-legend__item gaps-legend__item--full"><span class="dot"></span>Fresh / evergreen</span>
    <span class="gaps-legend__item gaps-legend__item--partial"><span class="dot"></span>Aging</span>
    <span class="gaps-legend__item gaps-legend__item--thin"><span class="dot"></span>Stale</span>
    <span class="gaps-legend__item gaps-legend__item--missing"><span class="dot"></span>Unknown</span>
  </div>`
    : '';

  const body = `
<div class="gaps-wrap">
  <div class="gaps-header">
    <h2>Coverage Map</h2>
    <p class="gaps-subtitle">Tag-weighted view of what this knowledge base covers well and where the thin spots are. Cell size reflects article count &times; depth.</p>
    <div class="gaps-summary">${summaryHtml}</div>
  </div>
  ${lensToggle}
  ${coverageLegend}${freshnessLegend}
  <div class="treemap-container">
    <div class="treemap-board" id="treemap-board">
    ${buildTreemapCells(cells)}
    </div>
    <div class="treemap-tooltip" id="treemap-tooltip"></div>
  </div>
</div>
${gapsScript()}`;

  return pageShell(`${shortTopic(data.schema.topic)} — Gaps`, 'gaps', body, config, data);
}

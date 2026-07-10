/**
 * present — Per-article pages (issue #2)
 *
 * One real page per article at site/read/{slug}/index.html: stable URLs,
 * deep-linkable, crawlable. Keeps the 3-column shell — article list (left,
 * real links), content (center), on-page TOC (right) — and morphs titles
 * across navigations via cross-document View Transitions (vta-{slug}).
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';
import { esc, jsonForScript } from '../esc.js';
import { sortByCentrality } from './read.js';
import { popoverScript } from '../js/popover.js';

function slugifyHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function confidenceBadgeClass(confidence: string): string {
  const lower = confidence.toLowerCase();
  if (lower === 'p0' || lower === 'high') return 'p0';
  if (lower === 'p1' || lower === 'medium') return 'p1';
  return 'p2';
}

const CONFIDENCE_TITLES: Readonly<Record<string, string>> = {
  p0: 'P0 — compiled from must-ingest sources (highest confidence)',
  p1: 'P1 — compiled from should-ingest sources (solid confidence)',
  p2: 'P2 — compiled from supplementary sources (verify before relying on)',
};

function freshnessBadge(data: SiteData, slug: string): string {
  const info = data.freshness?.bySlug[slug];
  if (!info || (info.tier !== 'aging' && info.tier !== 'stale')) return '';
  const dateNote = info.effectiveDate ? ` — last verified ${info.effectiveDate}` : '';
  const title = info.tier === 'stale'
    ? 'This article is past its staleness window; its sources may have moved on.'
    : 'This article is aging; consider a refresh pass.';
  return `<span class="freshness-badge freshness-badge--${info.tier}" title="${esc(title)}">${info.tier}${esc(dateNote)}</span>`;
}

function fidelityBadge(article: ArticleData): string {
  if (article.sourceFidelity === 'full') return '';
  const title = article.sourceFidelity === 'degraded'
    ? 'At least one cited source could not be captured; verify claims against the source list.'
    : 'At least one cited source was only partially captured; verify claims against the source list.';
  return `<span class="fidelity-badge fidelity-badge--${article.sourceFidelity}" title="${esc(title)}">Compiled from partial captures &mdash; verify against sources</span>`;
}

function buildBacklinks(article: ArticleData, all: readonly ArticleData[]): string {
  const backlinks = all.filter(a => a.slug !== article.slug && a.linksTo.includes(article.slug));
  if (backlinks.length === 0) return '';

  const items = backlinks.map(a => {
    const teaser = a.summary.length > 110 ? `${a.summary.slice(0, 110).trimEnd()}…` : a.summary;
    return `<li>
          <a href="../${esc(a.slug)}/index.html" data-wikilink-slug="${esc(a.slug)}">${esc(a.title)}</a>
          ${teaser ? `<span class="article-backlinks__teaser">${esc(teaser)}</span>` : ''}
        </li>`;
  }).join('\n        ');

  return `<section class="article-backlinks" aria-label="Articles linking here">
        <h2>Linked from</h2>
        <ul>
        ${items}
        </ul>
      </section>`;
}

function buildSources(article: ArticleData): string {
  if (article.sources.length === 0) return '';

  const items = article.sources.map(s => {
    let domain = '';
    try {
      domain = new URL(s.url).hostname.replace(/^www\./, '');
    } catch { /* unparseable url — skip the domain chip */ }
    return `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>${domain ? ` <span class="article-sources__domain">${esc(domain)}</span>` : ''}</li>`;
  }).join('\n        ');

  return `<section class="article-sources" id="sources" aria-label="Sources">
        <h2>Sources</h2>
        <ol>
        ${items}
        </ol>
      </section>`;
}

// Page-local preview payload: only the slugs this page links to (outbound)
// or is linked from (backlinks) — typically < 2KB.
function buildLinkPreviews(
  article: ArticleData,
  data: SiteData,
): string {
  const related = new Set<string>(article.linksTo);
  for (const a of data.articles) {
    if (a.linksTo.includes(article.slug)) related.add(a.slug);
  }
  related.delete(article.slug);

  const previews: Record<string, unknown> = {};
  for (const a of data.articles) {
    if (!related.has(a.slug)) continue;
    previews[a.slug] = {
      title: a.title,
      summary: a.summary.length > 180 ? `${a.summary.slice(0, 180).trimEnd()}…` : a.summary,
      tags: a.tags.slice(0, 3),
      readingTime: a.readingTime,
    };
  }
  return jsonForScript(previews);
}

// Wikilinks arrive as in-page anchors (`href="#slug" data-wikilink-slug`).
// On a real article page, known targets become real hrefs; unknown targets
// stay visibly "new" and non-navigating.
export function rewriteWikilinksForArticlePage(
  html: string,
  knownSlugs: ReadonlySet<string>,
): string {
  return html.replace(
    /href="#([^"]+)" data-wikilink-slug="([^"]+)"/g,
    (match, hrefSlug: string, dataSlug: string) => {
      if (knownSlugs.has(dataSlug)) {
        return `href="../${dataSlug}/index.html" data-wikilink-slug="${dataSlug}"`;
      }
      return `${match} role="link" aria-disabled="true"`;
    },
  );
}

function buildSidebar(sorted: readonly ArticleData[], currentSlug: string): string {
  const items = sorted.map(a => {
    const current = a.slug === currentSlug;
    return `<li><a href="../${esc(a.slug)}/index.html"${current ? ' aria-current="page"' : ''}>${esc(a.title)}</a></li>`;
  }).join('\n        ');

  return `<div class="read-sidebar">
      <h4>Articles</h4>
      <ul>
        ${items}
      </ul>
    </div>`;
}

function buildToc(article: ArticleData): string {
  const headings = article.headings.filter(h => h.level === 2);
  if (headings.length === 0) return '';

  const items = headings.map(h => {
    const id = slugifyHeading(h.text);
    return `<li data-heading="${esc(id)}"><a href="#${esc(id)}">${esc(h.text)}</a></li>`;
  }).join('\n          ');

  return `<div class="read-toc-right">
      <h4>On this page</h4>
      <ul>
          ${items}
      </ul>
    </div>`;
}

function buildPrevNext(
  sorted: readonly ArticleData[],
  index: number,
): string {
  const prev = index > 0 ? sorted[index - 1] : null;
  const next = index < sorted.length - 1 ? sorted[index + 1] : null;

  const prevLink = prev
    ? `<a href="../${esc(prev.slug)}/index.html" class="btn read-nav-btn" rel="prev">&larr; ${esc(prev.title)}</a>`
    : '<span></span>';
  const nextLink = next
    ? `<a href="../${esc(next.slug)}/index.html" class="btn read-nav-btn" rel="next">${esc(next.title)} &rarr;</a>`
    : '<span></span>';

  return `<nav class="article__nav" aria-label="Article navigation">
        ${prevLink}
        ${nextLink}
      </nav>`;
}

function articlePageScript(slug: string): string {
  return `<script>
(function() {
  try { localStorage.setItem('grimoire-last-read', ${jsonForScript(slug)}); } catch(e) {}

  // Reading progress: the CSS scroll-timeline path takes over where
  // supported; the scroll listener is the fallback.
  var bar = document.getElementById('read-progress');
  var cssProgress = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  if (!cssProgress) {
    var updateProgress = function() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (bar) bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // Unresolved wikilinks stay inert.
  document.addEventListener('click', function(e) {
    var dead = e.target.closest('a[aria-disabled="true"]');
    if (dead) e.preventDefault();
  });

  // TOC scroll spy with a sliding accent marker.
  var toc = document.querySelector('.read-toc-right');
  if (toc) {
    var list = toc.querySelector('ul');
    var marker = document.createElement('span');
    marker.className = 'read-toc-marker';
    marker.setAttribute('aria-hidden', 'true');
    if (list) list.appendChild(marker);

    var setActive = function(item) {
      toc.querySelectorAll('li').forEach(function(l) { l.classList.remove('active'); });
      item.classList.add('active');
      if (list && marker) {
        marker.style.transform = 'translateY(' + item.offsetTop + 'px)';
        marker.style.height = item.offsetHeight + 'px';
        marker.style.opacity = '1';
      }
    };

    var spy = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var active = toc.querySelector('li[data-heading="' + entry.target.id + '"]');
        if (active) setActive(active);
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    document.querySelectorAll('.article-body h2[id]').forEach(function(h) { spy.observe(h); });
  }
})();
</script>`;
}

export function generateArticlePage(
  article: ArticleData,
  data: SiteData,
  config: DesignConfig,
): string {
  const sorted = sortByCentrality(data.articles);
  const index = sorted.findIndex(a => a.slug === article.slug);
  const knownSlugs = new Set(data.articles.map(a => a.slug));

  const tags = article.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const badgeClass = confidenceBadgeClass(article.confidence);
  const confidenceBadge = article.confidence
    ? `<span class="confidence-badge ${badgeClass}" title="${esc(CONFIDENCE_TITLES[badgeClass] ?? '')}">${esc(article.confidence)}</span>`
    : '';
  const sourcesBadge = article.sources.length > 0
    ? `<a href="#sources" class="source-count">${article.sources.length} source${article.sources.length !== 1 ? 's' : ''}</a>`
    : '';
  const wordsMeta = `<span class="article-meta__words">${article.wordCount} words &middot; ${article.readingTime} min</span>`;

  const summaryBlock = article.summary
    ? `<div class="summary">${esc(article.summary)}</div>`
    : '';

  const body = `
<div class="read-3col">
  ${buildSidebar(sorted, article.slug)}
  <div class="read-content">
    <article class="article" id="${esc(article.slug)}" data-slug="${esc(article.slug)}">
      <div class="article-meta">
        ${confidenceBadge}
        ${sourcesBadge}
        ${freshnessBadge(data, article.slug)}
        ${fidelityBadge(article)}
        ${wordsMeta}
      </div>
      <h1 style="view-transition-name: vta-${esc(article.slug)}">${esc(article.title)}</h1>
      <div class="tag-row">${tags}</div>
      ${summaryBlock}
      <div class="article-body">
        ${rewriteWikilinksForArticlePage(article.html, knownSlugs)}
      </div>
      ${buildBacklinks(article, data.articles)}
      ${buildSources(article)}
      ${buildPrevNext(sorted, index)}
    </article>
  </div>
  ${buildToc(article)}
</div>
<script>window.LINK_PREVIEWS = ${buildLinkPreviews(article, data)};</script>
${articlePageScript(article.slug)}
${popoverScript()}`;

  return pageShell(
    `${article.title} — ${shortTopic(data.schema.topic)}`,
    'read',
    body,
    config,
    data,
    2,
  );
}

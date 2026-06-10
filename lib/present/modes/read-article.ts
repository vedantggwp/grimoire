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
import { esc } from '../esc.js';
import { sortByCentrality } from './read.js';

function slugifyHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function confidenceBadgeClass(confidence: string): string {
  const lower = confidence.toLowerCase();
  if (lower === 'p0' || lower === 'high') return 'p0';
  if (lower === 'p1' || lower === 'medium') return 'p1';
  return 'p2';
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
  try { localStorage.setItem('grimoire-last-read', ${JSON.stringify(slug)}); } catch(e) {}

  var bar = document.getElementById('read-progress');
  function updateProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Unresolved wikilinks stay inert.
  document.addEventListener('click', function(e) {
    var dead = e.target.closest('a[aria-disabled="true"]');
    if (dead) e.preventDefault();
  });

  // TOC scroll spy
  var toc = document.querySelector('.read-toc-right');
  if (toc) {
    var spy = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        toc.querySelectorAll('li').forEach(function(l) { l.classList.remove('active'); });
        var active = toc.querySelector('li[data-heading="' + entry.target.id + '"]');
        if (active) active.classList.add('active');
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
  const confidenceBadge = article.confidence
    ? `<span class="confidence-badge ${confidenceBadgeClass(article.confidence)}">${esc(article.confidence)}</span>`
    : '';
  const sourcesBadge = article.sources.length > 0
    ? `<span class="source-count">${article.sources.length} source${article.sources.length !== 1 ? 's' : ''}</span>`
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
        ${wordsMeta}
      </div>
      <h1 style="view-transition-name: vta-${esc(article.slug)}">${esc(article.title)}</h1>
      <div class="tag-row">${tags}</div>
      ${summaryBlock}
      <div class="article-body">
        ${rewriteWikilinksForArticlePage(article.html, knownSlugs)}
      </div>
      ${buildPrevNext(sorted, index)}
    </article>
  </div>
  ${buildToc(article)}
</div>
${articlePageScript(article.slug)}`;

  return pageShell(
    `${article.title} — ${shortTopic(data.schema.topic)}`,
    'read',
    body,
    config,
    data,
    2,
  );
}

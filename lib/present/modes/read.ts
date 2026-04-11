/**
 * present — Read mode
 *
 * Linear reading view: articles sorted by centrality,
 * TOC sidebar, progress bar, next/previous navigation.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sortByCentrality(
  articles: readonly ArticleData[],
): readonly ArticleData[] {
  return [...articles].sort((a, b) => {
    const scoreA = a.linksTo.length + countBacklinks(a, articles);
    const scoreB = b.linksTo.length + countBacklinks(b, articles);
    return scoreB - scoreA;
  });
}

function countBacklinks(
  article: ArticleData,
  all: readonly ArticleData[],
): number {
  return all.filter(a => a.linksTo.includes(article.slug)).length;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTOC(sorted: readonly ArticleData[]): string {
  const items = sorted.map(a =>
    `<li><a href="#${esc(a.slug)}" class="toc__link" data-target="${esc(a.slug)}">${esc(a.title)}</a></li>`
  ).join('\n      ');

  return `<aside class="read__toc" id="toc">
    <button class="read__toc-toggle btn" id="toc-toggle" aria-label="Toggle table of contents">Contents</button>
    <ol class="read__toc-list" id="toc-list">
      ${items}
    </ol>
  </aside>`;
}

function buildArticleSection(
  article: ArticleData,
  index: number,
  total: number,
  sorted: readonly ArticleData[],
): string {
  const tags = article.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ');
  const meta = [
    `${article.wordCount} words`,
    `${article.readingTime} min read`,
    article.confidence ? `Confidence: ${esc(article.confidence)}` : '',
  ].filter(Boolean).join(' &middot; ');

  const prevLink = index > 0
    ? `<a href="#${esc(sorted[index - 1].slug)}" class="btn">&larr; ${esc(sorted[index - 1].title)}</a>`
    : '<span></span>';
  const nextLink = index < total - 1
    ? `<a href="#${esc(sorted[index + 1].slug)}" class="btn">${esc(sorted[index + 1].title)} &rarr;</a>`
    : '<span></span>';

  const summaryBlock = article.summary
    ? `<p class="article__summary" style="font-size:var(--text-lg);color:var(--color-muted);font-style:italic;margin:var(--space-3) 0 var(--space-5)">${esc(article.summary)}</p>`
    : '';

  return `<article class="article" id="${esc(article.slug)}">
  <header>
    <h2>${esc(article.title)}</h2>
    <div class="article__meta">${tags} <span style="color:var(--color-muted);font-size:var(--text-sm)">${meta}</span></div>
    ${summaryBlock}
  </header>
  <div class="article__content content-column">
    ${article.html}
  </div>
  <nav class="article__nav" style="display:flex;justify-content:space-between;padding:var(--space-4) 0">
    ${prevLink}
    ${nextLink}
  </nav>
</article>`;
}

function readModeScript(): string {
  return `<script>
(function() {
  // Progress bar
  var bar = document.getElementById('read-progress');
  function updateProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  // TOC highlighting
  var articles = document.querySelectorAll('.article');
  var tocLinks = document.querySelectorAll('.toc__link');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        tocLinks.forEach(function(l) { l.classList.remove('nav__link--active'); });
        var active = document.querySelector('.toc__link[data-target="' + entry.target.id + '"]');
        if (active) active.classList.add('nav__link--active');
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px' });
  articles.forEach(function(a) { observer.observe(a); });

  // Mobile TOC toggle
  var toggle = document.getElementById('toc-toggle');
  var list = document.getElementById('toc-list');
  toggle.addEventListener('click', function() {
    list.classList.toggle('read__toc-list--open');
  });
})();
</script>`;
}

function readModeStyles(): string {
  return `<style>
  .read__layout { display: flex; gap: var(--space-6); }
  .read__toc {
    position: sticky; top: 60px; align-self: flex-start;
    width: var(--sidebar-width); flex-shrink: 0;
  }
  .read__toc-list { list-style: decimal; padding-left: var(--space-4); font-size: var(--text-sm); }
  .read__toc-list li { margin-bottom: var(--space-2); }
  .read__toc-toggle { display: none; }
  .read__main { flex: 1; min-width: 0; }
  @media (max-width: 767px) {
    .read__layout { flex-direction: column; }
    .read__toc { position: relative; top: 0; width: 100%; }
    .read__toc-toggle { display: block; width: 100%; margin-bottom: var(--space-2); }
    .read__toc-list { display: none; }
    .read__toc-list--open { display: block; }
  }
</style>`;
}

export function generateReadMode(data: SiteData, config: DesignConfig): string {
  const sorted = sortByCentrality(data.articles);

  const articleSections = sorted.map((a, i) =>
    buildArticleSection(a, i, sorted.length, sorted)
  ).join('\n');

  const body = `
<div class="read-progress" id="read-progress" style="position:fixed;top:0;left:0;height:3px;background:var(--color-accent);z-index:200;width:0%;transition:width 100ms linear"></div>
${readModeStyles()}
<div class="read__layout">
  ${buildTOC(sorted)}
  <div class="read__main">
    ${articleSections}
  </div>
</div>
${readModeScript()}`;

  return pageShell(`${data.schema.topic} — Read`, 'read', body, config, data);
}

/**
 * present — Read mode
 *
 * 3-column editorial layout: article nav sidebar (left),
 * article content (center, max 680px), on-page TOC (right).
 * Shows one article at a time with show/hide navigation.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function sortByCentrality(
  articles: readonly ArticleData[],
): readonly ArticleData[] {
  return [...articles].sort((a, b) => {
    const scoreA = a.linksTo.length + countBacklinks(a, articles);
    const scoreB = b.linksTo.length + countBacklinks(b, articles);
    return scoreB - scoreA || a.slug.localeCompare(b.slug);
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

function buildLeftSidebar(sorted: readonly ArticleData[]): string {
  const items = sorted.map((a, i) =>
    `<li data-article="${esc(a.slug)}"${i === 0 ? ' class="active"' : ''}>${esc(a.title)}</li>`
  ).join('\n        ');

  return `<div class="read-sidebar">
      <h4>Articles</h4>
      <ul>
        ${items}
      </ul>
    </div>`;
}

function buildRightTOC(article: ArticleData): string {
  const headings = article.headings.filter(h => h.level === 2);
  const items = headings.map((h, i) =>
    `<li data-heading="${esc(slugify(h.text))}"${i === 0 ? ' class="active"' : ''}>${esc(h.text)}</li>`
  ).join('\n          ');

  return `<ul>
          ${items}
        </ul>`;
}

function confidenceBadgeClass(confidence: string): string {
  const lower = confidence.toLowerCase();
  if (lower === 'p0' || lower === 'high') return 'p0';
  if (lower === 'p1' || lower === 'medium') return 'p1';
  return 'p2';
}

function buildArticleSection(
  article: ArticleData,
  index: number,
  total: number,
  sorted: readonly ArticleData[],
): string {
  const tags = article.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const confidenceBadge = article.confidence
    ? `<span class="confidence-badge ${confidenceBadgeClass(article.confidence)}">${esc(article.confidence)}</span>`
    : '';
  const sourcesBadge = article.sources.length > 0
    ? `<span class="source-count">${article.sources.length} source${article.sources.length !== 1 ? 's' : ''}</span>`
    : '';
  const wordsMeta = `<span style="color:var(--text-tertiary);font-size:12px;font-family:var(--font-mono)">${article.wordCount} words &middot; ${article.readingTime} min</span>`;

  const summaryBlock = article.summary
    ? `<div class="summary">${esc(article.summary)}</div>`
    : '';

  const prevLink = index > 0
    ? `<a href="#" class="btn read-nav-btn" data-article="${esc(sorted[index - 1].slug)}">&larr; ${esc(sorted[index - 1].title)}</a>`
    : '<span></span>';
  const nextLink = index < total - 1
    ? `<a href="#" class="btn read-nav-btn" data-article="${esc(sorted[index + 1].slug)}">${esc(sorted[index + 1].title)} &rarr;</a>`
    : '<span></span>';

  return `<article class="article" id="${esc(article.slug)}" data-slug="${esc(article.slug)}" style="${index > 0 ? 'display:none' : ''}">
      <div class="article-meta">
        ${confidenceBadge}
        ${sourcesBadge}
        ${wordsMeta}
      </div>
      <h1>${esc(article.title)}</h1>
      <div class="tag-row">${tags}</div>
      ${summaryBlock}
      <div class="article-body">
        ${article.html}
      </div>
      <nav class="article__nav" style="display:flex;justify-content:space-between;padding:16px 0;margin-top:32px;border-top:1px solid var(--border)">
        ${prevLink}
        ${nextLink}
      </nav>
    </article>`;
}

// Styles are in the main stylesheet (css.ts) — no inline styles needed

function readModeScript(sorted: readonly ArticleData[]): string {
  const tocData = JSON.stringify(
    sorted.map(a => ({
      slug: a.slug,
      headings: a.headings.filter(h => h.level === 2).map(h => ({
        text: h.text,
        id: slugify(h.text),
      })),
    }))
  );

  return `<script>
(function() {
  var tocData = ${tocData};
  var bar = document.getElementById('read-progress');
  var articles = document.querySelectorAll('.read-content .article');
  var sidebarItems = document.querySelectorAll('.read-sidebar li');
  var tocRight = document.querySelector('.read-toc-right');

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Progress bar
  function updateProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  // Switch article
  function showArticle(slug) {
    var found = false;
    articles.forEach(function(a) {
      var active = a.dataset.slug === slug;
      a.style.display = active ? '' : 'none';
      if (active) found = true;
    });
    if (!found) return;
    sidebarItems.forEach(function(li) {
      li.classList.toggle('active', li.dataset.article === slug);
    });
    // Update right TOC
    var entry = tocData.find(function(t) { return t.slug === slug; });
    if (entry && tocRight) {
      var items = entry.headings.map(function(h, i) {
        return '<li data-heading="' + esc(h.id) + '"' + (i === 0 ? ' class="active"' : '') + '>' + esc(h.text) + '</li>';
      }).join('');
      tocRight.querySelector('ul').innerHTML = items;
      bindTocClicks();
    }
    if (window.location.hash.slice(1) !== slug) {
      window.history.replaceState(null, '', '#' + slug);
    }
    window.scrollTo(0, 0);
    updateProgress();
  }

  // Sidebar click
  sidebarItems.forEach(function(li) {
    li.addEventListener('click', function() {
      showArticle(li.dataset.article);
    });
  });

  // Next/prev nav buttons
  document.addEventListener('click', function(e) {
    var wikilink = e.target.closest('a[data-wikilink-slug]');
    if (wikilink) {
      var targetSlug = wikilink.dataset.wikilinkSlug;
      if (targetSlug && document.querySelector('.article[data-slug="' + targetSlug + '"]')) {
        e.preventDefault();
        showArticle(targetSlug);
      }
      return;
    }
    var btn = e.target.closest('.read-nav-btn');
    if (btn) {
      e.preventDefault();
      showArticle(btn.dataset.article);
    }
  });

  // Right TOC click — scroll to heading
  function bindTocClicks() {
    var tocItems = tocRight ? tocRight.querySelectorAll('li') : [];
    tocItems.forEach(function(li) {
      li.addEventListener('click', function() {
        var id = li.dataset.heading;
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  bindTocClicks();

  var initialSlug = window.location.hash.slice(1);
  if (initialSlug && document.querySelector('.article[data-slug="' + initialSlug + '"]')) {
    showArticle(initialSlug);
  } else {
    updateProgress();
  }

  // TOC highlight on scroll (observe h2 within visible article)
  var headingObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && tocRight) {
        var tocItems = tocRight.querySelectorAll('li');
        tocItems.forEach(function(l) { l.classList.remove('active'); });
        var active = tocRight.querySelector('li[data-heading="' + entry.target.id + '"]');
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px' });

  // Observe headings in all articles (only visible ones will fire)
  articles.forEach(function(a) {
    a.querySelectorAll('h2[id]').forEach(function(h) {
      headingObserver.observe(h);
    });
  });
})();
</script>`;
}

export function generateReadMode(data: SiteData, config: DesignConfig): string {
  const sorted = sortByCentrality(data.articles);

  const articleSections = sorted.map((a, i) =>
    buildArticleSection(a, i, sorted.length, sorted)
  ).join('\n');

  const firstArticleTOC = sorted.length > 0 ? buildRightTOC(sorted[0]) : '<ul></ul>';

  const body = `
<div class="read-3col">
  ${buildLeftSidebar(sorted)}
  <div class="read-content">
    ${articleSections}
  </div>
  <div class="read-toc-right">
    <h4>On this page</h4>
    ${firstArticleTOC}
  </div>
</div>
${readModeScript(sorted)}`;

  return pageShell(`${data.schema.topic} — Read`, 'read', body, config, data);
}

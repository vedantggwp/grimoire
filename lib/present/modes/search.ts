/**
 * present — Search mode
 *
 * Command-palette-style search with a substantive default state:
 *   1. Example queries derived from the top centrality-ranked articles,
 *      prefilling the input when clicked.
 *   2. A tag cloud of every tag in the wiki (clickable → filters articles).
 *   3. A browse grid of all articles sorted by centrality, each card
 *      showing title, summary, and tag chips.
 *
 * When the user types 2+ characters the default state hides and live
 * results render in the same container. ⌘K focuses the input from anywhere.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sortByCentrality(articles: readonly ArticleData[]): readonly ArticleData[] {
  return [...articles].sort((a, b) => {
    const scoreA = a.linksTo.length + articles.filter(x => x.linksTo.includes(a.slug)).length;
    const scoreB = b.linksTo.length + articles.filter(x => x.linksTo.includes(b.slug)).length;
    return scoreB - scoreA || a.slug.localeCompare(b.slug);
  });
}

function buildArticlesJSON(data: SiteData): string {
  const articles = data.articles.map(a => ({
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    tags: a.tags,
    html: a.html,
    wordCount: a.wordCount,
    headings: a.headings.map(h => h.text),
    excerpt: a.html.replace(/<[^>]+>/g, '').slice(0, 200),
  }));
  return JSON.stringify(articles);
}

export function buildTagCloud(articles: readonly ArticleData[]): string {
  const tagCounts = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const cap = articles.length < 15
    ? 40
    : Math.min(40, Math.max(20, Math.ceil(articles.length * 3)));
  const sorted = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap);
  return sorted
    .map(([tag, count]) =>
      `<button type="button" class="search-tag-pill" data-tag="${esc(tag)}">${esc(tag)}<span class="search-tag-pill__count">${count}</span></button>`,
    )
    .join('');
}

function buildArticleGrid(articles: readonly ArticleData[]): string {
  const sorted = sortByCentrality(articles).slice(0, 18);
  return sorted
    .map(a => {
      const tagChips = a.tags.slice(0, 4)
        .map(t => `<span class="search-article-card__tag">${esc(t)}</span>`)
        .join('');
      const summary = a.summary || '';
      return `<article class="search-article-card" data-slug="${esc(a.slug)}" data-tags="${esc(a.tags.join(','))}">
      <h3>${esc(a.title)}</h3>
      ${summary ? `<p>${esc(summary)}</p>` : ''}
      <div class="search-article-card__tags">${tagChips}</div>
    </article>`;
    })
    .join('');
}

function buildExampleQueries(articles: readonly ArticleData[]): string {
  const top = sortByCentrality(articles).slice(0, 3);
  if (top.length === 0) return '';
  // Phrase-build example queries from titles — "what is X?", "how does Y work?", "Z overview".
  const templates: Array<(title: string) => string> = [
    title => `what is ${title.toLowerCase()}`,
    title => `how does ${title.toLowerCase()} work`,
    title => `${title.toLowerCase()} overview`,
  ];
  return top
    .map((a, i) => {
      const query = templates[i](a.title);
      return `<button type="button" class="search-example" data-query="${esc(query)}">${esc(query)}</button>`;
    })
    .join('');
}

function searchScript(): string {
  return `<script>
(function() {
  var articles = window.SEARCH_ARTICLES;
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var defaultPane = document.getElementById('search-default');
  var timer = null;
  var activeTagFilter = null;

  function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9\\s]/g, '');
  }

  function esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function highlightMatch(text, query) {
    if (!query) return esc(text);
    var escaped = esc(text);
    var qEsc = esc(query);
    var re = new RegExp('(' + qEsc.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
    return escaped.replace(re, '<span class="match">$1</span>');
  }

  function showDefault() {
    defaultPane.style.display = '';
    results.style.display = 'none';
    results.innerHTML = '';
  }

  function hideDefault() {
    defaultPane.style.display = 'none';
    results.style.display = '';
  }

  function search(query) {
    if (!query || query.length < 2) {
      showDefault();
      return;
    }

    hideDefault();

    var q = normalize(query);
    var words = q.split(/\\s+/).filter(Boolean);

    var scored = articles.map(function(a) {
      var titleNorm = normalize(a.title);
      var summaryNorm = normalize(a.summary || '');
      var excerptNorm = normalize(a.excerpt);
      var tagsNorm = a.tags.map(normalize).join(' ');
      var headingsNorm = a.headings.map(normalize).join(' ');
      var score = 0;

      words.forEach(function(w) {
        if (titleNorm.includes(w)) score += 10;
        if (summaryNorm.includes(w)) score += 6;
        if (headingsNorm.includes(w)) score += 5;
        if (tagsNorm.includes(w)) score += 3;
        if (excerptNorm.includes(w)) score += 1;
      });

      if (titleNorm.includes(q)) score += 20;

      return { article: a, score: score };
    }).filter(function(r) {
      return r.score > 0;
    }).sort(function(a, b) {
      return b.score - a.score;
    });

    var allTags = {};
    articles.forEach(function(a) {
      a.tags.forEach(function(t) {
        if (!allTags[t]) allTags[t] = { name: t, count: 0 };
        allTags[t].count++;
      });
    });
    var matchedTags = Object.values(allTags).filter(function(t) {
      return normalize(t.name).includes(q);
    }).sort(function(a, b) { return b.count - a.count; });

    if (scored.length === 0 && matchedTags.length === 0) {
      results.innerHTML = '<div class="search-empty">No results for <strong>' + esc(query) + '</strong>. Try a different term.</div>';
      return;
    }

    var html = '';

    if (scored.length > 0) {
      html += '<div class="search-group"><div class="search-group-title">Articles (' + scored.length + ')</div>';
      html += scored.map(function(r) {
        var a = r.article;
        var excerpt = a.summary || a.excerpt;
        return '<div class="search-result" data-slug="' + esc(a.slug) + '">' +
          '<div class="title">' + highlightMatch(a.title, query) + '</div>' +
          '<div class="excerpt">' + highlightMatch(excerpt.slice(0, 140), query) + (excerpt.length > 140 ? '...' : '') + '</div>' +
          '</div>';
      }).join('');
      html += '</div>';
    }

    if (matchedTags.length > 0) {
      html += '<div class="search-group"><div class="search-group-title">Tags (' + matchedTags.length + ')</div>';
      html += matchedTags.map(function(t) {
        return '<div class="search-result">' +
          '<div class="title">' + highlightMatch(t.name, query) + '</div>' +
          '<div class="excerpt">' + t.count + ' article' + (t.count !== 1 ? 's' : '') + '</div>' +
          '</div>';
      }).join('');
      html += '</div>';
    }

    results.innerHTML = html;
  }

  input.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      search(input.value.trim());
    }, 180);
  });

  // Example query pills prefill the input and trigger a search.
  document.querySelectorAll('.search-example').forEach(function(btn) {
    btn.addEventListener('click', function() {
      input.value = btn.dataset.query;
      input.focus();
      search(input.value);
    });
  });

  // Tag pills in the cloud filter the default article grid.
  var gridCards = document.querySelectorAll('.search-article-card');
  document.querySelectorAll('.search-tag-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var tag = pill.dataset.tag;
      if (activeTagFilter === tag) {
        activeTagFilter = null;
        pill.classList.remove('active');
      } else {
        activeTagFilter = tag;
        document.querySelectorAll('.search-tag-pill').forEach(function(p) {
          p.classList.toggle('active', p === pill);
        });
      }
      gridCards.forEach(function(card) {
        var tags = (card.dataset.tags || '').split(',');
        var visible = !activeTagFilter || tags.indexOf(activeTagFilter) !== -1;
        card.style.display = visible ? '' : 'none';
      });
    });
  });

  // Browse cards — click to open the Read page for that article.
  gridCards.forEach(function(card) {
    card.addEventListener('click', function() {
      var slug = card.dataset.slug;
      if (slug) window.location.href = '../read/index.html#' + slug;
    });
  });

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape') {
      if (input.value) {
        input.value = '';
        showDefault();
      } else {
        input.blur();
      }
    }
  });

  showDefault();
  input.focus();
})();
</script>`;
}

export function generateSearchMode(data: SiteData, config: DesignConfig): string {
  const articlesJSON = buildArticlesJSON(data);
  const tagCloud = buildTagCloud(data.articles);
  const articleGrid = buildArticleGrid(data.articles);
  const exampleQueries = buildExampleQueries(data.articles);

  const body = `
<script>window.SEARCH_ARTICLES = ${articlesJSON};</script>
<div class="search-page">
  <div class="search-hero">
    <div class="search-hint-top">Press <kbd>&#8984;K</kbd> to focus search from anywhere</div>
    <div class="search-overlay">
      <div class="search-input-wrap">
        <span class="search-icon">&#128269;</span>
        <input
          type="search"
          id="search-input"
          placeholder="Search articles, tags, concepts..."
          autocomplete="off"
        >
        <kbd>ESC</kbd>
      </div>
    </div>
    ${exampleQueries ? `<div class="search-examples">
      <span class="search-examples__label">Try</span>
      ${exampleQueries}
    </div>` : ''}
  </div>

  <div class="search-results" id="search-results" style="display:none"></div>

  <div class="search-default" id="search-default">
    <section class="search-section">
      <h3 class="search-section__title">Browse by tag</h3>
      <div class="search-tag-cloud">${tagCloud}</div>
    </section>
    <section class="search-section">
      <h3 class="search-section__title">All articles</h3>
      <div class="search-article-grid">${articleGrid}</div>
    </section>
  </div>
</div>
${searchScript()}`;

  return pageShell(`${data.schema.topic} — Search`, 'search', body, config, data);
}

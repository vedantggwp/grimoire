/**
 * present — Search mode
 *
 * Client-side search with debounced input, inline article expansion.
 * Uses simple substring + word matching (no external dependencies).
 */

import type { SiteData, DesignConfig } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildArticlesJSON(data: SiteData): string {
  const articles = data.articles.map(a => ({
    slug: a.slug,
    title: a.title,
    tags: a.tags,
    html: a.html,
    wordCount: a.wordCount,
    headings: a.headings.map(h => h.text),
    excerpt: a.html.replace(/<[^>]+>/g, '').slice(0, 200),
  }));
  return JSON.stringify(articles);
}

function searchScript(): string {
  return `<script>
(function() {
  var articles = window.SEARCH_ARTICLES;
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var timer = null;

  function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9\\s]/g, '');
  }

  function esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function search(query) {
    if (!query || query.length < 2) {
      results.innerHTML = '<p style="color:var(--color-muted)">Type at least 2 characters to search.</p>';
      return;
    }

    var q = normalize(query);
    var words = q.split(/\\s+/).filter(Boolean);

    var scored = articles.map(function(a) {
      var titleNorm = normalize(a.title);
      var excerptNorm = normalize(a.excerpt);
      var tagsNorm = a.tags.map(normalize).join(' ');
      var headingsNorm = a.headings.map(normalize).join(' ');
      var score = 0;

      words.forEach(function(w) {
        if (titleNorm.includes(w)) score += 10;
        if (headingsNorm.includes(w)) score += 5;
        if (tagsNorm.includes(w)) score += 3;
        if (excerptNorm.includes(w)) score += 1;
      });

      // Exact phrase in title
      if (titleNorm.includes(q)) score += 20;

      return { article: a, score: score };
    }).filter(function(r) {
      return r.score > 0;
    }).sort(function(a, b) {
      return b.score - a.score;
    });

    if (scored.length === 0) {
      results.innerHTML = '<p style="color:var(--color-muted)">No results found.</p>';
      return;
    }

    results.innerHTML = scored.map(function(r) {
      var a = r.article;
      var tags = a.tags.map(function(t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join(' ');
      var matchedHeading = '';
      var qLower = query.toLowerCase();
      for (var i = 0; i < a.headings.length; i++) {
        if (a.headings[i].toLowerCase().includes(qLower)) {
          matchedHeading = '<span style="color:var(--color-accent);font-size:var(--text-xs)">Matched: ' + esc(a.headings[i]) + '</span>';
          break;
        }
      }

      return '<div class="search-result card" data-slug="' + esc(a.slug) + '">' +
        '<h3 style="font-size:var(--text-lg);margin-bottom:var(--space-1)">' + esc(a.title) + '</h3>' +
        '<div style="margin-bottom:var(--space-2)">' + tags + ' ' + matchedHeading + '</div>' +
        '<p style="color:var(--color-muted);font-size:var(--text-sm)">' + esc(a.excerpt) + '...</p>' +
        '<div class="search-result__content" style="display:none;margin-top:var(--space-4)">' + a.html + '</div>' +
        '</div>';
    }).join('');

    // Click to expand
    results.querySelectorAll('.search-result').forEach(function(el) {
      el.addEventListener('click', function() {
        var content = el.querySelector('.search-result__content');
        var isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
      });
    });
  }

  input.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      search(input.value.trim());
    }, 300);
  });

  // Focus on load
  input.focus();
})();
</script>`;
}

export function generateSearchMode(data: SiteData, config: DesignConfig): string {
  const articlesJSON = buildArticlesJSON(data);

  const body = `
<script>window.SEARCH_ARTICLES = ${articlesJSON};</script>
<div style="padding:var(--space-6) 0">
  <div class="content-column">
    <h1 style="margin-bottom:var(--space-4)">Search</h1>
    <input
      type="search"
      id="search-input"
      class="search-input"
      placeholder="Search articles, tags, headings..."
      autocomplete="off"
    >
    <div id="search-results" class="search-results">
      <p style="color:var(--color-muted)">Type at least 2 characters to search.</p>
    </div>
  </div>
</div>
${searchScript()}`;

  return pageShell(`${data.schema.topic} — Search`, 'search', body, config, data);
}

/**
 * present — Reading index
 *
 * The entry page of read mode: every article as a real link to its own
 * page (site/read/{slug}/index.html — issue #2), ordered by graph
 * centrality, with a "Continue reading" pickup for returning readers and
 * a redirect shim that keeps pre-v0.4 `read/index.html#slug` hash links
 * working (issue #8 adjacency).
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';
import { esc, jsonForScript } from '../esc.js';

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

function buildRow(article: ArticleData, index: number): string {
  const num = String(index + 1).padStart(2, '0');
  const summary = article.summary
    ? `<span class="summary">${esc(article.summary)}</span>`
    : '';
  const tags = article.tags.slice(0, 3).map(t => esc(t)).join(' &middot; ');
  const meta = `<span class="read-row__meta">${article.readingTime} min read${tags ? ` &middot; ${tags}` : ''}</span>`;

  return `<li class="read-row" style="--reveal-i: ${Math.min(index, 8)}">
      <a class="read-row__link" href="${esc(article.slug)}/index.html">
        <span class="read-row__num">${num}</span>
        <span class="read-row__main">
          <span class="read-row__title" style="view-transition-name: vta-${esc(article.slug)}">${esc(article.title)}</span>
          ${summary}
          ${meta}
        </span>
        <span class="read-row__arrow" aria-hidden="true">&rarr;</span>
      </a>
    </li>`;
}

function readIndexScript(slugs: readonly string[]): string {
  return `<script>
(function() {
  var known = ${jsonForScript(slugs)};

  // Legacy hash links (read/index.html#slug) redirect to the article page.
  var hash = window.location.hash.slice(1);
  if (hash && known.indexOf(hash) !== -1) {
    window.location.replace('./' + hash + '/index.html');
    return;
  }

  // Returning readers can pick up where they left off.
  var last = null;
  try { last = localStorage.getItem('grimoire-last-read'); } catch(e) {}
  if (last && known.indexOf(last) !== -1) {
    var cta = document.getElementById('read-continue');
    var link = document.getElementById('read-continue-link');
    var row = document.querySelector('.read-row__link[href="' + last + '/index.html"]');
    var title = row ? row.querySelector('.read-row__title').textContent : last;
    if (cta && link) {
      link.href = last + '/index.html';
      link.textContent = 'Continue reading: ' + title + ' \\u2192';
      cta.hidden = false;
    }
  }
})();
</script>`;
}

export function generateReadMode(data: SiteData, config: DesignConfig): string {
  const sorted = sortByCentrality(data.articles);
  const rows = sorted.map((a, i) => buildRow(a, i)).join('\n    ');

  const body = `
<header class="read-index-header">
  <h1>Read</h1>
  <p class="read-index-lead">${sorted.length} article${sorted.length === 1 ? '' : 's'}, ordered by how central each is to the knowledge graph. Start at the top for the spine of the topic.</p>
  <p id="read-continue" hidden><a id="read-continue-link" class="btn btn--primary" href="#">Continue reading</a></p>
</header>
<ol class="read-index">
    ${rows}
</ol>
${readIndexScript(sorted.map(a => a.slug))}`;

  return pageShell(`${shortTopic(data.schema.topic)} — Read`, 'read', body, config, data);
}

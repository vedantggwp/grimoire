/**
 * present — Graph mode
 *
 * Force-directed graph visualization using D3.
 * Nodes sized by word count, colored by primary tag.
 * Click to show article summary in side panel.
 *
 * D3 is embedded inline from the bundled UMD build (see `./d3-source.ts`
 * and the `d3-inline` plugin in `scripts/build.mjs`) — no CDN, no network,
 * fully self-contained static output.
 */

import type { SiteData, DesignConfig } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';
import { d3MinSource } from './d3-source.js';
import { computeForceLayout } from '../layout.js';
import { esc, jsonForScript } from '../esc.js';

function graphScript(): string {
  // Emit d3 as a plain (non-module) script tag. The UMD wrapper assigns
  // to `self.d3` (i.e. `window.d3`) when neither CJS nor AMD is present,
  // so the graph script below picks up the global.
  return `<script>${d3MinSource}</script>
<script>
(function () {
var data = window.GRAPH_DATA;
var nodes = data.nodes.map(function(n) { return Object.assign({}, n); });
var edges = data.edges.map(function(e) {
  return { source: e.source, target: e.target };
});

var svg = d3.select('#graph-svg');
var container = document.getElementById('graph-container');
var width = Math.max(container.clientWidth, 600);
var height = Math.max(container.clientHeight || 0, 560);

svg.attr('viewBox', [0, 0, width, height]);

// Warm start: seed positions from the build-time layout so the graph
// settles in place instead of exploding from the center.
nodes.forEach(function(n) {
  n.x = (n.seedX || 0.5) * width;
  n.y = (n.seedY || 0.5) * height;
});

// Color by primary tag via the palette's categorical ramp — CSS custom
// properties, so a theme toggle recolors every node instantly.
var tags = Array.from(new Set(nodes.flatMap(function(n) { return n.tags; })));
var catIndex = data.tagColorIndex || {};
function tagColor(t) {
  var idx = catIndex[t];
  return idx === undefined ? 'var(--text-tertiary)' : 'var(--cat-' + idx + ')';
}

// Size by word count — scale up when there are few nodes so small graphs
// don't collapse into a dot in the middle of a large canvas.
var maxWords = Math.max.apply(null, nodes.map(function(n) { return n.wordCount || 1; }));
var sizeBoost = nodes.length <= 8 ? 1.6 : 1;
function radius(n) { return (8 + (n.wordCount / maxWords) * 20) * sizeBoost; }

// Label width (used for collision padding so labels don't overlap)
function estimateLabelWidth(d) {
  return Math.min(280, (d.label || '').length * 6.5);
}
function collisionRadius(d) {
  // circle radius + half-label-width + margin so labels never overlap
  return radius(d) + estimateLabelWidth(d) / 2 + 14;
}

// Link distance scales with node count — tight for dense graphs,
// airy for small graphs so there's room for labels.
var linkDistance = nodes.length <= 6 ? 180 : nodes.length <= 15 ? 130 : 90;
var chargeStrength = nodes.length <= 6 ? -600 : nodes.length <= 15 ? -600 : -300;

var simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(function(d) { return d.id; }).distance(linkDistance).strength(0.6))
  .force('charge', d3.forceManyBody().strength(chargeStrength).distanceMax(width * 0.8))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('x', d3.forceX(width / 2).strength(0.04))
  .force('y', d3.forceY(height / 2).strength(0.04))
  .force('collision', d3.forceCollide().radius(collisionRadius).strength(1))
  .alpha(0.3);

var g = svg.append('g');
var hullLayer = g.append('g').attr('class', 'graph-hulls').style('display', 'none');

// Zoom
var zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', function(e) {
  g.attr('transform', e.transform);
});
svg.call(zoom);

// Edges
var link = g.selectAll('.graph-edge')
  .data(edges).join('line')
  .attr('class', 'graph-edge')
  .attr('stroke', 'var(--graph-edge)')
  .attr('stroke-opacity', 0.4)
  .attr('stroke-width', 1);

// Nodes
var node = g.selectAll('.graph-node')
  .data(nodes).join('circle')
  .attr('class', 'graph-node')
  .attr('r', function(d) { return radius(d); })
  .attr('fill', function(d) { return d.tags.length ? tagColor(d.tags[0]) : 'var(--text-tertiary)'; })
  .attr('stroke', 'var(--color-surface)')
  .attr('stroke-width', 2)
  .style('cursor', 'pointer');

// Labels — text with a theme-aware stroke behind so they stay readable
// over edges and other nodes. paint-order: stroke ensures the stroke
// renders under the fill.
var label = g.selectAll('.graph-label')
  .data(nodes).join('text')
  .attr('class', 'graph-label')
  .attr('text-anchor', 'middle')
  .attr('dy', function(d) { return radius(d) + 16; })
  .attr('fill', 'var(--color-text)')
  .attr('stroke', 'var(--color-bg)')
  .attr('stroke-width', 4)
  .attr('paint-order', 'stroke')
  .attr('font-size', '12px')
  .attr('font-weight', '500')
  .attr('font-family', 'var(--font-body)')
  .style('pointer-events', 'none')
  .text(function(d) {
    var lbl = d.label || '';
    return lbl.length > 40 ? lbl.slice(0, 38) + '…' : lbl;
  });

// Drag
node.call(d3.drag()
  .on('start', function(e, d) {
    if (!e.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  })
  .on('drag', function(e, d) { d.fx = e.x; d.fy = e.y; })
  .on('end', function(e, d) {
    if (!e.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  })
);

// Click → focus the 1-hop neighborhood + detail panel. Double-click →
// open the article. Esc or background click clears.
var panel = document.getElementById('graph-panel');
var panelTitle = document.getElementById('panel-title');
var panelMeta = document.getElementById('panel-meta');
var panelClose = document.getElementById('panel-close');
var focusedId = null;

function neighborsOf(id) {
  var set = { };
  set[id] = true;
  edges.forEach(function(e) {
    var s = e.source.id || e.source;
    var t = e.target.id || e.target;
    if (s === id) set[t] = true;
    if (t === id) set[s] = true;
  });
  return set;
}

function applyFocus(d) {
  focusedId = d.id;
  var hood = neighborsOf(d.id);
  node.attr('opacity', function(n) { return hood[n.id] ? 1 : 0.08; });
  label.attr('opacity', function(n) { return hood[n.id] ? 1 : 0.08; });
  link.attr('stroke-opacity', function(e) {
    var s = e.source.id || e.source;
    var t = e.target.id || e.target;
    return s === d.id || t === d.id ? 0.6 : 0.05;
  });
}

function clearFocus() {
  if (focusedId === null) return;
  focusedId = null;
  node.attr('opacity', 1);
  label.attr('opacity', 1);
  link.attr('stroke-opacity', 0.4);
  tagList.querySelectorAll('.tag-btn').forEach(function(b) { b.classList.remove('active'); });
  panel.classList.remove('graph-panel--open');
}

node.on('click', function(e, d) {
  e.stopPropagation();
  applyFocus(d);
  panelTitle.textContent = d.label;
  panelMeta.innerHTML =
    (d.summary ? '<p class="graph-panel__summary"></p>' : '') +
    '<p>Links: ' + d.forwardLinkCount + ' outgoing, ' + d.backlinkCount + ' incoming</p>' +
    '<p>Words: ' + d.wordCount + '</p>' +
    (d.tags.length ? '<p class="graph-panel__tags"></p>' : '') +
    '<p><a class="btn" href="../read/' + encodeURIComponent(d.id) + '/index.html">Open in Read &rarr;</a></p>';
  if (d.summary) panelMeta.querySelector('.graph-panel__summary').textContent = d.summary;
  if (d.tags.length) panelMeta.querySelector('.graph-panel__tags').textContent = 'Tags: ' + d.tags.join(', ');
  panel.classList.add('graph-panel--open');
});

node.on('dblclick', function(e, d) {
  e.stopPropagation();
  window.location.href = '../read/' + d.id + '/index.html';
});

svg.on('click', clearFocus);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') clearFocus();
});

panelClose.addEventListener('click', function() {
  panel.classList.remove('graph-panel--open');
  clearFocus();
});

// Cluster hulls — convex outlines around the top tags with 3+ members.
var hullsOn = false;
function drawHulls() {
  hullLayer.selectAll('path').remove();
  if (!hullsOn) return;
  var topTags = Object.keys(catIndex)
    .filter(function(t) { return nodes.filter(function(n) { return n.tags.includes(t); }).length >= 3; })
    .slice(0, 5);
  topTags.forEach(function(t) {
    var pts = nodes
      .filter(function(n) { return n.tags.includes(t); })
      .map(function(n) { return [n.x, n.y]; });
    if (pts.length < 3) return;
    var hull = d3.polygonHull(pts);
    if (!hull) return;
    hullLayer.append('path')
      .attr('d', 'M' + hull.join('L') + 'Z')
      .attr('fill', tagColor(t))
      .attr('fill-opacity', 0.06)
      .attr('stroke', tagColor(t))
      .attr('stroke-opacity', 0.18)
      .attr('stroke-width', 14)
      .attr('stroke-linejoin', 'round');
  });
}

var hullToggle = document.getElementById('graph-hull-toggle');
if (hullToggle) {
  hullToggle.addEventListener('click', function() {
    hullsOn = !hullsOn;
    hullLayer.style('display', hullsOn ? '' : 'none');
    hullToggle.classList.toggle('btn--primary', hullsOn);
    drawHulls();
  });
}

// --- Sidebar: render tag buttons dynamically ---
var tagList = document.getElementById('graph-tag-list');
var tagSearchInput = document.getElementById('graph-tag-search');

// Count articles per tag
var tagArticleCount = {};
nodes.forEach(function(n) {
  n.tags.forEach(function(t) {
    tagArticleCount[t] = (tagArticleCount[t] || 0) + 1;
  });
});

// Sort tags by article count descending
var sortedTags = tags.slice().sort(function(a, b) {
  return (tagArticleCount[b] || 0) - (tagArticleCount[a] || 0);
});

function renderTagButtons(visibleTags) {
  tagList.innerHTML = '';
  sortedTags.forEach(function(t) {
    var btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.dataset.tag = t;
    btn.textContent = t + ' (' + (tagArticleCount[t] || 0) + ')';
    if (visibleTags && !visibleTags.includes(t)) {
      btn.style.display = 'none';
    }
    btn.addEventListener('click', function() {
      var clickedTag = btn.dataset.tag;
      var active = btn.classList.toggle('active');
      tagList.querySelectorAll('.tag-btn').forEach(function(b) {
        if (b !== btn) b.classList.remove('active');
      });
      if (!active) clickedTag = null;
      node.attr('opacity', function(d) {
        return !clickedTag || d.tags.includes(clickedTag) ? 1 : 0.15;
      });
      label.attr('opacity', function(d) {
        return !clickedTag || d.tags.includes(clickedTag) ? 1 : 0.15;
      });
      link.attr('stroke-opacity', function(d) {
        if (!clickedTag) return 0.4;
        var sNode = nodes.find(function(n) { return n.id === (d.source.id || d.source); });
        var tNode = nodes.find(function(n) { return n.id === (d.target.id || d.target); });
        return (sNode && sNode.tags.includes(clickedTag)) || (tNode && tNode.tags.includes(clickedTag)) ? 0.6 : 0.05;
      });
    });
    tagList.appendChild(btn);
  });
}

// Default: top 10 if >15 tags, otherwise all
var defaultN = sortedTags.length > 15 ? 10 : 0;
function applyTopN(n) {
  var btns = tagList.querySelectorAll('.tag-btn');
  btns.forEach(function(btn, i) {
    btn.style.display = (n === 0 || i < n) ? '' : 'none';
  });
  document.querySelectorAll('.graph-top-n').forEach(function(b) {
    b.classList.toggle('btn--primary', Number(b.dataset.n) === n);
  });
}

renderTagButtons(null);
applyTopN(defaultN);

// Top-N buttons
document.querySelectorAll('.graph-top-n').forEach(function(btn) {
  btn.addEventListener('click', function() {
    applyTopN(Number(btn.dataset.n));
  });
});

// Tag search filter
tagSearchInput.addEventListener('input', function() {
  var query = tagSearchInput.value.toLowerCase();
  tagList.querySelectorAll('.tag-btn').forEach(function(btn) {
    var tag = btn.dataset.tag.toLowerCase();
    btn.style.display = tag.includes(query) ? '' : 'none';
  });
});

// Zoom reset
document.getElementById('graph-zoom-reset').addEventListener('click', function() {
  svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
});

// Sidebar toggle (mobile)
document.querySelector('.graph-sidebar-toggle').addEventListener('click', function() {
  var content = document.querySelector('.graph-sidebar-content');
  var isHidden = content.style.display === 'none';
  content.style.display = isHidden ? '' : 'none';
});

simulation.on('tick', function() {
  link
    .attr('x1', function(d) { return d.source.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y2', function(d) { return d.target.y; });
  node
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; });
  label
    .attr('x', function(d) { return d.x; })
    .attr('y', function(d) { return d.y; });
  if (hullsOn) drawHulls();
});
})();
</script>`;
}

function graphStyles(): string {
  // Most graph styles live in the main stylesheet (css.ts).
  // Only the detail panel and mobile sidebar-content toggle need
  // inline styles because they aren't in the shared CSS.
  return `<style>
  .graph-panel {
    position: absolute; top: 0; right: 0;
    width: 280px; max-width: calc(100% - 24px); max-height: 70vh; overflow-y: auto;
    background: var(--color-surface); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: 16px;
    opacity: 0; visibility: hidden; pointer-events: none;
    transform: translateX(16px);
    transition: opacity 200ms var(--ease), transform 200ms var(--ease), visibility 200ms;
    z-index: 5;
  }
  .graph-panel--open {
    opacity: 1; visibility: visible; pointer-events: auto;
    transform: translateX(0);
  }
  .graph-panel h3 { font-size: 17px; margin-bottom: 8px; }
  .graph-panel p { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
  @media (max-width: 767px) {
    .graph-sidebar-content { display: none; }
    .graph-panel { display: none; }
  }
</style>`;
}

export function generateGraphMode(data: SiteData, config: DesignConfig): string {
  // Tag → categorical color index, assigned by frequency at build time so
  // node colors come from the palette's --cat-* ramp (theme-aware, no
  // hardcoded scheme).
  const tagCounts = new Map<string, number>();
  for (const n of data.graphData.nodes) {
    for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const tagColorIndex: Record<string, number> = {};
  [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([tag], i) => { tagColorIndex[tag] = i % 8; });

  // Deterministic warm-start positions so the simulation settles instead
  // of exploding from the center on load.
  const seeded = computeForceLayout(
    data.graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      weight: n.linkCount + n.backlinkCount + 1,
    })),
    data.graphData.edges,
    data.graphData.nodes.length,
  );
  const seedById = new Map(seeded.map(n => [n.id, n]));

  const summaryBySlug = new Map(
    data.articles.map(a => [a.slug, a.summary.length > 200 ? `${a.summary.slice(0, 200).trimEnd()}…` : a.summary]),
  );

  const graphDataJSON = jsonForScript({
    nodes: data.graphData.nodes.map(n => ({
      ...n,
      seedX: seedById.get(n.id)?.x ?? 0.5,
      seedY: seedById.get(n.id)?.y ?? 0.5,
      summary: summaryBySlug.get(n.id) ?? '',
    })),
    edges: data.graphData.edges,
    tagColorIndex,
  });

  const body = `
${graphStyles()}
<script>window.GRAPH_DATA = ${graphDataJSON};</script>
<div class="graph-wrapper" style="position:relative">
  <div class="graph-wrap">
    <div class="graph-sidebar">
      <button class="graph-sidebar-toggle btn">Filters</button>
      <div class="graph-sidebar-content">
        <input type="search" id="graph-tag-search" placeholder="Filter tags...">
        <div style="margin-bottom:12px;display:flex;gap:8px">
          <button class="btn graph-top-n" data-n="5">Top 5</button>
          <button class="btn graph-top-n" data-n="10">Top 10</button>
          <button class="btn graph-top-n" data-n="0">All</button>
        </div>
        <div class="tag-list" id="graph-tag-list"></div>
        <div class="graph-legend">
          <div><span class="dot" style="background:var(--color-accent)"></span> Node size = word count</div>
          <div><span class="dot" style="background:var(--cat-0)"></span> Color = primary tag</div>
        </div>
      </div>
    </div>
    <div class="graph-canvas">
      <div style="display:flex;justify-content:flex-end;padding:8px">
        <button class="btn" id="graph-hull-toggle">Clusters</button>
        <button class="btn" id="graph-zoom-reset">Reset view</button>
      </div>
      <div id="graph-container" style="width:100%;height:calc(100% - 40px);overflow:hidden">
        <svg id="graph-svg" style="width:100%;height:100%">
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
        </svg>
      </div>
    </div>
  </div>
  <div class="graph-panel" id="graph-panel">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 id="panel-title"></h3>
      <button class="btn" id="panel-close" aria-label="Close">&times;</button>
    </div>
    <div id="panel-meta"></div>
  </div>
</div>
${graphScript()}`;

  return pageShell(`${shortTopic(data.schema.topic)} — Graph`, 'graph', body, config, data);
}

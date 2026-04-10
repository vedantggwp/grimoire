/**
 * present — Graph mode
 *
 * Force-directed graph visualization using D3.
 * Nodes sized by word count, colored by primary tag.
 * Click to show article summary in side panel.
 */

import type { SiteData, DesignConfig } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function collectTags(data: SiteData): readonly string[] {
  const tagSet = new Set<string>();
  for (const node of data.graphData.nodes) {
    for (const tag of node.tags) tagSet.add(tag);
  }
  return [...tagSet].sort();
}

function graphScript(): string {
  return `<script type="module">
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

var data = window.GRAPH_DATA;
var nodes = data.nodes.map(function(n) { return Object.assign({}, n); });
var edges = data.edges.map(function(e) {
  return { source: e.source, target: e.target };
});

var svg = d3.select('#graph-svg');
var container = document.getElementById('graph-container');
var width = container.clientWidth;
var height = container.clientHeight || 500;

svg.attr('viewBox', [0, 0, width, height]);

// Color by primary tag
var tags = Array.from(new Set(nodes.flatMap(function(n) { return n.tags; })));
var tagColor = d3.scaleOrdinal(d3.schemeTableau10).domain(tags);

// Size by word count
var maxWords = Math.max.apply(null, nodes.map(function(n) { return n.wordCount || 1; }));
function radius(n) { return 6 + (n.wordCount / maxWords) * 18; }

var simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(function(d) { return d.id; }).distance(80))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(function(d) { return radius(d) + 4; }));

var g = svg.append('g');

// Zoom
svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', function(e) {
  g.attr('transform', e.transform);
}));

// Edges
var link = g.selectAll('.graph-edge')
  .data(edges).join('line')
  .attr('class', 'graph-edge')
  .attr('stroke', 'var(--color-muted)')
  .attr('stroke-opacity', 0.4)
  .attr('stroke-width', 1);

// Nodes
var node = g.selectAll('.graph-node')
  .data(nodes).join('circle')
  .attr('class', 'graph-node')
  .attr('r', function(d) { return radius(d); })
  .attr('fill', function(d) { return d.tags.length ? tagColor(d.tags[0]) : 'var(--color-muted)'; })
  .attr('stroke', 'var(--color-surface)')
  .attr('stroke-width', 2)
  .style('cursor', 'pointer');

// Labels
var label = g.selectAll('.graph-label')
  .data(nodes).join('text')
  .attr('class', 'graph-label')
  .attr('text-anchor', 'middle')
  .attr('dy', function(d) { return radius(d) + 14; })
  .attr('fill', 'var(--color-text)')
  .attr('font-size', '11px')
  .attr('font-family', 'var(--font-body)')
  .text(function(d) { return d.label; });

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

// Click for detail panel
var panel = document.getElementById('graph-panel');
var panelTitle = document.getElementById('panel-title');
var panelMeta = document.getElementById('panel-meta');
var panelClose = document.getElementById('panel-close');

node.on('click', function(e, d) {
  panelTitle.textContent = d.label;
  panelMeta.innerHTML =
    '<p>Links: ' + d.forwardLinkCount + ' outgoing, ' + d.backlinkCount + ' incoming</p>' +
    '<p>Words: ' + d.wordCount + '</p>' +
    (d.tags.length ? '<p>Tags: ' + d.tags.join(', ') + '</p>' : '');
  panel.classList.add('graph-panel--open');
});

panelClose.addEventListener('click', function() {
  panel.classList.remove('graph-panel--open');
});

// Tag filter
document.querySelectorAll('.graph-tag-filter').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tag = btn.dataset.tag;
    var active = btn.classList.toggle('btn--primary');

    document.querySelectorAll('.graph-tag-filter').forEach(function(b) {
      if (b !== btn) b.classList.remove('btn--primary');
    });

    if (!active) tag = null;

    node.attr('opacity', function(d) {
      return !tag || d.tags.includes(tag) ? 1 : 0.15;
    });
    label.attr('opacity', function(d) {
      return !tag || d.tags.includes(tag) ? 1 : 0.15;
    });
    link.attr('stroke-opacity', function(d) {
      if (!tag) return 0.4;
      var sNode = nodes.find(function(n) { return n.id === (d.source.id || d.source); });
      var tNode = nodes.find(function(n) { return n.id === (d.target.id || d.target); });
      return (sNode && sNode.tags.includes(tag)) || (tNode && tNode.tags.includes(tag)) ? 0.6 : 0.05;
    });
  });
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
});
</script>`;
}

function graphStyles(): string {
  return `<style>
  .graph-wrapper { position: relative; }
  .graph-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4); }
  #graph-container { width: 100%; height: 70vh; border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent); border-radius: 8px; overflow: hidden; }
  #graph-svg { width: 100%; height: 100%; }
  .graph-panel {
    position: absolute; top: 0; right: 0;
    width: 280px; max-height: 70vh; overflow-y: auto;
    background: var(--color-surface); border: 1px solid var(--color-muted);
    border-radius: 8px; padding: var(--space-4);
    transform: translateX(120%); transition: transform var(--transition-normal);
  }
  .graph-panel--open { transform: translateX(0); }
  .graph-panel h3 { font-size: var(--text-lg); margin-bottom: var(--space-2); }
  .graph-panel p { font-size: var(--text-sm); color: var(--color-muted); margin-bottom: var(--space-2); }
</style>`;
}

export function generateGraphMode(data: SiteData, config: DesignConfig): string {
  const tags = collectTags(data);
  const tagButtons = tags.map(t =>
    `<button class="btn graph-tag-filter" data-tag="${esc(t)}">${esc(t)}</button>`
  ).join('\n    ');

  const graphDataJSON = JSON.stringify({
    nodes: data.graphData.nodes,
    edges: data.graphData.edges,
  });

  const body = `
${graphStyles()}
<script>window.GRAPH_DATA = ${graphDataJSON};</script>
<div class="graph-wrapper">
  <div class="graph-filters">
    ${tagButtons}
  </div>
  <div id="graph-container">
    <svg id="graph-svg"></svg>
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

  return pageShell(`${data.schema.topic} — Graph`, 'graph', body, config, data);
}

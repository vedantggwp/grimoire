/**
 * present/js — Hub constellation renderer
 *
 * Draws the wiki's REAL knowledge graph as an ambient canvas behind the
 * hub hero: nodes drift on seeded sine paths, edges glow faintly, the
 * pointer attracts the nearest node and surfaces its label. Time-based
 * (delta-clamped) rAF loop; pauses when the tab is hidden; renders a
 * single static frame when motion is off. The canvas is aria-hidden —
 * it is texture, not content.
 */

export function constellationScript(): string {
  return `<script>
(function() {
  var data = window.HUB_GRAPH;
  var canvas = document.getElementById('constellation');
  if (!canvas || !data || !data.nodes || data.nodes.length === 0) return;

  var ctx = canvas.getContext('2d');
  var nodes = data.nodes;
  var edges = data.edges;
  var pointer = { x: -1, y: -1, active: false };
  var running = false;
  var t = 0;
  var last = null;

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      edge: cs.getPropertyValue('--graph-edge').trim() || '#d4d4d4',
      node: cs.getPropertyValue('--text-tertiary').trim() || '#8a8a8a',
      accent: cs.getPropertyValue('--color-accent').trim() || '#0d9488',
      label: cs.getPropertyValue('--text-secondary').trim() || '#5c5c5c'
    };
  }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pos(node, time) {
    var rect = canvas.getBoundingClientRect();
    // Seeded per-node phase from its layout position keeps drift stable
    // across reloads without shipping per-node randomness.
    var phase = (node.x * 7 + node.y * 13) * Math.PI;
    var driftX = Math.sin(time * 0.00022 + phase) * 6;
    var driftY = Math.cos(time * 0.00017 + phase * 1.3) * 6;
    var x = node.x * rect.width + driftX;
    var y = node.y * rect.height + driftY;

    if (pointer.active) {
      var dx = pointer.x - x;
      var dy = pointer.y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140 && dist > 0.001) {
        var pull = (1 - dist / 140) * 10;
        x += (dx / dist) * pull;
        y += (dy / dist) * pull;
      }
    }
    return { x: x, y: y };
  }

  function draw(time) {
    var rect = canvas.getBoundingClientRect();
    var c = colors();
    ctx.clearRect(0, 0, rect.width, rect.height);

    var positions = {};
    nodes.forEach(function(n) { positions[n.id] = pos(n, time); });

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    edges.forEach(function(e) {
      var a = positions[e.source];
      var b = positions[e.target];
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    var minDim = Math.min(rect.width, rect.height);
    var nearest = null;
    var nearestDist = Infinity;

    nodes.forEach(function(n, i) {
      var p = positions[n.id];
      var r = Math.max(n.r * minDim, 2);
      var isTop = i < 3; // nodes arrive weight-sorted; the top 3 glow
      ctx.globalAlpha = isTop ? 0.85 : 0.45;
      ctx.fillStyle = isTop ? c.accent : c.node;
      if (isTop) {
        ctx.shadowColor = c.accent;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (pointer.active) {
        var dx = pointer.x - p.x;
        var dy = pointer.y - p.y;
        var d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearest = { node: n, p: p }; }
      }
    });

    if (nearest && nearestDist < 120 * 120) {
      ctx.globalAlpha = Math.max(0, 1 - Math.sqrt(nearestDist) / 120);
      ctx.fillStyle = c.label;
      ctx.font = '11px ' + (getComputedStyle(document.body).getPropertyValue('--font-mono') || 'monospace');
      ctx.textAlign = 'center';
      ctx.fillText(nearest.node.label, nearest.p.x, nearest.p.y - 14);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    if (last !== null) t += Math.min(now - last, 50);
    last = now;
    draw(t);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = null;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  resize();

  if (window.GRIMOIRE_MOTION_OK && window.GRIMOIRE_MOTION_OK()) {
    canvas.parentElement.addEventListener('pointermove', function(e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    canvas.parentElement.addEventListener('pointerleave', function() {
      pointer.active = false;
    });
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener('resize', function() { resize(); if (!running) draw(t); });
    start();
  } else {
    // Motion off: one static frame.
    draw(0);
    window.addEventListener('resize', function() { resize(); draw(0); });
  }

  // Theme toggle repaints with the new custom-property colors.
  var toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', function() {
    requestAnimationFrame(function() { if (!running) draw(t); });
  });
})();
</script>`;
}

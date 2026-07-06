/**
 * present/css — Graph mode: force-directed canvas, sidebar, legend
 */

export const GRAPH_CSS = `/* === Graph === */
.graph-wrapper {
  position: relative;
  max-width: 100%;
  overflow: hidden;
}
.graph-wrap {
  display: flex;
  gap: clamp(12px, 1.5vw, 20px);
  height: clamp(520px, 70vh, 680px);
  min-height: 520px;
  max-width: 100%;
}
.graph-sidebar { width: 200px; flex-shrink: 0; }
.graph-sidebar input {
  width: 100%; padding: 8px 10px;
  background: var(--color-surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--color-text); font-size: 13px;
  font-family: var(--font-body);
  margin-bottom: 12px; outline: none;
}
.graph-sidebar input:focus { border-color: var(--color-accent); }
.graph-sidebar .tag-list { display: flex; flex-direction: column; gap: 4px; }
.graph-sidebar .tag-btn {
  padding: 5px 8px; font-size: 12px;
  background: none; border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary); cursor: pointer;
  text-align: left; font-family: var(--font-mono);
  transition: all 150ms;
}
.graph-sidebar .tag-btn:hover { border-color: var(--color-accent); color: var(--color-text); }
.graph-sidebar .tag-btn.active {
  background: var(--accent-muted);
  border-color: var(--color-accent); color: var(--color-accent);
}
.graph-legend {
  margin-top: 16px; font-size: 11px;
  color: var(--text-tertiary); font-family: var(--font-mono);
}
.graph-legend div { margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.graph-legend .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.graph-canvas {
  flex: 1; background: var(--graph-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  position: relative; overflow: hidden;
  transition: background 200ms, border-color 200ms;
}
.graph-canvas svg { width: 100%; height: 100%; }
.graph-node { cursor: pointer; }
.graph-node circle { transition: r 200ms var(--ease); }
.graph-node:hover circle { filter: url(#glow); }
.graph-node text {
  font-family: var(--font-mono); font-size: 10px;
  fill: var(--text-secondary);
}
.graph-edge { stroke: var(--graph-edge); stroke-width: 1; stroke-opacity: 0.4; }

/* Legacy graph layout compat */
.graph-layout { display: flex; gap: 16px; }
.graph-main { flex: 1; min-width: 0; }
.graph-sidebar__toggle { display: none; }
.mode-graph svg { width: 100%; height: 70vh; }`;

export const GRAPH_MODE_OVERRIDE_CSS = `/* === Mode: Graph — SVG fill === */
.mode-graph svg { width: 100%; height: 70vh; }`;

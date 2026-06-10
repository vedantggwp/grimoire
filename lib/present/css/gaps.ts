/**
 * present/css — Gaps mode: coverage treemap, legend, tooltip
 */

export const GAPS_CSS = `/* === Gaps — D3 Treemap === */
.gaps-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.gaps-header { margin-bottom: 18px; }
.gaps-header h2 {
  font-family: var(--font-heading);
  font-size: clamp(22px, 1vw + 18px, 28px);
  margin-bottom: 8px;
}
.gaps-subtitle {
  max-width: 64ch;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 18px;
}
.gaps-summary {
  display: flex; flex-wrap: wrap;
  gap: clamp(12px, 2vw, 24px);
  padding: 14px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.gaps-stat {
  font-size: 12.5px;
  color: var(--text-secondary);
  display: inline-flex; align-items: baseline; gap: 6px;
}
.gaps-stat strong {
  font-family: var(--font-heading);
  font-size: clamp(18px, 0.8vw + 14px, 22px);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
.gaps-stat--full strong { color: var(--color-success); }
.gaps-stat--partial strong { color: var(--color-warning); }
.gaps-stat--thin strong { color: var(--color-error); }

.gaps-legend {
  display: flex; flex-wrap: wrap;
  gap: clamp(12px, 2vw, 20px);
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}
.gaps-legend__item {
  display: inline-flex; align-items: center; gap: 6px;
}
.gaps-legend__item .dot {
  width: 8px; height: 8px; border-radius: 2px;
}
.gaps-legend__item--full .dot { background: var(--color-success); }
.gaps-legend__item--partial .dot { background: var(--color-warning); }
.gaps-legend__item--thin .dot { background: var(--color-error); }
.gaps-legend__item--missing .dot {
  background: transparent;
  border: 1px dashed var(--text-tertiary);
}

.treemap-container {
  position: relative;
  width: 100%;
  height: clamp(480px, 60vh, 640px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  overflow: hidden;
}
#treemap-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* D3 treemap leaves */
.treemap-leaf rect {
  transition: filter 180ms var(--ease), opacity 180ms var(--ease);
}
.treemap-leaf:hover rect { filter: brightness(1.08); }
.treemap-leaf .treemap-tag {
  font-family: var(--font-heading);
  font-size: 13px; font-weight: 600;
  fill: var(--color-text);
  pointer-events: none;
}
.treemap-leaf foreignObject {
  overflow: hidden;
  text-overflow: ellipsis;
}
.treemap-leaf .treemap-count {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-secondary);
  pointer-events: none;
}

/* Labels stay full-contrast text on every tier (WCAG AA — issue #5);
   the tier itself is conveyed by background tint, stroke, and dot. */
.treemap-leaf--full rect {
  fill: color-mix(in srgb, var(--color-success) 18%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-success) 45%, transparent);
}
.treemap-leaf--full .treemap-dot { fill: var(--color-success); }
.treemap-leaf--full .treemap-tag { fill: var(--color-text); }

.treemap-leaf--partial rect {
  fill: color-mix(in srgb, var(--color-warning) 16%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-warning) 40%, transparent);
}
.treemap-leaf--partial .treemap-dot { fill: var(--color-warning); }
.treemap-leaf--partial .treemap-tag { fill: var(--color-text); }

.treemap-leaf--thin rect {
  fill: color-mix(in srgb, var(--color-error) 14%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-error) 38%, transparent);
}
.treemap-leaf--thin .treemap-dot { fill: var(--color-error); }
.treemap-leaf--thin .treemap-tag { fill: var(--color-text); }

.treemap-leaf--missing rect {
  fill: var(--color-bg);
  stroke: var(--text-tertiary);
  stroke-dasharray: 3 3;
}
.treemap-leaf--missing .treemap-dot { fill: var(--text-tertiary); }
.treemap-leaf--missing .treemap-tag { fill: var(--color-text); }

.treemap-tooltip {
  position: absolute;
  display: none;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 12px;
  color: var(--color-text);
  box-shadow: var(--shadow-card-hover);
  max-width: 280px;
  pointer-events: none;
  z-index: 10;
}
.treemap-tooltip strong { font-family: var(--font-heading); }
.treemap-tooltip em {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-style: normal;
}
.treemap-tooltip .tier-full { color: var(--color-success); font-weight: 600; }
.treemap-tooltip .tier-partial { color: var(--color-warning); font-weight: 600; }
.treemap-tooltip .tier-thin { color: var(--color-error); font-weight: 600; }
.treemap-tooltip .tier-missing { color: var(--text-tertiary); font-weight: 600; }

/* Legacy gap card compat (kept for any older fixtures) */
.treemap {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.treemap-cell {
  border-radius: var(--radius-md);
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--border);
}
.mode-gaps .gap-card {
  padding: 16px; border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--color-surface);
  color: var(--color-text);
}`;

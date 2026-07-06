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

.gaps-legend[hidden] { display: none; }
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
.treemap-board {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Treemap cells — DOM elements positioned by the build-time squarified
   layout (percent geometry = responsive for free, focusable for free).
   Labels stay full-contrast text on every tier (WCAG AA — issue #5);
   the tier is conveyed by background tint, border, and dot. */
.treemap-cell {
  position: absolute;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--color-bg);
  padding: 8px 10px;
  overflow: hidden;
  box-sizing: border-box;
  transition: filter var(--dur-2) var(--ease-out);
}
.treemap-cell:hover { filter: brightness(1.06); z-index: 2; }
.treemap-cell:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
  z-index: 2;
}
.treemap-cell__tag {
  display: block;
  font-family: var(--font-heading);
  font-size: 13px; font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.treemap-cell__count {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.treemap-cell__dot {
  position: absolute;
  top: 10px; right: 10px;
  width: 8px; height: 8px;
  border-radius: 2px;
}

.treemap-cell--full {
  background: color-mix(in srgb, var(--color-success) 18%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-success) 45%, transparent);
}
.treemap-cell--full .treemap-cell__dot { background: var(--color-success); }
.treemap-cell--partial {
  background: color-mix(in srgb, var(--color-warning) 16%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
}
.treemap-cell--partial .treemap-cell__dot { background: var(--color-warning); }
.treemap-cell--thin {
  background: color-mix(in srgb, var(--color-error) 14%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-error) 38%, transparent);
}
.treemap-cell--thin .treemap-cell__dot { background: var(--color-error); }
.treemap-cell--missing {
  background: var(--color-bg);
  border-style: dashed;
  border-color: var(--text-tertiary);
}
.treemap-cell--missing .treemap-cell__dot { background: var(--text-tertiary); }

/* Freshness lens — recolors by per-tag staleness (update engine data) */
.lens-freshness .treemap-cell {
  background: var(--color-bg);
  border-color: var(--border);
}
.lens-freshness .treemap-cell__dot { background: var(--text-tertiary); }
.lens-freshness .treemap-cell--f-fresh,
.lens-freshness .treemap-cell--f-evergreen {
  background: color-mix(in srgb, var(--color-success) 14%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
}
.lens-freshness .treemap-cell--f-fresh .treemap-cell__dot,
.lens-freshness .treemap-cell--f-evergreen .treemap-cell__dot { background: var(--color-success); }
.lens-freshness .treemap-cell--f-aging {
  background: color-mix(in srgb, var(--color-warning) 16%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
}
.lens-freshness .treemap-cell--f-aging .treemap-cell__dot { background: var(--color-warning); }
.lens-freshness .treemap-cell--f-stale {
  background: color-mix(in srgb, var(--color-error) 16%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-error) 42%, transparent);
}
.lens-freshness .treemap-cell--f-stale .treemap-cell__dot { background: var(--color-error); }
.lens-freshness .treemap-cell--f-unknown {
  background: var(--color-bg);
  border-style: dashed;
}

/* Lens toggle */
.gaps-lens {
  display: inline-flex;
  gap: 2px;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  margin-bottom: 14px;
}
.gaps-lens button {
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: background var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out);
}
.gaps-lens button:hover { color: var(--color-text); }
.gaps-lens button.active {
  background: var(--surface-hover);
  color: var(--color-text);
  box-shadow: 0 0 0 1px var(--border);
}
.gaps-lens button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Cells pop in with a soft stagger (pure CSS — runs without JS) */
@media (prefers-reduced-motion: no-preference) {
  .motion-subtle .treemap-cell,
  .motion-expressive .treemap-cell {
    animation: cell-pop var(--dur-3) var(--ease-out) both;
    animation-delay: calc(var(--reveal-i, 0) * 30ms);
  }
  @keyframes cell-pop {
    from { opacity: 0; transform: scale(0.97); }
  }
}

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

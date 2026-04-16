/**
 * present — Mode-specific CSS overrides
 *
 * Minimal layer: only styles that are truly mode-namespace-specific
 * and don't fit in the main stylesheet. The bulk of mode styling
 * (bento, read-3col, treemap, flashcard, feed-timeline, search-overlay)
 * now lives in css.ts.
 */

export function generateModesCSS(): string {
  return `
/* === Mode: Read — progress bar === */
.mode-read .read-progress {
  height: 3px;
  background: var(--color-accent);
  position: fixed;
  top: var(--nav-height, 56px);
  left: 0;
  right: 0;
  z-index: 101;
  width: 0%;
  transition: width 200ms;
}

/* === Mode: Graph — SVG fill === */
.mode-graph svg { width: 100%; height: 70vh; }

/* === Mode: Search — results spacing === */
.mode-search .search-results { margin-top: 16px; }
.mode-search .search-result { padding: 12px; cursor: pointer; }
.mode-search .search-result:hover { background: var(--surface-hover); }
`;
}

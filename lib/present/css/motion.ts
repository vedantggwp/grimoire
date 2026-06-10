/**
 * present/css — Motion: reduced-motion overrides
 *
 * Phase 3 ("Editorial Constellation") will grow this module with
 * motion duration/easing tokens, keyframes, view transitions, and
 * scroll-driven animation blocks. For now it holds the global
 * reduced-motion kill switch.
 */

export const REDUCED_MOTION_CSS = `/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

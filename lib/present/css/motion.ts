/**
 * present/css — Motion: view transitions, reveal utility, reduced-motion
 *
 * Every effect here honors two kill switches: the OS-level
 * `prefers-reduced-motion` media query and the generation-time
 * `motion: none` config (which also zeroes all duration tokens).
 *
 * Reveal-safety invariant: an element may only get a hidden initial state
 * when (a) reduced motion is NOT requested, (b) the site was generated
 * with motion on (html.motion-*), and (c) JS is actually running to
 * reveal it (html.js, set by the runtime script). No-JS readers always
 * see content.
 */

import type { MotionLevel } from '../types.js';

const VIEW_TRANSITIONS_CSS = `/* === View transitions (cross-document, progressive) === */
@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
  }
  .brand { view-transition-name: vt-brand; }
  ::view-transition-old(root) {
    animation: vt-page-out var(--dur-2) var(--ease-out) both;
  }
  ::view-transition-new(root) {
    animation: vt-page-in var(--dur-2) var(--ease-out) both;
  }
  @keyframes vt-page-out {
    to { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes vt-page-in {
    from { opacity: 0; transform: translateY(8px); }
  }
}`;

const REVEAL_CSS = `/* === Reveal on scroll (IntersectionObserver path) === */
@media (prefers-reduced-motion: no-preference) {
  html.js.motion-subtle .reveal:not(.revealed),
  html.js.motion-expressive .reveal:not(.revealed) {
    opacity: 0;
    transform: translateY(var(--reveal-distance));
  }
  .reveal.revealed {
    opacity: 1;
    transform: none;
    transition:
      opacity var(--dur-3) var(--ease-out),
      transform var(--dur-3) var(--ease-out);
    transition-delay: calc(var(--reveal-i, 0) * 40ms);
  }
}`;

export const REDUCED_MOTION_CSS = `/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

export function motionCSS(motion: MotionLevel): string {
  // motion: none → no view transitions, no reveal states; the reduced-motion
  // kill switch is always present.
  if (motion === 'none') return REDUCED_MOTION_CSS;
  return [VIEW_TRANSITIONS_CSS, REVEAL_CSS, REDUCED_MOTION_CSS].join('\n\n');
}

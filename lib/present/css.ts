/**
 * present — CSS generator
 *
 * Produces a complete stylesheet from a DesignConfig:
 * reset, custom properties, typography, spacing, motion,
 * component styles, responsive breakpoints, print, reduced motion.
 */

import type { DesignConfig, PaletteColors } from './types.js';
import {
  resolvePalette,
  resolveTypography,
  getGoogleFontsUrl,
} from './config.js';

// --- Helpers ---

function cssVarsFromPalette(colors: PaletteColors): string {
  return [
    `--color-bg: ${colors.bg};`,
    `--color-surface: ${colors.surface};`,
    `--color-text: ${colors.text};`,
    `--color-muted: ${colors.muted};`,
    `--color-accent: ${colors.accent};`,
    `--color-success: ${colors.success};`,
    `--color-warning: ${colors.warning};`,
    `--color-error: ${colors.error};`,
    `--color-info: ${colors.info};`,
  ].join('\n  ');
}

function spacingScale(base: number): string {
  return Array.from({ length: 12 }, (_, i) => {
    const multiplier = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8][i];
    return `--space-${i + 1}: ${(base * multiplier).toFixed(1)}px;`;
  }).join('\n  ');
}

function motionVars(motion: string): string {
  if (motion === 'none') {
    return [
      '--transition-fast: 0ms;',
      '--transition-normal: 0ms;',
      '--transition-slow: 0ms;',
    ].join('\n  ');
  }
  if (motion === 'expressive') {
    return [
      '--transition-fast: 150ms;',
      '--transition-normal: 300ms;',
      '--transition-slow: 500ms;',
    ].join('\n  ');
  }
  // subtle (default)
  return [
    '--transition-fast: 100ms;',
    '--transition-normal: 200ms;',
    '--transition-slow: 300ms;',
  ].join('\n  ');
}

function densityBase(density: string): number {
  if (density === 'compact') return 6;
  if (density === 'spacious') return 10;
  return 8; // comfortable
}

// --- Main generator ---

export function generateCSS(config: DesignConfig): string {
  const palette = resolvePalette(config);
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);
  const base = densityBase(config.density);

  return `@import url('${fontsUrl}');

/* === Reset === */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { line-height: 1.6; -webkit-font-smoothing: antialiased; }
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }

/* === Light mode (default) === */
:root {
  ${cssVarsFromPalette(palette.light)}

  /* Typography */
  --font-heading: '${typo.headings}', system-ui, sans-serif;
  --font-body: '${typo.body}', system-ui, sans-serif;
  --font-mono: '${typo.mono}', ui-monospace, monospace;

  /* Type scale — 1.25 ratio with clamp */
  --text-xs: clamp(0.64rem, 0.58rem + 0.25vw, 0.72rem);
  --text-sm: clamp(0.8rem, 0.73rem + 0.31vw, 0.9rem);
  --text-base: clamp(1rem, 0.91rem + 0.39vw, 1.125rem);
  --text-lg: clamp(1.25rem, 1.14rem + 0.49vw, 1.406rem);
  --text-xl: clamp(1.563rem, 1.42rem + 0.61vw, 1.758rem);
  --text-2xl: clamp(1.953rem, 1.78rem + 0.76vw, 2.197rem);
  --text-3xl: clamp(2.441rem, 2.22rem + 0.95vw, 2.747rem);

  /* Spacing */
  ${spacingScale(base)}

  /* Motion */
  ${motionVars(config.motion)}

  /* Layout */
  --container-max: 72rem;
  --content-max: 48rem;
  --sidebar-width: 16rem;
}

/* === Dark mode === */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    ${cssVarsFromPalette(palette.dark)}
  }
}

.theme-dark {
  ${cssVarsFromPalette(palette.dark)}
}

.theme-light {
  ${cssVarsFromPalette(palette.light)}
}

/* === Base === */
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-bg);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.2;
}

h1 { font-size: var(--text-3xl); margin-bottom: var(--space-4); }
h2 { font-size: var(--text-2xl); margin-bottom: var(--space-3); }
h3 { font-size: var(--text-xl); margin-bottom: var(--space-3); }
h4 { font-size: var(--text-lg); margin-bottom: var(--space-2); }

p { margin-bottom: var(--space-4); }
a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
a:hover { opacity: 0.85; }

/* === Layout === */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.content-column {
  max-width: var(--content-max);
  margin: 0 auto;
}

/* === Nav === */
.nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-muted);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav__title {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  margin-right: auto;
}

.nav__links {
  display: flex;
  gap: var(--space-3);
  list-style: none;
  padding: 0;
  flex-wrap: wrap;
}

.nav__link {
  font-size: var(--text-sm);
  color: var(--color-muted);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.nav__link:hover,
.nav__link--active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

/* === Cards === */
.card {
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  border-radius: 8px;
  padding: var(--space-5);
  transition: border-color var(--transition-fast);
}

.card:hover {
  border-color: var(--color-accent);
}

/* === Tags === */
.tag {
  display: inline-block;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  text-decoration: none;
}

/* === Buttons === */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-muted);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn--primary { background: var(--color-accent); color: var(--color-surface); border-color: var(--color-accent); }
.btn--primary:hover { opacity: 0.9; color: var(--color-surface); }

/* === Article === */
.article {
  padding: var(--space-6) 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
}

.article h1 { font-size: var(--text-2xl); }
.article h2 { font-size: var(--text-xl); margin-top: var(--space-8); }
.article h3 { font-size: var(--text-lg); margin-top: var(--space-6); }

.article ul, .article ol {
  padding-left: var(--space-6);
  margin-bottom: var(--space-4);
}

.article li { margin-bottom: var(--space-2); }

.article blockquote {
  border-left: 3px solid var(--color-accent);
  padding: var(--space-3) var(--space-4);
  margin: var(--space-4) 0;
  color: var(--color-muted);
  background: color-mix(in srgb, var(--color-accent) 5%, transparent);
}

/* === Code === */
code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

pre {
  background: color-mix(in srgb, var(--color-text) 5%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
  border-radius: 6px;
  padding: var(--space-4);
  overflow-x: auto;
  margin: var(--space-4) 0;
}

pre code {
  background: none;
  padding: 0;
  font-size: var(--text-sm);
  line-height: 1.7;
}

/* === Responsive grid === */
.grid {
  display: grid;
  gap: var(--space-4);
}

.grid--2 { grid-template-columns: 1fr; }
.grid--3 { grid-template-columns: 1fr; }

/* === Footer === */
.footer {
  padding: var(--space-6) var(--space-4);
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
  font-size: var(--text-sm);
  text-align: center;
}

/* === Theme toggle === */
.theme-toggle {
  background: none;
  border: 1px solid var(--color-muted);
  border-radius: 6px;
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  color: var(--color-text);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast);
}

.theme-toggle:hover { border-color: var(--color-accent); }

/* === Mode namespaces === */
.mode-read .progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-accent);
  z-index: 200;
  transition: width 100ms linear;
}

.mode-graph svg { width: 100%; height: 70vh; }
.mode-search .search-input {
  width: 100%;
  font-size: var(--text-lg);
  padding: var(--space-3) var(--space-4);
  border: 2px solid color-mix(in srgb, var(--color-muted) 30%, transparent);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-fast);
}

.mode-search .search-input:focus { border-color: var(--color-accent); }
.mode-search .search-results { margin-top: var(--space-4); }
.mode-search .search-result { padding: var(--space-3); cursor: pointer; }
.mode-search .search-result:hover { background: color-mix(in srgb, var(--color-accent) 5%, transparent); }

.mode-feed .timeline-entry {
  padding: var(--space-4);
  border-left: 2px solid var(--color-muted);
  margin-left: var(--space-4);
  position: relative;
}

.mode-feed .timeline-entry::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--space-2) - 1px);
  top: var(--space-5);
  width: calc(var(--space-3));
  height: calc(var(--space-3));
  border-radius: 50%;
  background: var(--color-accent);
}

.mode-gaps .gap-card {
  padding: var(--space-4);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  background: var(--color-surface);
}

.mode-quiz .flashcard {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6);
  border: 2px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  border-radius: 12px;
  cursor: pointer;
  transition: transform var(--transition-normal);
  perspective: 1000px;
}

/* === Responsive breakpoints (mobile-first) === */
@media (min-width: 640px) {
  .grid--2 { grid-template-columns: repeat(2, 1fr); }
  .grid--3 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .nav__links { gap: var(--space-4); }
}

@media (min-width: 1024px) {
  .grid--3 { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1280px) {
  .container { padding: 0 var(--space-6); }
}

/* === Print === */
@media print {
  .nav, .theme-toggle, .footer, .mode-graph svg, .mode-quiz { display: none; }
  body { color: #000; background: #fff; font-size: 11pt; }
  a { color: #000; text-decoration: underline; }
  .article { break-inside: avoid; }
  pre { border: 1px solid #ccc; }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

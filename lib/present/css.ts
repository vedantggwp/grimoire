/**
 * present — CSS generator
 *
 * Produces a complete stylesheet from a DesignConfig:
 * reset, custom properties (light + dark), typography, layout,
 * bento grid, 3-column read, command palette search, timeline feed,
 * treemap gaps, quiz flashcards, responsive breakpoints, print, reduced motion.
 *
 * Design: Option F — Linear Editorial (dual-theme)
 */

import type { DesignConfig, PaletteColors } from './types.js';
import {
  resolvePalette,
  resolveTypography,
  getGoogleFontsUrl,
} from './config.js';
import { generateModesCSS } from './css-modes.js';

// --- Helpers ---

function lightVars(colors: PaletteColors): string {
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
    '',
    `--bg-nav: rgba(255,255,255,0.92);`,
    `--surface-hover: #EFEFEF;`,
    `--surface-overlay: #E8E8E8;`,
    `--text-secondary: #5C5C5C;`,
    `--text-tertiary: ${colors.muted};`,
    `--border: #E5E5E5;`,
    `--border-hover: #D4D4D4;`,
    `--accent-muted: rgba(13,148,136,0.08);`,
    `--accent-strong: rgba(13,148,136,0.15);`,
    `--success-muted: rgba(22,163,74,0.08);`,
    `--warning-muted: rgba(202,138,4,0.08);`,
    `--error-muted: rgba(220,38,38,0.08);`,
    `--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);`,
    `--shadow-card-hover: 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(13,148,136,0.12);`,
    `--shadow-overlay: 0 24px 48px rgba(0,0,0,0.12);`,
    `--graph-bg: #FAFAFA;`,
    `--graph-edge: #D4D4D4;`,
    `--code-bg: #F3F4F6;`,
    `--code-color: #B91C1C;`,
  ].join('\n  ');
}

function darkVars(colors: PaletteColors): string {
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
    '',
    `--bg-nav: rgba(15,15,15,0.88);`,
    `--surface-hover: #262626;`,
    `--surface-overlay: #2E2E2E;`,
    `--text-secondary: #C4C4C4;`,
    `--text-tertiary: #8A8A8A;`,
    `--border: #2E2E2E;`,
    `--border-hover: #404040;`,
    `--accent-muted: rgba(45,212,191,0.14);`,
    `--accent-strong: rgba(45,212,191,0.28);`,
    `--success-muted: rgba(74,222,128,0.14);`,
    `--warning-muted: rgba(251,191,36,0.14);`,
    `--error-muted: rgba(248,113,113,0.14);`,
    `--shadow-card: inset 0 1px 0 rgba(255,255,255,0.045), 0 0 0 1px rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.4);`,
    `--shadow-card-hover: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(45,212,191,0.22), 0 10px 28px rgba(0,0,0,0.5);`,
    `--shadow-overlay: 0 24px 48px rgba(0,0,0,0.5);`,
    `--graph-bg: #0A0A0A;`,
    `--graph-edge: #3A3A3A;`,
    `--code-bg: #1F1F1F;`,
    `--code-color: #5eead4;`,
  ].join('\n  ');
}

// --- Main generator ---

export function generateCSS(config: DesignConfig): string {
  const palette = resolvePalette(config);
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);

  return `@import url('${fontsUrl}');

/* === Reset === */
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; overflow-x: hidden; }
body {
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: hidden;
  max-width: 100vw;
}
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }

/* === Light mode (default) === */
:root {
  ${lightVars(palette.light)}

  /* Typography */
  --font-heading: '${typo.headings}', Georgia, 'Times New Roman', serif;
  --font-body: '${typo.body}', system-ui, -apple-system, sans-serif;
  --font-mono: '${typo.mono}', 'Fira Code', monospace;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Easing */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);

  /* Layout */
  --container-max: 1100px;
  --content-max: 680px;
  --nav-height: 56px;
}

/* === Dark mode — system preference === */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    ${darkVars(palette.dark)}
  }
}

/* === Dark mode — explicit toggle === */
.theme-dark {
  ${darkVars(palette.dark)}
}

.theme-light {
  ${lightVars(palette.light)}
}

/* === Base === */
html {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: clamp(15px, 0.2vw + 14.5px, 16.5px);
  transition: background 200ms, color 200ms;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.2;
  text-wrap: balance;
}

h1 { font-size: clamp(28px, 2vw + 20px, 42px); letter-spacing: -0.5px; margin-bottom: 14px; }
h2 { font-size: clamp(19px, 0.7vw + 15px, 25px); font-weight: 600; margin-bottom: 12px; }
h3 { font-size: clamp(16px, 0.3vw + 14px, 18px); font-weight: 600; margin-bottom: 6px; }
h4 { font-size: clamp(15px, 0.2vw + 14px, 17px); font-weight: 600; margin-bottom: 6px; }

p { margin-bottom: 14px; color: var(--text-secondary); line-height: 1.7; }
p strong { color: var(--color-text); }
a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
a:hover { opacity: 0.85; }

/* === Layout === */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: clamp(20px, 3vw, 40px) clamp(16px, 4vw, 32px);
}

/* === Skip link === */
.skip-link {
  position: absolute; left: -9999px; top: auto;
  width: 1px; height: 1px; overflow: hidden;
  z-index: 999; padding: 6px 16px;
  background: var(--color-surface); color: var(--color-text);
  border: 2px solid var(--color-accent); border-radius: 4px;
  font-size: 13px; text-decoration: none;
}
.skip-link:focus {
  position: fixed; left: 16px; top: 8px;
  width: auto; height: auto; overflow: visible;
}

/* === Nav === */
nav, .nav {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 10px clamp(16px, 4vw, 28px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0;
  background: var(--bg-nav);
  backdrop-filter: blur(14px);
  z-index: 100;
  transition: background 200ms, border-color 200ms;
}

.brand, .nav__title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: clamp(14px, 0.4vw + 12px, 16.5px);
  color: var(--color-text);
  text-decoration: none;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(48vw, 420px);
}

.tabs, .nav__tabs, .nav__links {
  display: flex; gap: 2px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 3px;
  list-style: none;
  transition: background 200ms;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs::-webkit-scrollbar,
.nav__tabs::-webkit-scrollbar,
.nav__links::-webkit-scrollbar { display: none; }

.tab, .nav__tab, .nav__link {
  padding: 8px 14px; border-radius: 7px;
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none; cursor: pointer;
  transition: color 150ms var(--ease), background 150ms var(--ease);
  border: none; background: none;
  font-family: var(--font-body);
  display: inline-flex; align-items: center;
  min-height: 36px; white-space: nowrap;
}
.tab:hover, .nav__tab:hover, .nav__link:hover {
  color: var(--color-text); background: var(--surface-hover);
}
.tab.active, .nav__tab--active, .nav__link--active {
  color: var(--color-text);
  background: var(--surface-hover);
  box-shadow: 0 0 0 1px var(--border);
}

.nav-right, .nav__right {
  display: flex; align-items: center; gap: 12px;
}

.nav-right kbd, .nav__right kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
  color: var(--text-tertiary);
}

/* === Theme toggle === */
.theme-toggle {
  background: none; border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px; cursor: pointer;
  font-size: 14px; line-height: 1;
  transition: all 150ms;
  color: var(--text-secondary);
}
.theme-toggle:hover { border-color: var(--border-hover); color: var(--color-text); }

/* === Focus visible === */
.tab:focus-visible,
.nav__tab:focus-visible,
.nav__link:focus-visible,
.bento-card:focus-visible,
.theme-toggle:focus-visible,
.tag:focus-visible,
.quiz-btn:focus-visible {
  outline: 2px solid var(--color-accent); outline-offset: 2px;
}

/* === Hub — Bento grid === */
.hub-hero {
  text-align: center;
  padding: clamp(28px, 5vw, 60px) 0 clamp(18px, 2.5vw, 32px);
}
.hub-hero .hub-lead {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: clamp(18px, 1.1vw + 14px, 26px);
  line-height: 1.35;
  color: var(--color-text);
  max-width: 62ch;
  margin: 0 auto clamp(20px, 3vw, 34px);
  text-wrap: balance;
  letter-spacing: -0.2px;
}
.hub-hero p {
  color: var(--text-secondary);
  max-width: 58ch; margin: 0 auto clamp(20px, 3vw, 32px);
  font-size: clamp(14px, 0.4vw + 12px, 16px); line-height: 1.65;
  text-wrap: pretty;
}
.hub-stats {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: clamp(14px, 3vw, 40px);
  margin-bottom: clamp(28px, 5vw, 52px);
  padding: clamp(14px, 2vw, 22px) 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.hub-stat { font-size: 12.5px; color: var(--text-secondary); text-align: center; }
.hub-stat strong {
  font-family: var(--font-heading);
  font-size: clamp(20px, 1vw + 16px, 26px); font-weight: 600;
  color: var(--color-text);
  display: block; margin-bottom: 2px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: min-content;
  align-items: start;
  gap: clamp(10px, 1.2vw, 16px);
}
.bento-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: clamp(20px, 2.4vw, 30px);
  cursor: pointer;
  transition: transform 200ms var(--ease), box-shadow 200ms var(--ease);
  box-shadow: var(--shadow-card);
  position: relative; overflow: hidden;
  text-decoration: none; color: inherit;
  display: flex; flex-direction: column; gap: 6px;
  align-self: start;
}
.bento-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}
.bento-card.featured {
  grid-column: span 2;
  grid-row: span 2;
  padding: clamp(24px, 3vw, 40px);
}
.bento-preview {
  list-style: none; margin: 18px 0 0; padding: 0;
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.bento-preview li {
  display: flex; align-items: baseline; gap: 12px;
  font-family: var(--font-heading);
  font-size: clamp(14px, 0.3vw + 13px, 16px);
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.35;
}
.bento-preview__num {
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 500;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 16px;
}
.bento-card.featured .when {
  margin-top: auto;
}
.bento-card .icon {
  font-size: clamp(24px, 1.4vw + 18px, 30px);
  margin-bottom: 14px; display: block;
}
.bento-card h3 { font-size: clamp(16px, 0.4vw + 14px, 18px); margin-bottom: 4px; }
.bento-card p {
  font-size: clamp(13px, 0.25vw + 12px, 14px);
  color: var(--text-secondary); line-height: 1.55;
}
.bento-card .when {
  font-size: 12px; color: var(--text-tertiary);
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid var(--border);
}
.bento-card.featured .icon { font-size: clamp(30px, 2vw + 22px, 38px); }
.bento-card.featured h3 { font-size: clamp(19px, 0.8vw + 16px, 23px); }
.bento-card.featured .badge {
  display: inline-block;
  background: var(--accent-muted); color: var(--color-accent);
  font-size: 11px; font-weight: 600;
  font-family: var(--font-mono);
  padding: 3px 8px; border-radius: 4px;
  margin-bottom: 14px;
  letter-spacing: 0.3px;
}
.bento-card.featured p { font-size: clamp(14px, 0.3vw + 13px, 15px); }

/* Hub card compat */
.hub-card { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px; }
.hub-card__icon { font-size: 28px; margin-bottom: 16px; }
.hub-card__when { font-size: 12px; color: var(--text-tertiary); margin-top: auto; }
.hub-card--recommended { border-color: var(--color-accent); border-width: 2px; }

/* === Read — 3-column layout === */
.read-3col {
  display: grid;
  grid-template-columns: 210px 1fr 180px;
  gap: 36px;
}
.read-sidebar { position: sticky; top: 72px; align-self: flex-start; }
.read-sidebar h4 {
  font-family: var(--font-heading);
  font-size: 12px; font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 14px;
}
.read-sidebar ul { list-style: none; }
.read-sidebar li {
  padding: 7px 12px; font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer; border-radius: var(--radius-sm);
  transition: all 150ms; margin-bottom: 2px;
}
.read-sidebar li:hover { background: var(--color-surface); color: var(--color-text); }
.read-sidebar li.active {
  background: var(--accent-muted);
  color: var(--color-accent); font-weight: 500;
}

.read-content { max-width: var(--content-max); }
.article-meta {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px; flex-wrap: wrap;
}

.read-content h1 {
  font-size: 30px; letter-spacing: -0.3px;
  line-height: 1.2; margin-bottom: 8px;
}
.read-content .summary {
  font-size: 15px; color: var(--text-secondary);
  font-style: italic; line-height: 1.7;
  margin-bottom: 20px;
}
.read-content h2 {
  font-size: 22px; font-weight: 600;
  margin-top: 36px; margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.read-content h3 { margin-top: 24px; }
.read-content p { line-height: 1.7; }
.read-content strong { color: var(--color-text); }

.read-content ul, .read-content ol {
  padding-left: 24px; margin-bottom: 14px;
}
.read-content li { margin-bottom: 6px; color: var(--text-secondary); }

.read-content blockquote {
  border-left: 3px solid var(--color-accent);
  padding: 12px 16px;
  margin: 14px 0;
  color: var(--text-secondary);
  background: var(--accent-muted);
}

.read-toc-right { position: sticky; top: 72px; align-self: flex-start; }
.read-toc-right h4 {
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.2px;
  color: var(--text-tertiary); margin-bottom: 12px;
  font-family: var(--font-mono);
}
.read-toc-right ul { list-style: none; border-left: 2px solid var(--border); }
.read-toc-right li {
  padding: 4px 0 4px 12px; font-size: 12px;
  color: var(--text-tertiary); cursor: pointer;
  transition: all 150ms;
}
.read-toc-right li:hover { color: var(--text-secondary); }
.read-toc-right li.active {
  color: var(--color-accent);
  border-left: 2px solid var(--color-accent);
  margin-left: -2px;
}

/* === Article (legacy compat) === */
.article {
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}
.article h1 { font-size: 30px; }
.article h2 { font-size: 22px; margin-top: 36px; }
.article h3 { font-size: 17px; margin-top: 24px; }
.article ul, .article ol { padding-left: 24px; margin-bottom: 14px; }
.article li { margin-bottom: 6px; }
.article blockquote {
  border-left: 3px solid var(--color-accent);
  padding: 12px 16px; margin: 14px 0;
  color: var(--text-secondary); background: var(--accent-muted);
}

/* === Tags === */
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }
.tag {
  display: inline-block;
  font-family: var(--font-mono); font-size: 11px;
  background: var(--accent-muted); color: var(--color-accent);
  padding: 3px 8px; border-radius: 4px;
  text-decoration: none;
}

/* === Confidence badges === */
.confidence-badge {
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 600;
  padding: 3px 8px; border-radius: 4px;
  display: inline-block;
}
.confidence-badge.p0,
.confidence-badge--p0 { background: var(--success-muted); color: var(--color-success); }
.confidence-badge.p1,
.confidence-badge--p1 { background: var(--warning-muted); color: var(--color-warning); }
.confidence-badge.p2,
.confidence-badge--p2 { background: var(--error-muted); color: var(--color-error); }

.source-count {
  font-size: 12px; color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* === Code === */
code {
  font-family: var(--font-mono); font-size: 13px;
  background: var(--code-bg); color: var(--code-color);
  padding: 2px 6px; border-radius: 4px;
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px; overflow-x: auto;
  margin: 14px 0;
}
pre code {
  background: none; padding: 0;
  font-size: 13px; line-height: 1.7;
  color: var(--color-text);
}

/* === Buttons === */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 150ms var(--ease);
}
.btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn--primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn--primary:hover { opacity: 0.9; color: #fff; }

/* === Cards (generic) === */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-card);
  transition: box-shadow 200ms var(--ease), transform 200ms var(--ease);
}
.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* === Search — Command palette + default state === */
.search-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.search-hero {
  max-width: 760px;
  margin: 0 auto clamp(24px, 4vw, 40px);
}
.search-hint-top {
  text-align: center;
  margin-bottom: 14px;
  color: var(--text-tertiary); font-size: 12.5px;
}
.search-hint-top kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
}
.search-empty {
  padding: 28px 16px;
  text-align: center; color: var(--text-tertiary);
  font-size: 14px;
}
.search-empty strong { color: var(--color-text); }
.search-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
}
.search-examples__label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-tertiary);
  margin-right: 4px;
}
.search-example {
  font-family: var(--font-body);
  font-size: 12.5px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 150ms var(--ease), color 150ms var(--ease), background 150ms var(--ease);
  white-space: nowrap;
}
.search-example:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.search-default {
  display: flex;
  flex-direction: column;
  gap: clamp(28px, 4vw, 48px);
}
.search-section__title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-tertiary);
  margin-bottom: 14px;
}
.search-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.search-tag-pill {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.search-tag-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.search-tag-pill.active {
  background: var(--accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.search-tag-pill__count {
  font-size: 10px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.search-article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(12px, 1.5vw, 18px);
}
.search-article-card {
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  cursor: pointer;
  transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-article-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-card-hover);
}
.search-article-card h3 {
  font-family: var(--font-heading);
  font-size: clamp(15px, 0.3vw + 14px, 17px);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
}
.search-article-card p {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.search-article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
  padding-top: 8px;
}
.search-article-card__tag {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-tertiary);
}
.search-result__content {
  margin-top: 16px; padding-top: 16px;
  border-top: 1px solid var(--border);
}

.search-overlay {
  background: var(--color-bg);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  max-width: 640px; margin: 0 auto;
  overflow: hidden;
  box-shadow: var(--shadow-overlay);
}
.search-input-wrap {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 12px;
}
.search-input-wrap .search-icon { color: var(--text-tertiary); font-size: 18px; }
.search-input-wrap input {
  flex: 1; background: none; border: none;
  color: var(--color-text); font-size: 16px;
  font-family: var(--font-body); outline: none;
}
.search-input-wrap input::placeholder { color: var(--text-tertiary); }
.search-input-wrap kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
  color: var(--text-tertiary);
}
.search-results { padding: 8px; }
.search-group { padding: 8px 12px; }
.search-group-title {
  font-family: var(--font-heading);
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-tertiary); margin-bottom: 8px;
}
.search-result {
  padding: 10px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: background 100ms;
}
.search-result:hover { background: var(--surface-hover); }
.search-result .title { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
.search-result .excerpt { font-size: 12px; color: var(--text-tertiary); }
.search-result .match {
  background: var(--accent-strong); color: var(--color-text);
  padding: 0 2px; border-radius: 2px;
}

/* Legacy search compat */
.mode-search .search-input {
  width: 100%; font-size: 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text); outline: none;
  transition: border-color 150ms;
}
.mode-search .search-input:focus { border-color: var(--color-accent); }

/* === Feed — Timeline === */
.feed-wrap {
  max-width: 820px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.feed-wrap h2 {
  font-family: var(--font-heading);
  font-size: clamp(22px, 1vw + 18px, 28px);
  margin-bottom: clamp(20px, 3vw, 36px);
}
.feed-timeline {
  position: relative;
  max-width: 680px;
  margin-left: clamp(0px, 10vw, 120px);
  padding-left: 0;
}
.feed-timeline::before {
  content: '';
  position: absolute;
  left: 0; top: 10px; bottom: 10px;
  width: 2px;
  background: var(--border-hover);
}
.feed-entry {
  position: relative;
  padding: 18px 0 18px 32px;
}
.feed-entry + .feed-entry { border-top: 1px dashed var(--border); }
.feed-entry::before {
  content: '';
  width: 11px; height: 11px;
  background: var(--color-bg);
  border: 2px solid var(--text-tertiary);
  border-radius: 50%;
  position: absolute;
  left: -5.5px; top: 24px;
  z-index: 1;
  transition: background 200ms, border-color 200ms;
}
.feed-entry:first-child::before {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--accent-muted);
}
.feed-date {
  position: absolute;
  left: -130px; top: 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  width: 108px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.feed-entry h4 {
  font-family: var(--font-heading);
  font-size: clamp(16px, 0.4vw + 14px, 18px);
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text);
}
.feed-entry p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  max-width: 62ch;
}
.feed-entry p + p { margin-top: 8px; }
.feed-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.feed-tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
}
.feed-tag.scouted { background: rgba(59,130,246,0.12); color: #3B82F6; }
.feed-tag.compiled { background: rgba(16,163,74,0.12); color: var(--color-success); }
.feed-tag.ingested { background: rgba(168,85,247,0.12); color: #A855F7; }
.feed-tag.edited { background: rgba(245,158,11,0.12); color: #F59E0B; }
.theme-dark .feed-tag.scouted { background: rgba(96,165,250,0.14); color: #93C5FD; }
.theme-dark .feed-tag.compiled { background: rgba(74,222,128,0.14); color: #6EE7B7; }
.theme-dark .feed-tag.ingested { background: rgba(192,132,252,0.14); color: #C4B5FD; }
.theme-dark .feed-tag.edited { background: rgba(251,191,36,0.14); color: #FCD34D; }

/* Legacy timeline compat */
.mode-feed .timeline-entry {
  padding: 20px 0 20px 28px;
  border-left: 2px solid var(--border);
  margin-left: 16px;
  position: relative;
}
.mode-feed .timeline-entry::before {
  content: ''; position: absolute;
  left: -6px; top: 24px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
}

/* === Gaps — D3 Treemap === */
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
  font-size: 14px; font-weight: 600;
  fill: var(--color-text);
  pointer-events: none;
}
.treemap-leaf .treemap-count {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-secondary);
  pointer-events: none;
}

.treemap-leaf--full rect {
  fill: color-mix(in srgb, var(--color-success) 18%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-success) 45%, transparent);
}
.treemap-leaf--full .treemap-dot { fill: var(--color-success); }
.treemap-leaf--full .treemap-tag { fill: var(--color-success); }

.treemap-leaf--partial rect {
  fill: color-mix(in srgb, var(--color-warning) 16%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-warning) 40%, transparent);
}
.treemap-leaf--partial .treemap-dot { fill: var(--color-warning); }
.treemap-leaf--partial .treemap-tag { fill: color-mix(in srgb, var(--color-warning) 80%, var(--color-text)); }

.treemap-leaf--thin rect {
  fill: color-mix(in srgb, var(--color-error) 14%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-error) 38%, transparent);
}
.treemap-leaf--thin .treemap-dot { fill: var(--color-error); }
.treemap-leaf--thin .treemap-tag { fill: color-mix(in srgb, var(--color-error) 75%, var(--color-text)); }

.treemap-leaf--missing rect {
  fill: var(--color-bg);
  stroke: var(--text-tertiary);
  stroke-dasharray: 3 3;
}
.treemap-leaf--missing .treemap-dot { fill: var(--text-tertiary); }
.treemap-leaf--missing .treemap-tag { fill: var(--text-tertiary); }

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
}

/* === Quiz — Anki-style reveal === */
.quiz-wrap {
  max-width: 620px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.quiz-progress {
  height: 4px;
  background: var(--color-surface);
  border-radius: 2px;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.quiz-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  width: 0%;
  transition: width 300ms var(--ease);
}
.quiz-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: clamp(20px, 3vw, 32px);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
}
.quiz-counter { font-variant-numeric: tabular-nums; }
.quiz-score { font-variant-numeric: tabular-nums; }

.quiz-card {
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: clamp(24px, 4vw, 40px);
  box-shadow: var(--shadow-card);
  outline: none;
}
.quiz-card:focus-visible {
  box-shadow: var(--shadow-card), 0 0 0 3px var(--accent-muted);
}
.quiz-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}
.quiz-question {
  font-family: var(--font-heading);
  font-size: clamp(19px, 1.2vw + 14px, 26px);
  font-weight: 500;
  line-height: 1.35;
  color: var(--color-text);
  margin: 0;
  text-wrap: balance;
}
.quiz-answer {
  display: none;
  font-family: var(--font-body);
  font-size: clamp(14px, 0.4vw + 12px, 16px);
  line-height: 1.7;
  color: var(--text-secondary);
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--border);
  animation: quiz-reveal 240ms var(--ease);
}
.quiz-answer.revealed { display: block; }
@keyframes quiz-reveal {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.quiz-actions {
  margin-top: clamp(18px, 3vw, 28px);
  display: flex;
  justify-content: center;
}
.quiz-feedback {
  display: none;
  gap: 12px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
  animation: quiz-reveal 240ms var(--ease);
}

.quiz-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--color-surface);
  color: var(--color-text);
  transition: transform 120ms var(--ease), background 120ms var(--ease), border-color 120ms var(--ease);
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.quiz-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quiz-btn:active { transform: translateY(1px); }

.quiz-btn--primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
  min-width: 160px;
}
.quiz-btn--primary:hover {
  filter: brightness(1.06);
  color: #fff;
  border-color: var(--color-accent);
}
.theme-dark .quiz-btn--primary { color: #0E0E0E; }

.quiz-btn--got-it {
  background: var(--color-success);
  color: #fff;
  border-color: var(--color-success);
}
.quiz-btn--got-it:hover {
  filter: brightness(1.06);
  color: #fff;
  border-color: var(--color-success);
}
.theme-dark .quiz-btn--got-it { color: #0E0E0E; }

.quiz-btn--review {
  background: var(--color-surface);
  color: var(--color-text);
}

/* Legacy compat for any tests still inspecting old quiz classes */
.flashcard, .flashcard-inner, .flashcard-front, .flashcard-back { display: none; }

/* === Graph === */
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
.mode-graph svg { width: 100%; height: 70vh; }

/* === Grid (generic) === */
.grid { display: grid; gap: 12px; }
.grid--2 { grid-template-columns: 1fr; }
.grid--3 { grid-template-columns: 1fr; }

/* === Footer === */
footer, .footer {
  text-align: center; padding: 32px 28px;
  font-size: 12px; color: var(--text-tertiary);
  font-family: var(--font-mono);
  border-top: 1px solid var(--border);
  margin-top: 48px;
}

/* === Screen visibility === */
.screen { display: none; }
.screen.active { display: block; }

/* === Responsive === */
@media (max-width: 1023px) {
  .read-3col {
    grid-template-columns: 1fr;
    gap: clamp(20px, 3vw, 32px);
  }
  .read-sidebar, .read-toc-right { position: static; }
  .read-toc-right { display: none; }
  .read-sidebar {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .read-sidebar ul {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .read-sidebar li { margin-bottom: 0; }
  .bento { grid-template-columns: repeat(2, 1fr); }
  .bento-card.featured {
    grid-column: span 2;
    grid-row: auto;
  }
  .treemap { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 767px) {
  nav, .nav { padding: 10px 16px; gap: 10px; }
  .brand, .nav__title { max-width: 40vw; }
  .tabs, .nav__tabs, .nav__links {
    overflow-x: auto; flex-wrap: nowrap;
    max-width: 60vw;
  }
  .bento { grid-template-columns: 1fr; }
  .bento-card.featured {
    grid-column: span 1;
    grid-row: auto;
  }
  .treemap { grid-template-columns: repeat(2, 1fr); }
  .feed-timeline { margin-left: 16px; }
  .feed-date {
    position: static; width: auto;
    text-align: left; margin-bottom: 4px;
  }
  .graph-wrap { flex-direction: column; height: auto; }
  .graph-sidebar { width: 100%; }
  .graph-sidebar__toggle { display: block; }
  .graph-canvas { min-height: 360px; }
  .grid--2 { grid-template-columns: repeat(2, 1fr); }
  .hub-stats { gap: 14px 24px; padding: 14px 0; }
}

@media (max-width: 479px) {
  .brand, .nav__title {
    max-width: 36vw;
    font-size: 12.5px;
  }
  .tab, .nav__tab, .nav__link {
    padding: 8px 10px;
    font-size: 12px;
    min-height: 34px;
  }
  .hub-stats { gap: 10px 18px; }
  .hub-stat strong { font-size: 18px; }
  .hub-stat { font-size: 11.5px; }
  .treemap { grid-template-columns: 1fr; }
  .grid--2 { grid-template-columns: 1fr; }
  .bento-card { padding: 20px; }
  .bento-card.featured { padding: 22px; }
}

@media (min-width: 640px) {
  .grid--2 { grid-template-columns: repeat(2, 1fr); }
  .grid--3 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid--3 { grid-template-columns: repeat(3, 1fr); }
}

/* === Print === */
@media print {
  .nav, .theme-toggle, .footer, footer, .mode-graph svg, .mode-quiz,
  .graph-wrap, .search-overlay, .quiz-wrap { display: none; }
  body { color: #000; background: #fff; font-size: 11pt; }
  a { color: #000; text-decoration: underline; }
  .article, .read-content { break-inside: avoid; }
  pre { border: 1px solid #ccc; }
  .bento-card { box-shadow: none; border: 1px solid #ccc; }
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
` + generateModesCSS();
}

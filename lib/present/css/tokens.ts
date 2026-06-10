/**
 * present/css — Design tokens
 *
 * Theme custom properties: palette variables (light + dark),
 * typography families, radii, easing, and layout dimensions.
 */

import type { PaletteColors, PaletteDef } from '../types.js';
import type { TypographySet } from '../config.js';

export function lightVars(colors: PaletteColors): string {
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

export function darkVars(colors: PaletteColors): string {
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
    `--code-color: #80f1f0;`,
  ].join('\n  ');
}

export function themeTokensCSS(palette: PaletteDef, typo: TypographySet): string {
  return `/* === Light mode (default) === */
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
}`;
}

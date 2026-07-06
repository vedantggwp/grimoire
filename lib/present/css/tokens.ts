/**
 * present/css — Design tokens
 *
 * Theme custom properties: palette variables (light + dark),
 * typography families, radii, easing, and layout dimensions.
 */

import type { Density, MotionLevel, PaletteColors, PaletteDef } from '../types.js';
import type { TypographySet } from '../config.js';
import { categoricalRamp } from '../color.js';

// --- Motion tokens ---
// Durations scale with the configured motion level; `none` collapses every
// duration to 0.01ms so transitions resolve instantly without breaking
// `transitionend` listeners.

const MOTION_DURATIONS: Readonly<Record<MotionLevel, readonly [string, string, string, string]>> = {
  subtle: ['120ms', '200ms', '320ms', '560ms'],
  expressive: ['150ms', '250ms', '400ms', '700ms'],
  none: ['0.01ms', '0.01ms', '0.01ms', '0.01ms'],
};

const REVEAL_DISTANCE: Readonly<Record<MotionLevel, string>> = {
  subtle: '12px',
  expressive: '20px',
  none: '0px',
};

const TILT_MAX: Readonly<Record<MotionLevel, string>> = {
  subtle: '2deg',
  expressive: '4deg',
  none: '0deg',
};

function motionVars(motion: MotionLevel): string {
  const [d1, d2, d3, d4] = MOTION_DURATIONS[motion];
  return [
    `--dur-1: ${d1};`,
    `--dur-2: ${d2};`,
    `--dur-3: ${d3};`,
    `--dur-4: ${d4};`,
    `--reveal-distance: ${REVEAL_DISTANCE[motion]};`,
    `--tilt-max: ${TILT_MAX[motion]};`,
  ].join('\n  ');
}

// --- Spacing tokens ---
// Strict 4px grid (issue #4). Semantic tokens swap between grid-aligned
// fluid clamps per density — named-token swaps, never multiplication, so
// every computed endpoint stays on the grid.

const SPACE_SCALE = [4, 8, 12, 16, 24, 32, 40, 48, 64, 96] as const;

interface SemanticSpacing {
  readonly padCard: string;
  readonly padCardLg: string;
  readonly padSection: string;
  readonly gapGrid: string;
  readonly gapStack: string;
}

const DENSITY_SPACING: Readonly<Record<Density, SemanticSpacing>> = {
  comfortable: {
    padCard: 'clamp(20px, 2.4vw, 32px)',
    padCardLg: 'clamp(24px, 3vw, 40px)',
    padSection: 'clamp(32px, 5vw, 64px)',
    gapGrid: 'clamp(12px, 1.2vw, 16px)',
    gapStack: '12px',
  },
  compact: {
    padCard: 'clamp(12px, 1.6vw, 20px)',
    padCardLg: 'clamp(16px, 2vw, 24px)',
    padSection: 'clamp(24px, 3.5vw, 48px)',
    gapGrid: 'clamp(8px, 1vw, 12px)',
    gapStack: '8px',
  },
  spacious: {
    padCard: 'clamp(24px, 3vw, 40px)',
    padCardLg: 'clamp(32px, 3.6vw, 48px)',
    padSection: 'clamp(40px, 6vw, 80px)',
    gapGrid: 'clamp(16px, 1.8vw, 24px)',
    gapStack: '16px',
  },
};

function spacingVars(density: Density): string {
  const scale = SPACE_SCALE.map((px, i) => `--space-${i + 1}: ${px}px;`);
  const semantic = DENSITY_SPACING[density];
  return [
    ...scale,
    `--pad-card: ${semantic.padCard};`,
    `--pad-card-lg: ${semantic.padCardLg};`,
    `--pad-section: ${semantic.padSection};`,
    `--gap-grid: ${semantic.gapGrid};`,
    `--gap-stack: ${semantic.gapStack};`,
  ].join('\n  ');
}

// --- Z-layer scale ---

const Z_LAYERS = [
  '--z-hulls: 1;',
  '--z-sticky: 100;',
  '--z-progress: 101;',
  '--z-popover: 200;',
  '--z-overlay: 300;',
  '--z-skip: 999;',
].join('\n  ');

// --- Categorical color variables ---

function catVars(colors: readonly string[]): string {
  return colors.map((hex, i) => `--cat-${i}: ${hex};`).join('\n  ');
}

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

export interface TokenConfig {
  readonly motion: MotionLevel;
  readonly density: Density;
}

export function themeTokensCSS(
  palette: PaletteDef,
  typo: TypographySet,
  tokens: TokenConfig,
): string {
  const ramp = categoricalRamp(palette.light.accent);

  return `/* === Light mode (default) === */
:root {
  ${lightVars(palette.light)}

  /* Categorical ramp (graph nodes, tag accents) */
  ${catVars(ramp.light)}

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
  --ease-out: var(--ease);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: var(--ease-out);

  /* Motion (level: ${tokens.motion}) */
  ${motionVars(tokens.motion)}

  /* Spacing — 4px grid (density: ${tokens.density}) */
  ${spacingVars(tokens.density)}

  /* Z-layers */
  ${Z_LAYERS}

  /* Layout */
  --container-max: 1100px;
  --content-max: 680px;
  --nav-height: 56px;
}

/* Spring easing where linear() is supported (no-op fallback above) */
@supports (transition-timing-function: linear(0, 1)) {
  :root {
    --ease-spring: linear(0, 0.32, 0.72, 0.95, 1.02, 1);
  }
}

/* === Dark mode — system preference === */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    ${darkVars(palette.dark)}

    ${catVars(categoricalRamp(palette.dark.accent).dark)}
  }
}

/* === Dark mode — explicit toggle === */
.theme-dark {
  ${darkVars(palette.dark)}

  ${catVars(categoricalRamp(palette.dark.accent).dark)}
}

.theme-light {
  ${lightVars(palette.light)}

  ${catVars(ramp.light)}
}`;
}

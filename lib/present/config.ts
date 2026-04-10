/**
 * present — Design configuration parser and palette resolver
 */

import { readFileSync } from 'node:fs';
import type { DesignConfig, PaletteDef, PaletteColors } from './types.js';

// --- Palette definitions ---

const SEMANTIC_LIGHT: Pick<PaletteColors, 'success' | 'warning' | 'error'> = {
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
};

const SEMANTIC_DARK: Pick<PaletteColors, 'success' | 'warning' | 'error'> = {
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

function palette(
  light: Omit<PaletteColors, 'success' | 'warning' | 'error' | 'info'>,
  dark: Omit<PaletteColors, 'success' | 'warning' | 'error' | 'info'>,
): PaletteDef {
  return {
    light: { ...light, ...SEMANTIC_LIGHT, info: light.accent },
    dark: { ...dark, ...SEMANTIC_DARK, info: dark.accent },
  };
}

const PALETTES: Readonly<Record<string, PaletteDef>> = {
  'midnight-teal': palette(
    { bg: '#f8fafb', surface: '#ffffff', text: '#1a2332', muted: '#64748b', accent: '#0d9488' },
    { bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', muted: '#94a3b8', accent: '#2dd4bf' },
  ),
  'noir-cinematic': palette(
    { bg: '#faf9f7', surface: '#ffffff', text: '#1c1917', muted: '#78716c', accent: '#b45309' },
    { bg: '#0c0a09', surface: '#1c1917', text: '#e7e5e4', muted: '#a8a29e', accent: '#f59e0b' },
  ),
  'cold-steel': palette(
    { bg: '#f8fafc', surface: '#ffffff', text: '#0f172a', muted: '#64748b', accent: '#2563eb' },
    { bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', muted: '#94a3b8', accent: '#60a5fa' },
  ),
  'warm-concrete': palette(
    { bg: '#fafaf9', surface: '#ffffff', text: '#292524', muted: '#78716c', accent: '#d97706' },
    { bg: '#1c1917', surface: '#292524', text: '#e7e5e4', muted: '#a8a29e', accent: '#fbbf24' },
  ),
  'electric-dusk': palette(
    { bg: '#faf5ff', surface: '#ffffff', text: '#1e1b4b', muted: '#6366f1', accent: '#8b5cf6' },
    { bg: '#0f0a1e', surface: '#1e1b4b', text: '#e0e7ff', muted: '#818cf8', accent: '#a78bfa' },
  ),
  'smoke-light': palette(
    { bg: '#fafafa', surface: '#ffffff', text: '#171717', muted: '#737373', accent: '#525252' },
    { bg: '#171717', surface: '#262626', text: '#e5e5e5', muted: '#a3a3a3', accent: '#d4d4d4' },
  ),
  'obsidian-chalk': palette(
    { bg: '#ffffff', surface: '#fafafa', text: '#000000', muted: '#666666', accent: '#000000' },
    { bg: '#000000', surface: '#0a0a0a', text: '#ffffff', muted: '#999999', accent: '#ffffff' },
  ),
};

// --- Typography maps ---

export interface TypographySet {
  readonly headings: string;
  readonly body: string;
  readonly mono: string;
}

const TYPOGRAPHY_MAPS: Readonly<Record<string, TypographySet>> = {
  editorial: { headings: 'Playfair Display', body: 'Inter', mono: 'JetBrains Mono' },
  technical: { headings: 'JetBrains Mono', body: 'Inter', mono: 'JetBrains Mono' },
  playful: { headings: 'Nunito', body: 'Nunito', mono: 'Fira Code' },
  brutalist: { headings: 'Space Grotesk', body: 'Inter', mono: 'Space Mono' },
  minimal: { headings: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
};

// --- Default config ---

const DEFAULT_CONFIG: DesignConfig = {
  palette: 'midnight-teal',
  typography: 'editorial',
  motion: 'subtle',
  density: 'comfortable',
};

// --- Frontmatter parser ---

function extractYamlFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string> = {};

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (value !== '' && !value.startsWith('#')) {
      result[key] = value;
    }
  }

  return result;
}

// --- Public API ---

export function parseDesignConfig(configPath: string): DesignConfig {
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return DEFAULT_CONFIG;
  }

  const yaml = extractYamlFrontmatter(content);

  const overrides: DesignConfig['overrides'] = {
    ...(yaml['accent'] ? { accent: yaml['accent'] } : {}),
    ...(yaml['font-display'] ? { fontDisplay: yaml['font-display'] } : {}),
    ...(yaml['font-mono'] ? { fontMono: yaml['font-mono'] } : {}),
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  return {
    palette: yaml['palette'] ?? DEFAULT_CONFIG.palette,
    typography: yaml['typography'] ?? DEFAULT_CONFIG.typography,
    motion: yaml['motion'] ?? DEFAULT_CONFIG.motion,
    density: yaml['density'] ?? DEFAULT_CONFIG.density,
    ...(hasOverrides ? { overrides } : {}),
  };
}

export function resolvePalette(config: DesignConfig): PaletteDef {
  const base = PALETTES[config.palette] ?? PALETTES['midnight-teal'];

  if (!config.overrides?.accent) return base;

  const accentOverride = config.overrides.accent;
  return {
    light: { ...base.light, accent: accentOverride, info: accentOverride },
    dark: { ...base.dark, accent: accentOverride, info: accentOverride },
  };
}

export function resolveTypography(config: DesignConfig): TypographySet {
  const base = TYPOGRAPHY_MAPS[config.typography] ?? TYPOGRAPHY_MAPS['editorial'];

  return {
    headings: config.overrides?.fontDisplay ?? base.headings,
    body: base.body,
    mono: config.overrides?.fontMono ?? base.mono,
  };
}

export function getGoogleFontsUrl(typo: TypographySet): string {
  const families = new Set([typo.headings, typo.body, typo.mono]);
  const params = [...families]
    .map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export { PALETTES, TYPOGRAPHY_MAPS, DEFAULT_CONFIG };

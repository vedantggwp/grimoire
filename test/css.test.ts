import { describe, expect, it } from 'vitest';

import { generateCSS } from '../lib/present/css/index.js';
import { DEFAULT_CONFIG } from '../lib/present/config.js';
import type { DesignConfig } from '../lib/present/types.js';

function css(overrides: Partial<DesignConfig> = {}): string {
  return generateCSS({ ...DEFAULT_CONFIG, ...overrides });
}

describe('css tokens — motion', () => {
  it('emits subtle durations by default', () => {
    const sheet = css();
    expect(sheet).toContain('--dur-1: 120ms;');
    expect(sheet).toContain('--dur-3: 320ms;');
    expect(sheet).toContain('--dur-4: 560ms;');
    expect(sheet).toContain('--reveal-distance: 12px;');
    expect(sheet).toContain('--tilt-max: 2deg;');
  });

  it('scales durations up for expressive motion', () => {
    const sheet = css({ motion: 'expressive' });
    expect(sheet).toContain('--dur-3: 400ms;');
    expect(sheet).toContain('--dur-4: 700ms;');
    expect(sheet).toContain('--tilt-max: 4deg;');
  });

  it('collapses every duration for motion: none', () => {
    const sheet = css({ motion: 'none' });
    expect(sheet).toContain('--dur-1: 0.01ms;');
    expect(sheet).toContain('--dur-4: 0.01ms;');
    expect(sheet).toContain('--reveal-distance: 0px;');
    expect(sheet).toContain('--tilt-max: 0deg;');
  });

  it('declares the spring easing with a linear() upgrade behind @supports', () => {
    const sheet = css();
    expect(sheet).toContain('--ease-spring: var(--ease-out);');
    expect(sheet).toContain('@supports (transition-timing-function: linear(0, 1))');
    expect(sheet).toContain('--ease-spring: linear(');
  });
});

describe('css tokens — spacing (issue #4)', () => {
  it('emits the full 4px-grid scale', () => {
    const sheet = css();
    expect(sheet).toContain('--space-1: 4px;');
    expect(sheet).toContain('--space-4: 16px;');
    expect(sheet).toContain('--space-10: 96px;');
  });

  it('every --space-* value sits on the 4px grid', () => {
    const sheet = css();
    const matches = [...sheet.matchAll(/--space-\d+: (\d+)px;/g)];
    expect(matches.length).toBeGreaterThanOrEqual(10);
    for (const match of matches) {
      expect(Number(match[1]) % 4).toBe(0);
    }
  });

  it('semantic tokens swap between densities (named swaps, not multiplication)', () => {
    const comfortable = css();
    const compact = css({ density: 'compact' });
    const spacious = css({ density: 'spacious' });

    expect(comfortable).toContain('--pad-card: clamp(20px, 2.4vw, 32px);');
    expect(compact).toContain('--pad-card: clamp(12px, 1.6vw, 20px);');
    expect(spacious).toContain('--pad-card: clamp(24px, 3vw, 40px);');
    expect(compact).toContain('--gap-stack: 8px;');
  });

  it('components consume the semantic tokens', () => {
    const sheet = css();
    expect(sheet).toContain('padding: var(--pad-card);');
    expect(sheet).toContain('gap: var(--gap-grid);');
  });
});

describe('css tokens — categorical ramp and layers', () => {
  it('emits eight categorical colors for light and dark themes', () => {
    const sheet = css();
    for (let i = 0; i < 8; i += 1) {
      expect(sheet).toContain(`--cat-${i}:`);
    }
    // Dark theme re-declares the ramp inside the dark blocks.
    const occurrences = sheet.match(/--cat-0:/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3); // :root, media dark, .theme-dark, .theme-light
  });

  it('emits the z-layer scale', () => {
    const sheet = css();
    expect(sheet).toContain('--z-popover: 200;');
    expect(sheet).toContain('--z-skip: 999;');
  });

  it('contains no font @import (fonts load via <link>)', () => {
    expect(css()).not.toContain('@import');
  });
});

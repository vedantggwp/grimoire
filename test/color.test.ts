import { describe, expect, it } from 'vitest';

import {
  categoricalRamp,
  contrastRatio,
  hexToOklch,
  mixSrgb,
  oklchToHex,
} from '../lib/present/color.js';
import { PALETTES } from '../lib/present/config.js';

const HEX = /^#[0-9a-f]{6}$/;

describe('color — OKLCH round trip', () => {
  it.each(['#0d9488', '#2dd4bf', '#1a1a1a', '#ffffff', '#b45309'])(
    '%s survives hex → oklch → hex within 1/255 per channel',
    hex => {
      const round = oklchToHex(hexToOklch(hex));
      const orig = parseInt(hex.slice(1), 16);
      const back = parseInt(round.slice(1), 16);
      for (const shift of [16, 8, 0]) {
        const a = (orig >> shift) & 0xff;
        const b = (back >> shift) & 0xff;
        expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
      }
    },
  );

  it('orders lightness sensibly', () => {
    expect(hexToOklch('#ffffff').l).toBeGreaterThan(0.99);
    expect(hexToOklch('#000000').l).toBeLessThan(0.01);
  });
});

describe('color — categorical ramp', () => {
  it('produces 8 distinct valid hex colors per theme', () => {
    const ramp = categoricalRamp('#0d9488');
    for (const theme of [ramp.light, ramp.dark]) {
      expect(theme).toHaveLength(8);
      expect(new Set(theme).size).toBe(8);
      for (const hex of theme) {
        expect(hex).toMatch(HEX);
      }
    }
  });

  it('anchors the first step at the accent hue', () => {
    const accent = '#0d9488';
    const ramp = categoricalRamp(accent);
    const accentHue = hexToOklch(accent).h;
    const firstHue = hexToOklch(ramp.light[0]).h;
    // Gamut clipping can nudge the hue slightly.
    expect(Math.abs(firstHue - accentHue)).toBeLessThan(12);
  });

  it('handles achromatic accents without NaN colors', () => {
    for (const accent of ['#525252', '#000000', '#ffffff']) {
      const ramp = categoricalRamp(accent);
      for (const hex of [...ramp.light, ...ramp.dark]) {
        expect(hex).toMatch(HEX);
      }
    }
  });

  it('keeps every dark-ramp color readable on every palette dark surface', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      const ramp = categoricalRamp(palette.dark.accent);
      for (const hex of ramp.dark) {
        // 3:1 is the WCAG threshold for graphical objects (graph nodes).
        expect(
          contrastRatio(hex, palette.dark.bg),
          `${name}: ${hex} on ${palette.dark.bg}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('color — WCAG contrast (issue #5 regression)', () => {
  it('computes the canonical black/white ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  it('text passes AA on bg and surface for every palette, both themes', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const theme of ['light', 'dark'] as const) {
        const colors = palette[theme];
        expect(
          contrastRatio(colors.text, colors.bg),
          `${name}/${theme} text-on-bg`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(colors.text, colors.surface),
          `${name}/${theme} text-on-surface`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('treemap labels pass AA on every tier tint for every palette/theme', () => {
    // Mirrors the generated CSS: tier backgrounds are
    // color-mix(in srgb, tierColor N%, surface) with text in --color-text.
    const tiers = [
      { color: 'success' as const, weight: 0.18 },
      { color: 'warning' as const, weight: 0.16 },
      { color: 'error' as const, weight: 0.14 },
    ];
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const theme of ['light', 'dark'] as const) {
        const colors = palette[theme];
        for (const tier of tiers) {
          const tinted = mixSrgb(colors[tier.color], colors.surface, tier.weight);
          expect(
            contrastRatio(colors.text, tinted),
            `${name}/${theme} text on ${tier.color}-tint`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

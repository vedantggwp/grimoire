/**
 * present — Color math
 *
 * Hex ↔ OKLCH conversion (Björn Ottosson's OKLab), categorical ramp
 * generation for graph/tag coloring, sRGB mixing (mirrors CSS color-mix
 * in srgb), and WCAG contrast ratios for build-time accessibility checks.
 * Pure functions, no I/O.
 */

export interface Oklch {
  readonly l: number; // 0..1
  readonly c: number; // 0..~0.4
  readonly h: number; // degrees 0..360
}

export interface Rgb {
  readonly r: number; // 0..1
  readonly g: number;
  readonly b: number;
}

// --- hex ↔ sRGB ---

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(ch => ch + ch).join('')
    : clean;
  const value = parseInt(full, 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  };
}

export function rgbToHex(rgb: Rgb): string {
  const channel = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

// --- sRGB ↔ linear ---

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// --- OKLab / OKLCH ---

export function rgbToOklch(rgb: Rgb): Oklch {
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(a * a + b * b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

  return { l: L, c, h };
}

export function oklchToRgb(oklch: Oklch): Rgb {
  const hRad = (oklch.h * Math.PI) / 180;
  const a = oklch.c * Math.cos(hRad);
  const b = oklch.c * Math.sin(hRad);

  const l = oklch.l + 0.3963377774 * a + 0.2158037573 * b;
  const m = oklch.l - 0.1055613458 * a - 0.0638541728 * b;
  const s = oklch.l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  return {
    r: linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}

export function oklchToHex(oklch: Oklch): string {
  return rgbToHex(oklchToRgb(oklch));
}

// --- Categorical ramp ---

// Below this chroma a hue angle is meaningless (gray/black/white accents
// like smoke-light and obsidian-chalk) — anchor the ramp at a fixed hue.
const ACHROMATIC_CHROMA = 0.02;
const ACHROMATIC_ANCHOR_HUE = 230;

export interface CategoricalRamp {
  readonly light: readonly string[];
  readonly dark: readonly string[];
}

/**
 * Generate `count` visually-distinct categorical colors anchored at the
 * palette accent's hue. Lightness and chroma are fixed per theme so every
 * step reads at the same visual weight; hue advances in equal rotations.
 */
export function categoricalRamp(accentHex: string, count = 8): CategoricalRamp {
  const accent = hexToOklch(accentHex);
  const baseHue = accent.c < ACHROMATIC_CHROMA ? ACHROMATIC_ANCHOR_HUE : accent.h;
  const step = 360 / count;

  const at = (l: number, c: number) =>
    Array.from({ length: count }, (_, i) =>
      oklchToHex({ l, c, h: (baseHue + i * step) % 360 }),
    );

  return {
    light: at(0.55, 0.11),
    dark: at(0.75, 0.12),
  };
}

// --- Mixing (mirrors CSS color-mix in srgb) ---

export function mixSrgb(hexA: string, hexB: string, weightA: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.min(1, Math.max(0, weightA));
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

// --- WCAG contrast ---

function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

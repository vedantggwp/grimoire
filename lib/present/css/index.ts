/**
 * present/css — Stylesheet assembler
 *
 * Produces the complete stylesheet from a DesignConfig by concatenating
 * the css/ partials in a fixed order: reset, theme tokens, base, hub,
 * read, shared components, search, feed, gaps, quiz, graph, tail,
 * responsive, print, reduced motion, then mode-specific overrides.
 *
 * Design: Option F — Linear Editorial (dual-theme)
 */

import type { DesignConfig } from '../types.js';
import {
  resolvePalette,
  resolveTypography,
  getGoogleFontsUrl,
} from '../config.js';
import { themeTokensCSS } from './tokens.js';
import { RESET_CSS, BASE_CSS, COMPONENTS_CSS, TAIL_CSS } from './base.js';
import { HUB_CSS } from './hub.js';
import { READ_CSS, READ_MODE_OVERRIDE_CSS } from './read.js';
import { SEARCH_CSS, SEARCH_MODE_OVERRIDE_CSS } from './search.js';
import { FEED_CSS } from './feed.js';
import { GAPS_CSS } from './gaps.js';
import { QUIZ_CSS } from './quiz.js';
import { GRAPH_CSS, GRAPH_MODE_OVERRIDE_CSS } from './graph.js';
import { RESPONSIVE_CSS } from './responsive.js';
import { PRINT_CSS } from './print.js';
import { REDUCED_MOTION_CSS } from './motion.js';

export function generateCSS(config: DesignConfig): string {
  const palette = resolvePalette(config);
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);

  const sections = [
    RESET_CSS,
    themeTokensCSS(palette, typo),
    BASE_CSS,
    HUB_CSS,
    READ_CSS,
    COMPONENTS_CSS,
    SEARCH_CSS,
    FEED_CSS,
    GAPS_CSS,
    QUIZ_CSS,
    GRAPH_CSS,
    TAIL_CSS,
    RESPONSIVE_CSS,
    PRINT_CSS,
    REDUCED_MOTION_CSS,
  ].join('\n\n');

  const modeOverrides = [
    READ_MODE_OVERRIDE_CSS,
    GRAPH_MODE_OVERRIDE_CSS,
    SEARCH_MODE_OVERRIDE_CSS,
  ].join('\n\n');

  return `@import url('${fontsUrl}');\n\n${sections}\n\n${modeOverrides}\n`;
}

/**
 * D3 source inliner.
 *
 * Exports the full d3.min.js UMD bundle as a string so graph mode can embed
 * it directly in the generated HTML — no CDN, no network, no build step on
 * the reader's machine.
 *
 * Two execution paths:
 *
 * 1. **Dev (tsx / vitest)**: the `readFileSync` below runs at module-load
 *    time, reading the real d3 package from `node_modules`. Works because
 *    the dev checkout always has `node_modules/` populated.
 *
 * 2. **Production (esbuild bundle)**: the build plugin in `scripts/build.mjs`
 *    intercepts this exact file during bundling and replaces its contents
 *    with an inlined string constant. At runtime, no filesystem access
 *    happens — d3 is a plain string baked into `dist/present.js`.
 *
 * Both paths produce the same export shape, so `graph.ts` imports it the
 * same way regardless of which form is loaded.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path: lib/present/modes/ → repo root → node_modules/d3/dist/d3.min.js
const d3MinPath = resolve(__dirname, '../../../node_modules/d3/dist/d3.min.js');

export const d3MinSource: string = readFileSync(d3MinPath, 'utf8');

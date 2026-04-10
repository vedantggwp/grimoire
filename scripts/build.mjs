/**
 * Build script for Grimoire CLI bundles.
 *
 * Bundles lib/compile.ts, lib/present/index.ts, and lib/serve.ts into
 * self-contained ESM JavaScript files in dist/ that users can execute via
 *
 *     node dist/{compile,present,serve}.js <args>
 *
 * without running `npm install`. This is what makes Grimoire installable
 * through the Claude Code plugin marketplace — pre-built bundles ship with
 * the plugin, so all dependencies (papyr-core, @modelcontextprotocol/sdk,
 * zod) resolve without a dependency install step on the user's machine.
 *
 * Pattern references:
 * - voidauth/voidauth (Node 24 ESM server, closest production match)
 * - angular/angular-cli (banner pattern, esbuild issue #1921)
 * - drizzle-team/drizzle-kit (CLI bundling)
 */

import esbuild from 'esbuild';
import { rm, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');

/**
 * ESM Node banner — MANDATORY for any ESM bundle that inlines npm
 * dependencies. Transitive deps may use `createRequire`, `__dirname`,
 * or `__filename`, none of which exist in ESM modules by default.
 * Without this shim, bundles crash at runtime with:
 *     ReferenceError: require is not defined
 *
 * Aliased names (__grimoire*) avoid colliding with any createRequire
 * import that might already exist in bundled user code — same defensive
 * pattern used by Angular CLI's build tooling.
 *
 * See esbuild issue #1921 for the canonical discussion.
 */
const esmShimBanner = [
  `import { createRequire as __grimoireCreateRequire } from 'node:module';`,
  `import { fileURLToPath as __grimoireFileURLToPath } from 'node:url';`,
  `import { dirname as __grimoireDirname } from 'node:path';`,
  `const require = __grimoireCreateRequire(import.meta.url);`,
  `const __filename = __grimoireFileURLToPath(import.meta.url);`,
  `const __dirname = __grimoireDirname(__filename);`,
].join('\n');

async function formatSize(path) {
  try {
    const { size } = await stat(path);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return '?';
  }
}

async function main() {
  const watchMode = process.argv.includes('--watch');

  // Clean dist/ before every full build
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const buildOptions = {
    entryPoints: {
      compile: resolve(root, 'lib/compile.ts'),
      present: resolve(root, 'lib/present/index.ts'),
      serve: resolve(root, 'lib/serve.ts'),
    },
    outdir: distDir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'bundle',
    conditions: ['node'],
    mainFields: ['module', 'main'],
    sourcemap: 'linked',
    minifyWhitespace: true,
    banner: { js: esmShimBanner },
    logLevel: 'info',
    metafile: !watchMode,
  };

  if (watchMode) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('\n[grimoire build] Watching for changes…');
    return;
  }

  const start = Date.now();
  const result = await esbuild.build(buildOptions);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  const compileSize = await formatSize(resolve(distDir, 'compile.js'));
  const presentSize = await formatSize(resolve(distDir, 'present.js'));
  const serveSize = await formatSize(resolve(distDir, 'serve.js'));

  console.log('');
  console.log(`[grimoire build] Bundled in ${elapsed}s`);
  console.log(`  dist/compile.js  ${compileSize}`);
  console.log(`  dist/present.js  ${presentSize}`);
  console.log(`  dist/serve.js    ${serveSize}`);

  if (result.warnings.length > 0) {
    console.log(`\n[grimoire build] ${result.warnings.length} warning(s) — see above.`);
  }
}

main().catch((err) => {
  console.error('[grimoire build] FAILED');
  console.error(err);
  process.exit(1);
});

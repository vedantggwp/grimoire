/**
 * slug — Single source of truth for slug derivation
 *
 * Slugs MUST be derived exactly the way papyr-core derives them for files
 * with a path: basename without extension, slugified lower/strict. Compile's
 * notes.json is the article manifest; any drift between derivations makes
 * downstream stages silently drop articles (issue #1 — nested taxonomy
 * directories rendered 0 articles). Imported by lib/compile.ts and
 * lib/present/data.ts so the definition can't fork.
 */

import slugify from 'slugify';

export function slugLikePapyr(relPath: string): string {
  const filename = relPath.split('/').pop() || relPath;
  const basename = filename.replace(/\.(md|markdown)$/i, '');
  return slugify(basename, { lower: true, strict: true });
}

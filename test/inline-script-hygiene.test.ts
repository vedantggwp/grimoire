import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const PRESENT_ROOT = join(__dirname, '../lib/present');
const BARE_JSON_STRINGIFY_EMBED = /\$\{JSON\.stringify\(/;

function tsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...tsFiles(path));
    } else if (path.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

describe('inline <script> JSON hygiene', () => {
  it('routes template-literal JSON embeds through jsonForScript', () => {
    const offenders = tsFiles(PRESENT_ROOT)
      .filter(path => !path.endsWith('/esc.ts'))
      .filter(path => BARE_JSON_STRINGIFY_EMBED.test(readFileSync(path, 'utf8')))
      .map(path => relative(process.cwd(), path));

    expect(
      offenders,
      'Inline <script> template literals must use jsonForScript, not bare JSON.stringify.',
    ).toEqual([]);
  });
});

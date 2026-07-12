import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { fetchSource, type FetchSourceResult, type FetchSourceOptions } from './providers/fetch.js';
import { searchWeb, type SearchWebOptions } from './providers/search.js';

interface ResearchCliOptions {
  readonly fetchImpl?: FetchSourceOptions['fetchImpl'] & SearchWebOptions['fetchImpl'];
  readonly stdout?: (text: string) => void;
  readonly stderr?: (text: string) => void;
  readonly now?: Date;
}

interface ParsedArgs {
  readonly error?: string;
  readonly out?: string;
  readonly positionals: readonly string[];
}

function usage(): string {
  return [
    'Usage:',
    '  node dist/research.js fetch <url> [--out file]',
    '  node dist/research.js search <query>',
    '',
  ].join('\n');
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  let out: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) {
        return { error: '--out requires a file path', positionals };
      }
      out = args[i + 1];
      i += 1;
      continue;
    }
    positionals.push(arg);
  }

  return { out, positionals };
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function formatFetchCapture(sourceUrl: string, result: FetchSourceResult, now = new Date()): string {
  const lines = [
    '---',
    `source_url: ${yamlString(sourceUrl)}`,
    `fidelity: ${result.fidelity}`,
    `method: ${result.method}`,
    `captured_at: ${yamlString(now.toISOString())}`,
  ];

  if (result.meta.finalUrl) lines.push(`final_url: ${yamlString(result.meta.finalUrl)}`);
  if (result.meta.status) lines.push(`status: ${result.meta.status}`);
  if (result.meta.error) lines.push(`error: ${yamlString(result.meta.error)}`);
  lines.push('---', '', result.text);
  return `${lines.join('\n').trimEnd()}\n`;
}

async function writeOut(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

export async function runResearchCli(args: readonly string[], options: ResearchCliOptions = {}): Promise<number> {
  const stdout = options.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = options.stderr ?? ((text: string) => process.stderr.write(text));
  const [command, ...rest] = args;

  if (!command || command === '--help' || command === '-h') {
    stdout(usage());
    return command ? 0 : 64;
  }

  if (command === 'fetch') {
    const parsed = parseArgs(rest);
    const url = parsed.positionals[0];
    if (parsed.error || !url || parsed.positionals.length > 1) {
      stderr(usage());
      return 64;
    }

    const result = await fetchSource(url, { fetchImpl: options.fetchImpl });
    const capture = formatFetchCapture(url, result, options.now);
    if (parsed.out) {
      await writeOut(parsed.out, capture);
    } else {
      stdout(capture);
    }
    return 0;
  }

  if (command === 'search') {
    const query = rest.join(' ').trim();
    if (!query) {
      stderr(usage());
      return 64;
    }

    const search = await searchWeb(query, { fetchImpl: options.fetchImpl });
    if (!search.ok) {
      stderr(`${JSON.stringify({ error: search.error })}\n`);
      return 1;
    }

    if (search.results.length === 0) {
      stdout('[]\n');
      return 0;
    }

    for (const result of search.results) {
      stdout(`${JSON.stringify(result)}\n`);
    }
    return 0;
  }

  stderr(usage());
  return 64;
}

const isDirect = process.argv[1]?.endsWith('/research-cli.ts') || process.argv[1]?.endsWith('/research.js');

if (isDirect) {
  runResearchCli(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

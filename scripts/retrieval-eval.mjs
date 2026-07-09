#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const noFail = args.includes('--no-fail');
const positional = args.filter((arg) => arg !== '--no-fail');
const [workspacePath, questionSetPath] = positional;

if (!workspacePath || !questionSetPath) {
  console.error('Usage: node scripts/retrieval-eval.mjs <wiki-workspace> <questions.json> [--no-fail]');
  process.exit(2);
}

const serveJs = process.env.GRIMOIRE_SERVE_JS
  ? resolve(process.env.GRIMOIRE_SERVE_JS)
  : resolve(root, 'dist/serve.js');

function parseSlugs(text) {
  const sources = text.match(/^Sources:\s*(.+)$/m);
  if (sources) {
    return sources[1]
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean);
  }

  return [...text.matchAll(/^###\s+.+?\(([^)]+)\)/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function extractText(result) {
  return (result?.content ?? [])
    .filter((entry) => entry.type === 'text')
    .map((entry) => entry.text)
    .join('\n');
}

function callQuery(question) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('node', [serveJs, workspacePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      proc.kill();
      reject(new Error(`Timed out calling grimoire_query for: ${question}`));
    }, 30000);

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      let newline;
      while ((newline = stdout.indexOf('\n')) >= 0) {
        const line = stdout.slice(0, newline).trim();
        stdout = stdout.slice(newline + 1);
        if (!line) continue;

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.id !== 2) continue;
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        proc.kill();

        if (message.error) {
          reject(new Error(`MCP error: ${JSON.stringify(message.error)}\n${stderr}`));
          return;
        }

        resolvePromise(extractText(message.result));
      }
    });

    proc.on('exit', () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(new Error(`serve.js exited before responding.\n${stderr}`));
    });

    const send = (message) => proc.stdin.write(`${JSON.stringify(message)}\n`);
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'grimoire-retrieval-eval', version: '1' },
      },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'grimoire_query',
        arguments: { question },
      },
    });
  });
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : `${text}${' '.repeat(width - text.length)}`;
}

const questions = JSON.parse(await readFile(resolve(questionSetPath), 'utf8'));
const rows = [];

for (const item of questions) {
  const text = await callQuery(item.question);
  const slugs = parseSlugs(text);
  const expected = item.expectedSlug ?? null;
  const top1 = expected === null ? false : slugs[0] === expected;
  const top3 = expected === null ? false : slugs.slice(0, 3).includes(expected);
  const noHit = expected === null ? slugs.length === 0 : false;

  rows.push({
    id: item.id ?? rows.length + 1,
    coverage: item.coverage ?? (expected === null ? 'absent' : 'present'),
    expected,
    slugs,
    top1,
    top3,
    noHit,
  });
}

const scorable = rows.filter((row) => row.expected !== null);
const absent = rows.filter((row) => row.expected === null);
const top1Count = scorable.filter((row) => row.top1).length;
const top3Count = scorable.filter((row) => row.top3).length;
const absentNoHitCount = absent.filter((row) => row.noHit).length;
const allTop1OrAbstain = top1Count + absentNoHitCount;
const allTop3OrAbstain = top3Count + absentNoHitCount;

console.log(`# Retrieval eval`);
console.log(`- Server: ${serveJs}`);
console.log(`- Workspace: ${resolve(workspacePath)}`);
console.log(`- Questions: ${resolve(questionSetPath)}`);
console.log('');
console.log(`${pad('ID', 4)} ${pad('Coverage', 8)} ${pad('Top1', 5)} ${pad('Top3', 5)} ${pad('NoHit', 5)} ${pad('Expected', 38)} Returned`);
console.log(`${'-'.repeat(4)} ${'-'.repeat(8)} ${'-'.repeat(5)} ${'-'.repeat(5)} ${'-'.repeat(5)} ${'-'.repeat(38)} ${'-'.repeat(40)}`);

for (const row of rows) {
  const returned = row.slugs.length > 0 ? row.slugs.join(', ') : '(none)';
  console.log(
    `${pad(row.id, 4)} ${pad(row.coverage, 8)} ${pad(row.top1 ? 'yes' : '-', 5)} ${pad(row.top3 ? 'yes' : '-', 5)} ${pad(row.noHit ? 'yes' : '-', 5)} ${pad(row.expected ?? '(absent)', 38)} ${returned}`,
  );
}

console.log('');
console.log(`Covered/partial top-1: ${top1Count}/${scorable.length}`);
console.log(`Covered/partial top-3: ${top3Count}/${scorable.length}`);
console.log(`Absent no-hit: ${absentNoHitCount}/${absent.length}`);
console.log(`All questions top-1-or-abstain: ${allTop1OrAbstain}/${rows.length}`);
console.log(`All questions top-3-or-abstain: ${allTop3OrAbstain}/${rows.length}`);

const requiredTop1 = Math.min(8, scorable.length);
const passed =
  top1Count >= requiredTop1 &&
  top3Count === scorable.length &&
  absentNoHitCount === absent.length;

console.log(`Gate: ${passed ? 'PASS' : 'FAIL'}`);

if (!passed && !noFail) {
  process.exitCode = 1;
}

/**
 * source-ledger — What this workspace has already ingested
 *
 * Builds the cross-run dedup ledger for delta scouting: every URL known to
 * the workspace (approved-sources.md in any of its historical table shapes,
 * plus raw/ archive frontmatter), keyed in normalized form, and the date of
 * the last update activity. Derived entirely from existing files — no new
 * state file to keep in sync.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

export interface SourceLedger {
  /** Normalized, deduplicated, sorted. */
  readonly knownUrls: readonly string[];
  /** ISO date (YYYY-MM-DD) of the most recent activity, or null for fresh workspaces. */
  readonly lastUpdate: string | null;
  /** Normalized source URL → `collected:` date of its raw archive file. */
  readonly rawCollectedByUrl: Readonly<Record<string, string>>;
}

// Normalization rules (keep in lockstep with the prose copy in
// skills/scout/SKILL.md — this function is the source of truth):
// lowercase host, strip "www.", strip the #fragment, strip utm_* params,
// strip a trailing slash. Unparseable strings pass through trimmed.
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key);
  }

  const serialized = parsed.toString();
  return serialized.endsWith('/') && !parsed.search
    ? serialized.slice(0, -1)
    : serialized;
}

// Frontmatter date fields arrive as JS Date objects when the YAML value is
// unquoted (gray-matter behavior) and as strings when quoted. Accept both.
export function normalizeFrontmatterDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  return null;
}

const URL_PATTERN = /https?:\/\/[^\s)\]|>"'`]+/g;

function extractUrls(text: string): readonly string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return matches.map(url => url.replace(/[.,;:]+$/, ''));
}

function readFileOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function collectRawFiles(dir: string): readonly string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.flatMap(entry => {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      return collectRawFiles(join(dir, entry.name));
    }
    return entry.name.endsWith('.md') ? [join(dir, entry.name)] : [];
  });
}

function extractLogDates(logMd: string): readonly string[] {
  const matches = logMd.match(/^## (\d{4}-\d{2}-\d{2})/gm) ?? [];
  return matches.map(line => line.slice(3, 13));
}

export function buildSourceLedger(workspaceDir: string): SourceLedger {
  const knownUrls = new Set<string>();
  const rawCollectedByUrl: Record<string, string> = {};
  const activityDates: string[] = [];

  // approved-sources.md — extract URLs from any line; the table shape has
  // drifted between the spec format and real workspaces, so never parse by
  // column position.
  const approvedSources = readFileOrNull(join(workspaceDir, 'approved-sources.md'));
  if (approvedSources) {
    for (const url of extractUrls(approvedSources)) {
      knownUrls.add(normalizeUrl(url));
    }
  }

  // raw/ archives — `source_url:` is the canonical identity of an ingested
  // source; `collected:` dates double as update-activity timestamps.
  for (const filePath of collectRawFiles(join(workspaceDir, 'raw'))) {
    const raw = readFileOrNull(filePath);
    if (!raw) continue;

    let data: Record<string, unknown>;
    try {
      data = matter(raw).data ?? {};
    } catch {
      continue;
    }

    const sourceUrl = typeof data.source_url === 'string' ? data.source_url : null;
    const collected = normalizeFrontmatterDate(data.collected);

    if (sourceUrl) {
      const normalized = normalizeUrl(sourceUrl);
      knownUrls.add(normalized);
      if (collected) rawCollectedByUrl[normalized] = collected;
    }
    if (collected) activityDates.push(collected);
  }

  // wiki/log.md date headers mark every pipeline operation.
  const logMd = readFileOrNull(join(workspaceDir, 'wiki', 'log.md'));
  if (logMd) {
    activityDates.push(...extractLogDates(logMd));
  }

  const lastUpdate = activityDates.length > 0
    ? [...activityDates].sort().at(-1) ?? null
    : null;

  return {
    knownUrls: [...knownUrls].sort(),
    lastUpdate,
    rawCollectedByUrl,
  };
}

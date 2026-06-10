/**
 * update-policy — Parse and resolve `_config/update.md`
 *
 * The policy file is the human's standing judgment for headless update runs:
 * it replaces the two interactive taste checkpoints (source curation, final
 * review) with authored rules. When the file is absent every field falls back
 * to a conservative default, so the engine works on workspaces that have
 * never been configured.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export type UpdateAutonomy = 'pr' | 'branch' | 'digest-only';

export interface StalenessWindows {
  /** Inclusive upper bound (days) for the `fresh` tier. */
  readonly freshDays: number;
  /** Inclusive upper bound (days) for the `aging` tier; beyond is `stale`. */
  readonly agingDays: number;
}

export interface ConnectionExclusion {
  readonly a: string;
  readonly b: string;
}

export interface UpdatePolicy {
  readonly autonomy: UpdateAutonomy;
  /** Composite 6-signal score floor (6–30) for auto-approving a source. */
  readonly minScore: number;
  readonly maxSourcesPerRun: number;
  readonly maxConnectionsPerRun: number;
  readonly staleness: StalenessWindows;
  readonly verifyStale: boolean;
  readonly maxStaleChecks: number;
  /** Documentation for humans and schedulers; the engine is trigger-agnostic. */
  readonly cadence: string;
  /** Standing interests: phrases become search angles, URLs are fetched directly. */
  readonly watchlist: readonly string[];
  /** Article pairs the editor rejected; connection mining never re-proposes them. */
  readonly connectionExclusions: readonly ConnectionExclusion[];
  readonly source: 'defaults' | 'file';
}

export const DEFAULT_UPDATE_POLICY: UpdatePolicy = {
  autonomy: 'pr',
  minScore: 12,
  maxSourcesPerRun: 5,
  maxConnectionsPerRun: 5,
  staleness: { freshDays: 30, agingDays: 90 },
  verifyStale: false,
  maxStaleChecks: 3,
  cadence: 'weekly',
  watchlist: [],
  connectionExclusions: [],
  source: 'defaults',
};

const PolicyFrontmatterSchema = z.object({
  cadence: z.string().optional(),
  autonomy: z.enum(['pr', 'branch', 'digest-only']).optional(),
  min_score: z.number().int().min(6).max(30).optional(),
  max_sources_per_run: z.number().int().min(0).optional(),
  max_connections_per_run: z.number().int().min(0).optional(),
  staleness: z
    .object({
      fresh: z.number().int().positive().optional(),
      aging: z.number().int().positive().optional(),
    })
    .optional(),
  verify_stale: z.boolean().optional(),
  max_stale_checks: z.number().int().min(0).optional(),
});

function sectionBullets(body: string, heading: string): readonly string[] {
  const lines = body.replace(/\r/g, '').split('\n');
  const headingPattern = new RegExp(`^##\\s+${heading}\\s*$`, 'i');
  const start = lines.findIndex(line => headingPattern.test(line));
  if (start === -1) return [];

  const bullets: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) break;
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('- ')) bullets.push(trimmed.slice(2).trim());
  }
  return bullets;
}

const EXCLUSION_PATTERN = /^(\S+)\s*<->\s*(\S+)/;

function parseExclusions(bullets: readonly string[]): readonly ConnectionExclusion[] {
  return bullets.flatMap(line => {
    const match = line.match(EXCLUSION_PATTERN);
    if (!match) return [];
    const [a, b] = [match[1], match[2]].sort();
    return [{ a, b }];
  });
}

export function parseUpdatePolicy(markdown: string): UpdatePolicy {
  const { data, content } = matter(markdown);
  const parsed = PolicyFrontmatterSchema.safeParse(data ?? {});

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join('; ');
    throw new Error(`_config/update.md has invalid policy fields — ${issues}`);
  }

  const fm = parsed.data;
  const defaults = DEFAULT_UPDATE_POLICY;

  return {
    autonomy: fm.autonomy ?? defaults.autonomy,
    minScore: fm.min_score ?? defaults.minScore,
    maxSourcesPerRun: fm.max_sources_per_run ?? defaults.maxSourcesPerRun,
    maxConnectionsPerRun: fm.max_connections_per_run ?? defaults.maxConnectionsPerRun,
    staleness: {
      freshDays: fm.staleness?.fresh ?? defaults.staleness.freshDays,
      agingDays: fm.staleness?.aging ?? defaults.staleness.agingDays,
    },
    verifyStale: fm.verify_stale ?? defaults.verifyStale,
    maxStaleChecks: fm.max_stale_checks ?? defaults.maxStaleChecks,
    cadence: fm.cadence ?? defaults.cadence,
    watchlist: sectionBullets(content, 'Watchlist'),
    connectionExclusions: parseExclusions(sectionBullets(content, 'Connection exclusions')),
    source: 'file',
  };
}

export function loadUpdatePolicy(workspaceDir: string): UpdatePolicy {
  let markdown: string;
  try {
    markdown = readFileSync(join(workspaceDir, '_config', 'update.md'), 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_UPDATE_POLICY;
    }
    throw err;
  }
  return parseUpdatePolicy(markdown);
}

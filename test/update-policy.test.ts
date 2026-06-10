import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_UPDATE_POLICY,
  loadUpdatePolicy,
  parseUpdatePolicy,
} from '../lib/update-policy.js';

describe('update policy', () => {
  it('exposes conservative defaults', () => {
    expect(DEFAULT_UPDATE_POLICY.autonomy).toBe('pr');
    expect(DEFAULT_UPDATE_POLICY.minScore).toBe(12);
    expect(DEFAULT_UPDATE_POLICY.maxSourcesPerRun).toBe(5);
    expect(DEFAULT_UPDATE_POLICY.maxConnectionsPerRun).toBe(5);
    expect(DEFAULT_UPDATE_POLICY.staleness).toEqual({ freshDays: 30, agingDays: 90 });
    expect(DEFAULT_UPDATE_POLICY.verifyStale).toBe(false);
    expect(DEFAULT_UPDATE_POLICY.source).toBe('defaults');
  });

  it('parses a full policy file', () => {
    const policy = parseUpdatePolicy([
      '---',
      'cadence: monthly',
      'autonomy: digest-only',
      'min_score: 18',
      'max_sources_per_run: 3',
      'max_connections_per_run: 2',
      'staleness:',
      '  fresh: 14',
      '  aging: 60',
      'verify_stale: true',
      'max_stale_checks: 1',
      '---',
      '',
      '## Watchlist',
      '',
      '- MCP specification releases — https://modelcontextprotocol.io/specification',
      '- agent memory papers',
      '',
      '## Connection exclusions',
      '',
      '- slug-b <-> slug-a — too tangential',
    ].join('\n'));

    expect(policy.cadence).toBe('monthly');
    expect(policy.autonomy).toBe('digest-only');
    expect(policy.minScore).toBe(18);
    expect(policy.maxSourcesPerRun).toBe(3);
    expect(policy.maxConnectionsPerRun).toBe(2);
    expect(policy.staleness).toEqual({ freshDays: 14, agingDays: 60 });
    expect(policy.verifyStale).toBe(true);
    expect(policy.maxStaleChecks).toBe(1);
    expect(policy.watchlist).toEqual([
      'MCP specification releases — https://modelcontextprotocol.io/specification',
      'agent memory papers',
    ]);
    expect(policy.source).toBe('file');
  });

  it('stores connection exclusions in lexical pair order', () => {
    const policy = parseUpdatePolicy([
      '---',
      '---',
      '## Connection exclusions',
      '- zebra <-> alpha — reason text',
      '- not an exclusion line',
    ].join('\n'));

    expect(policy.connectionExclusions).toEqual([{ a: 'alpha', b: 'zebra' }]);
  });

  it('merges partial frontmatter over defaults', () => {
    const policy = parseUpdatePolicy('---\nmin_score: 20\n---\n');
    expect(policy.minScore).toBe(20);
    expect(policy.autonomy).toBe(DEFAULT_UPDATE_POLICY.autonomy);
    expect(policy.staleness).toEqual(DEFAULT_UPDATE_POLICY.staleness);
    expect(policy.source).toBe('file');
  });

  it('ignores unknown frontmatter keys', () => {
    const policy = parseUpdatePolicy('---\nfuture_option: yes\nmin_score: 15\n---\n');
    expect(policy.minScore).toBe(15);
  });

  it('throws a descriptive error for invalid values', () => {
    expect(() => parseUpdatePolicy('---\nautonomy: yolo\n---\n')).toThrow(
      /_config\/update\.md has invalid policy fields — autonomy/,
    );
    expect(() => parseUpdatePolicy('---\nmin_score: 99\n---\n')).toThrow(/min_score/);
  });

  describe('loadUpdatePolicy', () => {
    it('returns defaults when the file is absent', () => {
      const workspace = mkdtempSync(join(tmpdir(), 'grimoire-policy-'));
      try {
        expect(loadUpdatePolicy(workspace)).toEqual(DEFAULT_UPDATE_POLICY);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('reads _config/update.md when present', () => {
      const workspace = mkdtempSync(join(tmpdir(), 'grimoire-policy-'));
      try {
        mkdirSync(join(workspace, '_config'));
        writeFileSync(join(workspace, '_config', 'update.md'), '---\nmin_score: 22\n---\n');
        const policy = loadUpdatePolicy(workspace);
        expect(policy.minScore).toBe(22);
        expect(policy.source).toBe('file');
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  });
});

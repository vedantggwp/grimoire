import { describe, expect, it } from 'vitest';

import { buildConnectionCandidates } from '../lib/connections.js';
import type { ConnectionArticleInput } from '../lib/connections.js';

const NO_EDGES: readonly { source: string; target: string }[] = [];
const ONE_COMPONENT = [['a', 'b', 'c', 'd']];

function article(
  slug: string,
  tags: readonly string[],
  linksTo: readonly string[] = [],
  sources: readonly { url: string }[] = [],
): ConnectionArticleInput {
  return { slug, tags, linksTo, sources };
}

describe('connection candidates', () => {
  it('proposes unlinked pairs with two or more shared tags', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x', 'y']), article('b', ['x', 'y', 'z'])],
      NO_EDGES,
      [],
      [],
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      a: 'a',
      b: 'b',
      sharedTags: ['x', 'y'],
      sameComponent: false,
      score: 4,
    });
  });

  it('excludes pairs already linked by an edge in either direction', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x', 'y']), article('b', ['x', 'y'])],
      [{ source: 'b', target: 'a' }],
      [],
      [],
    );
    expect(candidates).toHaveLength(0);
  });

  it('excludes pairs linked via linksTo even when edges are missing', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x', 'y'], ['b']), article('b', ['x', 'y'])],
      NO_EDGES,
      [],
      [],
    );
    expect(candidates).toHaveLength(0);
  });

  it('one shared source qualifies a pair (normalized URLs)', () => {
    const candidates = buildConnectionCandidates(
      [
        article('a', ['x'], [], [{ url: 'https://www.example.com/shared/' }]),
        article('b', ['y'], [], [{ url: 'https://example.com/shared' }]),
      ],
      NO_EDGES,
      [],
      [],
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sharedSources).toEqual(['https://example.com/shared']);
    expect(candidates[0].score).toBe(3);
  });

  it('same component plus one shared tag qualifies', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x']), article('b', ['x'])],
      NO_EDGES,
      ONE_COMPONENT,
      [],
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sameComponent).toBe(true);
    expect(candidates[0].score).toBe(3);
  });

  it('one shared tag in different components does not qualify', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x']), article('b', ['x'])],
      NO_EDGES,
      [['a'], ['b']],
      [],
    );
    expect(candidates).toHaveLength(0);
  });

  it('respects exclusions regardless of pair order', () => {
    const candidates = buildConnectionCandidates(
      [article('a', ['x', 'y']), article('b', ['x', 'y'])],
      NO_EDGES,
      [],
      [{ a: 'a', b: 'b' }],
    );
    expect(candidates).toHaveLength(0);
  });

  it('filters support pages', () => {
    const candidates = buildConnectionCandidates(
      [article('overview', ['x', 'y']), article('b', ['x', 'y'])],
      NO_EDGES,
      [],
      [],
    );
    expect(candidates).toHaveLength(0);
  });

  it('sorts by score descending with deterministic tiebreak and caps the list', () => {
    const articles = [
      article('a', ['x', 'y', 'z']),
      article('b', ['x', 'y', 'z']),
      article('c', ['x', 'y']),
      article('d', ['x', 'y']),
    ];
    const candidates = buildConnectionCandidates(articles, NO_EDGES, ONE_COMPONENT, [], 3);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({ a: 'a', b: 'b', score: 7 });
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[1].score);
    expect(candidates[1].score).toBeGreaterThanOrEqual(candidates[2].score);
  });
});

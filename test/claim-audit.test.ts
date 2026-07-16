import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  normalizeForMatch,
  extractClaims,
  classifyClaim,
  auditArticleClaims,
  buildClaimAuditReport,
  buildRawSourceTextIndex,
  type Claim,
  type EntailmentContext,
} from '../lib/claim-audit.js';

describe('normalizeForMatch', () => {
  it('unifies quotes, dashes, percent word, digit-group commas, whitespace, case', () => {
    expect(normalizeForMatch('“Hello”')).toBe('"hello"');
    expect(normalizeForMatch('26–54%')).toBe('26-54%');
    expect(normalizeForMatch('95 percent')).toBe('95 %');
    expect(normalizeForMatch('200,000 tokens')).toBe('200000 tokens');
    expect(normalizeForMatch('  A   B  ')).toBe('a b');
  });
});

describe('extractClaims', () => {
  it('extracts percentages and ranges', () => {
    const claims = extractClaims('It improved +10.6% on agents and 26–54% on cost.');
    const stats = claims.filter(c => c.kind === 'statistic').map(c => c.text);
    expect(stats).toContain('+10.6%');
    expect(stats).toContain('26–54%');
  });

  it('extracts multi-word quoted spans, not single-word scare quotes', () => {
    const claims = extractClaims(
      'The paper calls it "an efficient and robust context pruner" but the term "pruner" is loose.',
    );
    const quotes = claims.filter(c => c.kind === 'quote').map(c => c.text);
    expect(quotes).toContain('an efficient and robust context pruner');
    expect(quotes).not.toContain('pruner');
  });

  it('ignores numbers in code, wikilinks, link URLs, and headings', () => {
    const body = [
      '## 95% coverage', // heading
      'See [[strategies/foo-42]] and [the docs](https://x.com/page-88).',
      'Run `curl -s 99%` locally.',
      '```',
      'value = 77%',
      '```',
      'Only this real 46% figure counts.',
    ].join('\n');
    const stats = extractClaims(body).filter(c => c.kind === 'statistic').map(c => c.text);
    expect(stats).toEqual(['46%']);
  });

  it('deduplicates a figure repeated in prose and a results list', () => {
    const body = 'Cuts tokens by 46%.\n\n## Results\n\n- A 46% reduction was observed.';
    const stats = extractClaims(body).filter(c => c.kind === 'statistic');
    expect(stats).toHaveLength(1);
  });
});

describe('classifyClaim', () => {
  const stat = (text: string): Claim => ({ kind: 'statistic', text, context: '' });
  const quote = (text: string): Claim => ({ kind: 'quote', text, context: '' });
  const ctx = (over: Partial<EntailmentContext> = {}): EntailmentContext => ({
    anyHaystack: '',
    hasFullCapture: false,
    hasAnyCapture: true,
    siblingStatHit: false,
    ...over,
  });

  it('supports a statistic present in any capture', () => {
    const hay = normalizeForMatch('reduces peak token usage by 26-54% while improving success');
    expect(classifyClaim(stat('26–54%'), ctx({ anyHaystack: hay }))).toBe('supported');
  });

  it('returns unverifiable when the article has no captures at all', () => {
    expect(classifyClaim(stat('95%'), ctx({ hasAnyCapture: false }))).toBe('unverifiable');
  });

  it('flags an absent statistic as REVIEW when a sibling statistic is archived (the ACON 95% case)', () => {
    // The abstract archives 26-54% and 46% (siblingStatHit) but never 95%.
    const hay = normalizeForMatch(
      'reduces peak token usage by 26-54%, up to 46% improvement, distilled into smaller models',
    );
    expect(classifyClaim(stat('95%+'), ctx({ anyHaystack: hay, siblingStatHit: true }))).toBe('review');
  });

  it('treats an absent statistic as unverifiable when NO sibling is archived (trimmed excerpt)', () => {
    // lost-in-the-middle: the excerpt archives none of the paper's figures.
    const excerpt = normalizeForMatch('a short excerpt with no numbers in it');
    expect(classifyClaim(stat('56.1%'), ctx({ anyHaystack: excerpt, siblingStatHit: false }))).toBe(
      'unverifiable',
    );
  });

  it('flags a statistic absent from a FULL-fidelity capture as unsupported (decisive)', () => {
    const full = normalizeForMatch('the complete page text mentioning 46% but nothing else');
    expect(classifyClaim(stat('95%'), ctx({ anyHaystack: full, hasFullCapture: true }))).toBe(
      'unsupported',
    );
  });

  it('flags a quote absent from a full-fidelity capture as unsupported', () => {
    const full = normalizeForMatch('the real archived sentence about memory');
    expect(classifyClaim(quote('a fabricated sentence'), ctx({ anyHaystack: full, hasFullCapture: true }))).toBe(
      'unsupported',
    );
  });

  it('treats a quote missing from an excerpt-only capture as unverifiable, not a defect', () => {
    const excerpt = normalizeForMatch('short archived excerpt');
    expect(
      classifyClaim(quote('a sentence trimmed out of the excerpt'), ctx({ anyHaystack: excerpt })),
    ).toBe('unverifiable');
  });

  it('supports a quote present in an excerpt capture', () => {
    const excerpt = normalizeForMatch('the LeadResearcher begins by thinking through the approach');
    expect(
      classifyClaim(quote('the LeadResearcher begins by thinking through the approach'), ctx({ anyHaystack: excerpt })),
    ).toBe('supported');
  });
});

describe('buildClaimAuditReport', () => {
  it('aggregates verdicts and separates unsupported (decisive) from review (spot-check)', () => {
    const report = buildClaimAuditReport([
      {
        slug: 'a',
        claims: [
          { kind: 'statistic', text: '26–54%', context: 'x', verdict: 'supported' },
          { kind: 'statistic', text: '95%+', context: 'y', verdict: 'review' },
        ],
      },
      {
        slug: 'b',
        claims: [{ kind: 'quote', text: 'foo bar baz', context: 'z', verdict: 'unsupported' }],
      },
      {
        slug: 'c',
        claims: [{ kind: 'quote', text: 'nope nope nope', context: 'w', verdict: 'unverifiable' }],
      },
    ]);
    expect(report.summary).toEqual({
      articlesAudited: 3,
      claimsChecked: 4,
      supported: 1,
      unsupported: 1,
      review: 1,
      unverifiable: 1,
      articlesFlagged: 2,
    });
    expect(report.unsupported).toHaveLength(1);
    expect(report.unsupported[0]).toMatchObject({ slug: 'b', kind: 'quote' });
    expect(report.review).toHaveLength(1);
    expect(report.review[0]).toMatchObject({ slug: 'a', text: '95%+' });
  });
});

// End-to-end: reproduce the ACON regression against a real raw capture on disk.
describe('auditArticleClaims + buildRawSourceTextIndex (ACON regression)', () => {
  let workspace: string;

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'grimoire-claim-'));
    mkdirSync(join(workspace, 'raw', 'strategies'), { recursive: true });
    writeFileSync(
      join(workspace, 'raw', 'strategies', 'acon.md'),
      [
        '---',
        'source_url: "https://arxiv.org/abs/2510.00615"',
        'fidelity: extract',
        '---',
        '',
        '## Abstract (verbatim)',
        '',
        'ACON reduces peak token usage by 26-54% while improving task success,',
        'achieving up to 46% performance improvement. To minimize overhead, we',
        'distill the optimized compressor into smaller models.',
        '',
      ].join('\n'),
    );
  });

  afterAll(() => rmSync(workspace, { recursive: true, force: true }));

  it('supports the archived figures and flags the fabricated one for review', () => {
    const index = buildRawSourceTextIndex(workspace);
    const audit = auditArticleClaims(
      {
        slug: 'context-compression-optimization',
        body: [
          '- **26–54%** reduction in peak token usage across three benchmarks.',
          '- Up to **46%** performance improvement for smaller models.',
          "- Distilled compressors retain **95%+** of the teacher's performance.",
        ].join('\n'),
        sources: [{ url: 'https://arxiv.org/abs/2510.00615' }],
      },
      index,
    );

    const byText = Object.fromEntries(audit.claims.map(c => [c.text.replace(/\*/g, ''), c.verdict]));
    expect(byText['26–54%']).toBe('supported');
    expect(byText['46%']).toBe('supported');
    // Extract-fidelity capture, but its numeric region is archived (siblings
    // hit) → the fabricated figure is suspicious, surfaced for human review.
    expect(byText['95%+']).toBe('review');
  });

  it('does NOT flag genuine figures trimmed out of an excerpt with no sibling hits', () => {
    // A paper capture trimmed to prose only — none of its numbers archived.
    mkdirSync(join(workspace, 'raw', 'failure-modes'), { recursive: true });
    writeFileSync(
      join(workspace, 'raw', 'failure-modes', 'litm.md'),
      [
        '---',
        'source_url: "https://arxiv.org/html/2307.03172v1"',
        'fidelity: extract',
        '---',
        '',
        '> Excerpt. Models struggle to use information in the middle of long contexts.',
        '',
      ].join('\n'),
    );
    const index = buildRawSourceTextIndex(workspace);
    const audit = auditArticleClaims(
      {
        slug: 'lost-in-the-middle',
        body: 'Accuracy fell to 56.1% and 52.9% at the midpoint.',
        sources: [{ url: 'https://arxiv.org/html/2307.03172v1' }],
      },
      index,
    );
    for (const claim of audit.claims) {
      expect(claim.verdict).toBe('unverifiable');
    }
  });

  it('classifies a percentage as unverifiable when the cited source has no capture', () => {
    const index = buildRawSourceTextIndex(workspace);
    const audit = auditArticleClaims(
      {
        slug: 'orphan',
        body: 'An unbacked 73% claim.',
        sources: [{ url: 'https://example.com/no-capture' }],
      },
      index,
    );
    expect(audit.claims[0].verdict).toBe('unverifiable');
  });
});

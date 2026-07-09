# MCP Retrieval Ranking Report

Date: 2026-07-10

## Scope

Launch gate 2 from `SPEC.md`: make naive `grimoire_query` / `grimoire_search` retrieval match the T3 hand-routed path for the `agent-sdk-claude` wiki.

Evidence read first:

- `/Users/ved/Developer/grimoire/.growth/truth/T3-brains.md`
- `/Users/ved/Developer/grimoire/.growth/truth/workspaces/t3-brains/brain.mjs`
- `/Users/ved/Developer/grimoire/.growth/truth/workspaces/t3-brains/questions-and-key.md`

Eval command:

```bash
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json
```

## Before

Baseline was run against the checked-in `dist/serve.js` before changing `lib/serve.ts`:

```bash
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json --no-fail
```

| Metric | Result |
|---|---:|
| Covered/partial top-1 | 4/8 |
| Covered/partial top-3 | 6/8 |
| Absent no-hit | 0/2 |
| All questions top-1-or-abstain | 4/10 |
| All questions top-3-or-abstain | 6/10 |
| Gate | FAIL |

Baseline misses:

- Q2 ranked `runtime-and-subprocess-architecture` before `hosting-and-deployment-patterns`.
- Q3 had `file-checkpointing` only at top-3.
- Q4 missed `permissions-and-approval-control` from top-3.
- Q6 had `production-security-and-sandboxing` only at top-3.
- Q8 and Q10 returned false-positive article hits despite absent coverage.

## After

Post-fix was run after `npm run build` rebuilt `dist/serve.js`:

| Metric | Result |
|---|---:|
| Covered/partial top-1 | 8/8 |
| Covered/partial top-3 | 8/8 |
| Absent no-hit | 2/2 |
| All questions top-1-or-abstain | 10/10 |
| All questions top-3-or-abstain | 10/10 |
| Gate | PASS |

Post-fix returned slugs:

| ID | Expected | Returned top-3 |
|---|---|---|
| Q1 | `authentication-and-providers` | `authentication-and-providers`, `tool-search`, `permissions-and-approval-control` |
| Q2 | `hosting-and-deployment-patterns` | `hosting-and-deployment-patterns`, `migration-from-claude-code-sdk`, `production-security-and-sandboxing` |
| Q3 | `file-checkpointing` | `file-checkpointing`, `python-and-typescript-apis`, `migration-from-claude-code-sdk` |
| Q4 | `permissions-and-approval-control` | `permissions-and-approval-control`, `hooks`, `sessions-continue-resume-fork` |
| Q5 | `sessions-continue-resume-fork` | `sessions-continue-resume-fork`, `runtime-and-subprocess-architecture`, `hosting-and-deployment-patterns` |
| Q6 | `production-security-and-sandboxing` | `production-security-and-sandboxing`, `permissions-and-approval-control`, `hooks` |
| Q7 | `migration-from-claude-code-sdk` | `migration-from-claude-code-sdk`, `what-is-the-agent-sdk`, `file-checkpointing` |
| Q8 | absent | no hit |
| Q9 | `skills-and-plugins` | `skills-and-plugins`, `what-is-the-agent-sdk`, `migration-from-claude-code-sdk` |
| Q10 | absent | no hit |

## Implementation Notes

- Added `scripts/retrieval-eval.mjs` using the T3 stdio JSON-RPC transport pattern.
- Added `test/fixtures/retrieval-questions.agent-sdk.json` from the frozen T3 instrument.
- Replaced candidate-only reranking with deterministic per-article scoring in `lib/serve.ts`.
- Ranking now uses salient-term extraction, code-token preservation, title/summary/tag/heading/body field weights, phrase and proximity bonuses, weak FlexSearch bonus, deterministic tie-breaks, and no-confidence gates for missing code tokens and absent accepted-values facts.
- `grimoire_query` and `grimoire_search` use the same ranking core.
- `grimoire_query` keeps the existing envelope and adds best-matching section headings per hit.

## Verification

```bash
npm test
npm run build
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json
```

Results:

- `npm test`: 20 files passed, 351 tests passed.
- `npm run build`: rebuilt `dist/compile.js`, `dist/present.js`, and `dist/serve.js`.
- Retrieval eval: PASS.

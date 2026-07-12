# Retrieval Integrity Report

Generated: 2026-07-12

## Scope

Fixed the three ADV-1/ADV-4/ADV-5 retrieval integrity issues from `SPEC.md`:

- Removed `scoreAnswerPatternBonuses` and its rank/evidence contribution.
- Reordered salient-term tokenization so compound code tokens win before bare identifiers.
- Replaced unconditional small-corpus robust-z abstention with absolute evidence gating below 8 articles.

No topic-specific ranking constants remain in `lib/serve.ts`.

## Small-Corpus Regression

Added synthetic 1-, 2-, 3-, and 5-article fixtures under `test/fixtures/small-wikis/`.

Focused verification:

```text
npm test -- test/serve.test.ts
Test Files  1 passed (1)
Tests       65 passed (65)
```

Covered query: `aurora cache invalidation` returns `aurora-cache` at every size.
Absent query: `quantum ledger settlement` abstains at every size.

## Final Verification

```text
npm test
Test Files  24 passed (24)
Tests       381 passed (381)

npm run build
dist/serve.js    946.4 KB
```

## Eval Baselines

Workspace:

```text
/Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude
```

Contaminated baseline used original `HEAD:dist/serve.js`.
Fixed baseline used rebuilt `dist/serve.js` from this worktree.

| Set | SPEC bar | Contaminated baseline | Fixed baseline | Delta |
| --- | --- | --- | --- | --- |
| Tuned covered/partial top-1 | >= 7/8 | 8/8 | 8/8 | 0 |
| Tuned absent no-hit | 2/2 | 2/2 | 2/2 | 0 |
| Heldout covered top-1 | >= 8/10 | 9/10 | 9/10 | 0 |
| Heldout absent no-hit | 2/2 | 2/2 | 2/2 | 0 |
| Absent3 no-hit | >= 5/6 | 5/6 | 5/6 | 0 |

The fixed run passes every SPEC bar. The generic eval script still prints `Gate: FAIL` for absent3 because its built-in gate requires 6/6 absent no-hit, while `SPEC.md` sets the acceptance bar at 5/6.

## Fixed Eval Details

Tuned (`test/fixtures/retrieval-questions.agent-sdk.json`):

- Covered/partial top-1: 8/8
- Covered/partial top-3: 8/8
- Absent no-hit: 2/2
- Gate: PASS

Heldout (`test/fixtures/retrieval-questions.heldout.json`):

- Covered top-1: 9/10
- Covered top-3: 10/10
- Absent no-hit: 2/2
- Miss: question 5 returns `runtime-and-subprocess-architecture` top-1 and expected `hosting-and-deployment-patterns` top-3.
- Gate: PASS

Absent3 (`test/fixtures/retrieval-questions.absent3.json`):

- Absent no-hit: 5/6
- False positive: A3-Q4 returns `migration-from-claude-code-sdk`, `custom-tools-in-process-mcp`, `external-mcp-integration`.
- SPEC bar: PASS
- Script gate: FAIL

## Commands Run

```text
npm test -- test/serve.test.ts
npm run build
GRIMOIRE_SERVE_JS=/tmp/grimoire-contaminated-Y2jlIH/dist/serve.js node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json --no-fail
GRIMOIRE_SERVE_JS=/tmp/grimoire-contaminated-Y2jlIH/dist/serve.js node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.heldout.json --no-fail
GRIMOIRE_SERVE_JS=/tmp/grimoire-contaminated-Y2jlIH/dist/serve.js node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.absent3.json --no-fail
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json --no-fail
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.heldout.json --no-fail
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.absent3.json --no-fail
npm test
npm run build
```

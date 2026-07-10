# Abstention Threshold Report

Date: 2026-07-10

## Scope

Fix `grimoire_query` / `grimoire_search` abstention for the `agent-sdk-claude`
wiki without tuning to individual absent questions.

Workspace:

```bash
/Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude
```

## Pre-registration

Before changing threshold code, I wrote the third absent set to:

```bash
test/fixtures/retrieval-questions.absent3.json
```

Pre-registration timestamp embedded in each item:

```text
2026-07-10T17:50:23Z
```

The six questions target adjacent but uncovered topics checked against the wiki
slugs: LangChain integration, LlamaIndex workflow memory, raw Messages API
tool-call JSON, Claude Desktop Projects, MCP Registry publishing, and Anthropic
fine-tuning.

I also restored the held-out fixture from commit `8c1f84e` because `SPEC.md`
references a held-out set but this worktree only had the tuned fixture present.
The historical path is:

```bash
test/fixtures/retrieval-questions.heldout.json
```

## Diagnosis

The previous no-hit decision mixed general score thresholds with narrow guards:

- hard reject when selected code-like terms had no exact corpus support
- hard reject for option-phrase questions
- hard reject for accepted-values phrasing
- fixed per-hit score and evidence floors

That passed the tuned absent questions but did not generalize: held-out absent
questions returned confident article hits, and the pre-registered absent3 set
only abstained on 2/6 before the threshold change.

## Implementation

The new no-hit decision scores every article, ranks as before, then accepts the
ranked list only when the top hit clears corpus-relative confidence gates:

- `robustScoreZ`: top score as a robust z-score against the corpus score
  distribution
- `corpusSupportRatio`: weighted salient-term mass that exists anywhere in the
  corpus
- `topSupportedCoverageRatio`: weighted supported salient-term mass carried by
  the top article

Code-like salient tokens can still use variants for ranking, but confidence
requires their exact normalized form to be present. This prevents arbitrary
code-ish gibberish from being validated by weak split-token matches.

All new threshold constants in `lib/serve.ts` have one-line statistical
justification comments.

## Results

Commands:

```bash
npm test
npm run build
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.agent-sdk.json --no-fail
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.heldout.json --no-fail
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.absent3.json --no-fail
```

Unit/build:

| Check | Result |
|---|---:|
| `npm test` | 23 files passed, 369 tests passed |
| `npm run build` | PASS |

Retrieval evals:

| Set | Covered top-1 | Covered top-3 | Absent no-hit | SPEC result |
|---|---:|---:|---:|---|
| Tuned | 8/8 | 8/8 | 2/2 | PASS |
| Held-out | 9/10 | 10/10 | 2/2 | PASS |
| Absent3 | n/a | n/a | 5/6 | PASS |

Notes:

- The tuned fixture has 8 scorable covered/partial questions plus 2 absent
  questions, so its covered count is reported as 8/8 by the eval script.
- The absent3 eval script prints `Gate: FAIL` because the script's generic gate
  requires every absent item to abstain. `SPEC.md` acceptance for the third set
  is `>=5/6`, and the result is exactly 5/6.

## Returned Slugs

Tuned:

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

Held-out:

| ID | Expected | Returned top-3 |
|---|---|---|
| 1 | `permissions-and-approval-control` | `permissions-and-approval-control`, `hooks`, `production-security-and-sandboxing` |
| 2 | `custom-tools-in-process-mcp` | `custom-tools-in-process-mcp`, `agent-loop-and-turns`, `hooks` |
| 3 | `file-checkpointing` | `file-checkpointing`, `permissions-and-approval-control`, `what-is-the-agent-sdk` |
| 4 | `external-mcp-integration` | `external-mcp-integration`, `custom-tools-in-process-mcp`, `tool-search` |
| 5 | `hosting-and-deployment-patterns` | `sessions-continue-resume-fork`, `runtime-and-subprocess-architecture`, `hosting-and-deployment-patterns` |
| 6 | `observability-opentelemetry` | `observability-opentelemetry`, `hooks`, `authentication-and-providers` |
| 7 | `migration-from-claude-code-sdk` | `migration-from-claude-code-sdk`, `what-is-the-agent-sdk`, `runtime-and-subprocess-architecture` |
| 8 | `sessions-continue-resume-fork` | `sessions-continue-resume-fork`, `runtime-and-subprocess-architecture`, `file-checkpointing` |
| 9 | `subagents` | `subagents`, `observability-opentelemetry`, `permissions-and-approval-control` |
| 10 | `tool-search` | `tool-search`, `external-mcp-integration`, `custom-tools-in-process-mcp` |
| 11 | absent | no hit |
| 12 | absent | no hit |

Absent3:

| ID | Result |
|---|---|
| A3-Q1 | no hit |
| A3-Q2 | no hit |
| A3-Q3 | no hit |
| A3-Q4 | returned `migration-from-claude-code-sdk`, `custom-tools-in-process-mcp`, `external-mcp-integration` |
| A3-Q5 | no hit |
| A3-Q6 | no hit |

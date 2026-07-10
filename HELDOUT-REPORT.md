# Held-out retrieval eval

Independent eval for issue #24. Questions were written from the 17 verbatim raw sources under:

`/Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude/raw/uncategorized/`

Wiki contents were not read; only wiki slugs were listed. Excluded files from `SPEC.md` were not opened or modified. Ranking code was not tuned.

## Commands

```sh
npm run build
node scripts/retrieval-eval.mjs /Users/ved/Developer/grimoire/.growth/truth/workspaces/agent-sdk-claude test/fixtures/retrieval-questions.heldout.json --no-fail
npm test
```

## Results

| Set | Present top-1 | Present top-3 | Absent abstain | All top-1-or-abstain | All top-3-or-abstain | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Tuned set from PR #21 | 10/10 | 10/10 | n/a | 10/10 | 10/10 | PASS |
| Held-out set | 9/10 | 10/10 | 0/2 | 9/12 | 10/12 | FAIL |

## Per-question output

| ID | Coverage | Top-1 | Top-3 | No-hit | Expected | Returned |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | present | yes | yes | - | `permissions-and-approval-control` | `permissions-and-approval-control`, `hooks`, `production-security-and-sandboxing` |
| 2 | present | yes | yes | - | `custom-tools-in-process-mcp` | `custom-tools-in-process-mcp`, `agent-loop-and-turns`, `hooks` |
| 3 | present | yes | yes | - | `file-checkpointing` | `file-checkpointing`, `permissions-and-approval-control`, `what-is-the-agent-sdk` |
| 4 | present | yes | yes | - | `external-mcp-integration` | `external-mcp-integration`, `custom-tools-in-process-mcp`, `tool-search` |
| 5 | present | - | yes | - | `hosting-and-deployment-patterns` | `sessions-continue-resume-fork`, `runtime-and-subprocess-architecture`, `hosting-and-deployment-patterns` |
| 6 | present | yes | yes | - | `observability-opentelemetry` | `observability-opentelemetry`, `hooks`, `authentication-and-providers` |
| 7 | present | yes | yes | - | `migration-from-claude-code-sdk` | `migration-from-claude-code-sdk`, `what-is-the-agent-sdk`, `runtime-and-subprocess-architecture` |
| 8 | present | yes | yes | - | `sessions-continue-resume-fork` | `sessions-continue-resume-fork`, `runtime-and-subprocess-architecture`, `file-checkpointing` |
| 9 | present | yes | yes | - | `subagents` | `subagents`, `observability-opentelemetry`, `permissions-and-approval-control` |
| 10 | present | yes | yes | - | `tool-search` | `tool-search`, `external-mcp-integration`, `custom-tools-in-process-mcp` |
| 11 | absent | - | - | - | absent | `what-is-the-agent-sdk`, `migration-from-claude-code-sdk`, `runtime-and-subprocess-architecture` |
| 12 | absent | - | - | - | absent | `what-is-the-agent-sdk`, `custom-tools-in-process-mcp`, `hosting-and-deployment-patterns` |

## Finding

The independent set does not reproduce the tuned set's 10/10 gate. Retrieval is strong for covered topics at top-3, but the current behavior does not abstain on absent topics: both absent questions returned wiki articles instead of no hit.

## Test status

`npm test` passed: 23 test files, 368 tests.

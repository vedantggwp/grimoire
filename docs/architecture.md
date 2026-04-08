# Architecture — ICM Foundation

Grimoire is built on the **Interpreted Context Methodology (ICM)** by Jake Van Clief. ICM replaces framework-level orchestration with filesystem structure. The folder hierarchy IS the agent architecture.

## Five-Layer Context Model

| Layer | File | Budget | Question |
|-------|------|--------|----------|
| **L0** | `CLAUDE.md` | ~800 tokens | "Where am I?" |
| **L1** | `CONTEXT.md` | ~300 tokens | "Where do I go?" |
| **L2** | `stages/NN-name/CONTEXT.md` | ~200-500 tokens | "What do I do?" |
| **L3** | `_config/`, `shared/`, `templates/` | Variable | "What rules apply?" |
| **L4** | `stages/NN-name/output/`, `raw/`, `wiki/` | Variable | "What am I working with?" |

**Critical distinction:** L3 material requires *internalization as constraints*. L4 material requires *processing as input for transformation*.

A complete pipeline stage delivers 2,000-8,000 tokens — well within optimal model performance. Monolithic approaches push 30,000-50,000 tokens, causing information loss.

## Five Stages

```
01-scout → 02-ingest → 03-compile → 04-present → 05-serve
   ↑            ↑           ↑            ↑           ↑
 human       human       automated     human      automated
checkpoint  checkpoint                checkpoint
```

| Stage | Job | Input | Output | Checkpoint? |
|-------|-----|-------|--------|-------------|
| **01-scout** | Research + score sources | Topic + scope | Prioritized URL list | Yes |
| **02-ingest** | Fetch, preserve raw, compile articles | Approved URLs | `raw/` + `wiki/` | Yes |
| **03-compile** | Cross-refs, backlinks, overview, gaps | Wiki articles | Updated wiki graph | No |
| **04-present** | Generate study frontend | Wiki + design.md | HTML/CSS/JS | Yes |
| **05-serve** | MCP server + local dev | Wiki structure | Running server | No |

## Stage Contracts

Every stage CONTEXT.md follows the ICM contract format:

```
## Inputs
| File | Layer | Relevant Sections | Why |

## Process
1. Step one
2. Step two
   → CHECKPOINT: human reviews X before continuing

## Outputs
| Artifact | Location | Format |

## Audit (creative stages only)
- [ ] Check 1
```

## Stage Handoffs

Output folders connect sequential stages. Stage 01's `output/` contains the curated URL list that Stage 02 reads. Humans can edit intermediate outputs; the next stage picks up whatever remains.

## Diagrams

- [system-overview.svg](architecture/system-overview.svg) — Full pipeline with checkpoints and data flow
- [context-layers.svg](architecture/context-layers.svg) — 5-layer model with token budgets

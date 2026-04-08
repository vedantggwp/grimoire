# 03-compile

Audit the wiki as a system, repair deterministic link issues, and surface the next knowledge gaps.

## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|
| `docs/architecture.md` | L3 | Stages, Handoffs | Stage contract format and pipeline position |
| `docs/frontend-modes.md` | L3 | Core Modes | Knowledge model the frontend expects |
| `CLAUDE.md` | L0 | Core Rules | Keep compile focused on deterministic system maintenance |
| `CONTEXT.md` | L1 | Stage Map, Decision Tree | Confirm this task belongs to compile |
| `wiki/**/*.md` | L4 | All articles and support pages | Full graph needed for cross-reference audit |
| `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | L4 | Navigation, synthesis, change history | Update shared understanding after the audit |

## Process
1. Read all wiki articles and support pages as one graph, not as isolated files.
2. Audit internal links, backlinks, article references, and index coverage across the full wiki.
3. Detect broken links, orphan pages, duplicate concepts, and obvious missing cross-references.
4. Auto-fix deterministic issues such as stale index entries, broken internal targets, and reciprocal backlinks when the intended target is unambiguous.
5. Report heuristic issues separately when judgment is required, including likely cross-links, weak article boundaries, or taxonomy ambiguity.
6. Update `wiki/overview.md` with the current understanding of the topic, open questions, and coverage gaps.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Repaired wiki graph | `wiki/**/*.md` | Markdown files with deterministic cross-reference fixes applied |
| Updated overview | `wiki/overview.md` | Current synthesis, open questions, and gap notes |
| Compile report | `stages/03-compile/output/compile-report.md` | Markdown audit of fixes made, heuristic issues, orphan pages, and coverage gaps |

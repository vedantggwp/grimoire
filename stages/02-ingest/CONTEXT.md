# 02-ingest

Preserve source material, confirm takeaways with a human, then compile or update wiki articles.

## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|
| `docs/architecture.md` | L3 | Stages, Handoffs | Stage contract format and pipeline position |
| `docs/scout-spec.md` | L3 | Emergent Taxonomy | Taxonomy rules (emergent vs. defined) |
| `CLAUDE.md` | L0 | Core Rules | Keep raw preservation and stage isolation intact |
| `CONTEXT.md` | L1 | Stage Map, Decision Tree | Confirm this task belongs to ingest |
| `stages/01-scout/output/approved-sources.md` or direct source payload | L4 | URLs, files, pasted text | Defines what to ingest in this run |
| `raw/` and `wiki/` | L4 | Existing sources, articles, index, overview, log | Prevent duplication and update the knowledge base in place |

## Process
1. Accept one source as a URL, local file, or pasted text and normalize it to a named ingest target.
2. Save the raw material first under `raw/<topic>/`, then read it in full before writing anything derived from it.
3. Surface 3-5 concrete takeaways, likely article updates, and placement notes.
4. Present those takeaways to the human reviewer.
   -> CHECKPOINT: human confirmation is required before writing or updating wiki articles.
5. Write or update wiki articles from the confirmed takeaways. If taxonomy exists, place articles accordingly; otherwise keep structure simple and note category candidates.
6. Update `wiki/index.md`, `wiki/overview.md`, and `wiki/log.md`, then run a backlink audit and fix deterministic backlink gaps caused by the ingest.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Raw source copy | `raw/<topic>/...` | Original text, file, or fetched page preserved verbatim |
| Updated article set | `wiki/**/*.md` | Markdown articles created or revised from confirmed takeaways |
| Wiki navigators | `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | Updated index, evolving synthesis, and chronological log |
| Ingest audit | `stages/02-ingest/output/ingest-report.md` | Markdown record of takeaways, article changes, and backlink audit results |

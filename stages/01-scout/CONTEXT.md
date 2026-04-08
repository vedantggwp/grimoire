# 01-scout

Research a topic, score candidate sources, and hand an approved source list to ingest.

## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|
| `SOUL.md` | L0 | 5, 9 | Canonical scout contract, scoring rules, and handoff model |
| `CLAUDE.md` | L0 | Core Rules | Keep stage isolation and editable outputs intact |
| `CONTEXT.md` | L1 | Stage Map, Decision Tree | Confirm this task belongs to scout |
| User brief / questionnaire | L4 | Topic, scope, exclusions, desired depth | Defines search angles and ranking priorities |
| `stages/01-scout/output/` | L4 | Prior reports if resuming | Preserve prior research and human edits |

## Process
1. Parse the topic, scope, exclusions, freshness needs, and source types to prioritize.
2. Run parallel searches across official docs, community guides, videos, social threads, GitHub, and research sources.
3. Deduplicate results and score every source 1-5 on Authority, Credibility, Uniqueness, Depth, Recency, and Engagement.
4. Rank sources into P0, P1, and P2 tiers; record rationale and list gaps that remain thin or uncovered.
5. Present the curated list to the human reviewer.
   -> CHECKPOINT: approval, rejection, or reprioritization is required before the output is final.
6. Freeze the approved list for Stage 02 handoff. Do not ingest or summarize source contents here.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Scout report | `stages/01-scout/output/scout-report.md` | Markdown report with P0/P1/P2 tables, scores, rationale, and gaps |
| Approved sources | `stages/01-scout/output/approved-sources.md` | Markdown URL list reflecting human decisions |
| Search notes | `stages/01-scout/output/search-notes.md` | Brief notes on dedupes, exclusions, and search angles |

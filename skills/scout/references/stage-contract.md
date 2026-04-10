# Scout Stage Contract

Research a topic, score candidate sources, and hand an approved source list to ingest.

## Inputs
| Source | Purpose |
|--------|---------|
| `SCHEMA.md` | Topic, scope, exclusions, audience |
| `scout-queue.md` (if exists) | Seed URLs from init |
| `scout-report.md` (if exists) | Prior report if resuming |
| `references/scout-spec.md` | Scout workflow and scoring rules |
| `references/confidence-scoring.md` | 6-signal scoring rubric |

## Process
1. Parse topic, scope, exclusions, freshness needs, and source types to prioritize.
2. Run parallel searches across official docs, community guides, videos, social threads, GitHub, and research sources.
3. Deduplicate results and score every source 1-5 on Authority, Credibility, Uniqueness, Depth, Recency, and Engagement.
4. Rank sources into P0, P1, and P2 tiers; record rationale and list gaps.
5. Present the curated list to the human reviewer.
   → CHECKPOINT: approval, rejection, or reprioritization required before output is final.
6. Freeze the approved list for ingest handoff.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Scout report | `scout-report.md` (workspace root) | P0/P1/P2 tables, scores, rationale, gaps |
| Approved sources | `approved-sources.md` (workspace root) | URL list with status field |
| Search notes | `scout-notes.md` (workspace root) | Dedupes, exclusions, search angles |

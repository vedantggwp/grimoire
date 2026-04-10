# Scout Specification

The scout is Grimoire's research engine. It finds, evaluates, and presents sources for human curation.

## How It Works

1. User provides topic + scope (from questionnaire or direct input)
2. Scout runs parallel web searches across:
   - Official documentation
   - Community tutorials and guides
   - Video resources
   - Social media threads (X/Twitter)
   - GitHub repositories
   - Academic/research sources
3. Each source scored on 6 confidence signals
4. Sources deduplicated and ranked
5. Scout presents results to human with scores and rationale
6. **CHECKPOINT:** human approves, rejects, or reprioritizes
7. Approved list becomes the ingest pipeline

## Confidence Scoring

See `shared/confidence-scoring.md` for the full rubric. Summary:

| Signal | Weight |
|--------|--------|
| Authority | High |
| Credibility | High |
| Uniqueness | High |
| Depth | Medium |
| Recency | Medium |
| Engagement | Medium |

Tiers: P0 (18-30), P1 (12-17), P2 (6-11).

## Scout Output Format

```markdown
# Scout Report: [Topic]
Date: YYYY-MM-DD
Sources found: N | After dedup: M

## P0 — Must Ingest
| # | URL | Title | Auth | Cred | Uniq | Depth | Rec | Eng | Score |

## P1 — Should Ingest
...

## P2 — Nice to Have
...

## Gaps Identified
- [Topics with thin coverage]
```

## Emergent Taxonomy

Categories are NOT predefined — they emerge from sources.

1. First 5-10 sources ingested into flat `wiki/` (no subdirectories)
2. After enough mass, Grimoire proposes taxonomy (5-8 categories)
3. Human approves, edits, or asks for a redo
4. Grimoire creates subdirectories and reorganizes
5. Subsequent ingests auto-categorize into established taxonomy

**Alternative:** user defines categories upfront via questionnaire (Q5).

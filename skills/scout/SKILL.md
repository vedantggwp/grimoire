---
name: scout
description: >-
  Use this skill when the user wants to research sources for a grimoire, find URLs
  on a topic, score source quality, curate a reading list, or says "grimoire scout",
  "find sources", "research this topic", or "/grimoire:scout". Evaluates sources using
  6-signal confidence scoring and produces a ranked, human-reviewable source list.
version: 0.1.0
---

# scout

Research a topic, discover sources, score them with 6-signal confidence scoring,
and produce a curated source list for human review.

## Prerequisites

- A grimoire workspace must exist (SCHEMA.md present in working directory or a user-specified path)
- Read SCHEMA.md to extract topic, scope (in/out), and audience before searching
- Check for `scout-queue.md` — seed URLs from init should be included in the candidate pool
- Check for a prior `scout-report.md` — if one exists, ask the user whether to resume or start fresh

## Step 1 — Locate the Grimoire

Find the grimoire workspace:

1. Look for `SCHEMA.md` in the current directory first
2. If not found, ask the user: "Where is your grimoire? (path to the directory containing SCHEMA.md)"
3. Parse SCHEMA.md for `topic`, `scope.in`, `scope.out`, and `audience`
4. If `scout-queue.md` exists, load all URLs with status `pending` — these are seeds from init
5. If `scout-report.md` already exists, show the existing report date and ask:
   - "A scout report already exists from {date}. Resume (add new angles), or start fresh?"

Do NOT proceed if SCHEMA.md is missing — scaffold the workspace first with init.

## Step 2 — Plan Search Angles

Derive 4-8 search angles from the topic and scope. Cover all six source categories:

- **Official documentation** — primary docs, specifications, reference manuals
- **Community tutorials and guides** — how-tos, walkthroughs, blog posts
- **Video resources** — conference talks, screencasts, courses
- **Social media threads** — X/Twitter discussions, Reddit threads, HN posts
- **GitHub repositories** — reference implementations, example projects, libraries
- **Academic and research sources** — papers, benchmarks, formal analyses

Map each angle to a concrete search query. Use `scope.out` to exclude irrelevant directions.

Use AskUserQuestion to show the planned angles before searching:

```
I'll search these angles for "{topic}":

1. Official docs — "{query}"
2. Community tutorials — "{query}"
3. GitHub repos — "{query}"
4. X/Twitter threads — "{query}"
5. Video talks — "{query}"
6. Academic sources — "{query}"

Add angles, remove any, or adjust queries before I search?
```

Incorporate user edits before proceeding.

## Step 3 — Execute Searches

Run WebSearch for each approved angle. For each result, collect:

- URL
- Title
- Snippet or description
- Inferred source type (docs, tutorial, video, social, repo, research)

Also add any seed URLs from `scout-queue.md` to the candidate pool.

Deduplicate by URL before scoring:
- Normalize trailing slashes (treat `example.com/page` and `example.com/page/` as identical)
- Normalize `www` prefix (treat `www.example.com` and `example.com` as identical)
- Keep the canonical form; note duplicates removed in scout-notes.md

## Step 4 — Score Every Source

Load the full rubric from:
`${CLAUDE_PLUGIN_ROOT}/skills/scout/references/confidence-scoring.md`

Score each source on all 6 signals (1-5 each):

| Signal | Weight |
|--------|--------|
| Authority | High |
| Credibility | High |
| Uniqueness | High |
| Depth | Medium |
| Recency | Medium |
| Engagement | Medium |

Sum the 6 scores for a composite (range: 6-30). Assign a priority tier:

| Tier | Score | Action |
|------|-------|--------|
| P0 | 18-30 | Must ingest — defines the knowledge base |
| P1 | 12-17 | Should ingest — adds perspective or depth |
| P2 | 6-11 | Nice to have — supplementary or redundant |

Write one-line rationale for every source explaining the tier assignment.

Tie-breaking when composite scores are equal: Uniqueness > Authority > Depth > Recency.

Do NOT fetch or read source content — scoring is based on metadata (URL, title, snippet,
source domain, publication date, observable engagement). Content reading is ingest's job.

## Step 5 — Present Scout Report (CHECKPOINT)

Display the full report organized by tier before writing any files:

```
Scout Report: {topic}
Sources found: {N} | After dedup: {M}

P0 — Must Ingest ({n} sources)
  1. {title} [{score}/30]
     {url}
     Auth:{a} Cred:{c} Uniq:{u} Depth:{d} Rec:{r} Eng:{e}
     {rationale}
  ...

P1 — Should Ingest ({n} sources)
  ...

P2 — Nice to Have ({n} sources)
  ...

Gaps Identified:
  - {topic area} — {what coverage is thin or missing}
```

Then use AskUserQuestion:

```
Ready to approve? Options:
  A) Approve all and write output files
  B) Approve with exclusions (tell me which to remove)
  C) Move sources between tiers
  D) Add known URLs I didn't find
  E) Search additional angles (I'll search and re-present)
  F) Reject and start over with new angles
```

**Hard checkpoint: do NOT write output files until the user selects A, B, C, or D and
confirms the final list.**

Handle each response before proceeding:
- B: remove excluded sources, re-present the updated full report, then ask again (A/B/C/D/E/F)
- C: move specified sources to new tiers, re-present the updated full report, then ask again
- D: score the added URLs, insert them into the correct tier, re-present the updated full report, then ask again
- E: run additional searches, merge new results, re-score, re-present the full updated report, then ask again
- F: return to Step 2

Only proceed to Step 6 when the user explicitly selects A, or selects B/C/D and then confirms the final list.

## Step 6 — Write Outputs

Write three files in the **grimoire workspace** (the directory containing SCHEMA.md).
Do NOT write inside the plugin directory.

### scout-report.md

```markdown
# Scout Report: {topic}
Date: {YYYY-MM-DD}
Sources found: {N} | After dedup: {M}

## P0 — Must Ingest

| # | URL | Title | Type | Auth | Cred | Uniq | Depth | Rec | Eng | Score | Rationale |
|---|-----|-------|------|------|------|------|-------|-----|-----|-------|-----------|
| 1 | {url} | {title} | {type} | {1-5} | {1-5} | {1-5} | {1-5} | {1-5} | {1-5} | {sum} | {one-line} |

## P1 — Should Ingest

(same table structure)

## P2 — Nice to Have

(same table structure)

## Gaps Identified

- {topic area} — {what's missing or thin}
```

### approved-sources.md

```markdown
# Approved Sources: {topic}
Approved: {YYYY-MM-DD}
Total: {N}

## Ingest Queue

| # | URL | Title | Type | Tier | Status |
|---|-----|-------|------|------|--------|
| 1 | {url} | {title} | {type} | P0 | pending |
```

Sources are listed P0 first, then P1, then P2. All start with status `pending` —
ingest updates these as it processes each source.

### scout-notes.md

```markdown
# Scout Notes: {topic}
Date: {YYYY-MM-DD}

## Search Angles
- {category}: {query used}

## Deduplication
- {N} duplicates removed: {list normalized URLs}

## Exclusions
- {url} — {reason given by user}

## Resumption Notes
- (only if resuming a prior run) Prior report date: {date}, new sources added: {N}
```

If `scout-queue.md` exists in the workspace, update the status of all seed URLs that
were included in `approved-sources.md` from `pending` to `consumed`. If all entries
are consumed, note this in `scout-notes.md` under Resumption Notes.

Also append to `wiki/log.md` in the grimoire workspace (create the file if it does not exist):

```markdown
## {YYYY-MM-DD} — Scout complete
- {N} sources found, {M} approved ({p0} P0, {p1} P1, {p2} P2)
- Gaps: {comma-separated gap topics}
```

After writing, print a summary:

```
Scout complete for "{topic}"

  Sources approved: {N} ({p0} P0 / {p1} P1 / {p2} P2)
  Gaps identified:  {N}
  Output written to: {workspace-path}/

Next step:
  Run ingest to fetch and compile wiki articles
```

## Validation Rules

- Every source must be scored on all 6 signals with a written rationale — no partial scores
- No duplicate URLs may appear in the final report (dedup before presenting)
- The Gaps section must identify at least one area with thin or missing coverage
- The human checkpoint (Step 5) MUST be reached and confirmed before any output files are written
- All dates use ISO 8601 format: YYYY-MM-DD
- All filenames are slugified: lowercase, hyphens only, no spaces
- Do NOT fetch or read source content — that is ingest's job
- Use `${CLAUDE_PLUGIN_ROOT}` for all internal path references (rubric, templates)
- Output files go in the grimoire workspace alongside SCHEMA.md, NOT inside the plugin directory
- Respect `scope.out` from SCHEMA.md — do not surface sources that fall outside declared scope

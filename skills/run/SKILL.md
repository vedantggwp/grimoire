---
name: run
description: >-
  Use this skill when the user wants to create a grimoire in one command, says
  "grimoire about X", "build a knowledge base about X", or provides a quoted topic
  like '/grimoire "reinforcement learning"'. Chains init → scout → ingest → compile
  → present into a single flow with exactly two taste checkpoints: source curation
  and final review. Use /grimoire:init, /grimoire:scout, etc. for individual stages.
version: 0.1.0
---

# run

Build a complete grimoire from a single sentence. One command, two taste
checkpoints, smart defaults for everything else.

## When to use this skill vs. individual skills

- **This skill (`/grimoire "topic"`)** — first-time users, repeat users who want speed,
  anyone who says "build a knowledge base about X" without specifying a stage.
- **Individual skills** (`/grimoire:init`, `/grimoire:scout`, etc.) — power users who
  want granular control, users who explicitly name a stage, incremental operations
  on an existing grimoire.

## Flags (parsed from natural language, not CLI args)

| Flag | What it does | Default |
|------|-------------|---------|
| `--guided` | Run the full 7-question init questionnaire (Step 1 becomes interactive) | off |
| `--review-angles` | Add scout angle approval checkpoint before searching | off |
| `--sequential` | Process sources one-at-a-time with per-source takeaway approval | off |
| `--from <path>` | Inherit palette, typography, audience, and taxonomy style from an existing grimoire | none |
| `--no-present` | Skip the present step (useful for MCP-only grimoires) | off |
| `--palette <name>` | Override default palette (midnight-teal, noir-cinematic, cold-steel, warm-concrete, electric-dusk, smoke-light, obsidian-chalk, linear-editorial) | linear-editorial |

Detect these from the user's input. Examples:
- "Build a grimoire about CRDTs, guided" → `--guided`
- "Grimoire about WebGPU using the same style as my RLHF grimoire at ../rlhf-wiki" → `--from ../rlhf-wiki`
- "Grimoire about Rust, midnight-teal palette" → `--palette midnight-teal`
- "Grimoire about ML, I want to review each source individually" → `--sequential`

## Step 1 — Init (automatic)

Extract the topic from the user's input. The quoted or natural-language topic IS
the topic — do not ask a questionnaire unless `--guided` is set.

### Default flow (no `--guided`)

Infer all SCHEMA.md fields from the topic:

| Field | How to derive |
|-------|--------------|
| Topic | The user's input, cleaned (trimmed, surrounding quotes stripped) |
| Scope IN | "All aspects of {topic}" |
| Scope OUT | "Topics unrelated to {topic}" |
| Audience | Infer from keywords: "engineer"/"developer"/"architect"/"senior"/"advanced" → engineers/developers (advanced); "beginner"/"intro"/"101"/"getting started" → learners (beginner); default → practitioners (intermediate) |
| Taxonomy | Always "emergent" |
| Palette | `linear-editorial` unless `--palette` specified |
| CLAUDE.md | Detect if one exists in cwd; integrate at the end if so |

If `--from <path>` is set, load the existing grimoire's `_config/design.md` and
`SCHEMA.md` to inherit palette, typography, density, motion, audience, and
taxonomy style. The topic and scope still come from the user's input.

**Workspace location:** Default to `./{topic-slug}/` in the current directory.
Do not ask — scaffold silently. If the directory already exists and contains
`SCHEMA.md`, warn and ask to confirm overwrite.

Scaffold the workspace using the same templates as `/grimoire:init`:
- `SCHEMA.md` from `${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/schema-template.md`
- `_config/design.md` from `${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/design-config.md`
- `wiki/index.md` from `${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/index-template.md`
- `wiki/overview.md` — stub
- `wiki/log.md` — empty changelog
- `raw/` — empty directory

Print a one-line confirmation:

```
Workspace scaffolded at {path} for "{topic}" (audience: {audience}, palette: {palette})
```

### Guided flow (`--guided`)

Delegate to `/grimoire:init` — run the full 7-question questionnaire. After init
completes, continue to Step 2 with the scaffolded workspace.

## Step 2 — Scout (automatic)

Read `SCHEMA.md` from the workspace. Derive 4-8 search angles from the topic and
scope, covering the 6 source categories (official docs, community tutorials, video,
social media, GitHub repos, academic/research).

### Default flow (no `--review-angles`)

Execute searches immediately without presenting angles for approval. Run WebSearch
for each angle. Collect, deduplicate (normalize trailing slashes, www prefix), and
score every source using the 6-signal confidence rubric at
`${CLAUDE_PLUGIN_ROOT}/skills/scout/references/confidence-scoring.md`.

Score all sources, assign P0/P1/P2 tiers, identify coverage gaps.

Print a progress line:

```
Scouted {N} sources across {M} search angles. Scoring...
```

### Review-angles flow (`--review-angles`)

Present the planned angles before searching, as described in
`skills/scout/SKILL.md` Step 2. Wait for approval before executing searches.

## Step 3 — CHECKPOINT 1: Source Curation

**This is a taste checkpoint. Always pause here.**

Present the scout report organized by tier:

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

Use AskUserQuestion:

```
Ready to approve? Options:
  A) Approve all and proceed to ingest
  B) Approve with exclusions (tell me which to remove)
  C) Move sources between tiers
  D) Add known URLs I didn't find
  E) Search additional angles (I'll search and re-present)
  F) Reject and start over with new angles
```

Handle each response as described in `skills/scout/SKILL.md` Step 5.
Only proceed when the user explicitly approves the final source list.

Write the three scout output files (`scout-report.md`, `approved-sources.md`,
`scout-notes.md`) and update `wiki/log.md`.

## Step 4 — Ingest (batch, automatic)

Process ALL approved sources at once. This is the key difference from
`/grimoire:ingest`: no per-source "Process next?" prompts, no per-source
takeaway approval.

### Default flow (no `--sequential`)

For each approved source in priority order (P0 first):

1. Fetch and preserve raw text (same as ingest Step 2)
2. Extract 3-5 takeaways (same as ingest Step 3)
3. Write or update wiki articles using best judgment (same as ingest Step 5)
4. Add cross-references and backlinks (same as ingest Step 5)
5. Update source status in `approved-sources.md` to `ingested`

After ALL sources are processed, print a single summary:

```
Ingested {N} sources in batch.

  Created: {slug1}, {slug2}, {slug3}
  Updated: {slug4}
  Backlinks added: {N}
  Failed: {slug5} (reason)

  Raw files: raw/{topic-slug}/
```

Update `wiki/index.md`, `wiki/overview.md`, and `wiki/log.md` once at the end
(not per-source).

If a source fails to fetch, mark it as `failed` in `approved-sources.md`, note
the failure, and continue with the remaining sources. Do not stop the pipeline.

### Sequential flow (`--sequential`)

Delegate to `/grimoire:ingest` behavior — process one source at a time with
per-source takeaway approval. Ask "Process the next source?" between each.

## Step 5 — Compile (automatic)

Run the compile script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace-path}
```

Read the audit results. Apply deterministic fixes (broken links, backlinks,
stale index entries, orphan articles) as described in `skills/compile/SKILL.md`
Steps 3-4.

Update `wiki/overview.md` (Step 5 of compile).

**Skip the taxonomy proposal** (compile Step 5.5) — in the orchestrated flow,
emergent taxonomy is always used and taxonomy proposals are deferred to a
later `/grimoire:compile` run when the user is ready for that decision.

Print a progress line:

```
Compiled. {N} fixes applied, {M} coverage gaps identified.
```

## Step 6 — Present (automatic)

Skip this step entirely if `--no-present` is set.

Run the present script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace-path}
```

Print:

```
Site generated at {workspace}/site/
```

## Step 7 — CHECKPOINT 2: Final Review

**This is a taste checkpoint. Always pause here.**

Tell the user how to preview the site:

```
Your grimoire is ready for review.

  open {workspace}/site/index.html

  Modes: read | graph | search | feed | gaps | quiz
  Design: {palette} palette, {typography} typography

Approve, or tell me what to change.
```

Wait for user response. Handle feedback:

### If approved

Print completion summary and suggest next steps:

```
Grimoire complete: "{topic}"

  Workspace:  {path}
  Articles:   {N}
  Sources:    {N} ingested
  Palette:    {palette}

Next steps:
  - Run /grimoire:serve to expose via MCP server
  - Add more sources later: /grimoire "add sources about {subtopic}"
  - Iterate: /grimoire:scout, /grimoire:ingest, /grimoire:compile
```

If a CLAUDE.md was detected in cwd during Step 1, ask: "Add a grimoire reference
to your project's CLAUDE.md?" If yes, append the integration snippet as described
in `skills/init/SKILL.md` Step 6.

### If feedback given

Parse the feedback and act on it:

**Design changes** — "switch to midnight-teal", "use cold-steel palette",
"make it more spacious", "use technical typography", "darker":
1. Load `${CLAUDE_PLUGIN_ROOT}/skills/run/references/design-shortcuts.md` for phrase mapping
2. Edit `_config/design.md` with the mapped changes
3. Re-run `node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace-path}`
4. Return to this checkpoint — ask again

**Content changes** — "that article about X seems weak", "merge articles A and B",
"the overview doesn't mention Y":
1. Edit the wiki article(s) as requested
2. Re-run compile: `node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace-path}`
3. Apply any new deterministic fixes
4. Re-run present: `node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace-path}`
5. Return to this checkpoint — ask again

**Scope changes** — "actually the audience should be beginners",
"add X to the scope":
1. Edit `SCHEMA.md` with the change
2. If the change affects articles already written, update them
3. Re-run compile and present
4. Return to this checkpoint — ask again

## Incremental Mode

If the user runs `/grimoire "add sources about X"` or `/grimoire "expand coverage
of Y"` and a `SCHEMA.md` already exists in the working directory or a child
directory, treat this as an **incremental** run:

1. **Skip init** — the workspace already exists
2. **Targeted scout** — derive search angles from the new subtopic only, not the
   full original topic. Add new sources to the existing `approved-sources.md`
3. **Checkpoint 1** — present only the NEW sources for approval (show existing
   sources for context but don't re-approve them)
4. **Ingest only new sources** — skip sources already marked `ingested`
5. **Full compile** — the graph needs full rebuilding to incorporate new articles
6. **Full present** — regenerate the entire site
7. **Checkpoint 2** — final review as usual

Print an incremental mode indicator at the start:

```
Existing grimoire detected at {path}. Running in incremental mode for "{subtopic}".
```

## Validation Rules

- All rules from individual skills still apply (no mutation of raw files, mandatory
  summary fields, ISO 8601 dates, slugified filenames, etc.)
- Use `${CLAUDE_PLUGIN_ROOT}` for all internal paths
- Output files go in the grimoire workspace, not inside the plugin directory
- The two taste checkpoints (Step 3 and Step 7) are MANDATORY — never skip them
- If any stage fails, surface the error clearly and tell the user which stage
  failed and what intermediate files exist for inspection
- Flags are parsed from natural language, not CLI arguments — be generous in
  interpretation ("I want to review each source" = `--sequential`,
  "use the noir palette" = `--palette noir-cinematic`)

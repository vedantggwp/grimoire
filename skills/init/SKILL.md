---
name: init
description: >-
  Use this skill when the user wants to create a new Grimoire knowledge base,
  start a new wiki, initialize a grimoire, or says "grimoire init", "new grimoire",
  "create a knowledge base", "start a wiki", or "/grimoire:init". Detects existing
  projects, auto-discovers context from README/CLAUDE.md/package.json/docs, offers
  workspace placement options, and scaffolds a complete grimoire workspace.
version: 0.2.0
---

# init

Initialize a new Grimoire knowledge base. If run inside an existing project,
intelligently discover context and pre-fill the questionnaire. Otherwise, run
the full interactive flow.

## Step 1 — Detect the Current Context

Before asking anything, look at the current working directory to understand
what kind of environment Grimoire is being initialized in.

Check for project markers in the current directory:

| Marker | What it indicates |
|--------|-------------------|
| `.git/` | A git repository |
| `package.json` | Node.js project |
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python project |
| `Cargo.toml` | Rust project |
| `go.mod` | Go project |
| `Gemfile` | Ruby project |
| `pom.xml`, `build.gradle` | Java project |
| `README.md`, `README.rst` | Documented project |
| `CLAUDE.md` | Claude Code project with existing instructions |
| `docs/` directory | Existing documentation |

Determine the context:

- **Existing project** — at least one project marker found
- **Empty directory** — no markers, fresh start
- **Non-project directory** — has files but no obvious project markers (e.g., Documents/Notes)

## Step 2 — Offer the Onboarding Mode (CHECKPOINT)

Based on what was detected, present the user with a choice using AskUserQuestion.

### If an existing project was detected

```
I see this is a {language} project ({project-name}). How would you like to start?
```

Options (use AskUserQuestion with these 4 options):

1. **Auto-discover context** — "I'll read your README, CLAUDE.md, package.json, and docs/ to understand the project, then confirm each answer with you before scaffolding."
2. **Guided from scratch** — "You answer all 7 questions manually. I won't peek at your project files."
3. **Hybrid** — "I'll auto-discover, you review/edit each answer before I proceed."
4. **Tell me more first** — "Show me what Grimoire does before I decide."

If the user picks option 4, briefly explain Grimoire's pipeline (scout → ingest → compile → present → serve) and re-ask.

### If no project was detected

Skip auto-discovery. Ask the user directly:

```
What subject do you want to build a knowledge base about?
```

And proceed to Step 4 (Questionnaire) with all answers from scratch.

## Step 3 — Auto-Discover Project Context (conditional)

Only run this step if the user chose **Auto-discover** or **Hybrid** in Step 2.

Read these files in order (skip any that don't exist):

1. `README.md` / `README.rst` — project purpose, description, major features
2. `CLAUDE.md` — existing project instructions for Claude Code
3. `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` — name, description, dependencies, keywords
4. `docs/` directory listing — existing documentation structure
5. First-level directories in the project root — indicates architecture
6. `.gitignore` — hints at what's generated vs. committed

Extract these signals:

| Signal | From | Use for |
|--------|------|---------|
| Project name | package.json name, repo dir name | Default topic prefix |
| One-line description | package.json description, README first paragraph | Default topic phrasing |
| Tech stack | package.json deps, imports in src/ | Scope definition |
| Keywords/tags | package.json keywords, README headings | Taxonomy hints |
| Docs structure | docs/ subdirectories | Category suggestions |
| Audience hints | README sections like "For developers", "Getting started" | Audience level |

Then pre-fill the 7 questions:

- **Topic (Q1)** — `"Deep knowledge of {project-name}: {short description}"` or `"{primary-domain} patterns for {project-name}"`
- **Scope IN (Q2)** — Derived from dependencies + primary language + major subsystems
- **Scope OUT (Q2)** — "Unrelated tech, tangentially related libraries"
- **Audience (Q3)** — Default `advanced` for developer projects, `expert` if deeply technical
- **Sources (Q4)** — Any URLs found in README (documentation links, dependency docs)
- **Taxonomy (Q5)** — `emergent` by default, unless docs/ has obvious category subdirectories
- **Design (Q6)** — Default `midnight-teal` unless you can detect aesthetic signals (unlikely)
- **CLAUDE.md (Q7)** — Default `yes` if CLAUDE.md exists in the project

## Step 4 — Run the Questionnaire (CHECKPOINT)

This step behavior depends on the onboarding mode:

### Guided from scratch

Ask all 7 questions interactively using AskUserQuestion. Ask them ONE AT A TIME,
not all at once. Use the full question text from the reference file for context,
but keep the actual prompt conversational.

Load the full questionnaire from:
`${CLAUDE_PLUGIN_ROOT}/skills/init/references/questionnaire.md`

### Auto-discover

Present ALL 7 pre-filled answers at once in a single summary block. Ask:

```
Here's what I gathered from your project:

  Q1 Topic:     {pre-filled}
  Q2 Scope IN:  {pre-filled}
  Q2 Scope OUT: {pre-filled}
  Q3 Audience:  {pre-filled}
  Q4 Sources:   {pre-filled or "none"}
  Q5 Taxonomy:  {pre-filled}
  Q6 Palette:   {pre-filled}
  Q7 CLAUDE.md: {pre-filled}
  Workspace:    {suggested path}

Does this look right? (approve / edit / redo)
```

- **approve** → proceed to Step 5
- **edit** → ask which field(s) to change, update, re-display, ask again
- **redo** → switch to "Guided from scratch" flow

### Hybrid

Go through each pre-filled answer one at a time. For each:

```
Q{N}: {question}
Suggested: {pre-filled answer}
(press enter to accept, or type a new answer)
```

Let the user edit or accept each. Proceed to Step 5 when done.

### Question reference

**Q1: Topic** — Must be specific, not too broad. If vague, suggest narrowing.
**Q2: Scope** — Must have both IN and OUT. These define what gets researched and what doesn't.
**Q3: Audience** — Accept: beginner, intermediate, advanced, expert.
**Q4: Initial Sources** — URLs or file paths, optional.
**Q5: Taxonomy** — `emergent` (default) or `defined` with categories.
**Q6: Design** — Pick a palette: midnight-teal (default), noir-cinematic, cold-steel, warm-concrete, electric-dusk, smoke-light, obsidian-chalk.
**Q7: CLAUDE.md** — yes/no + target path if yes.

## Step 5 — Choose Workspace Location (CHECKPOINT)

Ask the user where the grimoire workspace should live using AskUserQuestion.

### If an existing project was detected

Offer these options (the defaults should be realistic paths based on the project):

1. **Inside project** — `./grimoire/` at the project root
   - Description: "Versioned alongside the project. Good if the knowledge base IS part of the project and should be shared with collaborators."
2. **Inside docs directory** — `./docs/grimoire/` (only if `./docs/` exists)
   - Description: "Nested under existing documentation. Good if you already have a docs/ structure."
3. **Sibling directory** — `../{project-name}-grimoire/`
   - Description: "Next to the project, not inside it. Keeps the project repo clean. Good if the grimoire is private or supplemental."
4. **Custom path** — user specifies
   - Description: "Tell me where."

### If no project detected

Default to `./grimoire-{topic-slug}/` but still offer the custom option.

If the chosen directory already exists and contains `SCHEMA.md`, warn and ask
to confirm overwrite.

## Step 6 — Scaffold the Workspace

After collecting all answers and the workspace path, create the structure:

```
{target}/
├── SCHEMA.md              # Populated from answers (Q1-Q5)
├── _config/
│   └── design.md          # Populated from Q6
├── wiki/
│   ├── index.md           # Empty index from template
│   ├── overview.md        # Stub overview
│   └── log.md             # Empty changelog
├── raw/                   # Empty, for ingested sources
├── scout-queue.md         # Only if Q4 provided seed URLs
└── (target project's CLAUDE.md updated)  # Only if Q7 = yes
```

### Populating SCHEMA.md

Use the schema template from:
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/schema-template.md`

Replace placeholders in the YAML domain block. Keep the nested `scope.in` /
`scope.out` structure — all downstream skills parse that exact shape:

- `"[YOUR TOPIC HERE]"` → Q1 answer, quoted string
- `"[WHAT IS IN SCOPE]"` → Q2 IN answer, quoted string
- `"[WHAT IS OUT OF SCOPE]"` → Q2 OUT answer, quoted string
- `"[WHO READS THIS AND AT WHAT LEVEL]"` → Q3 answer, quoted string

Set `taxonomy: "emergent"` (Q5 default) or `taxonomy: "defined"` if the user
specified categories.

If Q5 = defined, populate the taxonomy table with the user's categories.
If Q5 = emergent, leave the table empty with the explanatory note.

### Populating _config/design.md

Use the design config template from:
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/design-config.md`

Replace `palette: midnight-teal` with the user's Q6 choice.

### Populating wiki/index.md

Use the index template from:
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/index-template.md`

If Q5 = defined, create section headers for each category.

### Seed URLs → scout-queue.md

If Q4 provided URLs, create `scout-queue.md` in the target directory:

```markdown
# Scout Queue

Sources provided during init. Run scout to evaluate and ingest.

| URL | Status |
|-----|--------|
| {url} | pending |
```

### CLAUDE.md Integration (Q7)

If yes, append this snippet to the TARGET project's CLAUDE.md (not the grimoire's).
The target path was resolved in Step 2 (auto-discovered) or Step 4 (user-provided).

```markdown
## Grimoire Wiki — {topic}

This project has a curated knowledge base at `{relative-path-to-grimoire}/`.

Rules:
- Consult `{path}/wiki/index.md` before answering domain questions
- Prefer wiki articles over guessing
- If the wiki doesn't cover a topic, say so — don't fabricate
```

## Step 7 — Confirm and Report

After scaffolding, print a summary:

```
Grimoire created at {path}/

  Topic:     {topic}
  Scope:     {in_scope}
  Audience:  {audience}
  Taxonomy:  {emergent|defined with N categories}
  Palette:   {palette}
  Sources:   {N seed URLs | none}
  CLAUDE.md: {integrated at {path} | not integrated}

Next steps:
  1. Run /grimoire:scout to research and curate sources
  2. Review scout results and approve sources
  3. Run /grimoire:ingest to fetch and compile articles
  4. Run /grimoire:compile for graph audit and gap analysis
  5. Run /grimoire:present to generate the frontend
  6. Run /grimoire:serve to expose via MCP
```

## Validation Rules

- **Never create files outside the target directory** (except Q7 CLAUDE.md integration in the parent project)
- **Never modify the host project's code** — only CLAUDE.md is touched, and only with explicit consent (Q7)
- **Read-only on project files during auto-discovery** — never write to README, package.json, or any project file
- All file paths must use the target directory as root
- All dates in generated files use ISO 8601 (YYYY-MM-DD)
- All filenames are slugified (lowercase, hyphens, no spaces)
- If auto-discovery fails (file read errors, unclear signals), fall back gracefully to guided mode rather than scaffolding with bad defaults

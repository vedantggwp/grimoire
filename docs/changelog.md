# Changelog

## 2026-04-10 — Pre-Launch Hardening + Real-World Readiness

### Overview

Pre-launch hardening session to make the plugin publishable and verify it works under realistic conditions. Ran three parallel review agents (pipeline, code, goal alignment) and fixed every critical and high issue in-session. Ran a separate security + hygiene pre-publish scan across all tracked and untracked files. Enhanced `grimoire-init` to v0.2.0 with project auto-discovery so the plugin can onboard itself inside an existing project without a manual questionnaire. Performed a dry-run of the full compile → present → serve chain against a throwaway RLHF workspace, which surfaced three bugs that all 79 existing tests had missed. All three bugs were fixed and the full test suite still passes.

### Audit Findings + Fixes

Three parallel review agents were run against the full codebase:

1. **Pipeline audit** — verified skill handoffs and file contracts
2. **Code audit** — scanned `lib/compile.ts`, `lib/present/`, `lib/serve.ts` for bugs, security, and quality
3. **Goal alignment audit** — checked implementation against SOUL.md, `docs/decisions.md`, `docs/roadmap.md`

**Critical issues found and fixed:**
- **XSS in search mode** — `lib/present/modes/search.ts` was interpolating article title and excerpt into HTML without escaping. Added an `esc()` helper and wrapped all user-content interpolations.
- **Path traversal in serve** — `lib/serve.ts` `readArticle` concatenated the slug into a filesystem path with no validation. Added a slug regex check before any filesystem read.

**High issues found and fixed:**
- **Missing explicit zod dependency** — `package.json` relied on zod being transitively available via `@modelcontextprotocol/sdk`. Added zod as an explicit dependency.
- **Flat-dir scan missed taxonomy subdirectories** — `lib/present/data.ts` only read the top-level `wiki/` directory. Replaced with a recursive `collectMdFiles` walker so taxonomy subdirs are indexed.
- **Failed search index sentinel** — `lib/present/modes/search.ts` did not check for the error-flag sentinel before calling `importSearchIndex`. Added the check and a fallback path.
- **writeFile using string ops** — `lib/present/index.ts` was constructing directory paths with string manipulation. Replaced with `path.dirname()`.
- **Stale stage-contract files** — `skills/grimoire-{scout,ingest,compile}/references/stage-contract.md` were carried over from the pre-plugin ICM layout and referenced the old stage numbering. Rewritten to reflect current skill I/O.
- **No `npm install` prereq check** — `skills/grimoire-compile/SKILL.md`, `skills/grimoire-present/SKILL.md`, and `skills/grimoire-serve/SKILL.md` assumed `node_modules/` already existed. Added a `npm install` prerequisite check to all three.
- **Quiz templates rigid** — `lib/present/modes/quiz.ts` used a single generic question template regardless of heading content. Replaced with a heading-type-to-question mapping (Overview → "What is X?", Key Capabilities → "What can X do?", How It Works → "How does X work?", Limitations → "What are the limits of X?", etc.).
- **Scout-queue status never cleared** — `skills/grimoire-scout/SKILL.md` Step 6 now explicitly clears consumed entries in `scout-queue.md`.
- **MCP spec "watches for changes" claim** — both `docs/mcp-spec.md` and `skills/grimoire-serve/references/mcp-spec.md` claimed the server watched for wiki changes. The implementation reads once on startup. Corrected both copies to "Restart the server to pick up changes."
- **Compile overview lacked grounding** — `skills/grimoire-compile/SKILL.md` Step 5 now requires reading the top 5 articles by centrality before writing the overview narrative.
- **grimoire_query is retrieval, not synthesis** — the tool name implies synthesis but the implementation only does FlexSearch retrieval. Deferred to a later phase; documented honestly in `README.md` as "keyword retrieval, synthesis deferred."

**Dead code removed:**
- `lib/present/modes/quiz.ts` — unreachable branch in `extractSentences` and an unused helper.

### Pre-Publish Security Scan

A fresh agent scanned all tracked and untracked files in the repo root:

- **Zero secrets** — no API keys, credentials, tokens, or passwords found in any file
- **Zero unwanted files** — no `.env`, `.log`, `.cache`, `.DS_Store`, or `.bak` files
- **node_modules** — correctly gitignored (91MB, not tracked)

**Blockers found (4) — all fixed:**
- Stale `mcp-spec.md` copy in `skills/grimoire-serve/references/` still said "watches for changes" — corrected to "Restart to pick up changes"
- `README.md` listed all skill statuses as "Stub" even though all six were fully implemented — full rewrite by agent: statuses now "Working", added pipeline walkthrough and MCP client config snippet
- No `LICENSE` file — created with standard MIT text, 2026 Ved copyright
- `docs/architecture.md` still described the deleted ICM `stages/01-*/` layout — rewritten to describe the current plugin architecture

**Should-fixes found (4) — all fixed:**
- `papyr-core` npm availability unverified — confirmed `papyr-core@1.0.0` on npm (MIT license, 123KB)
- `plugin.json` and `package.json` author had no contact info — added name/email/url to both (GitHub handle `vedantggwp`, `noreply` email)
- `docs/references/papyr-core.md` still labelled "Evaluation Needed" — updated to "Evaluation Result" with adoption date and verified capabilities
- `MANIFEST.md` listed `package-lock.json` but it was gitignored — removed `package-lock.json` from `.gitignore` (will now ship for reproducibility) and removed from `MANIFEST.md`

### grimoire-init v0.2.0

User feedback during the session:

> "This question should be asked by the plug-in itself... There should also be an option for the user to tell Claude to gain as much context from the project's existing state or documentation without the user needing to give it to Claude, because this is an agentic, intelligent plugin."

Enhanced `skills/grimoire-init/SKILL.md` from v0.1.0 to v0.2.0:

- **Project marker detection** — detects `.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `CLAUDE.md`, `README.md`, and `docs/` in the current working directory
- **4 onboarding modes** — Auto-discover from project / Guided from scratch / Hybrid / Tell me more
- **Auto-discovery pipeline** — reads `README.md`, `CLAUDE.md`, `package.json` / `pyproject.toml` / `Cargo.toml`, `docs/`, and `.gitignore` to infer project context
- **Questionnaire pre-fill** — all 7 questionnaire answers are pre-filled from project signals and presented for approve/edit/redo
- **Workspace location checkpoint** — 4 options: inside project root / inside `docs/` / sibling directory / custom path

Skill step count increased from 6 to 7. Version bumped `0.1.0 → 0.2.0`.

### Dry-Run Validation

Created a throwaway workspace at `/tmp/grimoire-dryrun` with 3 realistic RLHF articles (`reward-modeling.md`, `ppo-fine-tuning.md`, `preference-data.md`). Ran `grimoire-compile`, then `grimoire-present`, then tested all 6 `grimoire-serve` handlers directly. Three bugs surfaced that the 79-test suite had not caught.

#### Bug 1: `quiz.ts` extractSentences bullet content bug

- **Symptom** — only 3 quiz cards generated (all "Overview" cards) instead of the expected 12 (4 per article × 3 articles)
- **Root cause** — `extractSentences` used the regex `[^.!?]+[.!?]+/g`, which requires terminal punctuation. Bullet-list sections like "Key Capabilities" and "Limitations" don't have periods, so the regex returned zero matches and those sections produced no cards.
- **Fix** — added a fallback chain in `lib/present/modes/quiz.ts`: first try the sentence match, then split on em-dash / en-dash / newline / semicolon, then truncate the whole text as the last resort
- **After fix** — 12 cards generated with varied question templates per heading type

#### Bug 2: `serve.ts` support pages counted as articles

- **Symptom** — `handleListTopics` reported "Total articles: 6" for a 3-article wiki; `handleSearch` returned `index` and `overview` as search hits
- **Root cause** — `lib/compile.ts` correctly indexes every markdown file (needed for graph analysis), but `loadWikiData` in `lib/serve.ts` did not distinguish content articles from navigation pages (`index`, `overview`, `log`)
- **Fix** — added a `SUPPORT_PAGES` filter in `loadWikiData` that strips `index`, `overview`, and `log` from the notes list returned to handlers
- **After fix** — `handleListTopics` reports 3 articles; `handleSearch` returns only content articles

#### Bug 3: `serve.ts` handleQuery fails on natural language queries

- **Symptom** — `grimoire_query` with input `"what is reward modeling"` returned "No results found" even though the article `Reward Modeling` existed as a direct title match
- **Root cause** — FlexSearch's default config requires all tokens to match. Stop words like `what` and `is` don't appear in articles, so the full query never matched anything.
- **Fix** — added a `searchWithFallback` function in `lib/serve.ts` that tries the exact query first, then strips ~25 stop words and retries, then does per-keyword search and merges results. Also filters support pages from query results.
- **After fix** — `handleQuery` correctly returns the Reward Modeling article for the natural-language query

### Files Created

- `LICENSE` — MIT license text, 2026 Ved copyright

### Files Modified

- `lib/serve.ts` — added `SUPPORT_PAGES` filter in `loadWikiData`, added `searchWithFallback` with stop-word stripping, added slug regex validation in `readArticle`
- `lib/present/modes/quiz.ts` — `extractSentences` fallback chain (sentence → dash/newline/semicolon split → truncate), heading-type-to-question template mapping, dead code removed
- `lib/present/modes/search.ts` — added `esc()` helper, escaped all title/excerpt interpolations, added search index error sentinel check
- `lib/present/index.ts` — `writeFile` now uses `path.dirname()` instead of string ops
- `lib/present/data.ts` — recursive `collectMdFiles` walker so taxonomy subdirectories are indexed
- `skills/grimoire-init/SKILL.md` — v0.2.0, 7 steps, project marker detection, 4 onboarding modes, auto-discovery pipeline, pre-filled questionnaire, workspace location checkpoint
- `skills/grimoire-compile/SKILL.md` — Step 5 now requires reading top 5 articles by centrality before writing overview; added `npm install` prerequisite check
- `skills/grimoire-present/SKILL.md` — added `npm install` prerequisite check
- `skills/grimoire-serve/SKILL.md` — added `npm install` prerequisite check; Step 1 staleness check
- `skills/grimoire-scout/SKILL.md` — Step 6 now clears consumed entries in `scout-queue.md`
- `skills/grimoire-scout/references/stage-contract.md` — rewritten for current skill I/O
- `skills/grimoire-ingest/references/stage-contract.md` — rewritten for current skill I/O
- `skills/grimoire-compile/references/stage-contract.md` — rewritten for current skill I/O
- `skills/grimoire-serve/references/mcp-spec.md` — "watches for changes" → "Restart the server to pick up changes"
- `docs/mcp-spec.md` — same fix in the authoritative copy
- `docs/architecture.md` — full rewrite, no more ICM stage references, describes current plugin architecture
- `docs/references/papyr-core.md` — "Evaluation Needed" → "Evaluation Result" with adoption date and verified capabilities
- `docs/roadmap.md` — Phases 2, 3, and 4 marked complete
- `README.md` — comprehensive rewrite; all skill statuses now "Working", full pipeline walkthrough, MCP client config snippet
- `package.json` — added explicit `zod` dependency, author with contact info, `present` script
- `.claude-plugin/plugin.json` — added author with contact info
- `.gitignore` — removed `package-lock.json` (will now ship for reproducibility)
- `MANIFEST.md` — removed `package-lock.json` entry, added `LICENSE` entry, updated recent changes

### Test Summary

- **Total tests: 79** — all passing after fixes
- `test/compile.test.ts` — 18 tests
- `test/present.test.ts` — 42 tests
- `test/serve.test.ts` — 19 tests

The three dry-run bugs were not covered by the existing test suite. Follow-up: add regression tests for quiz bullet-content extraction, serve support-page filtering, and stop-word query fallback.

### Pipeline Status

| Skill | Status | Notes |
|-------|--------|-------|
| `grimoire-init` | Complete (v0.2.0) | Project auto-discovery added |
| `grimoire-scout` | Complete | Scout-queue status clearing added |
| `grimoire-ingest` | Complete | Stage contract rewritten |
| `grimoire-compile` | Complete | Overview grounding + npm prereq added |
| `grimoire-present` | Complete | XSS, path-dirname, taxonomy walker, quiz fallback fixes |
| `grimoire-serve` | Complete | Path traversal, support-page filter, stop-word fallback fixes |

All six skills fully implemented and verified. Plugin is publish-ready.

### What's Next

- First real-project test — user to spin up a fresh Claude session with `claude --plugin-dir /Users/ved/Developer/grimoire` inside an existing project
- Add regression tests for the three dry-run bugs
- Follow through on deferred items: `grimoire_query` retrieval → synthesis upgrade, Claude Desktop MCP compatibility testing

## 2026-04-09 — Full Pipeline Build + Security Audit

### Overview

Built the complete Grimoire pipeline from core skills through static frontend and MCP server in a single session. Implemented grimoire-scout, grimoire-ingest, and grimoire-compile skills with full process definitions. Built `lib/compile.ts` (Papyr Core orchestration), `lib/present/` (12-module static site generator with 6 study modes), and `lib/serve.ts` (MCP server with 6 query tools). Added 79 integration tests across three test suites. Ran a 3-agent security audit that surfaced critical, high, and design-level issues — all critical and high issues were fixed in-session. Restructured the project from ICM stage directories to Claude Code plugin format and adopted Papyr Core as the compilation engine.

### Phase 1.5 — Plugin Packaging

- Restructured from ICM stages (`stages/01-scout/` through `stages/05-serve/`) to Claude Code plugin format (`.claude-plugin/plugin.json` + `skills/*/SKILL.md`)
- Old directories removed: `stages/`, `setup/`, `_config/`, `templates/`, `shared/`, `CONTEXT.md`
- Stage contracts preserved as `skills/*/references/stage-contract.md`
- Templates and config moved to `skills/grimoire-init/assets/templates/`
- Evaluated and adopted Papyr Core (`papyr-core@^1.0.0`) as compilation/graph/search engine
- Built `grimoire-init` skill (questionnaire + workspace scaffolding)
- Stubbed grimoire-scout, grimoire-ingest, grimoire-compile, grimoire-present, grimoire-serve

### Phase 2 — Core Pipeline Completion

**grimoire-scout** (`skills/grimoire-scout/SKILL.md`):
- 6-step research workflow with checkpoint gate
- 6-signal confidence scoring: Authority (H), Credibility (H), Uniqueness (H), Depth (M), Recency (M), Engagement (M)
- Tiers: P0 (18-30), P1 (12-17), P2 (6-11)
- 3 output files: `scout-report.md`, `approved-sources.md`, `scout-queue.md` status updates
- References: `confidence-scoring.md`, `scout-spec.md`, `stage-contract.md`

**grimoire-ingest** (`skills/grimoire-ingest/SKILL.md`):
- 7-step fetch-and-compile workflow
- Raw source preservation in `raw/` directory
- Mandatory human checkpoint before wiki article creation
- Backlink audit and wiki navigator (index.md) updates
- Handles both batch (from `approved-sources.md`) and direct source input

**grimoire-compile** (`skills/grimoire-compile/SKILL.md` + `lib/compile.ts`):
- 8-step Claude workflow in SKILL.md
- `lib/compile.ts` (198 lines): Papyr Core orchestration — graph analysis, link validation, search indexing, analytics
- Outputs to `wiki/.compile/`: `notes.json`, `graph.json`, `analytics.json`, `audit.json`, `search-index.json`, `build-info.json`, `folder-hierarchy.json`, `papyr-data.json`
- Step 3 audit: deterministic fixes (broken links, missing backlinks, stale index entries, orphan repair) + heuristic issues (duplicates, taxonomy gaps, missing cross-refs, coverage distribution)
- Step 5 overview: reads top-5 articles by centrality for narrative grounding
- Step 5.5 emergent taxonomy engine: conditional category proposal from co-occurrence analysis after 5-10 sources
- Test suite: `test/compile.test.ts` — 18 tests

**scout-queue.md handoff** verified: init creates it, scout reads it, ingest consumes it.

### Phase 3 — Frontend (grimoire-present)

**Architecture** — `lib/present/` (12 modules, 2147 lines total):

| Module | Lines | Purpose |
|--------|-------|---------|
| `types.ts` | 85 | Shared type definitions (DesignConfig, PaletteDef, PaletteColors) |
| `config.ts` | 174 | Design configuration parser, palette resolver, typography maps |
| `css.ts` | 444 | CSS custom properties generator, base styles, component styles |
| `data.ts` | 191 | Wiki data loader — reads compile JSON + markdown articles |
| `html.ts` | 181 | HTML shell generator, navigation, head/meta tags |
| `index.ts` | 139 | Orchestrator — reads config, loads data, generates all pages |
| `modes/read.ts` | 160 | Linear reading mode — centrality-ordered, TOC, reading progress |
| `modes/graph.ts` | 217 | Graph exploration — D3 force-directed graph via CDN |
| `modes/search.ts` | 150 | Search + answer mode — client-side full-text search |
| `modes/feed.ts` | 58 | Changelog/feed mode — timeline from wiki/log.md |
| `modes/gaps.ts` | 116 | Gap map visualization — tag-based coverage grid |
| `modes/quiz.ts` | 232 | Flashcard/quiz mode — auto-generated Q&A from article sections |

**6 study modes built:**
1. **Linear Reading** — articles ordered by centrality score, table of contents, "next article" navigation, reading progress indicator
2. **Graph Exploration** — D3 force-directed interactive concept map, nodes are articles, edges are cross-references
3. **Search + Answer** — client-side full-text search with highlighted results and source links
4. **Changelog / Feed** — "what's new" timeline parsed from `wiki/log.md`
5. **Gap Map** — tag-based coverage grid: well-covered (dark), thin (light), empty (outline)
6. **Flashcard / Quiz** — auto-generated Q&A pairs extracted from article sections

**Design engine:**
- 7 palettes: midnight-teal, noir-cinematic, cold-steel, warm-concrete, electric-dusk, smoke-light, obsidian-chalk
- Each palette defines light + dark mode with semantic colors (success, warning, error, info)
- 5 typography options: editorial (Playfair Display/Inter), technical (JetBrains Mono/Inter), playful (Nunito/Fira Code), brutalist (Space Grotesk/Space Mono), minimal (Inter/JetBrains Mono)
- Motion: subtle, none, playful
- Density: comfortable, compact, spacious
- CSS custom properties on `:root` — palette switch is a class change, no rebuild

**Test coverage:** `test/present.test.ts` — 42 tests

### Phase 4 — MCP Server (grimoire-serve)

**Architecture** — `lib/serve.ts` (405 lines):
- Built on `@modelcontextprotocol/sdk@^1.29.0`
- stdio transport for Claude Desktop / Claude Code / any MCP client
- Zod schema validation for all tool inputs
- Immutable data types throughout (readonly interfaces)
- Loads wiki data once on startup from `wiki/.compile/` JSON artifacts

**6 tools implemented:**

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `grimoire_query` | Synthesize an answer from wiki articles | Medium |
| `grimoire_list_topics` | Return taxonomy with article counts | Low |
| `grimoire_get_article` | Return a specific article by slug | Low |
| `grimoire_open_questions` | Return unresolved questions from overview | Low |
| `grimoire_coverage_gaps` | Return topics with thin or missing coverage | Low |
| `grimoire_search` | Full-text search across all content via Papyr Core | Medium |

**Test coverage:** `test/serve.test.ts` — 19 tests

### Security Audit

Three parallel review agents ran against the full codebase:

1. **Pipeline review** — validated skill handoffs, file contracts, and data flow
2. **Code review** — scanned `lib/compile.ts`, `lib/present/`, `lib/serve.ts` for bugs, security, and quality
3. **Goal alignment** — checked implementation against SOUL.md, decisions.md, and roadmap.md

**Critical issues found and fixed:**
- Quiz question template used raw article content without escaping — fixed with HTML entity encoding in `lib/present/modes/quiz.ts`
- Scout-queue status not cleared after ingest consumption — fixed: ingest SKILL.md now marks consumed entries as `status: ingested`

**High issues found and fixed:**
- MCP spec doc (`docs/mcp-spec.md`) claimed server "watches for changes" — corrected to "restart the server to pick up changes" (the implementation reads once on startup, does not watch)
- Compile overview Step 5 did not instruct reading actual article content — fixed: SKILL.md now requires reading top-5 articles by centrality before writing the overview narrative

**Design issues identified and deferred:**
- No rate limiting on MCP server (deferred — stdio transport is local-only, rate limiting is a network concern)
- No input sanitization on search queries beyond Zod type validation (deferred — Papyr Core's FlexSearch handles this internally)
- No graceful degradation if compile JSON is stale relative to wiki markdown (deferred — compile step is always re-run before present/serve)

### Post-Audit Fixes

- **Quiz question templates** — HTML entity escaping added to prevent XSS in generated quiz HTML (`lib/present/modes/quiz.ts`)
- **Scout-queue status clearing** — ingest SKILL.md updated to mark consumed entries as `status: ingested`
- **MCP spec doc correction** — `docs/mcp-spec.md` line 28: "watches for changes" changed to "Restart the server to pick up changes"
- **Compile overview instruction** — `skills/grimoire-compile/SKILL.md` Step 5: added requirement to read top-5 articles by centrality before writing overview narrative

### Files Created

**Plugin infrastructure:**
- `.claude-plugin/plugin.json` — Plugin manifest (name, version, description)
- `package.json` — Node package with papyr-core, @modelcontextprotocol/sdk, zod dependencies
- `README.md` — Install guide, quick start, skill reference

**Skills (6 skills, each with SKILL.md + references):**
- `skills/grimoire-init/SKILL.md` — Interactive questionnaire + workspace scaffolding
- `skills/grimoire-init/references/questionnaire.md` — 7-question onboarding flow
- `skills/grimoire-init/assets/templates/schema-template.md` — SCHEMA.md template
- `skills/grimoire-init/assets/templates/design-config.md` — Design configuration template
- `skills/grimoire-init/assets/templates/article-template.md` — Wiki article format
- `skills/grimoire-init/assets/templates/raw-template.md` — Raw source preservation format
- `skills/grimoire-init/assets/templates/archive-template.md` — Archived query format
- `skills/grimoire-init/assets/templates/index-template.md` — Wiki index table format
- `skills/grimoire-scout/SKILL.md` — Source research + 6-signal confidence scoring
- `skills/grimoire-scout/references/stage-contract.md` — Scout stage contract
- `skills/grimoire-scout/references/scout-spec.md` — Full scout specification
- `skills/grimoire-scout/references/confidence-scoring.md` — 6-signal scoring rubric
- `skills/grimoire-ingest/SKILL.md` — Fetch, preserve raw, checkpoint, compile wiki articles
- `skills/grimoire-ingest/references/stage-contract.md` — Ingest stage contract
- `skills/grimoire-compile/SKILL.md` — Graph audit, backlink repair, gap analysis, index serialization
- `skills/grimoire-compile/references/stage-contract.md` — Compile stage contract
- `skills/grimoire-present/SKILL.md` — Static site generation with 6 study modes
- `skills/grimoire-present/references/stage-contract.md` — Present stage contract
- `skills/grimoire-present/references/design-engine.md` — Theming and design specs
- `skills/grimoire-present/references/frontend-modes.md` — 6 study modes spec
- `skills/grimoire-serve/SKILL.md` — MCP server with 6 tools + CLAUDE.md integration
- `skills/grimoire-serve/references/stage-contract.md` — Serve stage contract
- `skills/grimoire-serve/references/mcp-spec.md` — MCP server tool inventory
- `skills/grimoire-serve/references/integration.md` — CLAUDE.md integration rules

**Runtime scripts:**
- `lib/compile.ts` — Papyr Core orchestration (198 lines)
- `lib/present/types.ts` — Shared type definitions (85 lines)
- `lib/present/config.ts` — Design configuration parser (174 lines)
- `lib/present/css.ts` — CSS custom properties generator (444 lines)
- `lib/present/data.ts` — Wiki data loader (191 lines)
- `lib/present/html.ts` — HTML shell generator (181 lines)
- `lib/present/index.ts` — Present orchestrator (139 lines)
- `lib/present/modes/read.ts` — Linear reading mode (160 lines)
- `lib/present/modes/graph.ts` — Graph exploration mode (217 lines)
- `lib/present/modes/search.ts` — Search + answer mode (150 lines)
- `lib/present/modes/feed.ts` — Changelog / feed mode (58 lines)
- `lib/present/modes/gaps.ts` — Gap map mode (116 lines)
- `lib/present/modes/quiz.ts` — Flashcard / quiz mode (232 lines)
- `lib/serve.ts` — MCP server (405 lines)

**Test suites:**
- `test/compile.test.ts` — Integration tests for compile (175 lines, 18 tests)
- `test/present.test.ts` — Integration tests for present (341 lines, 42 tests)
- `test/serve.test.ts` — Integration tests for serve (169 lines, 19 tests)

**Test fixtures:**
- `test/fixtures/sample-wiki/SCHEMA.md` — Test schema
- `test/fixtures/sample-wiki/_config/design.md` — Midnight-teal design config fixture
- `test/fixtures/sample-wiki/wiki/index.md` — Test wiki index
- `test/fixtures/sample-wiki/wiki/overview.md` — Test wiki overview
- `test/fixtures/sample-wiki/wiki/log.md` — Test wiki changelog
- `test/fixtures/sample-wiki/wiki/react-fundamentals.md` — Test article
- `test/fixtures/sample-wiki/wiki/signals-pattern.md` — Test article
- `test/fixtures/sample-wiki/wiki/svelte-compilation.md` — Test article
- `test/fixtures/sample-wiki/wiki/vue-reactivity.md` — Test article (deliberate broken link for audit testing)
- `test/fixtures/sample-wiki/wiki/.compile/` — Pre-built compile JSON artifacts (8 files)
- `test/fixtures/sample-wiki/site/` — Pre-built site output for present tests (7 files)

### Files Modified

- `CLAUDE.md` — Rewritten from ICM-oriented L0 context to plugin-oriented project instructions. Removed CONTEXT.md routing, added plugin structure table, updated core rules to reference skills instead of stages, added Papyr Core as a core rule.
- `.gitignore` — Removed ICM stage output rules. Added `**/.compile/`, `**/site/`, `_test/` ignores.
- `MANIFEST.md` — Full rewrite to reflect plugin structure. Added all new files, updated recent changes section.
- `docs/roadmap.md` — Marked Phases 1.5, 2, 3, 4 complete. Added Phase 5 items.
- `docs/decisions.md` — Added 2026-04-08 entries for plugin restructure, Papyr Core adoption, and all founding decisions.
- `docs/mcp-spec.md` — Corrected "watches for changes" to "Restart the server to pick up changes" (line 28).

### Files Deleted

- `CONTEXT.md` — ICM router, replaced by plugin skill auto-discovery
- `_config/design.md` — Moved to `skills/grimoire-init/assets/templates/design-config.md`
- `_config/schema-template.md` — Moved to `skills/grimoire-init/assets/templates/schema-template.md`
- `setup/questionnaire.md` — Moved to `skills/grimoire-init/references/questionnaire.md`
- `shared/confidence-scoring.md` — Moved to `skills/grimoire-scout/references/confidence-scoring.md`
- `stages/01-scout/CONTEXT.md` — Absorbed into `skills/grimoire-scout/SKILL.md`
- `stages/01-scout/output/.gitkeep` — Removed (output dirs no longer tracked)
- `stages/02-ingest/CONTEXT.md` — Absorbed into `skills/grimoire-ingest/SKILL.md`
- `stages/02-ingest/output/.gitkeep` — Removed
- `stages/03-compile/CONTEXT.md` — Absorbed into `skills/grimoire-compile/SKILL.md`
- `stages/03-compile/output/.gitkeep` — Removed
- `stages/04-present/CONTEXT.md` — Absorbed into `skills/grimoire-present/SKILL.md`
- `stages/04-present/output/.gitkeep` — Removed
- `stages/05-serve/CONTEXT.md` — Absorbed into `skills/grimoire-serve/SKILL.md`
- `stages/05-serve/output/.gitkeep` — Removed
- `templates/archive-template.md` — Moved to `skills/grimoire-init/assets/templates/`
- `templates/article-template.md` — Moved to `skills/grimoire-init/assets/templates/`
- `templates/index-template.md` — Moved to `skills/grimoire-init/assets/templates/`
- `templates/raw-template.md` — Moved to `skills/grimoire-init/assets/templates/`

### Test Summary

- **Total tests: 79**
- `test/compile.test.ts`: 18 tests — graph analysis, link validation, search indexing, analytics output, build-info generation
- `test/present.test.ts`: 42 tests — config parsing, CSS generation, data loading, HTML rendering, all 6 modes
- `test/serve.test.ts`: 19 tests — data loading, all 6 tool handlers, schema validation, error handling

### Pipeline Status

| Skill | Status | SKILL.md | Runtime Script | Tests |
|-------|--------|----------|---------------|-------|
| `grimoire-init` | Complete | Yes | N/A (Claude workflow) | N/A |
| `grimoire-scout` | Complete | Yes | N/A (Claude workflow) | N/A |
| `grimoire-ingest` | Complete | Yes | N/A (Claude workflow) | N/A |
| `grimoire-compile` | Complete | Yes | `lib/compile.ts` (198 lines) | 18 |
| `grimoire-present` | Complete | Yes | `lib/present/` (2147 lines) | 42 |
| `grimoire-serve` | Complete | Yes | `lib/serve.ts` (405 lines) | 19 |

Note: init, scout, and ingest are Claude-driven workflows defined entirely in SKILL.md. They do not have runtime scripts — they instruct Claude what to do step-by-step. Compile, present, and serve have both SKILL.md instructions and TypeScript runtime scripts that Claude executes via `tsx`.

### What's Left (Phase 5)

From `docs/roadmap.md`:

- [ ] Claude Desktop compatibility testing for MCP server
- [ ] Comparison tables mode (post-MVP frontend mode)
- [ ] Learning paths mode (post-MVP frontend mode)
- [ ] CLI wrapper (`grimoire init`, `grimoire scout`, etc.)
- [ ] GitHub template repository
- [ ] README and distribution guide

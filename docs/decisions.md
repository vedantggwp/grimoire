# Decision Log

> Living document. Append new decisions at the top. Never delete entries — they're historical context.
> When making architectural, scope, or design decisions during a session, update this file before the session ends.

---

## 2026-04-16 — v0.2.4 quality fix pass (25 bugs from first dogfood run)

**Decision:** Ship v0.2.4 as a focused quality pass across `lib/present/` and `lib/serve.ts`, with every fix landed as a test-backed commit-sized chunk. The pass fixes schema parsing drift and silent truncation, static wikilink resolution, hub stat correctness, small-corpus hub/read/graph behavior, CSS polish, and load-time article validation. Bugs 11 and 12 from the original dogfood inventory are explicitly **not** TypeScript runtime bugs: they are compile-skill behaviors described in `skills/compile/SKILL.md` / `skills/compile/references/stage-contract.md`. Those two items are deferred to **v0.2.5 compile skill hardening** rather than being papered over in `lib/compile.ts`.

**Why:** The first end-to-end meta-grimoire dogfood run surfaced a real release blocker set: SCHEMA topics truncated mid-sentence in `<title>` and the nav brand, hub lead text could render empty, every article cross-reference resolved to papyr's dead `#/note/slug` SPA route, the read progress bar floated inside content instead of pinning below the nav, hub stats overclaimed density on tiny corpora, graph layout over-pushed long labels off-canvas, and the serve-side schema parser still truncated multi-line topics for MCP clients even after the present-side parser was fixed. None of these were architectural rewrites; all of them were the kind of quality failures that make a product feel untrustworthy on first contact. v0.2.4 is the pass that closes that gap before anything else moves forward.

**Trail:** Ten fix commits landed in dependency order (A→J): schema parsing/template alignment, wikilink rewrite + read-mode hash navigation, hub stat cleanup and density normalization, body-level progress bar placement, dynamic featured-card span, deterministic centrality sort + dangling-link warnings + tag cloud/feed polish, breakpoint/contrast/tabs overflow cue fixes, graph small-N force tuning, Zod article validation, and the mirrored `parseSchemamd` serve fix. Final release steps: `npm run build`, version bump to `0.2.4`, full test rerun, regenerate `../grimoire-wiki/` via `node dist/{compile,present}.js`, and visual QA grep checks for title truncation, dead `#/note/` links, progress-bar placement, breakpoint string drift, and dark-mode code color. Bugs 11/12 remain tracked as a follow-up because the honest fix belongs in the compile skill layer: add end-of-run enforcement that taxonomy proposal / overview evolution actually happened, or move that behavior into a deterministic runtime. This decision intentionally does **not** modify `skills/compile/SKILL.md` in v0.2.4; it just records the architectural truth so the roadmap is no longer lying.

## 2026-04-16 — Add a `/grimoire:run` end-to-end mode to eliminate pipeline friction (implemented in v0.3.0)

**Decision:** A new top-level skill, `/grimoire:run`, will chain `scout → ingest → compile → present` into a single invocation that runs end-to-end *without* pausing at the scout, ingest, or present checkpoints by default. The checkpoint flow remains available via an opt-in flag (tentative: `--checkpointed` or `--interactive`) for users who want to inspect intermediate state between stages. `serve` stays separate because it's a daemon, not a pipeline step — pairing with `/grimoire:run` would mean either blocking the terminal or daemonizing, both bad defaults.

**Why:** Surfaced during the first real end-to-end dogfood run on 2026-04-16, when a meta-grimoire about Grimoire itself was scaffolded via `/grimoire:init` and the maintainer attempted to drive the full pipeline manually. User feedback: the multi-stage pipeline creates enough friction to lose first-time users in the first five minutes, before they have invested enough to tolerate it. The tension is real. The checkpoints exist because the "human stays in control" principle is load-bearing — they are what prevents an LLM-maintained wiki from becoming a training-data-quality problem, and they're what distinguishes Grimoire from "Claude auto-writes markdown into a folder." But the cost of the checkpoints is exactly the first-run friction described above. A knowledge-base tool whose core value prop is "you get a compounding artifact" cannot afford that failure mode on the first run. The answer is not to delete the checkpoints — it's to make them opt-in so the default experience is "one command, watch it go" while the power-user experience remains "pause and edit between stages."

**Trail:** The problem surfaced mid-session while a meta-grimoire was being scaffolded via `/grimoire:init` and the conversation then stalled at "now run `/grimoire:scout`, then `/grimoire:ingest`, then `/grimoire:compile`, then `/grimoire:present`, then `/grimoire:serve`." Alternatives considered: **(a)** Keep the current flow and document the friction clearly — rejected, documentation doesn't fix UX friction. **(b)** Delete the checkpoints entirely — rejected, this is exactly the quality-failure mode the checkpoints exist to prevent, and it would violate the `SOUL.md` principle "The human stays in control." **(c)** Add `/grimoire:run` as the new default with checkpoints opt-in — chosen, preserves both experiences without deleting the principle. Implementation sketch: create `skills/run/SKILL.md` that orchestrates invocations of scout → ingest → compile → present in sequence, with an `--interactive` flag (parsed from user input in the SKILL.md instructions) to enable the checkpoint pauses; default prints a single-line progress indicator per stage; on failure, surface which stage failed and what intermediate file to inspect. The friction was also documented inside the meta-grimoire at `../grimoire-wiki/wiki/roadmap-and-decisions.md` under "Open friction: the pipeline-length problem," which means future sessions reading that wiki via the MCP server will discover the finding without having to re-derive it.

**Implementation (2026-04-16):** Delivered as `skills/run/SKILL.md` v0.1.0 with six flags (`--guided`, `--review-angles`, `--sequential`, `--from`, `--no-present`, `--palette`). Smart defaults via `lib/defaults.ts` (topic inference from one sentence) and `lib/templates.ts` (grimoire-to-grimoire inheritance). Batch ingest added to `skills/ingest/SKILL.md` as an additive code path. Inline reconfiguration at checkpoint 2 handles design/content/scope changes via natural language. Incremental mode detects existing workspaces and runs targeted re-scout/re-ingest. `lib/pipeline-types.ts` defines shared types. All 6 original skills untouched in behavior. 183 tests green, 0 regressions. Version bumped to 0.3.0.

---

## 2026-04-15 — Option F: Linear Editorial ships as the launch frontend (v0.2.3)

**Decision:** The generated frontend is rewritten around an "Option F — Linear Editorial" dual-theme design system and becomes the launch target for v0.2.3. Source Serif 4 + Inter + JetBrains Mono typography, `linear-editorial` palette as default (`#FFFFFF`/`#0E0E0E` backgrounds, `#0D9488`/`#2dd4bf` accent), dark mode via `.theme-dark` + `prefers-color-scheme`. Eighteen concrete fixes landed across `lib/present/`:

- Bento grid uses `grid-auto-rows: min-content` with an explicit `span 2×2` featured card populated with a top-4 centrality preview so the wide slot has real content instead of empty padding.
- Hub drops its duplicate H1 — the nav brand already carries the full topic name (design choice: the KB is the topic's KB, no wordmark), the hero leads with the `scope.in` line.
- Read strips the leading markdown `<h1>` during render so the template H1 is the only title visible.
- Density stat de-duplicates undirected edge pairs and caps at 100%; previous display of "82%" was a Papyr-directed-vs-present-undirected formula mismatch amplified by the compile tool writing to the wrong `.compile` dir.
- Graph filters support pages (`index`, `log`, `overview`) from both nodes and edges at the data layer — same filter shared with `serve.ts`. Force simulation parameters scale with node count; labels render below nodes with `paint-order: stroke` so they stay legible over edges.
- Feed renders as a real vertical timeline with a spine line, dot markers, and multi-tag inference (scouted/ingested/compiled/edited can co-occur on one entry).
- Gaps is now an actual `d3.treemap()` layout sized by `articleCount × sqrt(totalWords)` with a 4-tier classification (full ≥3 / partial 2 / thin 1 / missing 0), legend, and hover tooltip. The previous CSS-grid "treemap" was the same size for every cell.
- Quiz replaces the broken 3D flip flashcard with an Anki-style reveal: question visible → "Show answer" button → inline reveal → feedback buttons. Keyboard support via Space/Enter.
- Search grows a substantive default state: example queries derived from top centrality articles, a tag cloud with click-to-filter, and a centrality-sorted article grid with summaries and tag chips. The empty "Type at least 2 characters" void is gone.
- Fluid typography via `clamp()` across all headings, body, and card scales. New 479/767/1023 breakpoints. `overflow-x: hidden` on html+body prevents surprise horizontal scroll. Graph detail panel is hidden on mobile. Gaps treemap labels truncate per-cell based on measured width.
- Dark mode lifts card surfaces to `#1C1C1C`, adds an inset `rgba(255,255,255,0.045)` highlight for card edges, and raises `--text-secondary` to `#C4C4C4` for WCAG AA.

**Why:** On the first visual QA pass, five of seven generated pages failed the quality bar: hub had a duplicate H1 and stretched featured card with huge empty space, Read showed its title three times, graph nodes clumped into an unreadable blob, gaps was a uniform grid not a treemap, quiz had no visible flashcard flip or inline reveal, search was 80% empty whitespace, and the density stat was mathematically wrong. The position (recorded as durable feedback) is that frontend quality is a hard launch gate on a knowledge-base tool whose value prop is "a beautiful frontend for humans" — fixing these was not polish, it was the launch condition. Shipping the pre-rewrite frontend would have failed the product's own `docs/design-engine.md` rule "No AI slop" and cost the trust of the first visitors before they read any wiki content.

**Trail:** Pre-work explored 6 options (A–F) in `mockups/option-*.html`. Option F "Linear Editorial" won because it already satisfied the dual-theme + editorial-typography + bento-grid non-negotiables from `docs/design-engine.md` without requiring a new palette concept. Alternatives rejected: ship the pre-rewrite frontend and iterate on user feedback (wrong for visual-artifact tools — users don't give feedback on ugly v1, they close the tab); make the featured Read card smaller to avoid the empty-space problem (would have lost the editorial hierarchy); keep the CSS-grid "treemap" (not a treemap, users would see through it). The ui-ux-pro-max skill was invoked for polish guidance; its typography recommendation (Newsreader + Roboto) was rejected in favor of the already-decided Source Serif 4 + Inter, but its rules on `clamp()`, touch targets ≥36px, mobile-first breakpoints, and inner-highlight dark surfaces were adopted. All 129 tests still pass, with three regressions updated to reflect intentional UI changes (gaps moved from `.treemap-cell` classes to `.treemap-leaf` SVG nodes; quiz from `#flashcard`/`#card-front` to `#quiz-card`/`#quiz-question`; search debounce threshold softened from literal `300` to ≥100ms). Desktop + dark + mobile verified across all 7 pages at `/tmp/grimoire-shots/v2/`.

---

## 2026-04-10 — grimoire-init v0.2.0: project auto-discovery

**Decision:** Init now detects existing projects (`.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `CLAUDE.md`, `README.md`, `docs/`), offers auto-discovery mode, reads project files to pre-fill the 7 questionnaire answers, and asks the user to confirm. Also: workspace location is now a checkpoint question with 4 options (inside project, inside `docs/`, sibling directory, custom path) instead of a hardcoded default.

**Why:** An "agentic, intelligent" plugin should minimize the user's thinking and data-entry burden when there's existing project context available. User requirement: minimize the thinking and data-ingestion workload imposed on the user.

**Trail:** Alternatives rejected — keep the old "ask 7 questions from scratch" flow (too manual for existing projects); fully automatic without confirmation (violates "human stays in control" principle). Landed on detect → pre-fill → confirm.

---

## 2026-04-10 — Dry-run before any real-project test

**Decision:** Before testing in a real project, run compile → present → serve handlers directly against a throwaway workspace.

**Why:** Synthetic test fixtures passed all 79 tests but the dry-run found 3 real bugs that only showed up with realistic content. All three were fixed immediately. 79/79 tests still pass after fixes.

**Trail:** Bugs found: (a) quiz `extractSentences` required terminal punctuation, dropped all bullet-list sections; (b) `loadWikiData` counted support pages (index/overview/log) as content articles; (c) `handleQuery` failed on natural language queries like "what is reward modeling" because FlexSearch needed all tokens to match.

---

## 2026-04-10 — Security posture for public launch

**Decision:** Pre-publish scan found zero secrets, zero credentials, zero unwanted files. Four blockers fixed (stale `mcp-spec` copy, missing `LICENSE`, stale `architecture.md` referencing deleted ICM stages, README skill statuses all "Stub"). Four should-fix items fixed (papyr-core verified on npm, author contact added, `papyr-core.md` reference updated, `package-lock.json` un-ignored and MANIFEST entry removed).

**Why:** First public release must be clean. MIT license file missing would make the declaration legally incomplete. Stale docs misrepresenting deleted architecture would confuse users.

**Trail:** Ran pre-publish scan → enumerated blockers → fixed in order. Lockfile now ships for reproducibility.

---

## 2026-04-10 — Natural language query resilience in grimoire_query

**Decision:** Added `searchWithFallback` to `serve.ts`: tries exact query first, then strips ~25 stop words and retries, then falls back to per-keyword search with merged results.

**Why:** FlexSearch's default matching is token-AND. Users phrase MCP queries as natural language ("what is reward modeling", "how does PPO work") which has stop words. Without fallback, the query tool returns "no results" for queries where the answer clearly exists. This also hardens `grimoire_search` which uses the same fallback.

**Trail:** Dry-run against realistic content exposed the issue. Three-tier fallback (exact → stop-words-stripped → per-keyword merged) added and verified.

---

## 2026-04-10 — Support pages are not content

**Decision:** `loadWikiData` in `serve.ts` now filters out `index`, `overview`, and `log` from the notes list. These are navigators, not articles.

**Why:** `handleListTopics` was reporting inflated article counts. `handleSearch` was surfacing overview/index as hits. This pollutes the MCP responses with non-content.

**Trail:** Noticed during dry-run that `list_topics` returned support pages alongside articles. Added `SUPPORT_PAGES` filter at the loader level so every handler benefits.

---

## 2026-04-09 — SiYuan Note evaluation: steal, don't integrate

**Decision:** No integration with SiYuan Note. Learn from their architecture instead.

**Why:** SiYuan (42.5k stars, block-based PKM, Go+SQLite+REST API) solves a different problem (human PKM) than Grimoire (LLM compilation). Integration would violate "plain text is the interface" principle. API-only pattern (Pattern A) scored 78/100 but deferred.

**Trail:** Evaluated SiYuan Note for potential integration. What we took: section-level retrieval concept (for future MCP optimization), FTS5 as a future upgrade path if FlexSearch hits limits, FSRS as a future flashcard upgrade if users do repeated reviews.

---

## 2026-04-09 — grimoire-compile: two-layer architecture (script + skill)

**Decision:** `lib/compile.ts` (Node.js) computes JSON artifacts; `SKILL.md` tells Claude how to interpret and fix.

**Why:** Machine computes (graph analysis, link validation, search indexing), Claude interprets (what to fix, what to surface, how to rewrite overview). Each layer does what it's good at.

**Trail:** Graph analysis requires running Papyr Core programmatically. Pure SKILL.md approach rejected — Claude can't run FlexSearch or traverse graph algorithms.

---

## 2026-04-09 — Papyr Core is richer than documented — use what exists

**Decision:** Compile stage orchestrates Papyr Core's existing functions, doesn't reinvent.

**Why:** All graph analysis primitives already exist. Building our own would be duplication.

**Trail:** Initial reference doc listed basic API. Actual `dist/` has `findOrphanedNotes`, `findOrphanedLinks`, `validateLinks`, `calculateCentrality`, `getConnectedComponents`, `getGraphStatistics`, `findHubs`, `findAuthorities`, `exportSearchIndex`/`importSearchIndex`, `AnalyticsEngine` with cluster detection. No reason to rebuild any of it.

---

## 2026-04-09 — grimoire-present: static site, no server needed

**Decision:** Generate self-contained HTML files that work from `file://` protocol.

**Why:** Local-first principle. User opens `index.html`, done. No build step, no `npm install` in the output, no CORS. CDN-loaded D3 for graph mode only.

**Trail:** Evaluated dev server (Vite) vs. static files. Static won on simplicity and alignment with local-first.

---

## 2026-04-09 — grimoire-serve: MCP SDK over stdio

**Decision:** Use `@modelcontextprotocol/sdk` with `StdioServerTransport`.

**Why:** Official SDK handles protocol negotiation, error formatting, and transport. Less code, more correct.

**Trail:** Considered bare JSON-RPC vs. official SDK. SDK chosen for correctness and reduced maintenance surface.

---

## 2026-04-09 — Search mode: vanilla JS, not FlexSearch in browser

**Decision:** Simple substring + word scoring in ~40 lines of vanilla JS.

**Why:** For <200 articles, FlexSearch is overkill in the browser. The Node.js serialized index format isn't browser-compatible anyway. Simple scoring (title: 10pts, headings: 5pts, tags: 3pts) works well enough.

**Trail:** Evaluated embedding FlexSearch via CDN vs. hand-rolled search. Vanilla JS won on size and compatibility.

---

## 2026-04-09 — grimoire_query: ship as retrieval, defer synthesis

**Decision:** Ship what works. The tool returns FlexSearch excerpts, not synthesized answers. Synthesis deferred.

**Why:** Synthesis would require Claude API calls at query time, fundamentally changing the server architecture. The other 3 shape-aware tools (`list_topics`, `coverage_gaps`, `open_questions`) are the real moat.

**Trail:** Audit found `grimoire_query` returns FlexSearch excerpts, not synthesized answers as docs aspirationally claim. Deferred — retrieval is useful on its own.

---

## 2026-04-09 — Quiz: heading-type-aware question templates

**Decision:** Map heading types to question patterns (Overview → "What is X and why does it matter?", Limitations → "What are the trade-offs?", etc.).

**Why:** Single "What is the {H2} of {title}?" template produced awkward questions. Heading-aware templates produce natural study questions without requiring an LLM at build time.

**Trail:** Evaluated single template vs. heading-type mapping vs. LLM at build time. LLM rejected — adds dependency and latency for marginal quality gain.

---

## 2026-04-09 — Security fixes from code audit

**Decision:** Four security fixes applied: XSS escaping in search mode, path traversal validation in `serve.ts`, explicit zod dependency, search index error sentinel.

**Why:** Code audit identified injection vectors and implicit dependencies that would bite in production.

**Trail:** XSS: added `esc()` function for title/excerpt/heading in `innerHTML`. Path traversal: added slug regex validation (`/^[a-zA-Z0-9/_-]+$/`). Zod: was working via transitive dep from MCP SDK, made explicit in `package.json`. Search index: check for error flag before `importSearchIndex()`.

---

## 2026-04-09 — Subdirectory wiki support in present/data.ts

**Decision:** Recursive `collectMdFiles()` to match compile's behavior.

**Why:** After taxonomy reorganization (Step 5.5), articles live in `wiki/{category}/`. Present's `data.ts` used flat `readdirSync` and missed them.

**Trail:** Compile and serve already handle taxonomy subdirectories. Present's `data.ts` was the only holdout using flat directory reads.

---

## 2026-04-08 — Restructure from ICM stages to Claude Code plugin format

**Decision:** Replace the ICM stage directory structure (`stages/01-scout/` through `stages/05-serve/`) with Claude Code plugin format (`.claude-plugin/plugin.json` + `skills/*/SKILL.md`).

**Why:** The project is being packaged as a Claude Code plugin for distribution. The plugin system provides auto-discovery of skills via `SKILL.md` frontmatter, replacing the ICM router (`CONTEXT.md`). Each ICM stage maps 1:1 to a plugin skill, preserving the "one stage, one job" principle.

**Trail:** Plugin packaging was requested. Plugin spec extracted from `anthropics/claude-plugins-official`. Stage contracts preserved as skill `references/stage-contract.md`. Templates and config moved to `skills/init/assets/`. Old directories (`stages/`, `setup/`, `_config/`, `templates/`, `shared/`, `CONTEXT.md`) removed after contents absorbed into skills.

---

## 2026-04-08 — Adopt Papyr Core as compilation engine

**Decision:** Use `papyr-core` (npm, MIT, v1.0.0) for markdown parsing, graph construction, search indexing, and analytics.

**Why:** Papyr Core bundles exactly the stack we'd build from scratch: gray-matter (frontmatter), remark/rehype pipeline (markdown → HTML), remark-wiki-link (wikilinks), flexsearch (search), plus graph analysis (centrality, hubs, orphan detection, backlinks). One dependency replaces 12.

**Trail:** Installed and tested against Grimoire-style markdown with custom frontmatter (confidence, sources). Results: frontmatter passes through in `metadata` untouched; wikilinks resolve and generate bidirectional backlinks; graph includes nodes with metadata, edges, centrality scores; search index serializes to JSON. One quirk: `[[topic/slug]]` resolves to just `slug` (strips path prefix) — compile skill will need slug disambiguation. Not a blocker.

---

## 2026-04-08 — SOUL.md split for ICM compliance

**Decision:** Split SOUL.md (3500 words) into SOUL.md (~700 words) + 8 spec docs in docs/.

**Why:** SOUL.md violated ICM's <200 line reference file convention. A monolithic file also caused Codex agents to exhaust their token budget reading it before they could write anything.

**Trail:** Audit found SOUL.md at 420+ lines. ICM spec says reference files stay under 200. The split approach was confirmed.

---

## 2026-04-08 — Grimoire as the product name

**Decision:** Name the product "Grimoire."

**Why:** The requirement was a name that appeals to non-tech users, isn't "girly," is immediately evocative, and isn't taken. Grimoire = medieval knowledge manuscript. Etymology: Old French *grammaire* (grammar) — structured knowledge that looked like magic. Maps perfectly to a KB that gives LLMs power.

**Trail:** Rejected Lore, Grove, Cairn, Fern, Moss, Primer, Atlas (too common). The grimoire direction was proposed. Modern spins (Grimlore, Grym, Lumoire) were explored but the team landed on the word itself — not taken in tech, everyone knows it from pop culture.

---

## 2026-04-08 — ICM as architectural foundation

**Decision:** Use Jake Van Clief's Interpreted Context Methodology (ICM) as the structural foundation.

**Why:** ICM's "folder structure as agent architecture" maps perfectly to Grimoire's staged pipeline. 5-layer context model keeps token budgets under control. Plain text interfaces make everything debuggable.

**Trail:** ICM was raised as a candidate methodology. Research against the GitHub repo and full methodology confirmed fit. The 5 stages (scout → ingest → compile → present → serve) mapped directly to ICM's numbered stage directories.

---

## 2026-04-08 — Emergent taxonomy over predefined

**Decision:** Categories emerge from sources by default. User can override with predefined categories.

**Why:** Every subject has its own quirks. Predefined categories force a structure that may not fit. The decision was that categories must emerge from the sources.

**Trail:** Hardcoded vs. emergent taxonomy was evaluated; emergent was chosen. Mechanical approach: first 5-10 sources go flat, then system proposes categories, human approves/edits/redoes.

---

## 2026-04-08 — Custom MCP server as the moat

**Decision:** Every Grimoire ships its own MCP server with 6 tools.

**Why:** QMD does generic semantic search. A custom MCP understands the wiki's shape — taxonomy, cross-refs, open questions, gaps. This makes Grimoire queryable from Claude Desktop (which can't use CLIs). The custom MCP server was endorsed as a real differentiator.

**Trail:** QMD limitations vs. a custom server were discussed and the MCP direction was confirmed. 6 tools defined: grimoire_query, grimoire_list_topics, grimoire_get_article, grimoire_open_questions, grimoire_coverage_gaps, grimoire_search.

---

## 2026-04-08 — design.md as theme config

**Decision:** Theming controlled by a single `_config/design.md` with palette, typography, motion, density options.

**Why:** The system has access to 97+ palettes and 9 design skills. Rather than hardcoding 3-5 themes, design.md is a lightweight config that tells the skills what to do. A central theme config was endorsed as the right shape.

**Trail:** Originally proposed hardcoded palettes. After scanning the available design skills (ui-ux-pro-max, billion-dollar-design, etc.), shifted to a config-driven approach. 7 named palettes + custom option.

---

## 2026-04-08 — Frontend always included, presentations optional

**Decision:** Every Grimoire gets a study-oriented frontend. Presentation decks are a separate optional skill.

**Why:** The product requirement is that every grimoire ships a beautiful, study-oriented frontend; presentations are a separate optional skill.

**Trail:** Whether landing page and presentation were always part of the system was evaluated. The split: frontend = core, presentations = optional.

---

## 2026-04-08 — 6 core frontend modes

**Decision:** Core modes: linear reading, graph exploration, search + answer, changelog/feed, gap map, flashcard/quiz. Future: comparison tables, learning paths.

**Why:** All 8 proposed modes were in scope. Prioritized 6 as core (MVP), 2 as post-MVP.

**Trail:** 8 modes were proposed and all were accepted. Agreed on core vs. future split.

---

## 2026-04-08 — CLAUDE.md integration is optional and lightweight

**Decision:** The wiki reference in a project's CLAUDE.md is optional, ~10 lines, and only generated when the user says yes.

**Why:** CLAUDE.md must stay 50-150 lines max. Only a reference to the index plus very lightweight rules belongs there.

**Trail:** Auto-generating a CLAUDE.md snippet was proposed; auto-updating and including the full index were rejected. Settled on: optional, lightweight pointer to wiki/index.md, hard rule (not suggestion).

---

## 2026-04-08 — Confidence scoring with 6 signals

**Decision:** Scout scores sources on Authority (H), Credibility (H), Uniqueness (H), Depth (M), Recency (M), Engagement (M). Tiers: P0 18-30, P1 12-17, P2 6-11.

**Why:** These parameters give the human enough context to approve/reject/reprioritize. The confidence threshold needs more signal than "official docs vs. community content."

**Trail:** 6 signals with weights were proposed and confirmed. Added that the flow should be collaborative — human gives topic + inclusions/exclusions, scout surfaces ranked results.

---

## 2026-04-08 — Single-author for now

**Decision:** Single-author wikis. Multi-user deferred.

**Why:** Reduces complexity. Conflict resolution, contributor attribution, and review workflows can come later.

**Trail:** Multi-user was evaluated; single-author was chosen for the initial release.

---

## 2026-04-08 — Local-first, host if you want

**Decision:** Grimoire is local-first. If someone wants to host, they can — it's static files.

**Why:** Local-first is the default. Self-hosting is easy enough that no first-party hosting story is needed.

---

## 2026-04-08 — No hooks (token cost concern)

**Decision:** Do not implement custom hooks for Grimoire. The token cost of injecting hook context on every turn outweighs the benefit.

**Why:** 5 proposed hooks were reviewed and cancelled. The guiding rule: before implementing anything, evaluate whether it will cause significant token expense.

**Trail:** Proposed ICM router gate, decisions reminder, manifest sync, route check, context budget warning. All rejected for token cost reasons.

---

## 2026-04-08 — Packaging as Claude Code plugin

**Decision:** Package Grimoire as a Claude Code plugin (plugin.json format).

**Why:** Plugin format is the native distribution mechanism for Claude Code. Makes it installable, discoverable, and updatable.

**Trail:** Packaging format options (plugin vs. standalone skills) were evaluated. Plugin was chosen, with a check against the latest Anthropic docs.

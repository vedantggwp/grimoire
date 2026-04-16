# Roadmap

## Phase 1 — Foundation (Complete)
- [x] Product bible (SOUL.md)
- [x] ICM directory structure
- [x] Stage contracts and templates
- [x] D2 architecture diagrams
- [x] Onboarding questionnaire
- [x] Library ecosystem research (docs/references/)

## Phase 1.5 — Plugin Packaging (Complete)
- [x] Restructure from ICM stages to Claude Code plugin format
- [x] Evaluate and adopt Papyr Core (markdown, graph, search, analytics)
- [x] Build init skill (questionnaire + scaffolding)
- [x] Stub scout, ingest, compile, present, serve
- [x] Distribute stage contracts and specs to skill references

## Phase 2 — Core Pipeline (Complete)
- [x] scout: web research, confidence scoring, human review checkpoint
- [x] ingest: fetch approved sources, raw preservation, article compilation
- [x] compile: Papyr Core graph + backlinks + overview evolution + gap analysis
- [x] Emergent taxonomy engine (propose categories after 5-10 sources)
- [x] scout-queue.md → ingest handoff workflow (verified: init creates, scout reads, ingest consumes)

## Phase 3 — Frontend (Complete)
- [x] present: static site generation (lib/present/ — 12 modules, 2113 lines)
- [x] design.md → CSS custom properties pipeline (7 palettes, 5 typography options, motion, density)
- [x] Linear reading mode (centrality-ordered, TOC, reading progress)
- [x] Search + answer mode (client-side full-text search)
- [x] Graph exploration (D3 force-directed graph, inlined d3, zero CDN dep)
- [x] Changelog / feed mode (timeline from wiki/log.md)
- [x] Gap map visualization (tag-based coverage grid)
- [x] Flashcard / quiz mode (auto-generated Q&A from article sections)
- [x] Article subtitles rendered from frontmatter `summary` (v0.2.2)

## Phase 4 — MCP Server (Complete for launch)
- [x] serve: custom MCP server (lib/serve.ts, @modelcontextprotocol/sdk ^1.29.0)
- [x] grimoire_query, grimoire_list_topics, grimoire_get_article
- [x] grimoire_open_questions, grimoire_coverage_gaps, grimoire_search
- [x] **grimoire_get_section** — section-level addressing (v0.2.2)
- [x] **grimoire_get_article token guard** — auto summary envelope for large articles (v0.2.2)
- [x] **Article index with summaries in list_topics** — Karpathy routing pattern (v0.2.2)
- [x] **Hybrid query reranking** — FlexSearch + substring + title/summary bonus (v0.2.2)
- [x] **Search index graceful fallback** — substring search when FlexSearch export fails (v0.2.2)
- [ ] Claude Desktop MCP end-to-end compatibility test — **deferred to v0.3**

## Phase 5 — Polish & Distribution (Launch-critical items complete)
- [x] Flashcard / quiz mode (included in Phase 3)
- [x] init v0.2.0 with project auto-discovery
- [x] LICENSE, README with marketplace install, plugin manifest with homepage/repository
- [x] **examples/mcp — reference knowledge base for end-to-end validation** (v0.2.2)
- [x] **docs/launch-readiness.md — consolidated audit + decision scratchpad** (v0.2.2)
- [ ] Comparison tables + learning paths study modes — **deferred (post-launch polish)**
- [ ] Standalone CLI wrapper (`grimoire init` binary) — **deferred (post-launch convenience)**
- [ ] GitHub template repository — **deferred (post-launch distribution)**

## Phase 6 — Launch (In progress)
- [x] **Public GitHub repo** — live at [vedantggwp/grimoire](https://github.com/vedantggwp/grimoire)
- [x] **Published through Athanor marketplace** — install via `/plugin install grimoire@athanor`
- [x] **Real-project validation** — full pipeline run against examples/mcp produces 5-article P0 KB with 23 cross-refs, graph density 0.411 (v0.2.2)
- [x] **End-to-end regression suite** — test/examples-mcp.smoke.test.ts locks in the full contract with 22 assertions (v0.2.2)
- [x] **v0.2.3 Option F shipping fix pass** — 18 concrete design + UX fixes across `lib/present/` so the generated frontend clears Ved's quality bar; decisions.md entry captures the full trail; 129/129 tests still green; desktop + dark + mobile verified
- [x] **README + docs refresh for v0.2.3** — updated palette/typography counts (8 palettes, 6 typography systems), added example use cases section, updated gaps/quiz descriptions to match actual shipping behavior, added badges row
- [x] **Launch announcement draft refreshed to v0.2.3** — `docs/launch-announcement-draft.md` updated with the Option F frontend narrative
- [ ] Launch announcement published — **Ved's call, Ved's voice**
- [ ] Share with community — **Ved's call, Ved's networks**
- [ ] Claude Desktop end-to-end MCP compatibility test — **deferred to v0.3**

## Phase 7 — v0.2.4 Quality Pass (Complete)
- [x] **25-bug dogfood quality pass across present + serve** — schema parser hardening, static wikilink resolution, hub stat cleanup, progress-bar placement, small-corpus layout/graph fixes, CSS polish, and Zod article validation all landed with regression tests; 154/154 tests green
- [x] **Meta-grimoire regression targets closed** — full topic string preserved, hub lead never empty, no papyr `#/note/` links in rendered article HTML, read-mode hash navigation works, small corpora show `graph density: N/A`
- [ ] **v0.2.5 compile skill hardening** — taxonomy proposal enforcement and overview evolution enforcement remain deferred because bugs 11/12 are compile-skill behaviors, not `lib/compile.ts` runtime gaps

### v0.3.0 — One-command flow (shipped 2026-04-16)

- `/grimoire:run` orchestrator: one command, two taste checkpoints
- Smart defaults from topic inference (`lib/defaults.ts`)
- Template inheritance (`lib/templates.ts`, `--from` flag)
- Batch ingest mode (skip per-source approval in orchestrated flow)
- Inline reconfiguration at final review (palette, typography, content changes)
- Incremental mode for growing existing grimoires
- Progressive disclosure: `--guided`, `--review-angles`, `--sequential` flags

## Post-launch (v0.3+)

These are all explicitly deferred from v0.2.2 so the launch stays focused:

- Claude Desktop + Cursor end-to-end MCP compatibility testing
- Cursor-style pagination on list-returning MCP tools (`cursor` / `nextCursor`, `totalMatches`)
- Per-claim confidence + provenance triples in article frontmatter
- Freshness / staleness telemetry (lag-from-source, auto-flag stale articles)
- Code-execution retrieval pattern (agent writes queries against the graph rather than pre-loading tool schemas)
- Comparison tables + learning paths study modes
- Standalone CLI wrapper
- GitHub template repository
- v2 SDK migration (@modelcontextprotocol/sdk 2.x when stable)

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
- [ ] Launch announcement draft — see `docs/launch-announcement-draft.md` (ready for Ved's review)
- [ ] Share with community — **Ved's call, Ved's networks**
- [ ] Claude Desktop end-to-end MCP compatibility test — **deferred to v0.3**

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

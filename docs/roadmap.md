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
- [x] Graph exploration (D3 force-directed graph via CDN)
- [x] Changelog / feed mode (timeline from wiki/log.md)
- [x] Gap map visualization (tag-based coverage grid)
- [x] Flashcard / quiz mode (auto-generated Q&A from article sections)

## Phase 4 — MCP Server (Complete)
- [x] serve: custom MCP server (lib/serve.ts — 419 lines, @modelcontextprotocol/sdk)
- [x] grimoire_query, grimoire_list_topics, grimoire_get_article
- [x] grimoire_open_questions, grimoire_coverage_gaps, grimoire_search
- [ ] Claude Desktop compatibility testing

## Phase 5 — Polish & Distribution
- [x] Flashcard / quiz mode (included in Phase 3)
- [x] init v0.2.0 with project auto-discovery
- [ ] Comparison tables + learning paths
- [ ] CLI wrapper (`grimoire init`, `grimoire scout`, etc.)
- [ ] GitHub template repository
- [ ] README and distribution guide

## Phase 6 — Launch
- [ ] Claude Desktop compatibility test (end-to-end MCP connection)
- [ ] First real-project test in an existing codebase
- [ ] Launch announcement draft
- [ ] Public GitHub repo creation
- [ ] Share with community

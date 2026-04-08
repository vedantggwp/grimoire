# Manifest

## Root — ICM Layers 0-1
- `CLAUDE.md` — L0 context (~400 words). Project identity, core rules, routing pointer
- `CONTEXT.md` — L1 router (~200 words). Stage map and decision tree
- `SOUL.md` — Product bible. Source of truth for architecture, features, boundaries, roadmap

## Stages — ICM Layer 2
- `stages/01-scout/CONTEXT.md` — Scout stage contract: research, score, curate sources
- `stages/02-ingest/CONTEXT.md` — Ingest stage contract: fetch, preserve raw, compile wiki articles
- `stages/03-compile/CONTEXT.md` — Compile stage contract: cross-refs, backlinks, overview, gaps
- `stages/04-present/CONTEXT.md` — Present stage contract: generate study-oriented frontend
- `stages/05-serve/CONTEXT.md` — Serve stage contract: MCP server, local dev, CLAUDE.md snippet

## Config — ICM Layer 3
- `_config/design.md` — Theme configuration: palette, typography, motion, density
- `_config/schema-template.md` — Template SCHEMA.md populated per wiki instance

## Shared — ICM Layer 3
- `shared/confidence-scoring.md` — 6-signal scoring rubric for scout stage (P0/P1/P2 tiers)

## Templates — ICM Layer 3
- `templates/article-template.md` — Wiki article format with frontmatter
- `templates/raw-template.md` — Raw source preservation format
- `templates/archive-template.md` — Archived query answer format
- `templates/index-template.md` — Index table format

## Setup
- `setup/questionnaire.md` — One-time onboarding: 7 questions, flat format, output mapping

## Architecture Diagrams
- `docs/architecture/system-overview.d2` — Full 5-stage pipeline with human checkpoints and data flow
- `docs/architecture/system-overview.svg` — Rendered SVG
- `docs/architecture/context-layers.d2` — ICM 5-layer context model with token budgets
- `docs/architecture/context-layers.svg` — Rendered SVG
- `docs/architecture/mcp-server.d2` — MCP server: 6 tools, clients, QMD integration
- `docs/architecture/mcp-server.svg` — Rendered SVG
- `docs/architecture/frontend-modes.d2` — 6 core frontend study modes with data sources
- `docs/architecture/frontend-modes.svg` — Rendered SVG

## Recent Changes
- 2026-04-08: Initialized Grimoire project with ICM architecture
- 2026-04-08: Created SOUL.md — product bible (15 sections, ~3500 words)
- 2026-04-08: Created CLAUDE.md (L0) and CONTEXT.md (L1) — context layers
- 2026-04-08: Created 5 stage CONTEXT.md files — ICM stage contracts
- 2026-04-08: Created setup/questionnaire.md — 7-question onboarding
- 2026-04-08: Created 4 templates, design.md, schema-template.md, confidence-scoring.md
- 2026-04-08: Created 4 D2 architecture diagrams with SVG renders

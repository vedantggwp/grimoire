# CONTEXT.md

Route by **job**, not by file type.
This is the L1 router. Its job is only to answer: **Where do I go?**

## Stage Map

- `01-scout` — Research a topic, find sources, score confidence, and produce a curated URL list.
- `02-ingest` — Fetch approved sources, preserve raw text, and turn them into wiki articles.
- `03-compile` — Build backlinks, cross-references, overview updates, taxonomy, and gap analysis.
- `04-present` — Turn wiki content into the study-oriented frontend and visual presentation layer.
- `05-serve` — Expose the knowledge base through MCP, local serving, and integration/runtime setup.

## Decision Tree

- User wants to research or discover sources: go to `stages/01-scout/`
- User wants to add, fetch, or process a source: go to `stages/02-ingest/`
- User wants cross-refs, backlinks, overview evolution, or gaps: go to `stages/03-compile/`
- User wants frontend, design, HTML/CSS/JS, or study UI work: go to `stages/04-present/`
- User wants MCP, serving, or tool access: go to `stages/05-serve/`

## Quick Rules

- Read only the selected stage's `CONTEXT.md` next.
- Stay inside one stage unless the user explicitly requests a handoff.
- If routing is ambiguous, check `SOUL.md`, decide the stage, then continue.

# Ecosystem Research — Obsidian + Open Source

> Researched 2026-04-08. Findings that inform Grimoire's build decisions.

## Key Libraries to Use

| Library | License | Stars | What it gives us |
|---------|---------|-------|-----------------|
| **Papyr Core** (`papyr-core`) | MIT | New | Markdown parsing, graph building, search indexing, backlink resolution, folder hierarchy. `buildFromDirectory()` returns `{ notes, graph, searchIndex, folderHierarchy }`. Closest existing library to Grimoire's core engine. |
| **FlexSearch** | Apache-2.0 | 13,653 | Full-text search. Fast, browser-compatible. Powers Quartz's search. |
| **D3.js v7** | ISC | — | Force simulation for graph visualization. |
| **PixiJS v8** | MIT | — | WebGL rendering for graph nodes/edges (faster than SVG at scale). |
| **remark/rehype** (unified) | MIT | — | Markdown processing pipeline. Pluggable, standard ecosystem. |
| **remark-wiki-link** | MIT | 106 | Wikilink `[[slug]]` resolution for remark. |
| **gray-matter** | MIT | — | YAML frontmatter parsing. |

## Alternative: react-force-graph

If frontend is React-based, `vasturiano/react-force-graph` (MIT, 3K stars) is the fastest path to interactive graph exploration — wraps D3 + Three.js for 2D/3D/VR.

## Architecture Patterns to Adopt

1. **MetadataCache** (from Obsidian) — Pre-index all links, tags, headings at ingest time into a queryable cache. Don't parse on every read.

2. **ContentIndexMap** (from Quartz) — Single JSON blob: `slug → { title, links[], tags[], content, date }`. Data contract between compile stage and frontend.

3. **Markdown as database** (from Dataview) — Frontmatter + inline fields + links = queryable structured data. This is what the MCP server queries against.

## Obsidian CLI

No official CLI exists. Community alternative: **NotesMD CLI** (`Yakitrak/notesmd-cli`) — MIT, Go, 1,349 stars. Headless vault operations without Obsidian running. Command structure (`create`, `search`, `list`) maps to Grimoire's needs.

## Quartz's OFM Transformer

`ofm.ts` — 150 lines of regex/AST transforms for `[[wikilinks]]`, `#tags`, `==highlights==`, callouts, block references. MIT. The definitive open-source implementation.

## Existing Obsidian MCP Servers

All require Obsidian running (use Local REST API plugin). Grimoire's advantage: works directly on markdown files, no Obsidian dependency.

## What NOT to Use

- **MkDocs Publisher Template** — AGPL-3.0, not usable commercially without open-sourcing
- **Obsidian app internals** — proprietary, closed source

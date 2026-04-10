# Papyr Core — Reference

> MIT license. TypeScript. npm package. Framework-agnostic.
> Repo: `Ray-kong/papyr-core`

## What It Does

A library specifically for building markdown-based knowledge management systems. It takes a directory of markdown files and returns structured data: parsed notes, a graph of connections, a search index, and a folder hierarchy.

## Core API

```typescript
import { PapyrBuilder } from 'papyr-core';

const result = PapyrBuilder.buildFromDirectory('./wiki');
// Returns:
// {
//   notes: Note[],           // Parsed markdown with frontmatter, links, tags
//   graph: Graph,            // Node/edge graph of cross-references
//   searchIndex: SearchIndex, // Full-text search index
//   folderHierarchy: Folder   // Directory tree structure
// }
```

## What It Handles

- Wikilink parsing (`[[slug]]` resolution)
- Backlink resolution (bidirectional)
- Graph analysis (orphan detection, centrality)
- Full-text search indexing
- Folder hierarchy building
- JSON export

## Why It Matters for Grimoire

This is the closest existing library to what Grimoire's compile and serve stages need. Instead of building markdown parsing, graph construction, and search indexing from scratch, Papyr Core could be the engine that:
- Stage 03 (compile) uses for cross-reference audit and graph analysis
- Stage 05 (serve) uses for MCP server query resolution
- Stage 04 (present) uses for the ContentIndexMap that feeds the frontend

## Evaluation Result

Adopted 2026-04-08. Verified in production use via `lib/compile.ts` and the
79-test suite.

Confirmed:
- **Custom frontmatter** — passes through `title`, `tags`, `sources`, `updated`, `confidence` as-is via `ParsedNote.metadata`
- **Wikilink resolution** — `[[category/slug]]` strips the path prefix and resolves to `slug` (quirk, not a bug — compile stage handles disambiguation via the `notes.json` manifest)
- **Search index serialization** — `exportSearchIndex()` and `importSearchIndex()` provide full round-trip for serve to reload the index
- **Performance** — benchmarked on sample-wiki fixture (7 notes): ~69ms full build. Scales linearly with note count.
- **Maintenance** — actively maintained, v1.0.0 on npm (MIT), 12 transitive deps (flexsearch, gray-matter, remark, rehype).

Used by: `compile` (graph analysis, link validation, analytics) and
`serve` (search index import at server startup).

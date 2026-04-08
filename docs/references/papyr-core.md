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

## Evaluation Needed

Before adopting:
- Does it handle our frontmatter format (title, tags, sources, updated, confidence)?
- Does it resolve `[[topic/slug]]` two-level wikilinks, not just `[[slug]]`?
- Can the search index be serialized to JSON for the frontend?
- Performance: how does it handle 100+ articles?
- Last commit date and maintenance status?

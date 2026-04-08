# FlexSearch — Reference

> Apache-2.0 license. 13,653 stars. Browser + Node.js compatible.
> Repo: `nextapps-de/flexsearch`

## What It Does

Full-text search library. Indexes text, returns ranked results. Used by Quartz for wiki search.

## Basic Usage

```javascript
import FlexSearch from 'flexsearch';

// Create index
const index = new FlexSearch.Index({
  tokenize: 'forward',  // or 'reverse', 'full', 'strict'
  resolution: 9,         // scoring resolution (1-9)
  cache: true
});

// Add documents
index.add(0, 'Claude Code for design workflows');
index.add(1, 'Figma MCP server integration');

// Search
const results = index.search('figma');
// → [1]
```

## Document Store (for structured data)

```javascript
const store = new FlexSearch.Document({
  document: {
    id: 'slug',
    index: ['title', 'content', 'tags'],
    store: ['title', 'slug', 'description', 'updated']
  },
  tokenize: 'forward'
});

// Add article
store.add({
  slug: 'figma/mcp-server',
  title: 'Figma MCP Server',
  content: 'The 16-tool MCP server for reading designs...',
  tags: ['figma', 'mcp', 'integration'],
  description: 'Setup and usage guide',
  updated: '2026-04-08'
});

// Search returns stored fields
const results = store.search('mcp server', { enrich: true });
```

## For Grimoire's Frontend

The search + answer mode needs:
1. At build time (stage 04): index all articles from ContentIndexMap
2. Serialize index to JSON
3. At runtime: load JSON, create FlexSearch instance, search on user input
4. Display results with title, description, and link to article

```javascript
// Export for static site
const exportedIndex = index.export();

// Import in browser
const clientIndex = new FlexSearch.Index();
clientIndex.import(exportedIndex);
```

## Why Not Lunr.js or Fuse.js?

- **Lunr** — smaller but no incremental indexing, older API
- **Fuse** — fuzzy matching focused, not full-text search
- **FlexSearch** — fastest benchmarks, best tokenization options, actively maintained

# Quartz Patterns — Reference

> Repo: `jackyzha0/quartz` — 11,745 stars, MIT, TypeScript
> The dominant open-source Obsidian Publish alternative.

## ContentIndexMap — The Data Contract

The format that connects the build step to the frontend. A single JSON blob emitted at build time.

```typescript
type ContentIndexMap = Map<FullSlug, ContentDetails>;

interface ContentDetails {
  slug: string;
  filePath: string;
  title: string;
  links: SimpleSlug[];    // outgoing wikilinks
  tags: string[];
  content: string;        // raw text for search
  richContent: string;    // rendered HTML
  date: Date;
  description: string;
}
```

**For Grimoire:** This is the shape of the JSON that stage 04 (present) would emit for the frontend to consume. Every frontend mode reads from this map.

## Graph Component

**Stack:** D3.js v7 (force simulation) + PixiJS v8 (WebGL rendering) + Tween.js (animations)

**Two modes:**
- Local graph: depth-limited neighborhood around current article
- Global graph: entire wiki

**D3Config (configurable):**

```typescript
interface D3Config {
  drag: boolean;          // allow node dragging
  zoom: boolean;          // allow zoom
  depth: number;          // local graph depth (-1 = global)
  scale: number;          // layout scale factor
  repelForce: number;     // node repulsion strength
  centerForce: number;    // pull toward center
  linkDistance: number;    // ideal edge length
  fontSize: number;       // node label size
  opacityScale: number;   // link opacity scaling
  removeTags: string[];   // tags to exclude from graph
  showTags: boolean;      // render tag nodes
  focusOnHover: boolean;  // dim non-neighbors on hover
  enableRadial: boolean;  // radial force layout
}
```

**How it works:**
1. Fetch the `ContentIndexMap` JSON
2. Build node array (one per article) and link array (one per wikilink)
3. Initialize D3 force simulation with the config
4. Render nodes and edges with PixiJS WebGL
5. On click, navigate to article; on hover, highlight neighbors

## OFM Transformer (Obsidian-Flavored Markdown)

`ofm.ts` — ~150 lines. Handles:
- `[[wikilinks]]` — with alias support `[[slug|display text]]`
- `#tags` — inline tags
- `==highlights==` — highlighted text
- `%%comments%%` — hidden comments
- `^block-references` — block-level references
- Callouts — `> [!note]` syntax

**The wikilink regex:**
```regex
/!?\[\[([^\[\]\|\#\\]+)?(#+[^\[\]\|\#\\]+)?(\\?\|[^\[\]\#]*)?\]\]/g
```

Groups: `[1]` = slug, `[2]` = heading anchor, `[3]` = display alias

## Markdown Pipeline

Quartz uses the unified/remark/rehype pipeline:

```
markdown text
  → remark-parse (→ MDAST)
  → remark-gfm (tables, strikethrough)
  → remark-frontmatter (YAML parsing)
  → custom OFM transformer (wikilinks, tags, callouts)
  → remark-rehype (→ HAST)
  → rehype-stringify (→ HTML)
```

All MIT licensed. Standard ecosystem.

## Search

Uses **FlexSearch** (Apache-2.0, 13,653 stars):
- Indexes the `content` field from ContentIndexMap
- Browser-compatible, works in static sites
- Supports tokenization, stemming, and ranking

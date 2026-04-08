# Remark/Rehype Pipeline — Reference

> All MIT licensed. The standard markdown processing ecosystem in JS/TS.

## The Pipeline

```
markdown string
  → remark-parse          → MDAST (Markdown AST)
  → remark-gfm            → adds tables, strikethrough, autolinks
  → remark-frontmatter    → extracts YAML frontmatter
  → remark-wiki-link      → resolves [[wikilinks]]
  → custom transforms     → any additional processing
  → remark-rehype         → HAST (HTML AST)
  → rehype-stringify       → HTML string
```

## Key Packages

```bash
npm install unified remark-parse remark-gfm remark-frontmatter remark-rehype rehype-stringify
npm install remark-wiki-link   # for [[wikilink]] support
npm install gray-matter         # standalone YAML frontmatter parser
```

## Basic Usage

```javascript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const result = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(markdownString);

console.log(String(result)); // HTML output
```

## Wikilink Plugin

```javascript
import wikiLinkPlugin from 'remark-wiki-link';

// Configure for Grimoire's [[topic/slug]] format
.use(wikiLinkPlugin, {
  pageResolver: (name) => [name.replace(/\s+/g, '-').toLowerCase()],
  hrefTemplate: (permalink) => `/wiki/${permalink}`,
  aliasDivider: '|'  // supports [[slug|display text]]
})
```

**Repo:** `landakram/remark-wiki-link` — 106 stars, MIT.

## Frontmatter Extraction (Standalone)

For cases where you just need frontmatter without the full pipeline:

```javascript
import matter from 'gray-matter';

const { data, content } = matter(markdownString);
// data = { title: '...', tags: [...], sources: [...], updated: '...' }
// content = markdown body without frontmatter
```

## Quartz's OFM Wikilink Regex

For full Obsidian-flavored markdown support beyond basic wikilinks:

```regex
/!?\[\[([^\[\]\|\#\\]+)?(#+[^\[\]\|\#\\]+)?(\\?\|[^\[\]\#]*)?\]\]/g
```

- Group 1: slug (`figma/mcp-server`)
- Group 2: heading anchor (`#setup`)
- Group 3: display alias (`|Figma MCP`)

Full match examples:
- `[[figma/mcp-server]]` → slug only
- `[[figma/mcp-server#setup]]` → slug + heading
- `[[figma/mcp-server|Figma MCP]]` → slug + alias
- `![[image.png]]` → embed (leading `!`)

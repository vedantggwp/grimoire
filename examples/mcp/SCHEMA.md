# SCHEMA.md

> Conventions, taxonomy, and structure for this Grimoire wiki.
> Every stage reads this file. Edit it to reshape the entire knowledge base.

---

## Domain

```yaml
topic: "Model Context Protocol for AI engineers"
scope:
  in: "The MCP specification, server design, TypeScript SDK, tool-response token efficiency, and client integration with Claude Desktop, Claude Code, and Cursor"
  out: "Legacy plugin formats, unrelated AI protocols, product marketing"
audience: "Senior engineers building MCP servers or clients"
taxonomy: "emergent"
```

The domain block is YAML. Keep it exactly this shape — scout, ingest, compile,
present, and serve all parse the nested `scope.in` / `scope.out` fields.

---

## Taxonomy

Categories organize wiki articles into directories under `wiki/`.

| Directory | Description | Example Articles |
|-----------|-------------|-----------------|
| | | |

> This wiki uses emergent taxonomy — the compile stage will propose categories
> after more articles are ingested. The initial 5-article set is flat.

---

## Cross-Reference Format

Link between wiki articles using double-bracket notation:

```
[[slug]]
```

- `slug` is the article filename without `.md`
- Example: `[[mcp-overview]]` links to `wiki/mcp-overview.md`

Backlinks are bidirectional. When article A references article B, the compile stage ensures article B's "See Also" section links back to article A.

---

## Frontmatter Conventions

### Wiki Articles

Required fields:

```yaml
---
title: "Human-readable title"
summary: "One sentence under 180 characters describing what this article covers."
tags: [lowercase, hyphenated, relevant]
sources:
  - url: "https://..."
    title: "Source title"
    accessed: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: P0 | P1 | P2
---
```

The `summary` field is load-bearing: LLMs querying the wiki use it to decide
which articles to fetch in full. Keep it factual, specific, and one sentence.

---

## Conventions

1. **One article, one concept** — Split broad topics into focused articles
2. **Every article has a one-line summary** — LLM routing depends on it
3. **No orphan pages** — Every article must have at least one incoming or outgoing cross-reference
4. **Tags are lowercase and hyphenated** — `design-systems`, not `Design Systems`
5. **Dates are ISO 8601** — `YYYY-MM-DD`, no exceptions
6. **Filenames are slugified** — Lowercase, hyphens, no spaces
7. **Overview evolves** — `wiki/overview.md` is rewritten after every compile
8. **Log is append-only** — `wiki/log.md` records every operation chronologically

---

*This example workspace was built as the end-to-end launch-readiness validation for Grimoire v0.2.2. Articles cover the Model Context Protocol as a reference topic AI engineers actually care about.*

# SCHEMA.md

> Conventions, taxonomy, and structure for this Grimoire wiki.
> Every stage reads this file. Edit it to reshape the entire knowledge base.

---

## Domain

```
topic: [YOUR TOPIC HERE]
scope: [WHAT'S IN / WHAT'S OUT]
audience: [WHO READS THIS AND AT WHAT LEVEL]
```

---

## Taxonomy

Categories organize wiki articles into directories under `wiki/`.

| Directory | Description | Example Articles |
|-----------|-------------|-----------------|
| | | |

> If using emergent taxonomy, this table is empty until the compile stage
> proposes categories after 5-10 sources are ingested. If using defined
> taxonomy, populate this table during onboarding.

---

## Cross-Reference Format

Link between wiki articles using double-bracket notation:

```
[[topic/slug]]
```

- `topic` matches a taxonomy directory name from the table above
- `slug` is the article filename without `.md`
- Example: `[[fundamentals/getting-started]]` links to `wiki/fundamentals/getting-started.md`

Backlinks are bidirectional. When article A references article B, the compile stage ensures article B's "See Also" section links back to article A.

---

## Raw Source Naming

Raw sources are stored in `raw/` and named by convention:

```
raw/{topic}/{YYYY-MM-DD}-{slug}.md
```

- `topic` matches the taxonomy directory
- Date is the collection date (when it was fetched), not the publication date
- `slug` is a URL-safe lowercase identifier derived from the source title
- Example: `raw/tooling/2026-04-08-claude-code-official-docs.md`

---

## Frontmatter Conventions

### Wiki Articles

Required fields:

```yaml
---
title: "Human-readable title"
tags: [lowercase, hyphenated, relevant]
sources:
  - url: "https://..."
    title: "Source title"
    accessed: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: P0 | P1 | P2
---
```

### Raw Sources

Required fields:

```yaml
---
source_url: "https://..."
collected: YYYY-MM-DD
published: YYYY-MM-DD
type: article | documentation | tutorial | video-transcript | thread | repository | paper
author: "Author Name"
title: "Original Title"
---
```

---

## Conventions

1. **One article, one concept** — Split broad topics into focused articles
2. **No orphan pages** — Every article must have at least one incoming or outgoing cross-reference
3. **Sources are immutable** — Never edit files in `raw/`. Fix errors in the wiki article instead
4. **Tags are lowercase and hyphenated** — `design-systems`, not `Design Systems` or `design_systems`
5. **Dates are ISO 8601** — `YYYY-MM-DD`, no exceptions
6. **Filenames are slugified** — Lowercase, hyphens, no spaces. `getting-started.md`, not `Getting Started.md`
7. **Overview evolves** — `wiki/overview.md` is rewritten after every compile, never manually edited
8. **Log is append-only** — `wiki/log.md` records every operation chronologically, never truncated

---

*This file is the source of truth for wiki structure. All stages consult it. Update it when the taxonomy evolves.*

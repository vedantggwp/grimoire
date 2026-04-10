# Ingest Stage Contract

Fetch approved sources, preserve raw text, and compile structured wiki articles.

## Inputs
| Source | Purpose |
|--------|---------|
| `approved-sources.md` | Source list from scout (or direct user input) |
| `SCHEMA.md` | Topic, scope, taxonomy, naming conventions |
| `wiki/index.md` | Existing article inventory |
| `wiki/*.md` | Existing articles (for merge decisions) |
| Templates: `${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/raw-template.md` | Raw source format |
| Templates: `${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/article-template.md` | Article format |

## Process
1. Identify the next pending source from approved-sources.md (highest priority first).
2. Fetch the source content (WebFetch for URLs, Read for files, use pasted text as-is).
3. Save raw file to `raw/{topic-slug}/{date}-{source-slug}.md` (immutable after creation).
4. Extract 3-5 takeaways and map to existing or new articles.
5. Present proposed actions to user.
   → CHECKPOINT: approval required before writing any wiki article.
6. Write/update wiki articles with cross-references and backlinks.
7. Update wiki/index.md, wiki/overview.md, wiki/log.md.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Raw source | `raw/{topic-slug}/{date}-{source-slug}.md` | Immutable raw preservation |
| Wiki articles | `wiki/{slug}.md` or `wiki/{category}/{slug}.md` | Markdown with frontmatter |
| Updated navigators | `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | Markdown |

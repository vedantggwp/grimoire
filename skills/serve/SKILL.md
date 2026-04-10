---
name: serve
description: >-
  Use this skill when the user wants to expose a grimoire via MCP, set up the
  local server, generate CLAUDE.md integration, or says "grimoire serve",
  "start MCP server", "serve wiki", or "/grimoire:serve". Creates a custom
  MCP server with 6 tools for LLM-queryable knowledge access.
version: 0.1.0
---

# serve

Expose a grimoire through a custom MCP server with 6 query tools over stdio.

## Prerequisites

- A grimoire workspace must exist — check for `SCHEMA.md`.
  If missing, tell the user to run `/grimoire:init` first.
- The `wiki/.compile/` directory must exist with JSON artifacts.
  If missing, tell the user to run `/grimoire:compile` first.

## Step 1 — Locate the Grimoire

1. Look for `SCHEMA.md` in the current directory first
2. If not found, ask the user for the workspace path
3. Verify `wiki/.compile/` exists and contains `notes.json`, `graph.json`,
   `analytics.json`, `search-index.json`
4. Check if any `wiki/*.md` file is newer than `wiki/.compile/graph.json`.
   If so, warn: "Your wiki has been updated since the last compile. Run
   `/grimoire:compile` first for accurate results, or continue with the
   current index?" Wait for user response before proceeding.

## Step 2 — Start the MCP Server

The MCP server runs as a long-lived process over stdio:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/serve.js {workspace-path}
```

This loads:
- `wiki/.compile/notes.json` — article manifest
- `wiki/.compile/graph.json` — graph structure
- `wiki/.compile/analytics.json` — content analytics
- `wiki/.compile/search-index.json` — FlexSearch index (imported via papyr-core)
- `wiki/overview.md` — for open questions extraction
- `wiki/*.md` — for full article retrieval
- `SCHEMA.md` — topic and scope metadata

And exposes 6 MCP tools:

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `grimoire_query` | Synthesize an answer from wiki articles | Medium |
| `grimoire_list_topics` | Return taxonomy with article counts | Low |
| `grimoire_get_article` | Return a specific article by slug | Low |
| `grimoire_open_questions` | Return unresolved questions from overview | Low |
| `grimoire_coverage_gaps` | Return topics with thin or missing coverage | Low |
| `grimoire_search` | Full-text search across all content | Medium |

## Step 3 — Generate CLAUDE.md Integration (optional)

Ask the user: "Would you like to add an MCP server reference to a project's CLAUDE.md?"

If yes, ask for the target CLAUDE.md path and append:

```markdown
## Grimoire Wiki — {topic}

This project has a curated knowledge base served via MCP.

### MCP Server Configuration

Add to your `.mcp.json` or Claude Desktop config:

\```json
{
  "mcpServers": {
    "grimoire-{topic-slug}": {
      "command": "node",
      "args": ["{absolute-path-to-plugin}/dist/serve.js", "{absolute-path-to-workspace}"]
    }
  }
}
\```

### Available Tools

- `grimoire_query` — ask a question, get a synthesized answer with sources
- `grimoire_list_topics` — see what the wiki covers
- `grimoire_get_article` — read a specific article
- `grimoire_open_questions` — see what's still unresolved
- `grimoire_coverage_gaps` — find what's missing
- `grimoire_search` — full-text search

### Rules

- Consult the wiki before answering domain questions
- Prefer wiki articles over guessing
- If the wiki doesn't cover a topic, say so — don't fabricate
```

Also generate a `.mcp.json` snippet the user can add to their project or
Claude Desktop configuration.

## Step 4 — Report

Print:

```
MCP server ready.

  Workspace: {workspace-path}
  Transport: stdio
  Tools:     6 registered
  Articles:  {N} indexed
  Search:    FlexSearch index loaded ({N} documents)

  To connect from Claude Desktop, add to .mcp.json:
    "grimoire-{topic-slug}": {
      "command": "node",
      "args": ["{plugin-path}/dist/serve.js", "{workspace-path}"]
    }

  To test: run a query tool from any MCP client.
```

## Step 5 — Update wiki/log.md

Append:

```markdown
## {YYYY-MM-DD} — MCP Server Configured

- Tools: grimoire_query, grimoire_list_topics, grimoire_get_article, grimoire_open_questions, grimoire_coverage_gaps, grimoire_search
- Articles indexed: {N}
- Integration: {CLAUDE.md path if configured, or "none"}
```

## Tool Details

### grimoire_query

Synthesizes an answer from wiki articles. Searches the FlexSearch index,
finds the top matching articles, and returns relevant excerpts with source
attribution. Best for "what does the wiki say about X?" questions.

### grimoire_list_topics

Returns the wiki's taxonomy — either defined categories from SCHEMA.md or
emergent tag-based topics. Includes article counts per category. Useful for
understanding the wiki's scope.

### grimoire_get_article

Returns the full markdown content of a specific article by slug. Use when
the LLM needs the complete article text for detailed analysis.

### grimoire_open_questions

Parses `wiki/overview.md` and extracts the "Open Questions" section. Returns
unresolved questions that the wiki raises but doesn't answer. Useful for
identifying research directions.

### grimoire_coverage_gaps

Identifies thin or missing coverage: tags with only one article, articles
significantly shorter than the median, and topics referenced in articles
that don't have their own article.

### grimoire_search

Full-text search using the FlexSearch index. Returns ranked results with
slug, title, excerpt, and relevance score. Use for specific keyword or
phrase lookups.

## Validation Rules

- The MCP server reads only — it never modifies wiki files
- All communication is over stdio (stdout for MCP protocol, stderr for logs)
- If `wiki/.compile/` is stale (older than wiki/*.md files), warn the user
  to re-run `/grimoire:compile`
- Use `${CLAUDE_PLUGIN_ROOT}` for the serve script path
- The server should handle errors gracefully — return MCP error responses,
  never crash

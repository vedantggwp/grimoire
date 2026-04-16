---
name: serve
description: >-
  Use this skill when the user wants to expose a grimoire via MCP, set up the
  local server, generate CLAUDE.md integration, or says "grimoire serve",
  "start MCP server", "serve wiki", or "/grimoire:serve". Creates a custom
  MCP server with 6 tools for LLM-queryable knowledge access.
version: 0.2.0
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

## Step 2 — MCP Server Invocation Shape

The MCP server runs as a long-lived process over stdio. It is launched by
the MCP client (Claude Desktop, Claude Code, or any MCP-compatible tool),
not from this skill directly. The invocation shape is:

```bash
node {absolute-serve-js-path} {absolute-workspace-path}
```

At startup the server loads:
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

## Step 3 — Resolve Absolute Paths

MCP client config files (Claude Desktop's `claude_desktop_config.json`,
project `.mcp.json`) are plain JSON — they do NOT expand environment
variables, `~`, or `${CLAUDE_PLUGIN_ROOT}`. Every path must be fully
resolved before it is written into the config.

Use Bash to capture both absolute paths:

```bash
SERVE_JS="$(realpath "${CLAUDE_PLUGIN_ROOT}/dist/serve.js")"
WORKSPACE_ABS="$(realpath "{workspace-path}")"
```

Verify both resolved paths exist. If `realpath` fails on either, stop and
report which path is missing — do not proceed with a broken config.

Derive a short server name from the `SCHEMA.md` `topic` field: lowercase,
replace spaces with dashes, strip non-ASCII, take the first 2–3 meaningful
words, prefix with `grimoire-`. Example: topic "Model Context Protocol"
→ `grimoire-mcp`.

## Step 4 — Write Pre-Filled MCP Config Snippet

Write a ready-to-paste JSON block to `{workspace}/mcp-config-snippet.json`
using the resolved paths from Step 3:

```json
{
  "mcpServers": {
    "{server-name}": {
      "command": "node",
      "args": [
        "{SERVE_JS}",
        "{WORKSPACE_ABS}"
      ]
    }
  }
}
```

The file must contain literal absolute paths — no placeholders, no `~`,
no environment variables. The user should be able to copy it straight
into their MCP client config without editing.

Also print the same JSON block inline in the chat so the user can copy
it without opening the file.

Tell the user where to paste it:
- **Claude Desktop**: merge the `mcpServers` entry into
  `~/Library/Application Support/Claude/claude_desktop_config.json`
  (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).
- **Project `.mcp.json`**: drop it into any codebase that wants to query
  this wiki. Commit it if the grimoire is shared with teammates.

Remind the user to **restart the MCP client** after adding the entry —
the server loads `.compile/` artifacts once at startup.

## Step 5 — Generate CLAUDE.md Integration (optional)

Ask the user: "Would you like to add an MCP server reference to a
project's CLAUDE.md?"

If yes, ask for the target CLAUDE.md path and append this block, using
the same resolved paths and server name from Step 3:

```markdown
## Grimoire Wiki — {topic}

This project has a curated knowledge base served via MCP.

### MCP Server Configuration

Add to your `.mcp.json` or Claude Desktop config:

\```json
{
  "mcpServers": {
    "{server-name}": {
      "command": "node",
      "args": [
        "{SERVE_JS}",
        "{WORKSPACE_ABS}"
      ]
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

## Step 6 — Report

Print, using the resolved paths and server name from Step 3:

```
MCP server ready.

  Workspace:  {WORKSPACE_ABS}
  Server:     {server-name}
  Serve JS:   {SERVE_JS}
  Transport:  stdio
  Tools:      6 registered
  Articles:   {N} indexed
  Search:     FlexSearch index loaded ({N} documents)

  Paste into your MCP client config:
  {mcp-config-snippet.json contents}

  Snippet saved to: {workspace}/mcp-config-snippet.json

  Next steps:
    1. Add the block above to your MCP client config
    2. Restart the MCP client
    3. Run grimoire_query or grimoire_list_topics to test
```

## Step 7 — Update wiki/log.md

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

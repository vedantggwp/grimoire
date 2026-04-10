# MCP Server Specification

The custom MCP server is Grimoire's moat. It transforms a folder of markdown into a **knowledge engine** that any AI tool can query.

## Why Not Just QMD?

| | QMD | Grimoire MCP |
|---|---|---|
| **Model** | Generic semantic search | Wiki-aware: taxonomy, cross-refs, overview, open questions |
| **Query** | "Find files about X" | "What do I know about X?" — synthesizes from articles |
| **Structure** | Raw file content | Structured answers with source attribution |
| **Context** | No relationship awareness | Knows which articles link, where gaps are |

## Tool Inventory

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `grimoire_query` | Synthesize an answer from wiki articles | Medium |
| `grimoire_list_topics` | Return taxonomy with article counts | Low |
| `grimoire_get_article` | Return a specific article by slug | Low |
| `grimoire_open_questions` | Return unresolved questions from overview | Low |
| `grimoire_coverage_gaps` | Return topics with thin or missing coverage | Low |
| `grimoire_search` | Full-text search across all content | Medium |

## Architecture

- Lightweight Node.js or Python server
- Reads wiki structure on startup. Restart the server to pick up changes.
- Can wrap QMD for full-text search OR implement native search
- Exposes stdio transport (Claude Desktop, Claude Code, any MCP client)
- Ships with the wiki — `grimoire serve` starts it

## The Moat

Every Grimoire wiki ships its own knowledge engine:
- Claude Desktop users query the wiki without a terminal
- IDE agents access domain knowledge without reading every file
- Multi-project setups have multiple Grimoires, each serving different domains
- The MCP server understands the wiki's SHAPE, not just its TEXT

## Diagram

- [mcp-server.svg](architecture/mcp-server.svg) — Server architecture with tools and clients

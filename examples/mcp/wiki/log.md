# Wiki Log

> Append-only log of every operation on this wiki.

## 2026-04-13 — Rebuilt from real web sources

- **Previous version deleted.** The prior wiki (2026-04-11) was synthesized from training knowledge without running the scout/ingest pipeline. This violated the Grimoire contract: scout finds real sources, ingest fetches real content, articles cite real URLs.
- **Scout**: Searched official MCP documentation (modelcontextprotocol.io spec pages), TypeScript SDK GitHub docs, official MCP blog (blog.modelcontextprotocol.io), community pattern articles (mcpbundles.com, klavis.ai, arcade.dev), and client integration docs (code.claude.com). Scored all sources on the 6-signal rubric. 9 sources approved (5 P0, 4 high-scoring P1).
- **Ingest**: Fetched all 9 sources via WebFetch. Preserved 9 raw source files in `raw/mcp/`. Compiled 5 wiki articles from the real content:
  - `mcp-overview` — protocol spec, architecture, Nov 2025 features (3 sources)
  - `mcp-transports` — stdio + Streamable HTTP, session management (2 sources)
  - `typescript-sdk` — McpServer API, Zod schemas, tool annotations (2 sources)
  - `tool-design-patterns` — six-tool, workflow, progressive discovery, error recovery (3 sources)
  - `client-integration` — Claude Code/Desktop/Cursor/VS Code config (2 sources)
- **Created**: scout-report.md, approved-sources.md, raw/mcp/ (9 files)
- **Updated**: index.md, overview.md, log.md

## 2026-04-11 — Initial bootstrap (superseded)

- Created workspace as the end-to-end launch-readiness validation for Grimoire v0.2.2
- Topic: Model Context Protocol for AI engineers
- 5 articles synthesized from training knowledge — no real sources fetched
- **This version was deleted on 2026-04-13 and rebuilt properly.**

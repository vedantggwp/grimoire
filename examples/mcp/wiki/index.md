---
title: "Index"
---

# Wiki Index

> Master catalog of all articles.

Last updated: 2026-04-13
Total articles: 5

---

## Protocol

| Article | Summary | Updated |
|---------|---------|---------|
| [[mcp-overview]] | MCP is an open JSON-RPC 2.0 protocol connecting LLM applications to external tools, data, and services through a host→client→server architecture with capability negotiation. | 2026-04-13 |
| [[mcp-transports]] | MCP defines two transports: stdio for local subprocess servers and Streamable HTTP for remote servers, with SSE streaming, session management, and resumability. | 2026-04-13 |

## Implementation

| Article | Summary | Updated |
|---------|---------|---------|
| [[typescript-sdk]] | The official @modelcontextprotocol/sdk provides McpServer for registering tools, resources, and prompts with Zod schemas, connecting via stdio or Streamable HTTP. | 2026-04-13 |
| [[tool-design-patterns]] | Patterns for token-efficient MCP tools: six-tool consolidation, workflow bundling, progressive discovery, and error-guided recovery. | 2026-04-13 |

## Deployment

| Article | Summary | Updated |
|---------|---------|---------|
| [[client-integration]] | How to connect MCP servers to Claude Code, Claude Desktop, Cursor, and VS Code using stdio, HTTP, or SSE transports with three configuration scopes. | 2026-04-13 |

---

*This index is updated by the compile stage. Manual edits may be overwritten.*

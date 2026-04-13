# Scout Report — Model Context Protocol for AI Engineers

> Generated: 2026-04-13
> Topic: Model Context Protocol for AI engineers
> Scope: MCP specification, server design, TypeScript SDK, tool-response token efficiency, client integration

---

## P0 — Must Ingest (Score 18-30)

| # | Source | Authority | Credibility | Uniqueness | Depth | Recency | Engagement | Total | Rationale |
|---|--------|-----------|-------------|------------|-------|---------|------------|-------|-----------|
| 1 | [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) | 5 | 5 | 5 | 5 | 5 | 5 | **30** | The canonical spec itself. Defines hosts/clients/servers, JSON-RPC protocol, capability negotiation, security model. No substitute. |
| 2 | [MCP Transport Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) | 5 | 5 | 5 | 5 | 4 | 5 | **29** | Official transport spec. Stdio rules, Streamable HTTP (replaced SSE), session management, resumability. Required reading for any server builder. |
| 3 | [MCP Architecture Specification](https://modelcontextprotocol.io/specification/2025-11-25/architecture) | 5 | 5 | 5 | 5 | 5 | 5 | **30** | Defines the host→client→server model, capability negotiation sequence, design principles, security boundaries. |
| 4 | [TypeScript SDK Server Docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) | 5 | 5 | 5 | 5 | 5 | 5 | **30** | Official SDK documentation. McpServer API, tool/resource/prompt registration, Zod schemas, transport setup, error handling, annotations. |
| 5 | [One Year of MCP: November 2025 Spec Release](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) | 5 | 5 | 4 | 4 | 5 | 4 | **27** | Official blog post. Tasks primitive, OAuth 2.1 simplification, tool annotations, governance move to AAIF/Linux Foundation, ecosystem stats. |

## P1 — Should Ingest (Score 12-17)

| # | Source | Authority | Credibility | Uniqueness | Depth | Recency | Engagement | Total | Rationale |
|---|--------|-----------|-------------|------------|-------|---------|------------|-------|-----------|
| 6 | [The Six-Tool Pattern: MCP Server Design That Scales](https://www.mcpbundles.com/blog/mcp-tool-design-pattern) | 3 | 3 | 4 | 4 | 4 | 3 | **21** | Exceeds P1 threshold. Practical pattern for tool consolidation. Fetch/search/list/upsert/delete with educational descriptions. Directly relevant to token efficiency. |
| 7 | [Less is More: 4 Design Patterns for MCP Servers](https://www.klavis.ai/blog/less-is-more-mcp-design-patterns-for-ai-agents) | 3 | 3 | 5 | 5 | 4 | 3 | **23** | Exceeds P1 threshold. Four patterns (semantic search, workflow-based, code mode, progressive discovery). Quantifies context window cost. |
| 8 | [54 Patterns for Building Better MCP Tools](https://www.arcade.dev/blog/mcp-tool-patterns) | 3 | 3 | 4 | 4 | 4 | 3 | **21** | Exceeds P1 threshold. Agent experience, security boundaries, error-guided recovery, tool composition. Practical classification framework. |
| 9 | [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) | 5 | 5 | 3 | 4 | 5 | 4 | **26** | Exceeds P1 threshold. Official Claude Code MCP client docs. Three scopes, CLI commands, plugin-provided servers, env var expansion. |

## Gaps Identified

- **Python SDK**: Not covered. Scope says TypeScript SDK, so acceptable.
- **MCP Registry / server discovery**: Growing ecosystem (2000+ entries) but not in scope.
- **OAuth 2.1 deep dive**: Covered at overview level in the anniversary post. Full auth spec could be a future article.
- **Tasks primitive implementation**: New in Nov 2025, covered at concept level. No production implementation guides found yet.

## Search Angles Used

1. Official docs: modelcontextprotocol.io specification pages
2. Official SDK: github.com/modelcontextprotocol/typescript-sdk docs
3. Official blog: blog.modelcontextprotocol.io
4. Community patterns: mcpbundles.com, klavis.ai, arcade.dev
5. Client integration: code.claude.com official docs
6. Production practices: thenewstack.io (paywall blocked content extraction)

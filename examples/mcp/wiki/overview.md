---
title: "Overview"
summary: "A synthesis of the MCP knowledge base covering protocol fundamentals, transport mechanisms, SDK usage, tool design patterns, and client integration."
tags: [overview, synthesis]
updated: 2026-04-13
confidence: P0
---

# Model Context Protocol — Knowledge Base Overview

## What This Wiki Covers

This knowledge base provides a structured understanding of the Model Context Protocol (MCP) for senior engineers building MCP servers or clients. It was compiled from 9 primary sources — 5 from the official MCP specification, SDK docs, and blog, plus 4 from leading community practitioners — all fetched and verified on 2026-04-13.

## Core Understanding

MCP is a JSON-RPC 2.0 protocol that standardizes how LLM applications connect to external tools, data, and services. Its architecture separates concerns across three layers: **hosts** (the LLM application), **clients** (per-server connectors), and **servers** (capability providers). This separation means servers are composable, isolated, and easy to build — the host handles orchestration complexity.

The protocol provides three server primitives — **tools** (model-invoked functions), **resources** (host-controlled read-only data), and **prompts** (user-invoked templates) — plus client features like **sampling** (server-initiated LLM calls) and **elicitation** (server requests for user input). Capability negotiation at initialization ensures both sides only use features they support.

## Transport Layer

Two standard transports exist: **stdio** for local subprocess servers (most common, zero config, recommended) and **Streamable HTTP** for remote servers (replaced the deprecated HTTP+SSE transport in March 2025). Streamable HTTP adds session management, SSE streaming, and connection resumability, but requires Origin validation and authentication.

## Building Servers

The official TypeScript SDK (`@modelcontextprotocol/sdk`) provides `McpServer` with Zod-native input schemas, tool annotations (destructive/idempotent/read-only hints), and ResourceLink outputs for token-efficient responses. Three steps: create server, register capabilities, connect transport.

## Tool Design for Token Efficiency

The most nuanced area. Four proven patterns emerged from community practice:

1. **Six-tool consolidation** — fetch, search, list-collections, list-objects, upsert, delete. One tool with parameters beats many tools with overlap.
2. **Workflow bundling** — single atomic operations replacing multi-step sequences (Vercel/Speakeasy pattern).
3. **Progressive discovery** — staged tool access so agents navigate to what they need without loading all schemas upfront.
4. **Error-guided recovery** — responses that teach the agent what to try next, not just report failure.

The underlying principle: context window space is the scarcest resource. Every tool description, parameter, and response consumes tokens that could be used for reasoning.

## Client Ecosystem

Major clients share a consistent JSON configuration format. Claude Code, Claude Desktop, and Cursor all use `mcpServers` objects with `command`/`args`/`env` fields. Three scopes control visibility: local (per-project, private), project (shared via `.mcp.json`), and user (global, private).

## Open Questions

- How will the Tasks primitive (experimental in Nov 2025) evolve in practice? Production implementations are still rare.
- Will the MCP Registry become a protocol-level discovery mechanism, or remain a community directory?
- How should servers handle the transition from SSE to Streamable HTTP while maintaining backwards compatibility with older clients?
- What is the optimal tool count for different server complexity levels? The six-tool pattern works for data-centric servers, but domain-specific servers may need different groupings.

## Coverage Assessment

| Topic | Coverage | Notes |
|-------|----------|-------|
| Protocol specification | Strong | 2025-11-25 spec, architecture, security model |
| Transport mechanisms | Strong | stdio + Streamable HTTP, deprecation context |
| TypeScript SDK | Strong | McpServer API, all three primitives, error handling |
| Tool design patterns | Strong | 4 patterns from 3 independent sources |
| Client integration | Strong | Claude Code, Desktop, Cursor, VS Code configs |
| Python SDK | Not covered | Out of scope (TypeScript focus) |
| OAuth 2.1 deep dive | Thin | Covered at overview level; full auth flow not detailed |
| Tasks primitive | Thin | Concept covered; no implementation examples |
| MCP Registry | Not covered | Not in scope |

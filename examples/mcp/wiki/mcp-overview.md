---
title: "Model Context Protocol Overview"
summary: "MCP is an open JSON-RPC 2.0 protocol connecting LLM applications to external tools, data, and services through a host→client→server architecture with capability negotiation."
tags: [mcp, protocol, architecture, json-rpc, capability-negotiation]
sources:
  - url: "https://modelcontextprotocol.io/specification/2025-11-25"
    title: "MCP Specification (2025-11-25)"
    accessed: 2026-04-13
  - url: "https://modelcontextprotocol.io/specification/2025-11-25/architecture"
    title: "MCP Architecture Specification"
    accessed: 2026-04-13
  - url: "https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/"
    title: "One Year of MCP: November 2025 Spec Release"
    accessed: 2026-04-13
updated: 2026-04-13
confidence: P0
---

# Model Context Protocol Overview

## Overview

The Model Context Protocol (MCP) is an open protocol that standardizes how LLM applications integrate with external data sources, tools, and services. Originally created by Anthropic and released in November 2024, it was donated to the Agentic AI Foundation (AAIF) under the Linux Foundation in December 2025, with co-founding from Anthropic, Block, and OpenAI.

MCP draws inspiration from the Language Server Protocol (LSP), which standardized how IDEs interact with programming language tooling. MCP does the same for AI applications — it defines a universal way to connect LLMs with the context they need, regardless of which host application or server implementation you choose.

The protocol uses JSON-RPC 2.0 over stateful connections. As of the November 2025 specification (version 2025-11-25), the ecosystem includes nearly 2,000 registry entries, 58 maintainers, and adoption from GitHub, Stripe, Notion, OpenAI, AWS, Google Cloud, and Microsoft.

## Key Capabilities

- **Standardized context exchange** — a single protocol for sharing data, tools, and prompts between any LLM application and any external service, eliminating per-integration glue code
- **Security-first design** — explicit user consent for all tool invocations, data access, and sampling; servers cannot see the full conversation or other servers
- **Progressive capability negotiation** — clients and servers declare what they support at initialization; unused features add zero overhead

## How It Works

MCP follows a client-host-server architecture:

1. **Host** — the LLM application (Claude Desktop, Claude Code, Cursor, VS Code Copilot). Creates and manages client instances, enforces security policies, coordinates AI sampling, and aggregates context across clients.
2. **Client** — a connector within the host. Each client maintains a 1:1 stateful session with one server. Handles protocol negotiation, capability exchange, and bidirectional message routing.
3. **Server** — a service providing context and capabilities. Exposes resources, tools, and prompts via MCP primitives. Can be a local subprocess (stdio) or a remote HTTP endpoint.

```
Host (e.g. Claude Desktop)
  ├── Client 1 ──── Server 1 (Files & Git)     ── Local Resource
  ├── Client 2 ──── Server 2 (Database)         ── Local Resource
  └── Client 3 ──── Server 3 (External APIs)    ── Remote Resource
```

### Protocol Primitives

**Server-provided features:**

| Primitive | Purpose | Control |
|-----------|---------|---------|
| Resources | Read-only context and data | Host-controlled — the application decides which resources to attach |
| Prompts | Templated interaction workflows | User-invoked — explicit selection by the human |
| Tools | Executable functions | Model-invoked — the LLM decides when to call, with user consent |

**Client-provided features:**

| Primitive | Purpose |
|-----------|---------|
| Sampling | Server-initiated LLM interactions (agentic loops) |
| Roots | Server queries about filesystem or URI boundaries |
| Elicitation | Server requests for additional user information |

### Capability Negotiation

During initialization, both sides declare supported features:

1. Client sends `InitializeRequest` with its capabilities (sampling support, notification handling)
2. Server responds with its capabilities (tool support, resource subscriptions, prompt templates)
3. Both parties respect declared capabilities for the session duration
4. Undeclared capabilities cannot be used — the protocol fails safe

### The November 2025 Specification

The 2025-11-25 release introduced several major features:

- **Tasks** (SEP-1686) — a new primitive for tracking long-running server operations with states (working, input_required, completed, failed, cancelled)
- **Simplified authorization** (SEP-991) — URL-based client registration via OAuth Client ID Metadata Documents, replacing complex Dynamic Client Registration
- **Sampling with tools** (SEP-1577) — servers can implement agentic loops using client tokens, with parallel tool execution
- **Extensions framework** — optional, additive protocol enhancements that can be experimented with before core integration
- **URL mode elicitation** (SEP-1036) — secure out-of-band credential flows via browser authentication
- **Standardized tool naming** (SEP-986) — consistent naming format across the ecosystem

## Usage Examples

### Example: Minimal Server Registration

A server declares its capabilities during the initialization handshake:

```json
{
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": true },
    "prompts": { "listChanged": true }
  }
}
```

### Example: Tool Invocation Flow

1. Host sends user message to LLM
2. LLM decides to call a tool → sends `tools/call` request via client
3. Host shows the user what the tool will do → user approves
4. Client forwards request to server → server executes → returns result
5. Result goes back through client → host → LLM → user

## Limitations

- **Stateful sessions** — each connection maintains state, so servers must handle session lifecycle (unlike stateless REST APIs)
- **No cross-server visibility** — servers cannot see each other or the full conversation, which is a security feature but limits multi-server coordination (the host must orchestrate)
- **Tasks are experimental** — the long-running operation primitive shipped in November 2025 but is not yet widely implemented
- **No built-in discovery** — servers must be manually configured per client; the MCP Registry exists but is not part of the protocol itself

## See Also

- [[mcp-transports]] — the two transport mechanisms (stdio and Streamable HTTP) and when to use each
- [[typescript-sdk]] — building MCP servers with the official TypeScript SDK
- [[tool-design-patterns]] — patterns for designing token-efficient, agent-friendly tools
- [[client-integration]] — connecting MCP servers to Claude Code, Claude Desktop, Cursor, and VS Code

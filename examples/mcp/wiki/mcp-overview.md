---
title: "Model Context Protocol: Overview"
summary: "MCP is an open JSON-RPC 2.0 protocol standardizing how LLM applications discover and call tools, resources, and prompts from external servers."
tags: [mcp, protocol, jsonrpc, architecture, spec]
sources:
  - url: "https://modelcontextprotocol.io/"
    title: "Model Context Protocol — Introduction"
    accessed: 2026-04-11
  - url: "https://spec.modelcontextprotocol.io/"
    title: "MCP Specification"
    accessed: 2026-04-11
  - url: "https://github.com/modelcontextprotocol/modelcontextprotocol"
    title: "modelcontextprotocol/modelcontextprotocol on GitHub"
    accessed: 2026-04-11
updated: 2026-04-11
confidence: P0
---

# Model Context Protocol: Overview

## Overview

The Model Context Protocol (MCP) is an open, vendor-neutral protocol that standardizes how LLM-powered applications connect to external data, tools, and workflows. Anthropic published the first draft in November 2024 to solve the "N×M integration" problem: every new model client and every new data source previously required a bespoke adapter, producing a combinatorial explosion of one-off glue code. MCP collapses that matrix by defining a single wire protocol so any compliant client can talk to any compliant server.

Conceptually, MCP is to AI tools what the Language Server Protocol is to code editors. It standardizes three primitives that a server can expose — **tools** (model-invoked functions), **resources** (application-controlled read-only context), and **prompts** (user-triggered templates) — plus a handshake, capability negotiation, and a typed notification channel. Everything rides on JSON-RPC 2.0, which makes it easy to implement in any language and trivially inspectable over the wire.

MCP matters for engineers because it turns "my chatbot can use a custom tool" into "any MCP-aware host can load my server and immediately use it." A single server you write today works in Claude Desktop, Claude Code, Cursor, Zed, and any other client that speaks MCP.

## Key Capabilities

- **JSON-RPC 2.0 wire format** — every request, response, and notification is a standard JSON-RPC envelope, so tracing and debugging use existing tools.
- **Three server primitives** — `tools/*`, `resources/*`, and `prompts/*` method families cover the full surface: model actions, application context, and user-triggered templates.
- **Capability negotiation** — the `initialize` handshake lets client and server declare which features they support (e.g. `tools.listChanged`, `resources.subscribe`, `roots`, `sampling`).
- **Bidirectional** — servers can issue requests back to the client (e.g. `sampling/createMessage` to ask the host model for a completion, or `roots/list` to discover workspace folders).
- **Host / client / server roles** — a host application (Claude Desktop) manages one or more clients, each of which owns a persistent connection to exactly one server.

## How It Works

1. **Spawn or connect.** The host launches a server process over stdio or opens a Streamable HTTP session to a remote server.
2. **Initialize.** The client sends `initialize` with its `protocolVersion`, `clientInfo`, and `capabilities`. The server replies with its own version, `serverInfo`, `capabilities`, and optional `instructions`.
3. **Notify ready.** The client sends `notifications/initialized` to confirm the handshake is done.
4. **Discover.** The client calls `tools/list`, `resources/list`, and `prompts/list` to enumerate what the server exposes, caching schemas locally.
5. **Invoke.** When the model decides to use a tool, the client sends `tools/call` with the tool name and arguments; the server runs the operation and returns structured `content` blocks (text, image, embedded resource, or `resource_link`).
6. **React to change.** If the server declared `listChanged`, it can push `notifications/tools/list_changed` so the client refreshes its cache.

### Specification history

The spec is versioned by calendar date. The published revisions are **2024-11-05** (initial public draft), **2025-03-26** (OAuth 2.1 auth, audio content, tool annotations), **2025-06-18** (structured tool output, elicitation, resource links in tool results, `MCP-Protocol-Version` header requirement), and **2025-11-25** (the current stable revision at time of writing). A `draft` branch tracks ongoing work between releases. Clients and servers advertise the version they speak during `initialize` and are expected to negotiate down to a shared revision.

## Usage Examples

A minimal `initialize` request on the wire:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "roots": { "listChanged": true }, "sampling": {} },
    "clientInfo": { "name": "claude-code", "version": "1.0.0" }
  }
}
```

The server responds with its declared capabilities and `serverInfo`; a subsequent `tools/list` returns an array of `{ name, description, inputSchema }` entries the model can reason over.

## Limitations

- **Not a transport by itself.** MCP defines message shapes, not networking; you still choose stdio, Streamable HTTP, or a custom transport and handle auth, timeouts, and reconnects.
- **Trust boundary is the host.** Servers run with the privileges the host gives them. A malicious or compromised server can exfiltrate anything the host exposes via `roots` or `sampling`.
- **Schema quality is on you.** Tool schemas are JSON Schema; poorly named or under-documented tools degrade model routing quality — MCP does not validate usefulness, only shape.

## See Also

- [[mcp-transports]] — the three wire formats MCP runs over
- [[typescript-sdk]] — reference implementation for servers and clients
- [[tool-design-patterns]] — how to design tool shapes a model can actually use well
- [[client-integration]] — wiring servers into Claude Desktop, Claude Code, and Cursor
- [MCP specification](https://spec.modelcontextprotocol.io/) — the canonical spec site
- [modelcontextprotocol GitHub org](https://github.com/modelcontextprotocol) — SDKs and example servers

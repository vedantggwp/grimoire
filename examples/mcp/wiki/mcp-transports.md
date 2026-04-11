---
title: "MCP Transport Layer: stdio, SSE, and Streamable HTTP"
summary: "MCP defines stdio for local servers and Streamable HTTP for remote servers; the older HTTP+SSE transport was deprecated in the 2025-03-26 revision."
tags: [mcp, transport, stdio, http, sse, streamable-http]
sources:
  - url: "https://modelcontextprotocol.io/docs/concepts/transports"
    title: "MCP Docs — Transports"
    accessed: 2026-04-11
  - url: "https://spec.modelcontextprotocol.io/specification/2025-06-18/basic/transports/"
    title: "Spec 2025-06-18 — Transports"
    accessed: 2026-04-11
  - url: "https://github.com/modelcontextprotocol/typescript-sdk"
    title: "TypeScript SDK"
    accessed: 2026-04-11
updated: 2026-04-11
confidence: P0
---

# MCP Transport Layer: stdio, SSE, and Streamable HTTP

## Overview

MCP is a message protocol, not a network protocol — every JSON-RPC 2.0 frame has to ride *something*. The spec defines two officially supported transports: **stdio** for local, process-spawned servers, and **Streamable HTTP** for remote servers reached over the network. A third mode, the original **HTTP+SSE** dual-endpoint transport, shipped in 2024-11-05 and was deprecated in favor of Streamable HTTP in the 2025-03-26 revision. It remains in the spec for backward compatibility but new servers should not implement it.

Choosing a transport is a meaningful architectural decision. stdio is cheap, private, and ideal for tools that live on the user's machine and share its filesystem and credentials. Streamable HTTP is the only reasonable option when the server is hosted remotely, multi-tenant, or needs OAuth. The transport choice also affects your threat model: stdio inherits the host process's trust; HTTP introduces origin, CORS, and DNS-rebinding concerns the spec explicitly calls out.

## Key Capabilities

- **stdio transport** — the server is launched as a subprocess; JSON-RPC messages are newline-delimited on `stdin`/`stdout`, logs go to `stderr`. Zero network surface.
- **Streamable HTTP (2025-03-26+)** — a single HTTP endpoint handles both POSTed client requests and optional server-to-client streaming via SSE on GET, with a `Mcp-Session-Id` header tying messages to a session.
- **HTTP+SSE (deprecated)** — the legacy two-endpoint design: one SSE stream for server messages, a separate HTTP POST endpoint for client messages. Kept for compatibility with pre-March-2025 clients.
- **Protocol version header** — since 2025-06-18, HTTP clients MUST send `MCP-Protocol-Version` on every request after `initialize`; servers reject mismatches.
- **Custom transports** — the spec explicitly allows implementers to define their own transports (WebSocket, named pipes, Unix sockets) as long as JSON-RPC 2.0 framing is preserved.

## How It Works

### stdio

1. The host spawns the server binary with configured args and env vars.
2. Each JSON-RPC message is written as a single line of UTF-8 to the pipe, terminated by `\n`. Messages MUST NOT contain embedded newlines.
3. `stderr` is reserved for logging; the host typically forwards it to a log file.
4. The host terminates the session by closing `stdin`; the server SHOULD exit cleanly.

### Streamable HTTP

1. The client POSTs the `initialize` request to the server's single MCP endpoint (e.g. `https://api.example.com/mcp`).
2. The server responds either with a JSON body (single response) or an `text/event-stream` response containing a session's stream of messages. It sets `Mcp-Session-Id` on the response; the client echoes it on all subsequent requests.
3. For server-initiated messages, the client opens a long-lived `GET` on the same endpoint with `Accept: text/event-stream`. The server pushes notifications and server→client requests down that stream.
4. Resumability: the spec supports `Last-Event-ID` so a dropped SSE stream can resume mid-session.
5. Auth: Streamable HTTP servers SHOULD implement OAuth 2.1 as defined in the spec's authorization section; bearer tokens travel in the `Authorization` header.

### Security notes from the spec

The transports doc explicitly warns implementers to **validate the `Origin` header**, **bind local HTTP servers to `127.0.0.1` (not `0.0.0.0`)**, and **require authentication for remote servers**, to prevent DNS-rebinding attacks against localhost MCP endpoints.

## Usage Examples

A typical stdio server launch (as configured by a client):

```json
{
  "command": "node",
  "args": ["/abs/path/to/server.js"],
  "env": { "API_KEY": "sk-..." }
}
```

A Streamable HTTP POST from client to server:

```http
POST /mcp HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json, text/event-stream
Mcp-Session-Id: 01HXYZ...
MCP-Protocol-Version: 2025-06-18
Authorization: Bearer eyJ...

{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"search","arguments":{"q":"mcp"}}}
```

## Limitations

- **stdio cannot be multiplexed.** One subprocess per client session; there is no built-in way for two clients to share a server process.
- **Streamable HTTP requires session state on the server.** The `Mcp-Session-Id` model rules out pure stateless load balancers without sticky sessions or an external session store.
- **HTTP+SSE is a trap for new servers.** It still appears in blog posts and older SDK releases; implementing it today locks you out of 2025-03-26+ clients that only speak Streamable HTTP.

## See Also

- [[mcp-overview]] — the protocol messages that ride these transports
- [[typescript-sdk]] — concrete transport classes (`StdioServerTransport`, `StreamableHTTPServerTransport`)
- [[client-integration]] — how hosts configure stdio vs HTTP servers
- [Transports spec, 2025-06-18](https://spec.modelcontextprotocol.io/specification/2025-06-18/basic/transports/) — canonical transport definitions

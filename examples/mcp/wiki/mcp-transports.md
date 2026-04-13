---
title: "MCP Transports"
summary: "MCP defines two transports: stdio for local subprocess servers and Streamable HTTP for remote servers, with SSE streaming, session management, and resumability."
tags: [mcp, transport, stdio, http, sse, streaming, session-management]
sources:
  - url: "https://modelcontextprotocol.io/specification/2025-03-26/basic/transports"
    title: "MCP Transport Specification"
    accessed: 2026-04-13
  - url: "https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/"
    title: "Why MCP Deprecated SSE and Went with Streamable HTTP"
    accessed: 2026-04-13
updated: 2026-04-13
confidence: P0
---

# MCP Transports

## Overview

MCP is transport-agnostic — the protocol defines message semantics, not how bytes move. The specification provides two standard transports: **stdio** for local subprocess communication and **Streamable HTTP** for network-accessible servers. A third transport, HTTP+SSE, was deprecated in the March 2025 specification update and replaced by Streamable HTTP.

All MCP messages are JSON-RPC 2.0 encoded as UTF-8. The choice of transport determines deployment topology, security model, and multi-client capability.

## Key Capabilities

- **stdio** — zero-config local integration; the client spawns the server as a subprocess and communicates over stdin/stdout. Most common, most interoperable.
- **Streamable HTTP** — remote-capable transport using POST/GET with optional SSE streaming. Supports multiple concurrent clients, session management, and connection resumability.
- **Custom transports** — the protocol allows any bidirectional channel, as long as it preserves JSON-RPC message format and lifecycle.

## How It Works

### stdio Transport

The client launches the MCP server as a child process. Communication happens over the process's standard I/O streams:

1. Client writes JSON-RPC messages to the server's **stdin**
2. Server writes JSON-RPC messages to **stdout**
3. Messages are newline-delimited and **must not** contain embedded newlines
4. Server **may** write logging to **stderr** (clients may capture, forward, or ignore)
5. Nothing other than valid MCP messages may appear on stdin or stdout

```
Client ──── stdin ────→ Server Process
       ←─── stdout ───
       ←─── stderr ─── (optional logging)
```

stdio is the recommended transport for local tools. It requires no network configuration, no authentication, and no port management. The security boundary is the process boundary — the server runs with the permissions of the user who launched it.

### Streamable HTTP Transport

Introduced in spec version 2025-03-26, replacing the deprecated HTTP+SSE transport. The server is an independent process exposing a single HTTP endpoint (the "MCP endpoint") that accepts both POST and GET:

**Sending messages (client → server):**

1. Every message from the client is a new HTTP POST to the MCP endpoint
2. The `Accept` header must list both `application/json` and `text/event-stream`
3. The POST body is a JSON-RPC request, notification, response, or a batch array
4. For notifications/responses only: server returns `202 Accepted` with no body
5. For requests: server returns either `application/json` (single response) or `text/event-stream` (SSE stream with one response per request, plus optional server-initiated messages)

**Listening for server messages (server → client):**

1. Client issues HTTP GET to the MCP endpoint
2. Server returns an SSE stream for server-initiated requests and notifications
3. Server may close the stream at any time; client may reconnect

**Session management:**

1. Server optionally assigns a session ID via `Mcp-Session-Id` header during initialization
2. Client must include this header on all subsequent requests
3. Server may terminate sessions at any time (responds 404 to stale session IDs)
4. Clients should send HTTP DELETE to explicitly end sessions

**Resumability:**

1. Servers may attach `id` fields to SSE events (globally unique within the session)
2. On reconnection, client includes `Last-Event-ID` header
3. Server replays missed messages from the disconnected stream only

## Usage Examples

### Example: stdio Server Startup

```bash
# Claude Code launches a stdio MCP server
claude mcp add --transport stdio my-db -- npx -y @my-org/db-server

# Under the hood:
# 1. Claude Code spawns: npx -y @my-org/db-server
# 2. Writes InitializeRequest to stdin
# 3. Reads InitializeResponse from stdout
# 4. Session established
```

### Example: Streamable HTTP Session

```
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc": "2.0", "method": "initialize", "params": {...}, "id": 1}

→ Response:
HTTP/1.1 200 OK
Content-Type: application/json
Mcp-Session-Id: a8f2e9c1-...

{"jsonrpc": "2.0", "result": {"capabilities": {...}}, "id": 1}
```

All subsequent requests include `Mcp-Session-Id: a8f2e9c1-...`

## Limitations

- **stdio requires local execution** — the server must run on the same machine as the client, limiting deployment to local tools and dev workflows
- **Streamable HTTP adds complexity** — session management, Origin validation (DNS rebinding defense), authentication, and SSE stream lifecycle all require careful implementation
- **No built-in encryption for stdio** — security depends entirely on the process boundary; sensitive data in transit between stdin/stdout is not encrypted (but it never leaves the machine)
- **SSE resumability is optional** — servers may not implement it, so clients must handle message loss gracefully

## See Also

- [[mcp-overview]] — the protocol architecture that transports serve
- [[typescript-sdk]] — transport setup code using the official SDK (StdioServerTransport, NodeStreamableHTTPServerTransport)
- [[client-integration]] — how Claude Code, Claude Desktop, and Cursor configure transport selection

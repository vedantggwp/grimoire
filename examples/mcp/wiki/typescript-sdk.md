---
title: "TypeScript SDK: @modelcontextprotocol/sdk"
summary: "The official TypeScript SDK ships McpServer, Client, and transport classes; v1.29.0 is the current stable release, with v2 packages in pre-alpha."
tags: [mcp, typescript, sdk, server, zod]
sources:
  - url: "https://github.com/modelcontextprotocol/typescript-sdk"
    title: "modelcontextprotocol/typescript-sdk README (main)"
    accessed: 2026-04-11
  - url: "https://registry.npmjs.org/@modelcontextprotocol/sdk"
    title: "npm — @modelcontextprotocol/sdk"
    accessed: 2026-04-11
  - url: "https://ts.sdk.modelcontextprotocol.io/"
    title: "TypeScript SDK v1 API docs"
    accessed: 2026-04-11
updated: 2026-04-11
confidence: P0
---

# TypeScript SDK: @modelcontextprotocol/sdk

## Overview

`@modelcontextprotocol/sdk` is the reference TypeScript implementation of MCP, maintained in the `modelcontextprotocol/typescript-sdk` repo on GitHub. It is the fastest path to a working server or client: the SDK handles JSON-RPC framing, capability negotiation, schema validation, and all three transports (stdio, Streamable HTTP, and legacy SSE) so you write business logic, not plumbing. It runs on Node.js, Bun, and Deno.

At the time of writing (April 2026) the **v1.29.0** release is the recommended production version; `npm view @modelcontextprotocol/sdk version` confirms `1.29.0` as `latest`. The SDK's `main` branch now hosts v2, a pre-alpha redesign that splits the monolith into `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, and framework middleware packages (`@modelcontextprotocol/node`, `@modelcontextprotocol/express`, `@modelcontextprotocol/hono`). A stable v2 is targeted for Q1 2026; v1.x continues to receive fixes for at least six months after v2 ships.

## Key Capabilities

- **`McpServer` high-level API** — declarative `server.tool()`, `server.resource()`, `server.prompt()` registrations with typed handlers.
- **Standard Schema / Zod validation** — tool input schemas are declared with Zod (or any Standard Schema library in v2); invalid inputs are rejected before your handler runs.
- **Bundled transports** — `StdioServerTransport`, `StreamableHTTPServerTransport`, and a legacy `SSEServerTransport` for backward compatibility.
- **OAuth helpers** — the SDK ships OAuth 2.1 helpers on both client and server sides for remote HTTP deployments.
- **Structured tool results** — since v1.10, handlers can return both text content and a machine-readable `structuredContent` object keyed to an `outputSchema`.

## How It Works

1. **Install** — `npm install @modelcontextprotocol/sdk zod` (v1) or the split `@modelcontextprotocol/server` / `@modelcontextprotocol/client` packages (v2).
2. **Construct a server** — instantiate `McpServer` with a name and version; these surface as `serverInfo` during `initialize`.
3. **Register tools** — call `server.tool(name, description, zodSchema, handler)`. The SDK auto-generates the `inputSchema` JSON Schema from the Zod object and wires up `tools/list` and `tools/call`.
4. **Attach a transport** — `await server.connect(new StdioServerTransport())` for a local CLI server, or mount a `StreamableHTTPServerTransport` inside an Express/Hono/Node HTTP handler for a remote server.
5. **Run** — the SDK handles handshake, validation, error mapping (`McpError` → JSON-RPC `-32xxx` codes), and `notifications/tools/list_changed` when you add or remove tools at runtime.

### Notable version history

- **1.10** — introduced Streamable HTTP transport in line with the 2025-03-26 spec revision and added `structuredContent` on tool results.
- **1.12–1.17** — `resource_link` content blocks, elicitation (`elicitation/create`) support, and richer `ResourceTemplate` helpers aligned with the 2025-06-18 spec.
- **1.20+** — tighter OAuth 2.1 flows, better session management, and resumable Streamable HTTP sessions.
- **1.29.0 (current)** — the latest v1 release; bug fixes, security updates, and compatibility shims while v2 stabilizes on `main`.

## Usage Examples

A minimal stdio server exposing one tool (v1.x idiomatic):

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "weather", version: "0.1.0" });

server.tool(
  "get_forecast",
  "Return a 3-day forecast for a city.",
  { city: z.string().describe("City name, e.g. 'Berlin'") },
  async ({ city }) => {
    const res = await fetch(`https://api.example.com/forecast?q=${city}`);
    const data = await res.json();
    return {
      content: [{ type: "text", text: `Forecast for ${city}: ${JSON.stringify(data)}` }],
      structuredContent: data,
    };
  },
);

await server.connect(new StdioServerTransport());
```

Run it directly (`node dist/server.js`) or point any MCP client at the compiled binary.

## Limitations

- **v1 and v2 are not drop-in compatible.** v2 renames packages, moves transports into middleware, and adopts Standard Schema; porting requires non-trivial refactors.
- **Handler errors are JSON-RPC errors by default.** If you want *tool* errors (visible to the model as `isError: true` content) rather than protocol errors, you must catch and return a content payload yourself.
- **Zod bundling adds weight.** A minimal stdio server compiled with Zod is ~300KB; trivial for Node, but worth knowing if you target constrained runtimes.

## See Also

- [[mcp-overview]] — the protocol the SDK implements
- [[mcp-transports]] — the transport classes the SDK exposes
- [[tool-design-patterns]] — how to design the tools you register with `server.tool()`
- [[client-integration]] — where your compiled server binary gets wired in
- [typescript-sdk on GitHub](https://github.com/modelcontextprotocol/typescript-sdk) — source and changelog
- [SDK v1 API reference](https://ts.sdk.modelcontextprotocol.io/) — full type docs

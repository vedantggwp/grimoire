---
title: "TypeScript SDK"
summary: "The official @modelcontextprotocol/sdk provides McpServer for registering tools, resources, and prompts with Zod schemas, connecting via stdio or Streamable HTTP."
tags: [mcp, typescript, sdk, tools, resources, prompts, zod]
sources:
  - url: "https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md"
    title: "TypeScript SDK Server Documentation"
    accessed: 2026-04-13
  - url: "https://www.npmjs.com/package/@modelcontextprotocol/sdk"
    title: "@modelcontextprotocol/sdk on npm"
    accessed: 2026-04-13
updated: 2026-04-13
confidence: P0
---

# TypeScript SDK

## Overview

The official TypeScript SDK (`@modelcontextprotocol/sdk`) is the reference implementation for building MCP servers and clients. It provides `McpServer` — a high-level class that handles protocol negotiation, capability advertisement, and message routing. You register tools, resources, and prompts with Zod schemas for input validation, pick a transport (stdio or Streamable HTTP), and call `server.connect()`.

The SDK is maintained in the `modelcontextprotocol/typescript-sdk` repository alongside the specification itself. It tracks spec versions closely — the November 2025 release added tool annotations, structured output, and the Tasks primitive.

## Key Capabilities

- **Zod-native input schemas** — tool and prompt parameters are defined as Zod objects, giving you runtime validation and TypeScript inference in one declaration
- **Two built-in transports** — `StdioServerTransport` for local subprocess servers, `NodeStreamableHTTPServerTransport` for HTTP-accessible servers
- **Tool annotations** — metadata hints (`destructiveHint`, `idempotentHint`, `readOnlyHint`) that clients use to adjust confirmation flows
- **ResourceLink outputs** — tools can return URIs to resources without embedding the content, keeping responses lean
- **Completions** — `completable()` wrapper provides argument auto-suggestions to clients

## How It Works

Building an MCP server involves three steps:

### 1. Create the server instance

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer(
  { name: 'my-wiki', version: '1.0.0' },
  { instructions: 'Call list_articles before querying specific content.' }
);
```

The `instructions` field is optional free-text guidance for LLM clients about how to use this server's tools together.

### 2. Register capabilities

**Tools** — functions the LLM can invoke:

```typescript
import { z } from 'zod';

server.registerTool(
  'search-articles',
  {
    title: 'Search Articles',
    description: 'Full-text search across all wiki articles. Returns top matches with summaries.',
    inputSchema: z.object({
      query: z.string().describe('Natural language search query'),
      limit: z.number().default(5).describe('Max results (default 5, max 20)')
    }),
    annotations: { readOnlyHint: true }
  },
  async ({ query, limit }) => {
    const results = searchIndex.search(query, { limit });
    return {
      content: [{ type: 'text', text: JSON.stringify(results) }]
    };
  }
);
```

**Resources** — read-only data the host application can attach as context:

```typescript
server.registerResource(
  'wiki-config',
  'config://wiki',
  { title: 'Wiki Configuration', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(config) }]
  })
);
```

**Prompts** — reusable interaction templates:

```typescript
server.registerPrompt(
  'summarize-topic',
  {
    title: 'Summarize Topic',
    description: 'Generate a structured summary of a wiki topic',
    argsSchema: z.object({ topic: z.string() })
  },
  ({ topic }) => ({
    messages: [{
      role: 'user' as const,
      content: { type: 'text' as const, text: `Summarize the wiki articles about: ${topic}` }
    }]
  })
);
```

### 3. Connect a transport

```typescript
// Local (stdio)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
await server.connect(new StdioServerTransport());

// Remote (Streamable HTTP)
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';

const transport = new NodeStreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID()
});
await server.connect(transport);
```

### Error Handling

For tool-level errors that the LLM should see and potentially self-correct on:

```typescript
return {
  content: [{ type: 'text', text: 'Article not found. Try list_articles first.' }],
  isError: true
};
```

Unhandled exceptions thrown inside tool handlers are automatically caught and converted to MCP error responses — the server does not crash.

## Usage Examples

### Example: Structured Output with Output Schema

```typescript
server.registerTool(
  'get-article-metadata',
  {
    title: 'Get Article Metadata',
    description: 'Returns structured metadata for an article',
    inputSchema: z.object({ slug: z.string() }),
    outputSchema: z.object({
      title: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      confidence: z.enum(['P0', 'P1', 'P2'])
    })
  },
  async ({ slug }) => {
    const meta = getArticleMeta(slug);
    return {
      content: [{ type: 'text', text: JSON.stringify(meta) }],
      structuredContent: meta
    };
  }
);
```

### Example: ResourceLink for Token-Efficient Responses

Instead of embedding file contents in the tool response, return a reference:

```typescript
return {
  content: [{
    type: 'resource_link',
    uri: `file:///wiki/${slug}.md`,
    name: article.title,
    mimeType: 'text/markdown'
  }]
};
```

The host decides whether to fetch the resource — the tool response stays small.

## Limitations

- **Node.js only** — the TypeScript SDK requires Node.js; browser or Deno support is not official (Python, Java, Kotlin, C#, and Swift SDKs exist for other runtimes)
- **No hot-reload** — changing tool registrations requires restarting the server (though `listChanged` notifications tell the client to re-fetch the tool list)
- **Zod version coupling** — the SDK bundles a specific Zod version; mismatches with your project's Zod can cause type errors (use the SDK's re-exported Zod)
- **Structured output is opt-in** — clients must support it; many current clients only read the `content` array

## See Also

- [[mcp-overview]] — the protocol specification the SDK implements
- [[mcp-transports]] — detailed transport semantics (stdio rules, Streamable HTTP session management)
- [[tool-design-patterns]] — how to design the tools you register with the SDK for token efficiency
- [[client-integration]] — configuring clients to connect to your SDK-built server

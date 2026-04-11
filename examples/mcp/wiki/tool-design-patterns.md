---
title: "Tool Design Patterns for MCP Servers"
summary: "Anthropic's tool design guidance: cap responses near 25k tokens, return excerpts not dumps, paginate with cursors, and keep tool surfaces small and well-named."
tags: [mcp, tools, token-efficiency, design, agents]
sources:
  - url: "https://www.anthropic.com/engineering/writing-tools-for-agents"
    title: "Writing effective tools for agents — Anthropic Engineering"
    accessed: 2026-04-11
  - url: "https://modelcontextprotocol.io/docs/concepts/tools"
    title: "MCP Docs — Tools"
    accessed: 2026-04-11
  - url: "https://spec.modelcontextprotocol.io/specification/2025-06-18/server/tools/"
    title: "Spec 2025-06-18 — Tools"
    accessed: 2026-04-11
updated: 2026-04-11
confidence: P0
---

# Tool Design Patterns for MCP Servers

## Overview

A working MCP server is the easy part. A server whose tools a model can actually *use well* is the hard part. Anthropic's engineering post "Writing effective tools for agents" (2025) is the canonical reference on the design discipline: tools live inside the model's context window, so every byte they return competes with the rest of the task. The agent pays for tool definitions on the way in and for responses on the way back — and modern agents typically run dozens of tool calls per task, so inefficiency compounds.

The post's core claim is that tool design is *prompt engineering*. A tool definition, its name, its parameter descriptions, and the shape of its output together teach the model when and how to call it. Sloppy tools produce the familiar failure modes: the model calls the wrong tool, retries identical calls, runs out of context mid-task, or hallucinates fields the tool never returned.

These patterns apply to any tool-calling agent, but they land especially hard on MCP servers because MCP puts the whole tool surface — every tool, every description — into the client's prompt on every turn.

## Key Capabilities

- **Token-budgeted responses** — Anthropic recommends tool responses stay under roughly **25,000 tokens** and warns that much smaller budgets (a few thousand tokens) are usually enough when you design well.
- **Excerpts over dumps** — return the snippets the model needs plus a pointer (URI, resource link, cursor) to fetch more, not the whole document.
- **Cursor pagination** — list tools should always support a `cursor` or `page_token` parameter so the model can page through large result sets on demand.
- **Configurable verbosity** — offer `detail: "concise" | "standard" | "verbose"` (or similar) so the model can ask for more only when needed.
- **Small, namespaced tool count** — fewer, sharper tools route better than dozens of near-duplicates; prefix tool names (`github_search_issues`, not `search`) to help routing when multiple servers are loaded.

## How It Works

1. **Name for routing.** The model picks tools largely by name and description. Use verb-object names (`create_issue`, `list_files`) and start descriptions with the action the tool performs in one sentence.
2. **Schema is documentation.** Every parameter needs a `.describe()` string. Enums beat free-text strings. Required vs optional matters — mark anything the model can omit as optional.
3. **Shape the response.** Return structured content the model can reason over: titles, IDs, short excerpts, and a URI the model can feed back to a `read_resource`-style tool. Avoid leaking framework internals, stack traces, or raw SQL.
4. **Cap and truncate.** Measure your response in tokens (not characters), cap it near 25k, and truncate with a clear `"... (truncated, use cursor=X for more)"` marker so the model knows *why* the data stopped.
5. **Paginate.** Accept `cursor` on input; return `next_cursor` on output when there is more. The model will happily page when it needs to.
6. **Evaluate empirically.** Anthropic's post recommends running an agent loop against your tools, measuring success rate and token usage, and iterating on the descriptions — treat tool design like you treat prompt design.

## Usage Examples

A well-shaped list tool in the TypeScript SDK:

```ts
server.tool(
  "github_list_issues",
  "List open issues in a GitHub repo. Returns id, title, and a 200-char excerpt. Use `cursor` to page.",
  {
    repo: z.string().describe("owner/name, e.g. 'anthropics/claude-code'"),
    cursor: z.string().optional().describe("Opaque cursor from a previous call"),
    detail: z.enum(["concise", "verbose"]).default("concise"),
  },
  async ({ repo, cursor, detail }) => {
    const page = await gh.listIssues(repo, { cursor, per_page: 25 });
    const items = page.items.map((i) => ({
      id: i.number,
      title: i.title,
      excerpt: detail === "verbose" ? i.body.slice(0, 2000) : i.body.slice(0, 200),
      uri: `github://${repo}/issues/${i.number}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ items, next_cursor: page.next }) }],
      structuredContent: { items, next_cursor: page.next },
    };
  },
);
```

Note the conservative default (`concise`), the URI the model can hand to a follow-up `read_issue` tool, and the cursor plumbed end-to-end.

## Limitations

- **25k is a soft ceiling, not a target.** Servers that routinely return 20k-token responses burn context budget and degrade multi-turn performance. Aim for hundreds to low thousands of tokens by default.
- **Tool count has a ceiling too.** Beyond ~40 tools in a single client session, routing accuracy drops; consolidate or split across MCP servers the user toggles on demand.
- **Verbosity flags aren't free.** Every extra parameter is more schema the model has to read. Add them only when concise-by-default plus pagination isn't enough.

## See Also

- [[mcp-overview]] — what tools are in the protocol
- [[typescript-sdk]] — the `server.tool()` API these patterns plug into
- [[client-integration]] — how clients surface your tools to the model
- [Writing effective tools for agents — Anthropic](https://www.anthropic.com/engineering/writing-tools-for-agents) — the canonical reference for this article
- [MCP Tools concept docs](https://modelcontextprotocol.io/docs/concepts/tools) — protocol-level tool mechanics

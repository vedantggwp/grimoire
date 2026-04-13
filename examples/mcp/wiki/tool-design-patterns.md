---
title: "Tool Design Patterns"
summary: "Patterns for token-efficient MCP tools: six-tool consolidation, workflow bundling, progressive discovery, and error-guided recovery."
tags: [mcp, tools, design-patterns, token-efficiency, context-window, agent-experience]
sources:
  - url: "https://www.mcpbundles.com/blog/mcp-tool-design-pattern"
    title: "The Six-Tool Pattern: MCP Server Design That Scales"
    accessed: 2026-04-13
  - url: "https://www.klavis.ai/blog/less-is-more-mcp-design-patterns-for-ai-agents"
    title: "Less is More: 4 Design Patterns for Building Better MCP Servers"
    accessed: 2026-04-13
  - url: "https://www.arcade.dev/blog/mcp-tool-patterns"
    title: "54 Patterns for Building Better MCP Tools"
    accessed: 2026-04-13
updated: 2026-04-13
confidence: P0
---

# Tool Design Patterns

## Overview

MCP tool design has a unique constraint that traditional API design does not: every tool description, parameter schema, and response consumes tokens from the LLM's context window. Cursor and Claude Code already expose 15-18 built-in tools, consuming approximately 5.9% of the context window before any user prompt. Each additional MCP tool adds to this overhead, and excessive tools increase hallucination risk because the model must reason over more options.

The core principle is **"less is more"** — minimize context window usage while maximizing the relevant information the agent receives. This is not about limiting capabilities but about strategic context management.

## Key Capabilities

- **Six-tool consolidation** — reduce 15-20 granular tools to 6 purpose-driven tools using parameter composition
- **Workflow bundling** — replace multi-step tool sequences with single atomic operations that handle orchestration internally
- **Progressive discovery** — stage tool access so agents only see full schemas when they need them
- **Error-guided recovery** — return actionable guidance instead of raw error codes, creating feedback loops that improve subsequent agent decisions

## How It Works

### Pattern 1: The Six-Tool Consolidation

Instead of creating a tool per operation, consolidate into six categories:

| Category | Tool | Purpose |
|----------|------|---------|
| Universal Discovery | **Fetch** | Retrieve a specific item by encoded ID |
| Universal Discovery | **Search** | Natural language or structured query |
| Domain Browsing | **List Collections** | Browse available data sources with filtering |
| Domain Browsing | **List Objects** | Browse data with pagination, sorting, filtering |
| Write | **Upsert** | Unified create/update based on ID presence |
| Write | **Delete** | Remove with type parameter and safety confirmations |

Why it works: one tool with eight parameters consumes less context than eight separate tools with redundant descriptions. The model spends cognitive resources on problem-solving, not tool selection.

### Pattern 2: Workflow-Based Design

Replace sequential tool calls with single atomic operations. The Vercel and Speakeasy teams champion this: "MCP tools as tailored toolkits that help an AI achieve a particular task, not as API mirrors."

**Before** (4 tools, 4 round trips):
```
create_project() → add_environment_variables() → create_deployment() → add_domain()
```

**After** (1 tool, 1 round trip):
```
deploy_project(repo_url, domain, environment_variables, branch="main")
```

The workflow tool handles orchestration internally and returns conversational updates instead of technical status codes.

### Pattern 3: Progressive Discovery

Structure tool access in stages so the agent navigates to what it needs:

1. `discover_categories` — agent sees available service categories
2. `get_category_actions` — agent gets action names and descriptions (no full schemas)
3. `get_action_details` — full parameter schemas for the selected action only
4. `execute_action` — perform the operation

This scales to unlimited tools without context overflow. The initial token cost is minimal because only category names load upfront.

### Pattern 4: Error-Guided Recovery

Design error responses as coaching, not rejection:

```
Bad:  "Error 429"
Good: "Rate limited. Retry after 30 seconds, or reduce batch size to 50."

Bad:  "Article not found"
Good: "No article with slug 'react-hooks'. Did you mean 'react-fundamentals'? 
       Call list_articles to see all available slugs."
```

This creates a feedback loop: the agent learns from errors and improves subsequent calls without human intervention.

## Usage Examples

### Example: Educational Parameter Descriptions

```typescript
inputSchema: z.object({
  limit: z.number()
    .default(10)
    .describe('Maximum objects per request (default: 10, max: 100). Use 10-20 for exploration, 50-100 for bulk operations.')
})
```

Instead of `"limit: int - Number of results"`, the description teaches the agent when to use different values.

### Example: Agent Experience vs. Human Experience

Design for LLM comprehension, not human convenience:

```typescript
// Agent-optimized: accept flexible date formats
inputSchema: z.object({
  date: z.string().describe('Date in any format: "2024-01-15", "January 15", "yesterday", "last week"')
})

// Handler normalizes internally
async ({ date }) => {
  const normalized = parseFlexibleDate(date);
  // ...
}
```

The Parameter Coercion pattern accepts natural language inputs and normalizes server-side, reducing the chance of format errors that waste round trips.

### Example: Security Boundary via Context Injection

```typescript
// WRONG: User identity passed through the LLM prompt
server.registerTool('get-data', { ... },
  async ({ userId }) => { /* userId from LLM — untrustworthy */ });

// RIGHT: User identity injected server-side from session context
server.registerTool('get-data', { ... },
  async (params, { session }) => {
    const userId = session.authenticatedUser.id;  // from server-side context
  });
```

"Prompts express intent, code enforces rules." Never rely on the LLM to pass identity or permissions accurately.

## Limitations

- **Workflow bundling reduces flexibility** — if the user needs a non-standard sequence, a bundled tool cannot accommodate it; have escape hatches for exploratory operations
- **Progressive discovery adds latency** — 3-4 round trips to reach execution vs. 1 for a flat tool list; unsuitable for simple, single-tool servers
- **Consolidation requires domain analysis** — grouping tools correctly requires understanding which operations share parameters and which have fundamentally different semantics
- **Token cost of descriptions compounds** — educational descriptions are individually better but collectively heavier; balance teaching with brevity

## See Also

- [[typescript-sdk]] — how to implement these patterns using the official SDK's registerTool API
- [[mcp-overview]] — the protocol primitives (tools, resources, prompts) that these patterns apply to
- [[client-integration]] — how different clients (Claude Code, Cursor) expose tool descriptions and manage context budgets

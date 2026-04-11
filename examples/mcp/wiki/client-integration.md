---
title: "MCP Client Integration: Claude Desktop, Claude Code, Cursor"
summary: "Each MCP host stores server configs in its own JSON file; the shape is similar (command/args/env for stdio, url for HTTP) but the paths and UI differ."
tags: [mcp, clients, claude-desktop, claude-code, cursor, config]
sources:
  - url: "https://modelcontextprotocol.io/quickstart/user"
    title: "MCP Docs — For Claude Desktop Users"
    accessed: 2026-04-11
  - url: "https://docs.anthropic.com/en/docs/claude-code/mcp"
    title: "Claude Code — Connecting to MCP servers"
    accessed: 2026-04-11
  - url: "https://docs.cursor.com/context/model-context-protocol"
    title: "Cursor — Model Context Protocol"
    accessed: 2026-04-11
updated: 2026-04-11
confidence: P0
---

# MCP Client Integration: Claude Desktop, Claude Code, Cursor

## Overview

An MCP server has zero value until a client connects to it. The big three hosts — Claude Desktop, Claude Code, and Cursor — all speak the same protocol but store their server lists in different JSON config files with slightly different keys. Once a host reads its config it spawns (or dials) each server, runs the `initialize` handshake, caches the declared tools/resources/prompts, and surfaces them to the model on every turn.

The practical pattern for server authors is: ship a single stdio binary (node, python, or a native executable), document three config snippets (one per host), and let users paste whichever they need. For teams shipping remote servers, document a Streamable HTTP URL plus any OAuth config the host supports. Avoid per-host branches in your server code itself — the protocol is meant to be host-agnostic.

## Key Capabilities

- **Config-file-driven loading** — all three clients load MCP servers from a user-editable JSON file at startup; edits require a client restart.
- **stdio-first UX** — the most supported mode is a subprocess launched with `command`, `args`, and `env`; Streamable HTTP servers are available but less universally supported at time of writing.
- **Per-project configs** — Claude Code and Cursor both support workspace-scoped MCP configs (`.mcp.json` or `.cursor/mcp.json`) so a repo can ship its own servers.
- **UI inspection** — all three hosts show connected servers and their declared tools in a status panel; failures surface with the server's `stderr` log.
- **Scope of tools** — clients present the union of all connected servers' tools to the model, usually with the server name prefixed for disambiguation.

## How It Works

1. **User edits config.** They add a server entry (stdio or HTTP) to the host's config file.
2. **Host restarts / reloads.** On startup the host iterates entries and, for stdio, spawns each subprocess with the declared env.
3. **Handshake.** The host's client sends `initialize`, reads the server's capabilities, then `notifications/initialized`.
4. **Discovery.** It calls `tools/list`, `resources/list`, and `prompts/list` (depending on declared capabilities) and caches the results.
5. **Exposure to the model.** On every model turn, the host injects the tool schemas into the prompt (usually namespaced as `{server}__{tool}` or similar). When the model calls a tool, the host routes the call to the right server.
6. **Lifecycle.** stdio servers stay alive for the duration of the session; the host terminates them on shutdown by closing stdin.

### Config locations

- **Claude Desktop:**
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Code:** user config in `~/.claude.json` (or managed via `claude mcp add`); project config in `.mcp.json` at the repo root.
- **Cursor:** user config in `~/.cursor/mcp.json`; project config in `.cursor/mcp.json`.

## Usage Examples

**Claude Desktop — `claude_desktop_config.json`:**

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/Users/you/code/weather-mcp/dist/server.js"],
      "env": { "WEATHER_API_KEY": "sk-..." }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/Documents"]
    }
  }
}
```

**Claude Code — project-scoped `.mcp.json`:**

```json
{
  "mcpServers": {
    "grimoire": {
      "command": "node",
      "args": ["${workspaceFolder}/skills/serve/server.js"]
    }
  }
}
```

**Cursor — `~/.cursor/mcp.json` with a remote server:**

```json
{
  "mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/mcp",
      "headers": { "Authorization": "Bearer ${LINEAR_TOKEN}" }
    }
  }
}
```

After restarting the host, each server appears in the MCP panel with its tool list; failures show the `stderr` output so you can debug misconfigured paths or missing env vars.

## Limitations

- **Config drift.** The three clients accept similar but not identical JSON shapes; Cursor and Claude Code in particular have evolved their schemas faster than Claude Desktop, so blindly copy-pasting between hosts often fails.
- **No hot reload.** Editing config requires a host restart in every major client today — a painful loop during server development. Run your server directly with the SDK's dev tools (MCP Inspector) instead.
- **HTTP support is uneven.** stdio works everywhere; Streamable HTTP and OAuth flows are better supported in Claude Code and Cursor than in Claude Desktop at time of writing.

## See Also

- [[mcp-overview]] — roles of host, client, and server
- [[mcp-transports]] — stdio vs Streamable HTTP wiring behind these configs
- [[typescript-sdk]] — the SDK most of these servers are written in
- [[tool-design-patterns]] — what the model actually sees after the handshake
- [Claude Desktop MCP quickstart](https://modelcontextprotocol.io/quickstart/user) — Claude Desktop setup guide
- [Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp) — Claude Code integration reference

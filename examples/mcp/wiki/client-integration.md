---
title: "Client Integration"
summary: "How to connect MCP servers to Claude Code, Claude Desktop, Cursor, and VS Code using stdio, HTTP, or SSE transports with three configuration scopes."
tags: [mcp, client, claude-code, claude-desktop, cursor, vscode, configuration]
sources:
  - url: "https://code.claude.com/docs/en/mcp"
    title: "Connect Claude Code to tools via MCP"
    accessed: 2026-04-13
  - url: "https://spknowledge.com/2025/06/06/configure-mcp-servers-on-vscode-cursor-claude-desktop/"
    title: "Configure MCP Servers on VSCode, Cursor & Claude Desktop"
    accessed: 2026-04-13
updated: 2026-04-13
confidence: P0
---

# Client Integration

## Overview

MCP servers are only useful when connected to a client. As of early 2026, the major MCP clients are Claude Code, Claude Desktop, Cursor, VS Code (via GitHub Copilot Chat), Windsurf, Zed, Continue, Sourcegraph Cody, and Taskade Genesis. The JSON configuration format is consistent across Claude Code, Claude Desktop, and Cursor, making server configs portable.

This article covers how to configure MCP servers in the most widely-used clients, the three installation scopes, environment variable management, and plugin-provided servers.

## Key Capabilities

- **Three transport options** — HTTP (recommended for remote), stdio (for local), and SSE (deprecated but still supported by some servers)
- **Three configuration scopes** — local (per-project, private), project (per-project, shared via `.mcp.json`), and user (all projects, private)
- **Plugin-bundled servers** — plugins can ship MCP servers that auto-connect when the plugin is enabled
- **Dynamic updates** — servers can notify clients of tool/resource changes via `list_changed` without requiring reconnection

## How It Works

### Claude Code

Claude Code uses the `claude mcp` CLI for server management:

```bash
# Remote HTTP server (recommended for cloud services)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Remote HTTP with authentication
claude mcp add --transport http stripe https://mcp.stripe.com \
  --header "Authorization: Bearer sk_live_..."

# Local stdio server
claude mcp add --transport stdio my-db \
  --env DB_URL=postgresql://localhost/mydb \
  -- npx -y @my-org/db-server

# Management
claude mcp list              # list all servers
claude mcp get notion        # inspect one server
claude mcp remove notion     # delete configuration
```

Within a session, `/mcp` shows server status and handles OAuth authentication for servers that require it.

**Important**: all flags (`--transport`, `--env`, `--scope`, `--header`) must come before the server name. The `--` separator precedes the command and arguments passed to the server process.

### Claude Desktop

Configuration lives in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-wiki": {
      "command": "node",
      "args": ["/path/to/dist/serve.js", "/path/to/workspace"],
      "env": {}
    }
  }
}
```

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor

Cursor reads `.cursor/mcp.json` in the project root or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "my-wiki": {
      "command": "node",
      "args": ["/path/to/dist/serve.js", "/path/to/workspace"]
    }
  }
}
```

### VS Code (GitHub Copilot Chat)

VS Code has native MCP support since version 1.99 (early 2026). Configuration is in `.vscode/mcp.json` or user settings:

```json
{
  "mcpServers": {
    "my-wiki": {
      "command": "node",
      "args": ["/path/to/dist/serve.js", "/path/to/workspace"]
    }
  }
}
```

### Configuration Scopes (Claude Code)

| Scope | Loads in | Shared | Stored in |
|-------|----------|--------|-----------|
| Local (default) | Current project only | No | `~/.claude.json` under project path |
| Project | Current project only | Yes | `.mcp.json` in project root |
| User | All projects | No | `~/.claude.json` global section |

Precedence: Local > Project > User > Plugin-provided > claude.ai connectors.

### Environment Variable Expansion

`.mcp.json` supports variable expansion for portable configs:

```json
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

`${VAR}` expands to the variable value; `${VAR:-default}` provides a fallback.

### Plugin-Provided Servers

Plugins can bundle MCP servers that auto-connect:

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```

Plugin servers start automatically when the plugin is enabled and appear alongside manually configured servers. Use `${CLAUDE_PLUGIN_ROOT}` for paths relative to the plugin installation and `${CLAUDE_PLUGIN_DATA}` for persistent state.

## Usage Examples

### Example: Grimoire MCP Server

A Grimoire knowledge base served over MCP:

```json
{
  "mcpServers": {
    "grimoire-rlhf": {
      "command": "node",
      "args": [
        "/path/to/grimoire-plugin/dist/serve.js",
        "/path/to/my-rlhf-grimoire"
      ]
    }
  }
}
```

This exposes 7 tools: `grimoire_query`, `grimoire_list_topics`, `grimoire_get_article`, `grimoire_get_section`, `grimoire_open_questions`, `grimoire_coverage_gaps`, and `grimoire_search`.

### Example: Multiple Servers Side by Side

Each knowledge base gets its own server instance:

```json
{
  "mcpServers": {
    "grimoire-mcp": {
      "command": "node",
      "args": ["dist/serve.js", "./examples/mcp"]
    },
    "grimoire-rlhf": {
      "command": "node",
      "args": ["dist/serve.js", "./my-rlhf-wiki"]
    }
  }
}
```

## Limitations

- **No auto-discovery** — servers must be manually configured per client; there is no protocol-level server discovery mechanism (the MCP Registry is a separate community directory)
- **Scope conflicts** — if the same server name exists at multiple scopes, only the highest-precedence definition loads; this can cause confusion when project and user configs diverge
- **Windows stdio quirk** — on native Windows (not WSL), stdio servers using `npx` require a `cmd /c` wrapper to execute correctly
- **OAuth requires interaction** — servers that use OAuth 2.0 need the user to authenticate via `/mcp` in Claude Code or through the client's auth flow; there is no headless OAuth for CI/CD

## See Also

- [[mcp-overview]] — the protocol architecture that clients implement
- [[mcp-transports]] — transport-level details for stdio and Streamable HTTP
- [[typescript-sdk]] — building the server that clients connect to
- [[tool-design-patterns]] — designing tools that work well across different client context budgets

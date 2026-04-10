# Claude Code Plugin Spec — Reference

> Extracted from official anthropics/claude-plugins-official marketplace repo. April 2026.

## Required Structure

```
grimoire/
├── .claude-plugin/
│   └── plugin.json              # REQUIRED — only hard requirement
├── skills/                       # Auto-discovered via SKILL.md in subdirs
│   └── init/
│       ├── SKILL.md             # Required per skill
│       ├── references/          # Loaded on-demand
│       └── assets/              # Templates, not loaded into context
├── agents/                       # Auto-discovered .md files
├── commands/                     # Slash commands (legacy, skills/ preferred)
├── hooks/
│   ├── hooks.json               # Hook config with wrapper
│   └── scripts/
├── .mcp.json                    # MCP server definitions
└── README.md
```

## plugin.json — Only `name` Required

```json
{
  "name": "grimoire",
  "version": "0.1.0",
  "description": "Knowledge base builder with scouting, compilation, and MCP serving",
  "author": { "name": "Ved" },
  "license": "MIT",
  "keywords": ["wiki", "research", "knowledge-base"]
}
```

Name must be kebab-case: `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`

## SKILL.md Frontmatter

```yaml
---
name: scout
description: "This skill should be used when..." (third-person, include trigger phrases)
version: 0.1.0
---
```

Body: imperative form ("Validate the input...", NOT "You should...").
Progressive disclosure: metadata ~100 words always loaded. Body loaded on trigger (1500-2000 words target).

## Agent .md Frontmatter

```yaml
---
name: scout
description: "Use this agent when..." (must include <example> blocks)
model: inherit
color: cyan
tools: ["Read", "Grep", "Bash", "WebFetch"]
---
```

## Key Variable

`${CLAUDE_PLUGIN_ROOT}` — use in ALL internal references. Never hardcode paths.

## Installation

- Marketplace: `/plugin install grimoire@marketplace-name`
- Local dev: `claude --plugin-dir /path/to/grimoire`
- Manual: place in `~/.claude/plugins/manual/grimoire/`

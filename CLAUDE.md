# CLAUDE.md

You are in **Grimoire**, a local-first **knowledge base builder** packaged as a Claude Code plugin. Grimoire turns a topic into a structured knowledge base by scouting sources, ingesting and compiling them into wiki articles, generating a study-oriented frontend, and optionally serving the result to LLM tools through MCP.

This file loads on every conversation. Keep it lean.

- Read `SOUL.md` for the full product bible, architecture, boundaries, or source-of-truth clarification
- Read `docs/decisions.md` for architectural decision history

## Plugin Structure

Grimoire is a Claude Code plugin. Skills are auto-discovered from `skills/*/SKILL.md`.

| Skill | Job |
|-------|-----|
| `run` | One-command pipeline: init → scout → ingest → compile → present, 2 checkpoints |
| `init` | Interactive questionnaire + workspace scaffolding |
| `scout` | Research sources, score confidence, curate URL list |
| `ingest` | Fetch sources, preserve raw text, compile wiki articles |
| `compile` | Cross-references, backlinks, overview, gap analysis |
| `present` | Generate study-oriented static frontend |
| `serve` | Expose knowledge via custom MCP server |

## Core Rules

1. **One skill, one job.** Keep responsibilities isolated. Each skill has its own references and assets.

2. **Plain text is the interface.** Markdown files are the contract between skills. Prefer transparent, editable artifacts.

3. **Keep outputs editable and local.** Humans must be able to inspect and modify outputs between steps.

4. **Use `${CLAUDE_PLUGIN_ROOT}`** for all internal path references. Never hardcode absolute paths.

5. **Papyr Core is a plugin dependency.** It handles markdown parsing, graph construction, search indexing, and analytics. Do not rebuild what it provides.

## Workspace Convention

Maintain `MANIFEST.md` as the workspace change ledger. Update it whenever files are created, edited, renamed, or deleted.

## What Not To Do

- Do not bloat this file
- Do not put skill-specific process instructions here — those belong in `skills/*/SKILL.md`
- Do not treat this file as a second `SOUL.md`
- Do not replace markdown interfaces with opaque hidden workflow

## Grimoire Wiki — Meta-Grimoire

A curated knowledge base about Grimoire itself lives at `../grimoire-wiki/` (sibling directory, not inside this repo).

- Consult `../grimoire-wiki/wiki/index.md` before answering questions about Grimoire's architecture, design decisions, competitive positioning, or roadmap
- Prefer wiki articles over re-deriving answers from source code or `docs/`
- If the wiki doesn't cover a topic, say so — don't fabricate. Consider whether it should be added via `/grimoire:scout`

# Architecture

Grimoire is a Claude Code plugin that runs a five-stage pipeline to turn a
topic into a structured knowledge base. Each stage is one skill; each skill is
isolated, editable, and hands off to the next via plain markdown or JSON files.

## Principles

Grimoire is built on **Interpreted Context Methodology (ICM)** by Jake Van
Clief, adapted for Claude Code plugin format. Three rules govern the design:

1. **One stage, one job** — each skill does one thing well
2. **Plain text is the interface** — handoffs between stages are markdown/JSON files humans can inspect and edit
3. **The human stays in control** — scout, ingest, and present have mandatory checkpoints

## Plugin Layout

```
grimoire/
  .claude-plugin/
    plugin.json              # Plugin manifest
  skills/                    # Claude-driven workflows
    init/                    # Interactive questionnaire + scaffold
    scout/                   # Web research + 6-signal scoring
    ingest/                  # Fetch, preserve raw, compile articles
    compile/                 # Graph audit, backlinks, taxonomy
    present/                 # Static site generation
    serve/                   # MCP server
  lib/                       # TypeScript runtimes invoked by skills
    compile.ts               # Papyr Core orchestration
    present/                 # 12-module static site generator
    serve.ts                 # MCP server with 6 tools
  test/                      # Vitest suites + sample-wiki fixture
  docs/                      # Specs, decisions, changelog, roadmap
  SOUL.md                    # Product bible
  MANIFEST.md                # File ledger
```

Skills auto-discover from `skills/*/SKILL.md` when Claude Code loads the plugin.

## Five Stages

```
 init            scout            ingest            compile           present           serve
  |                |                 |                 |                 |                |
  v                v                 v                 v                 v                v
  SCHEMA.md      scout-report.md    raw/*.md          wiki/.compile/    site/             MCP server
  _config/       approved-sources    wiki/*.md          *.json            (6 HTML modes)    (6 tools)
  wiki/          scout-notes.md      updated index                         assets/style.css   stdio
  scout-queue
       ^              ^                  ^                                     ^
       |              |                  |                                     |
       -human-     -checkpoint-    -checkpoint-                         -checkpoint-
```

| Stage | Job | Human checkpoint? |
|-------|-----|-------------------|
| `init` | 7-question questionnaire, workspace scaffold | Implicit (interactive) |
| `scout` | Research + score sources, curate approved list | Yes — approve before ingest |
| `ingest` | Fetch, preserve raw, compile articles | Yes — approve takeaways before write |
| `compile` | Graph audit, link repair, overview, gap analysis | No — deterministic |
| `present` | Generate static study frontend | Yes — preview and iterate |
| `serve` | MCP server over stdio | No — automated |

## Data Flow

Every stage reads from the workspace, writes back to the workspace. Files
between stages are the contract:

- `SCHEMA.md` — workspace config (topic, scope, audience, taxonomy)
- `scout-queue.md` — seed URLs from init
- `scout-report.md`, `approved-sources.md`, `scout-notes.md` — scout outputs
- `raw/{topic}/{date}-{source}.md` — immutable source archive
- `wiki/*.md` — compiled articles with frontmatter
- `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` — navigators
- `wiki/.compile/*.json` — compile artifacts (graph, analytics, search index, audit)
- `site/` — static frontend output
- MCP server reads `wiki/.compile/` + `wiki/*.md`, exposes tools over stdio

## Two-Layer Runtime

For stages that need programmatic computation (compile, present, serve), the
pattern is split:

- **SKILL.md** tells Claude what to do and how to interpret results
- **lib/ script** runs Papyr Core or the MCP SDK to do the actual work

This means compile can run graph analysis via Papyr Core, present can generate
HTML from compiled JSON, and serve can expose a real MCP server — while keeping
Claude's decision-making (what to fix, what to surface, how to design) in the
skill instructions.

## References

- [SOUL.md](../SOUL.md) — product bible, identity, boundaries
- [docs/mcp-spec.md](mcp-spec.md) — MCP server specification
- [docs/design-engine.md](design-engine.md) — palette and typography system
- [docs/frontend-modes.md](frontend-modes.md) — 6 study modes
- [docs/scout-spec.md](scout-spec.md) — research engine + confidence scoring
- [docs/decisions.md](decisions.md) — decision log
- [docs/roadmap.md](roadmap.md) — phased roadmap
- [docs/changelog.md](changelog.md) — build history
- [ICM by Jake Van Clief](https://github.com/RinDig/Interpreted-Context-Methdology) — original methodology

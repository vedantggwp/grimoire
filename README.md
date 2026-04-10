# Grimoire

Your knowledge, structured for machines and humans.

Grimoire is a Claude Code plugin that turns a topic into a structured knowledge base. It runs a five-stage pipeline — **scout** the web for sources, **ingest** them into wiki articles, **compile** a cross-referenced graph, **present** a study-oriented static frontend, and **serve** the whole thing to LLMs over MCP. Every stage is an editable markdown checkpoint, so humans stay in the loop between steps. The result is a local-first, LLM-readable wiki that compounds over time.

## Install

Grimoire is a Node-based plugin. Install its dependencies before loading it into Claude Code.

```bash
git clone https://github.com/<you>/grimoire.git
cd grimoire
npm install
```

The `npm install` step is required — `compile`, `present`, and `serve` all shell out to `tsx` scripts that depend on `papyr-core`, `@modelcontextprotocol/sdk`, and `zod`. Skipping it will break the pipeline after the ingest stage.

Point Claude Code at the plugin directory:

```bash
claude --plugin-dir /absolute/path/to/grimoire
```

Or symlink into your plugins directory:

```bash
ln -s /absolute/path/to/grimoire ~/.claude/plugins/manual/grimoire
```

Skills auto-discover from `skills/*/SKILL.md` once the plugin is loaded.

## Quick start

From any working directory with the plugin loaded:

```
> /grimoire:init
```

Or in natural language: *"Create a new grimoire about reinforcement learning from human feedback."*

`init` walks through a 7-question flow:

1. **Topic** — what subject, be specific
2. **Scope** — what's in and out of bounds
3. **Audience** — who reads this and at what level
4. **Seed sources** — URLs you already know are valuable (optional)
5. **Taxonomy** — emergent categories or predefined
6. **Design** — palette for the frontend
7. **CLAUDE.md** — integrate with a host project's CLAUDE.md

It then scaffolds a workspace:

```
my-grimoire/
  SCHEMA.md          # your answers, the config of record
  _config/
    design.md        # palette, typography, motion, density
  wiki/
    index.md         # article catalog (starts empty)
    overview.md      # evolving overview (auto-updated)
    log.md           # changelog
  raw/               # preserved source material
  scout-queue.md     # seed URLs (if provided)
```

From there, run the pipeline one stage at a time:

```
> /grimoire:scout      # research sources, produce approved-sources.md
> /grimoire:ingest     # fetch, preserve raw, compile articles
> /grimoire:compile    # graph, backlinks, overview, gaps
> /grimoire:present    # build the static frontend
> /grimoire:serve      # start the MCP server
```

## The six skills

| Skill | Status | What it does |
|---|---|---|
| `init` | Working | 7-question interactive questionnaire and workspace scaffold |
| `scout` | Working | Web research with 6-signal confidence scoring, human review checkpoint before ingest |
| `ingest` | Working | Fetches approved sources, preserves raw text, compiles wiki articles with a human checkpoint |
| `compile` | Working | Papyr Core graph audit, backlink repair, overview evolution, gap analysis, emergent taxonomy |
| `present` | Working | Static frontend with 6 study modes (read, graph, search, feed, gaps, quiz) |
| `serve` | Working | MCP server exposing 6 tools for LLM knowledge access |

`init`, `scout`, and `ingest` are Claude-driven workflows defined in `SKILL.md`. `compile`, `present`, and `serve` have matching TypeScript runtimes in `lib/` that the skills invoke via `tsx`.

## How it works

```
init     scaffolds the workspace
  |
  v
scout    finds and scores sources on the web
  |      -> scout-report.md, approved-sources.md
  v
ingest   fetches approved sources, writes wiki articles
  |      -> raw/*.md, wiki/*.md, updated index.md
  v
compile  builds graph, backlinks, overview, gap analysis
  |      -> wiki/.compile/*.json
  v
present  generates static study frontend
  |      -> site/ (HTML + CSS + JS, 6 modes)
  v
serve    MCP server over stdio
         -> 6 tools for LLM clients
```

Every handoff between stages is a plain markdown or JSON file you can inspect and edit. Scout, ingest, and present all have mandatory human checkpoints — you review before the next stage runs.

## The frontend

`present` generates a self-contained static site with six study modes:

- **Read** — linear reading ordered by graph centrality, with table of contents, "next article" navigation, and a reading progress indicator
- **Graph** — D3 force-directed concept map; articles are nodes, cross-references are edges
- **Search** — client-side full-text search with highlighted results and source links
- **Feed** — changelog timeline parsed from `wiki/log.md`
- **Gaps** — tag-based coverage grid showing which topics are well-covered, thin, or missing
- **Quiz** — auto-generated flashcards from article sections

Theming is driven by `_config/design.md`: **7 palettes** (midnight-teal, noir-cinematic, cold-steel, warm-concrete, electric-dusk, smoke-light, obsidian-chalk), **5 typography systems** (editorial, technical, playful, brutalist, minimal), dark/light mode, three motion levels, three density levels. Everything compiles to CSS custom properties on `:root`, so palette switching is a class change with no rebuild. Mobile-first.

## The MCP server

`serve` starts a stdio MCP server that exposes six tools:

| Tool | Returns |
|---|---|
| `grimoire_query` | Top 3 matching article excerpts with source slugs (retrieval, not synthesis — the client LLM does the synthesis) |
| `grimoire_list_topics` | All tags and taxonomy entries with article counts |
| `grimoire_get_article` | Full content of a specific article by slug |
| `grimoire_open_questions` | Unresolved questions parsed from `overview.md` |
| `grimoire_coverage_gaps` | Topics with thin or missing coverage |
| `grimoire_search` | Full-text search across all articles via Papyr Core |

The server reads `wiki/.compile/` once on startup — restart to pick up changes. Validation is Zod-based; the data layer uses immutable readonly types throughout.

To connect from Claude Desktop or any MCP client, add an entry to your MCP config:

```json
{
  "mcpServers": {
    "grimoire-myproject": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/grimoire/lib/serve.ts",
        "/absolute/path/to/my-grimoire"
      ]
    }
  }
}
```

You can run multiple Grimoire servers side by side — one per knowledge base, each with its own name.

## Requirements

- **Node.js 18+**
- **npm** (for plugin dependencies)
- **Claude Code** with plugin support

## Dependencies

Runtime:

- **papyr-core** — markdown parsing, graph construction, full-text search indexing (FlexSearch), analytics. Drives `compile` and `grimoire_search`.
- **@modelcontextprotocol/sdk** — MCP server framework. Drives `serve`.
- **zod** — schema validation for MCP tool inputs.

Dev:

- **tsx** — TypeScript execution without a build step
- **vitest** — test runner

See `package.json` for versions.

## Architecture

Grimoire follows ICM (Interpreted Context Methodology): one stage, one job, plain text as the interface between stages. See `SOUL.md` for the product bible and identity, `docs/` for detailed specs (architecture, mcp-spec, design-engine, frontend-modes, scout-spec), and `docs/decisions.md` for the decision log.

## Development

Run the tests (79 total across three suites):

```bash
npm test          # vitest run
npm run test:watch
```

Run individual pipeline stages directly against a workspace:

```bash
npm run compile -- /path/to/workspace
npm run present -- /path/to/workspace
npm run serve   -- /path/to/workspace
```

Project structure:

```
grimoire/
  .claude-plugin/plugin.json     # plugin manifest
  skills/                        # 6 skills, each with SKILL.md + references/
  lib/
    compile.ts                   # Papyr Core orchestration
    present/                     # 12-module static site generator
    serve.ts                     # MCP server
  test/                          # vitest suites + sample-wiki fixture
  docs/                          # specs, roadmap, decisions, changelog
  SOUL.md                        # product bible
  MANIFEST.md                    # workspace change ledger
```

See `MANIFEST.md` for the full file ledger.

## License

MIT

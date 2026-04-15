# Grimoire

**Your knowledge, structured for machines and humans.**

[![Version](https://img.shields.io/badge/version-0.2.3-0d9488)](https://github.com/vedantggwp/grimoire/releases) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE) [![Tests](https://img.shields.io/badge/tests-129%20passing-16a34a)](./test) [![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-1a1a1a)](https://github.com/vedantggwp/athanor)

Grimoire turns any topic into a structured, compounding knowledge base. It's a Claude Code plugin that runs a five-stage pipeline — **scout** the web for sources, **ingest** them into wiki articles, **compile** a cross-referenced graph, **present** a study-oriented static frontend, and **serve** the whole thing to LLMs over MCP.

Every handoff between stages is a plain markdown file you can edit. Scout, ingest, and present all pause for your review before the next stage runs, so humans stay in control. The output is **local-first**, **LLM-readable**, and **yours** — a wiki you own on disk, a website you open from `file://`, and an MCP server any LLM client can query.

```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

— or in natural language to Claude Code: *"Create a new grimoire about reinforcement learning from human feedback."*

## Install

Grimoire is distributed through the [Athanor](https://github.com/vedantggwp/athanor) marketplace. From Claude Code:

```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
```

That's it. No `npm install`, no build step, no dependency setup. The plugin ships with pre-built bundles in `dist/` that inline every runtime dependency (`papyr-core`, `@modelcontextprotocol/sdk`, `zod`), so `compile`, `present`, and `serve` run straight from `node dist/*.js` with nothing else on the machine.

Skills auto-discover from `skills/*/SKILL.md` once the plugin is loaded.

### Developing Grimoire locally

Only needed if you're contributing to Grimoire itself:

```bash
git clone https://github.com/vedantggwp/grimoire.git
cd grimoire
npm install
npm run build
```

`npm run build` regenerates `dist/{compile,present,serve}.js` via esbuild. The bundles are committed so marketplace installs work without a build step — rerun `npm run build` whenever you change anything in `lib/` and commit the updated bundles alongside the source.

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
> /grimoire:present    # build the static frontend → open site/index.html to view
> /grimoire:serve      # start the MCP server
```

After `present`, open `site/index.html` in your browser to explore the knowledge base.

## The six skills

| Skill | Status | What it does |
|---|---|---|
| `init` | Working | 7-question interactive questionnaire and workspace scaffold |
| `scout` | Working | Web research with 6-signal confidence scoring, human review checkpoint before ingest |
| `ingest` | Working | Fetches approved sources, preserves raw text, compiles wiki articles with a human checkpoint |
| `compile` | Working | Papyr Core graph audit, backlink repair, overview evolution, gap analysis, emergent taxonomy |
| `present` | Working | Static frontend with 6 study modes (read, graph, search, feed, gaps, quiz) |
| `serve` | Working | MCP server exposing 6 tools for LLM knowledge access |

`init`, `scout`, and `ingest` are Claude-driven workflows defined in `SKILL.md`. `compile`, `present`, and `serve` have matching TypeScript runtimes in `lib/` that esbuild bundles into self-contained ESM files under `dist/`; each skill invokes its bundle directly via `node ${CLAUDE_PLUGIN_ROOT}/dist/<skill>.js`, so nothing needs to be installed on the user's machine.

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

## Example use cases

Grimoire is built for people who want to **understand something deeply** and end up with a structured artifact they keep.

#### Learn a new technology in depth

You want to understand WebGPU, CRDTs, Rust async, or reinforcement learning from the ground up. Grimoire scouts the best specs, papers, and tutorials; scores them; compiles a linked wiki ordered by graph centrality; and lets you quiz yourself on what you just read. The MCP server plugs into Claude so you can ask questions and get answers grounded in your own curated sources, not the open web.

```
/grimoire:init      # "A deep study of WebGPU for engineers building compute shaders"
/grimoire:scout     # finds the WebGPU spec, W3C drafts, Chrome dev blog, conference talks
/grimoire:ingest    # fetches, preserves raw, writes 8–12 cross-linked articles
/grimoire:compile   # builds the graph, surfaces gaps you didn't realize you had
/grimoire:present   # opens a study-oriented site in your browser
```

#### Onboard to a new codebase's ecosystem

New job, new stack. Build a grimoire about the frameworks, tools, and conventions your team uses. Commit it to the repo next to `CLAUDE.md`. Every new hire after you gets a local wiki *and* an LLM expert for the stack — and when someone updates a tool, they update the grimoire in the same PR.

#### Research a market or product space before building

You're about to ship a product in an area you don't know well — creator tools, observability, vector databases, whatever. Scout the public research: competitor docs, G2 and Reddit, conference talks, academic surveys. Use **gaps mode** to see which parts of the space you still don't understand. Use **feed mode** to keep the research rolling as the market moves.

#### Give Claude expert knowledge on a niche

Your LLM tools don't know about your internal framework, your proprietary SDK, or that obscure scientific field you work in. Build a grimoire about it. Point Claude Desktop (or Claude Code, or any MCP client) at the generated MCP server. Now Claude is an expert — it queries your curated corpus via `grimoire_query` and cites the exact articles it pulled from.

#### Maintain a long-running personal wiki

Knowledge compounds across years, not weekends. Every new source goes through scout and ingest. The wiki evolves. `log.md` tracks the history. `overview.md` auto-updates. The graph grows denser. Git tracks every change. No SaaS can delete it, reprice it, or quietly degrade the UX.

In each case, the output is the same two artifacts: a static site you open in a browser, and an MCP server any LLM client can talk to.

## The frontend

`present` generates a self-contained static site with six study modes, each designed for a specific learning mode:

- **Read** — articles ordered by graph centrality in a 3-column editorial layout: article nav (left), centered content (right max 680px), on-page TOC (right). Reading progress bar, keyboard-navigable, self-contained from `file://`.
- **Graph** — D3 force-directed knowledge map. Articles are nodes, cross-references are edges. Force parameters scale with graph size so small and large corpora both render readably. Click a node for details; drag to reposition; filter by tag.
- **Search** — command-palette style with ⌘K shortcut. Default state shows example queries, a tag cloud with counts (click-to-filter), and a centrality-sorted article grid with summaries. Typing 2+ chars flips to live results with highlighted matches.
- **Feed** — vertical timeline parsed from `wiki/log.md`. Dates on the left rail, spine line with dot markers, color-coded action tags (scouted / ingested / compiled / edited) that co-occur on a single entry when an operation touched multiple pipeline phases.
- **Gaps** — real D3 treemap sized by `articleCount × sqrt(totalWords)`, classified into 4 coverage tiers (full ≥3 articles · partial 2 · thin 1 · missing 0). Legend and hover tooltip showing which articles cover a tag. Makes uncovered ground visible.
- **Quiz** — Anki-style flashcards auto-generated from article H2 sections. Question visible → "Show answer" button → inline reveal → "Got it / Review again" feedback. Shuffled deck, progress tracking, keyboard-navigable (Space/Enter reveals).

**Theming.** Everything compiles to CSS custom properties on `:root`, so palette switching is a single class change — no rebuild. Configured via `_config/design.md`:

- **8 palettes**: `linear-editorial` (default, Source Serif 4 + Inter), `midnight-teal`, `noir-cinematic`, `cold-steel`, `warm-concrete`, `electric-dusk`, `smoke-light`, `obsidian-chalk`
- **6 typography systems**: `linear-editorial`, `editorial`, `technical`, `minimal`, `playful`, `brutalist`
- **Dual theme** — light default, explicit `.theme-dark` toggle, automatic `prefers-color-scheme` support
- **Fluid typography** via `clamp()` — same CSS renders from 375px phone to 1440px desktop
- **Mobile-first** with 479 / 767 / 1023 / 1024 breakpoints, WCAG AA contrast, reduced-motion respected, print stylesheet

## The MCP server

`serve` starts a stdio MCP server that exposes seven tools designed for token-efficient LLM retrieval:

| Tool | Returns |
|---|---|
| `grimoire_query` | Top 3 matching articles with their one-line summaries (hybrid FlexSearch + substring rerank that prefers title/summary matches). Token-efficient routing — the client LLM fetches full content only when it needs to. |
| `grimoire_list_topics` | The LLM routing table: every article's slug + one-line summary, plus tag counts. Designed so a client can scan the whole corpus cheaply and decide what to read. |
| `grimoire_get_article` | A specific article by slug. Takes an optional `mode: "auto" \| "summary" \| "full"`. Auto mode returns a summary envelope (title + summary + section index + hints) for articles over 15 KB to stay under MCP token caps; `full` forces complete markdown. |
| `grimoire_get_section` | A specific H2 section of an article, case-insensitive heading match. Token-efficient retrieval when you only need one part of a long article. |
| `grimoire_open_questions` | Unresolved questions parsed from `overview.md` |
| `grimoire_coverage_gaps` | Topics with thin or missing coverage |
| `grimoire_search` | Full-text search across all articles via Papyr Core |

Every article's `summary` frontmatter field is the load-bearing routing signal: LLM clients read the routing table first (cheap), pick the right article (free), and pull just the relevant section (also cheap). This is the Karpathy LLM-wiki pattern, built into the MCP server.

The server reads `wiki/.compile/` once on startup — restart to pick up changes. Validation is Zod-based; the data layer uses immutable readonly types throughout.

To connect from Claude Desktop or any MCP client, add an entry to your MCP config. Point the command at the bundled `dist/serve.js` inside the installed plugin:

```json
{
  "mcpServers": {
    "grimoire-myproject": {
      "command": "node",
      "args": [
        "/absolute/path/to/grimoire-plugin/dist/serve.js",
        "/absolute/path/to/my-grimoire"
      ]
    }
  }
}
```

Marketplace installs live under `~/.claude-v/plugins/cache/athanor/grimoire/<version>/` — point the first path at that directory's `dist/serve.js`. The bundle is self-contained; no `npm install` is required.

You can run multiple Grimoire servers side by side — one per knowledge base, each with its own name.

## Requirements

- **Node.js 20+** (the bundled `dist/*.js` files are emitted by esbuild with `target: node20`)
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

## Reference example

[`examples/mcp/`](./examples/mcp/) is a complete, inspectable Grimoire workspace about the Model Context Protocol itself — built using the full pipeline (scout→ingest→compile→present) against 9 real web sources from the official MCP spec, TypeScript SDK docs, MCP blog, and community pattern articles. Raw source text is preserved in `raw/mcp/`, scout scores are in `scout-report.md`, and all 5 wiki articles cite the URLs they were compiled from.

**View the frontend** — after `present` runs, the `site/` directory contains a self-contained static site. Open it directly in your browser:

```bash
open examples/mcp/site/index.html        # macOS
xdg-open examples/mcp/site/index.html    # Linux
start examples/mcp/site/index.html       # Windows
```

No server needed. No network requests. Everything (including the D3 graph visualization) is inlined. The landing page links to all 6 study modes: read, graph, search, feed, gaps, and quiz.

**Query via MCP** — point any MCP client at the serve bundle:

```bash
node dist/serve.js examples/mcp
```

This starts a stdio MCP server exposing 7 tools (`grimoire_query`, `grimoire_list_topics`, `grimoire_get_article`, `grimoire_get_section`, `grimoire_open_questions`, `grimoire_coverage_gaps`, `grimoire_search`). See [The MCP server](#the-mcp-server) for client configuration.

## Development

Run the tests (129 total across four suites):

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

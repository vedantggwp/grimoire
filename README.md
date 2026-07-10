# Grimoire

**Your knowledge, structured for machines and humans — and kept current on a schedule.**

[![Version](https://img.shields.io/badge/version-0.5.0-0d9488)](https://github.com/vedantggwp/grimoire/releases) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE) [![Tests](https://img.shields.io/badge/tests-368%20passing-16a34a)](./test) [![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-1a1a1a)](https://github.com/vedantggwp/athanor)

Grimoire is a Claude Code plugin that turns a topic into a living knowledge base. Say what you want to understand; it **scouts** the web for the best sources, **ingests** them into cross-referenced wiki articles, **compiles** a knowledge graph, **presents** a study site you open from `file://`, and **serves** the whole corpus to any LLM client over MCP. Then `/grimoire:update` keeps it alive: a scheduled editorial pass that finds what's new, weaves in new connections, flags stale articles, and ships every change as a pull request you review.

Everything is plain markdown on your disk, in your git history. No SaaS, no database, no build step.

## Quick start

```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor

/grimoire "reinforcement learning from human feedback"
```

Or in natural language: *"Build a grimoire about WebGPU for engineers."* Grimoire infers topic, scope, audience, and design from your sentence, pauses once for you to curate the sources it found, and pauses once more for final review. One sentence in, a wiki + study site + MCP server out.

No `npm install`, no build step: the plugin ships pre-built bundles in `dist/` that inline every runtime dependency, so the pipeline runs on nothing but Node 20+.

## Why Grimoire

- **Versus a notes app** — Obsidian and Notion store what you write; Grimoire *builds* the knowledge base for you from external sources, with provenance: every article cites the URLs it was compiled from, and the raw source text is preserved immutably in `raw/`.
- **Versus asking a chatbot** — answers from chat evaporate; Grimoire's output compounds. Articles, cross-references, an evolving overview with open questions, and a graph that gets denser with every run — all reviewable, all in git.
- **Versus a RAG pipeline** — no embeddings infrastructure to host. The MCP server does token-efficient retrieval over plain markdown (routing table of one-line summaries → fetch only the section you need), following the LLM-wiki pattern end to end — including the *maintained* half, which is what `/grimoire:update` automates.

## How it works

```
new       scaffolds the workspace (SCHEMA.md, _config/, wiki/)
  |
scout     finds and scores sources (6-signal confidence rubric)
  |        -> scout-report.md, approved-sources.md   [you curate]
ingest    fetches approved sources, preserves raw text, writes articles
  |        -> raw/**.md (immutable), wiki/*.md
compile   builds the graph: backlinks, overview, gaps, freshness
  |        -> wiki/.compile/*.json
present   generates the static study frontend
  |        -> site/ (6 modes, zero dependencies)   [you review]
serve     MCP server over stdio -> 7 tools for LLM clients

update    scheduled editorial pass: delta scout -> policy-gated ingest
           -> connection mining -> staleness check -> digest -> PR
```

Every handoff between stages is a markdown or JSON file you can inspect and edit. ICM discipline throughout: one stage, one job, plain text as the interface.

## The skills

| Skill | What it does |
|---|---|
| `run` | One-command pipeline: new → scout → ingest → compile → present, with exactly 2 taste checkpoints |
| `new` | Interactive questionnaire + workspace scaffold, with project auto-discovery |
| `scout` | Web research with 6-signal confidence scoring; delta mode for update runs |
| `ingest` | Fetches approved sources, preserves raw text immutably, compiles wiki articles |
| `compile` | Graph audit, backlink repair, overview evolution, gap analysis, emergent taxonomy, freshness report |
| `present` | Static frontend with 6 study modes (read, graph, search, feed, gaps, quiz) |
| `serve` | MCP server exposing 7 retrieval tools |
| `update` | Self-updating: scheduled delta scout → policy-gated ingest → connection mining → freshness → PR |

`new`, `scout`, `ingest`, `run`, and `update` are Claude-driven workflows defined in `SKILL.md` files. `compile`, `present`, and `serve` have TypeScript runtimes bundled into self-contained ESM files under `dist/`, invoked via `node ${CLAUDE_PLUGIN_ROOT}/dist/<skill>.js`.

## Keeping it current

A knowledge base built once decays. `/grimoire:update` is the maintenance loop:

1. **Delta scout** — search angles derived from the wiki's own open questions, its coverage gaps, and a watchlist you control; every URL already ingested is deduplicated away.
2. **Policy-gated ingest** — sources scoring above your threshold (capped per run) flow through the standard pipeline; raw text preserved, articles compiled.
3. **Connection mining** — unlinked article pairs with real overlap become bidirectional cross-references; rejected pairs are remembered and never proposed again.
4. **Freshness** — every article is tiered fresh / aging / stale against configurable windows; optionally the stalest articles' sources are re-fetched and verified.
5. **PR-gated shipping** — everything lands on a branch with a digest (sources found, skipped-with-scores, articles changed, connections made) as the PR body. The update never touches your default branch. A run with nothing new is a no-op — no empty PRs.

Your judgment lives in [`_config/update.md`](skills/new/assets/templates/update-config.md) — score thresholds, per-run caps, staleness windows, watchlist — and in PR review.

**Scheduling.** Run it manually ("what's new?"), from local cron — which uses your existing Claude Code login, zero extra credentials:

```cron
0 6 * * 1 cd ~/wikis/my-grimoire && claude -p "/grimoire:update" --permission-mode acceptEdits
```

— or install the GitHub Actions adapter with `/grimoire:update --setup`. The Actions runner has no Claude login, so it needs one secret: a subscription token from `claude setup-token` (`CLAUDE_CODE_OAUTH_TOKEN`); an `ANTHROPIC_API_KEY` works as the metered alternative. Full setup, tuning, and trade-offs in [docs/self-updating.md](docs/self-updating.md).

## The frontend

`present` generates a self-contained static site — zero CDN dependencies, fully functional from `file://`, every page printable, WCAG AA contrast verified per palette in CI. The hub opens on an ambient constellation of your actual knowledge graph; cross-document View Transitions morph article titles between pages; everything respects `prefers-reduced-motion`.

- **Read** — every article is a real page (`read/{slug}/`) with stable deep links: editorial 3-column layout, hover preview cards on internal links, a "Linked from" backlinks panel, numbered sources, freshness badges, sliding table-of-contents marker, reading progress.
- **Graph** — D3 force-directed map, warm-started from a deterministic build-time layout. Click for 1-hop focus, double-click to open the article, toggle cluster hulls, node colors derived from your palette.
- **Search** — command-palette style (⌘K), full keyboard navigation (↑↓ ↵), live results with highlighting, tag-cloud browsing, recovery suggestions on empty results.
- **Feed** — timeline of the wiki's history from `log.md`; update runs render as digest cards with stat chips.
- **Gaps** — coverage treemap computed at build time (no client-side layout engine), with a second lens that recolors by freshness. Cells are keyboard-focusable.
- **Quiz** — flashcards auto-generated from article sections, with a 3D flip, shuffled deck, and streak rewards.

**Theming** via `_config/design.md`: 8 palettes, 6 typography systems (plus individual `font-heading` / `font-body` / `font-mono` overrides), light/dark with system preference, `motion: subtle | expressive | none` and `density: compact | comfortable | spacious` applied as real design tokens, and `modes:` to disable any study mode you don't want.

## The MCP server

`serve` starts a stdio MCP server with seven tools designed for token-efficient retrieval:

| Tool | Returns |
|---|---|
| `grimoire_query` | Top matching articles with one-line summaries (hybrid FlexSearch + substring rerank) |
| `grimoire_list_topics` | The routing table: every article's slug + summary + tag counts, cheap to scan |
| `grimoire_get_article` | One article; `mode: auto` returns a summary envelope for large articles to respect token caps |
| `grimoire_get_section` | A single H2 section — the cheapest way to answer a pointed question |
| `grimoire_open_questions` | Unresolved questions parsed from `overview.md` |
| `grimoire_coverage_gaps` | Thin/missing topics, plus articles past their staleness window |
| `grimoire_search` | Full-text search across all articles |

The pattern: clients scan the routing table first (cheap), pick an article (free), pull one section (cheap). Connect any MCP client by pointing it at the bundle:

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

`/grimoire:serve` writes this snippet for you with the paths resolved. The server reads compile artifacts once at startup — re-run compile and restart the client after merging an update PR. Multiple servers run side by side, one per knowledge base.

## Example use cases

- **Learn a technology in depth** — `/grimoire "A deep study of WebGPU for engineers building compute shaders"` scouts the spec, W3C drafts, and conference talks; you curate; out comes a linked study site and an MCP expert grounded in your curated sources. The weekly update PR tells you when the spec moves.
- **Onboard to a team's stack** — build a grimoire about your frameworks and conventions, commit it next to `CLAUDE.md`. Every new hire gets a wiki *and* an LLM expert; the update loop keeps it honest as tools change.
- **Research a market before building** — scout competitor docs, community threads, and surveys; use gaps mode to see what you don't understand yet; let scheduled updates track the space as it moves.
- **Give Claude expert knowledge of a niche** — your internal SDK, an obscure scientific field. Point Claude Desktop at the MCP server; answers cite your corpus, not the open web.

## Reference example

[`examples/mcp/`](./examples/mcp/) is a complete, inspectable workspace about the Model Context Protocol itself — built with the real pipeline against 9 web sources, raw text preserved, every article citing its URLs. Generate and open its site:

```bash
node dist/compile.js examples/mcp && node dist/present.js examples/mcp
open examples/mcp/site/index.html
```

Or query it over MCP: `node dist/serve.js examples/mcp`.

## Requirements

- **Node.js 20+** (the bundles target `node20`)
- **Claude Code** with plugin support — local runs and local cron use your existing login; no API key anywhere except the optional cloud scheduler, where a subscription token suffices

## Development

```bash
git clone https://github.com/vedantggwp/grimoire.git
cd grimoire && npm install
npm test            # 334 tests across 19 suites
npm run build       # regenerate dist/ bundles (commit them — installs are buildless)
```

Run pipeline stages directly: `npm run compile|present|serve -- /path/to/workspace`.

```
grimoire/
  .claude-plugin/plugin.json   # plugin manifest
  skills/                      # 8 skills: SKILL.md + references/ + assets/
  lib/                         # TypeScript runtimes (compile, present/, serve, update engine)
  test/                        # vitest suites + fixtures
  docs/                        # architecture, specs, decisions, changelog, self-updating
  SOUL.md                      # product bible
```

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md). Architecture and decision history: [docs/architecture.md](docs/architecture.md), [docs/decisions.md](docs/decisions.md).

## License

[MIT](LICENSE)

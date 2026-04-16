# Launch announcement draft — v0.2.3

> Draft for review. Not published. Revise in the maintainer's voice before sharing.
> Previous v0.2.2 draft is preserved in git history at commit `4a33db4` if you want to diff.

---

## Short version (tweet / LinkedIn / HN title)

**Grimoire v0.2.3 — turn any topic into a compounding knowledge base that humans can read and LLMs can query efficiently. Claude Code plugin, local-first, ships its own MCP server, now with a dual-theme editorial frontend that doesn't look like generic AI slop.**

Install:
```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

Repo: https://github.com/vedantggwp/grimoire · MIT

---

## Medium version (Twitter thread / short blog post)

I built Grimoire to scratch my own itch: I wanted to deeply understand a topic, accumulate the best sources, and end up with a structured knowledge base that both I and my LLM tools could use. Not a note-taking app, not a CMS, not a chatbot — a knowledge base *builder*.

Grimoire is a Claude Code plugin with a 5-stage pipeline, every stage a markdown checkpoint you can edit:

1. **scout** — research the web, score sources with 6 signals, curate
2. **ingest** — fetch sources, preserve raw text, compile wiki articles
3. **compile** — cross-references, backlinks, coverage gap analysis
4. **present** — generate a study-oriented static frontend (6 modes)
5. **serve** — expose everything to any LLM client via a local MCP server

Local-first. No SaaS. No hosted API. Your files, your machine, your Git repo.

**What's new in v0.2.3** — the frontend. v0.2.2 already had the token-efficient MCP routing (Karpathy-style article summaries, `grimoire_get_section`, token-guarded `get_article`). What it *didn't* have was a site that earned its own promise of "a beautiful frontend for humans." v0.2.3 fixes that:

- **New default design system** — Option F "Linear Editorial" with Source Serif 4 + Inter, full dual-theme (light default + `.theme-dark` toggle + `prefers-color-scheme` auto), fluid typography via `clamp()` that renders cleanly from 375 px phones to 1440 px desktops, WCAG-AA contrast in both modes.
- **Real D3 treemap for gaps mode** — cells sized by `articleCount × sqrt(totalWords)`, 4-tier classification (full / partial / thin / missing), legend, hover tooltips. Previously a uniform grid that wasn't actually a treemap.
- **Anki-style quiz** — question visible → Show answer → inline reveal → Got it / Review again. Replaces a broken 3D-flip card that never worked quite right.
- **Real timeline feed** — vertical spine with dot markers, dates on the left rail, multi-tag inference so a "Rebuilt from real web sources" entry correctly shows `SCOUTED INGESTED COMPILED` chips.
- **Substantive search default state** — example queries derived from your top-centrality articles, click-to-filter tag cloud, centrality-sorted article grid with summaries. No more empty void with a blinking cursor.
- **Graph force layout that actually reads** — force parameters scale with node count, label collision padding computed from estimated label width, labels render below nodes with a theme-aware stroke so they stay legible over edges.
- **18 concrete fixes** total across `lib/present/`, with the full trail in [`docs/decisions.md`](docs/decisions.md). 129/129 tests green.

Try it on a topic you care about:
```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

Six skills auto-discover. Run them one at a time, review each checkpoint, end up with a real knowledge base your Claude can query.

Repo: https://github.com/vedantggwp/grimoire
MIT licensed.

---

## Long version (blog post / Substack)

### Why I built this

The story starts with a wiki about Claude Code for Design. I'd been accumulating bookmarks for months — spec docs, blog posts, YouTube talks, GitHub repos, X threads — and I wanted to *compile* them into something I could actually reference. A real knowledge base, not a dumping ground.

I ran the process manually. Research sources. Grade them on quality. Read each one and pull out the takeaways. Write wiki articles that cross-reference each other. Build an overview. Track what I still didn't cover. After a few weekends I had 65 URLs, 7 compiled articles, 33 backlinks, and an evolving overview — and the thing was *useful*. Not just to me: I pointed Claude at it via an MCP server and it started answering questions with citations to my own curated material.

That worked well enough that I stopped and asked: what if this were a tool? What if anyone could say *"I want to deeply understand X"* and scaffold a compounding knowledge base the same way?

That's Grimoire.

### What v0.2.3 is

Grimoire is a Claude Code plugin that runs a 5-stage pipeline — scout, ingest, compile, present, serve — and produces two artifacts: a **human-readable static frontend** with 6 study modes, and an **LLM-queryable MCP server** exposing the same corpus via 7 tools. Both artifacts read from the same `wiki/` directory on disk. Neither needs a server, a database, or an account.

### The frontend side

v0.2.2 shipped the architecture. v0.2.3 shipped the *design*. The generated site now uses "Linear Editorial" as its default aesthetic — Source Serif 4 for headings, Inter for body, JetBrains Mono for metadata, an editorial color palette (`#FFFFFF` / `#0E0E0E` backgrounds, `#0D9488` / `#2dd4bf` accent), full light+dark theming that switches on a class flip, and fluid typography via `clamp()` so the same CSS renders from a 375 px phone to a 1440 px desktop.

Six modes, each for a specific learning mode:

- **Read** — 3-column editorial layout (article nav · centered content max 680 px · on-page TOC), articles ordered by graph centrality, reading progress bar, keyboard navigation.
- **Graph** — D3 force-directed knowledge map, inlined d3 (zero CDN dependency), force parameters that scale with corpus size, collision radii computed from estimated label width so labels don't overlap.
- **Search** — command-palette style with ⌘K shortcut. Default state shows example queries, a tag cloud with counts, and a centrality-sorted article grid with summaries. Typing 2+ characters flips to live results with highlighted matches.
- **Feed** — real vertical timeline with a spine line, dot markers, dates on the left rail, and multi-tag action inference (scouted / ingested / compiled / edited can co-occur on a single entry).
- **Gaps** — real D3 treemap sized by tag weight, 4-tier classification (full / partial / thin / missing), legend, hover tooltip. Makes the shape of what you don't know visible.
- **Quiz** — Anki-style reveal (question → Show answer → inline answer → Got it / Review again), auto-generated from article H2 sections, keyboard-navigable.

Everything compiles to CSS custom properties on `:root`, so palette switching is a single class change. 8 palettes ship. The entire site is self-contained from `file://` — no server, no network, no build step in the output. Open `index.html` and explore.

### The LLM side

The MCP server exposes seven tools designed for token-efficient retrieval:

- `grimoire_list_topics` — the LLM's routing table: every article's slug + one-line summary, plus tag counts. Cheap to scan.
- `grimoire_query` — natural-language question → top-3 matching articles via hybrid FlexSearch + substring rerank that prefers title/summary matches.
- `grimoire_get_article` — fetch one article; `auto` mode returns a summary envelope for anything over 15 KB to stay under token caps; `full` forces complete markdown.
- `grimoire_get_section` — fetch just one H2 section of an article, case-insensitive heading match. Most token-efficient retrieval pattern.
- `grimoire_search` — full-text FlexSearch across the whole corpus.
- `grimoire_open_questions` — unresolved questions parsed from `overview.md`.
- `grimoire_coverage_gaps` — thin and missing tags.

The `list_topics` + `get_article` + `get_section` chain is where token efficiency lives. An LLM client running against a 50-article wiki doesn't dump the whole corpus into context to answer a question — it reads the routing table (cheap), picks the right article (free), and pulls just the relevant section (also cheap). Every article's `summary` frontmatter field is the load-bearing routing signal.

### Why local-first matters

Your grimoire is a directory of markdown files on your machine. There's no hosted service. No database. No account. No telemetry. The MCP server is a stdio subprocess you launch from your own client. You can put the directory in Git, branch it, diff changes, share it with collaborators, fork it.

That matters because knowledge accumulates over years and has to survive every SaaS shutdown and pricing change. Your brain's second memory shouldn't rent-seek.

### What it isn't

- Not a note-taking app (no daily notes, no fleeting thoughts)
- Not a CMS (no publishing workflow)
- Not a doc generator (doesn't read your codebase)
- Not a chatbot (it builds the knowledge base that answers questions, not the answerer)
- Not a framework (no runtime, no dependencies beyond what ships in the plugin bundle)

### Example use cases

- **Learn a new technology** — want to understand WebGPU / CRDTs / RLHF from first principles? Grimoire scouts the canonical sources, compiles a linked wiki ordered by centrality, and gives you a quiz mode for active recall.
- **Onboard to a codebase's ecosystem** — new job, new stack. Build a grimoire of the frameworks your team uses. Commit it next to `CLAUDE.md`. Every new hire gets both a wiki and an LLM expert for the stack.
- **Research a market before building** — scout competitor docs, public research, conference talks. Use gaps mode to see the shape of what you don't know.
- **Give Claude expert knowledge on a niche** — your LLM tools don't know your internal framework or that obscure field you work in. Build a grimoire, point any MCP client at the server, and now Claude cites your curated corpus.
- **Maintain a long-running personal wiki** — knowledge compounds across years, not weekends. The graph grows denser. Git tracks every change.

### What's in the box

```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

6 skills auto-discover. Run them one at a time. Each stage produces editable markdown so humans stay in the loop.

Also in `examples/mcp/` of the repo: a real 5-article knowledge base about the Model Context Protocol itself, built using the full Grimoire pipeline — scout found and scored 9 real web sources (official MCP spec, TypeScript SDK docs, MCP blog, community pattern articles), ingest fetched and preserved the raw text, compile built the cross-reference graph, present generated the frontend. Every article cites the URLs it was compiled from. Spin it up locally, run `serve` against it, and you have a meta knowledge base — a wiki about the protocol that powers the wiki.

### What's next

v0.2.3 is launch-ready for the core promise: produce a world-class KB that humans *want to read* and LLMs can query efficiently. v0.3 is on the roadmap: end-to-end Claude Desktop MCP compatibility testing, cursor-style pagination on list tools, per-claim confidence + provenance metadata, and freshness telemetry (flag articles whose sources have drifted).

Contributions welcome. Repo: https://github.com/vedantggwp/grimoire. MIT licensed.

— the Grimoire team

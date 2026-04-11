# Launch announcement draft — v0.2.2

> Draft for Ved's review. Not published. Revise in his voice before sharing.

---

## Short version (tweet / LinkedIn / HN title)

**Grimoire v0.2.2 — turn any topic into a compounding knowledge base that humans can read and LLMs can query efficiently. Claude Code plugin, local-first, ships its own MCP server.**

Install: `/plugin marketplace add vedantggwp/athanor && /plugin install grimoire@athanor`

---

## Medium version (Twitter thread / short blog post)

I built Grimoire to scratch my own itch: I wanted to deeply understand a topic, accumulate the best sources, and end up with a structured knowledge base that both I and my LLM tools could use. Not a note-taking app, not a CMS, not a chatbot — a knowledge base *builder*.

Grimoire is a Claude Code plugin with a 5-stage pipeline:

1. **scout** — research the web, score sources with 6 signals, curate
2. **ingest** — fetch sources, preserve raw text, compile wiki articles
3. **compile** — cross-references, backlinks, coverage gap analysis
4. **present** — generate a study-oriented static frontend (6 modes: read, graph, search, feed, gaps, quiz)
5. **serve** — expose everything to any LLM client via a local MCP server

Every handoff between stages is a plain markdown file you can edit before the next stage runs. Local-first. No SaaS. No hosted API. Your files, your machine, your Git repo.

The v0.2.2 release adds the piece I'd been circling: **every article ships with a one-line summary in its frontmatter**. This is Karpathy's LLM-wiki routing pattern — the summary is what lets an LLM client decide which article to fetch without reading each body in full. That one change makes the whole MCP server token-efficient in a way it wasn't before.

It also adds a new `grimoire_get_section` tool so LLMs can pull just one section of a long article (H2 heading matched, case-insensitive), and a token guard on `get_article` that returns a summary envelope for anything over 15KB instead of dumping the full body.

Try it on a topic you care about:
```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

Six skills auto-discover. Run them one at a time, review each checkpoint, end up with a real knowledge base.

Repo: https://github.com/vedantggwp/grimoire
MIT licensed.

---

## Long version (blog post / Substack)

### Why I built this

The story starts with a wiki about Claude Code for Design. I'd been accumulating bookmarks for months — spec docs, blog posts, YouTube talks, GitHub repos, X threads — and I wanted to *compile* them into something I could actually reference. A real knowledge base, not a dumping ground.

I ran the process manually. Research sources. Grade them on quality. Read each one and pull out the takeaways. Write wiki articles that cross-reference each other. Build an overview. Track what I still didn't cover. After a few weekends I had 65 URLs, 7 compiled articles, 33 backlinks, and an evolving overview — and the thing was *useful*. Not just to me: I pointed Claude at it via an MCP server and it started answering questions with citations to my own curated material.

That worked well enough that I stopped and asked: what if this were a tool? What if anyone could say "I want to deeply understand X" and scaffold a compounding knowledge base the same way?

That's Grimoire.

### What v0.2.2 is

Grimoire is a Claude Code plugin that runs a 5-stage pipeline — scout, ingest, compile, present, serve — and produces two artifacts: a **human-readable static frontend** with 6 study modes, and an **LLM-queryable MCP server** exposing the same corpus via 7 tools.

The human side has a read mode (articles ordered by graph centrality with a TOC and progress bar), a D3 force-directed graph mode (knowledge graph, inlined d3, zero CDN dependency), a client-side search mode, a changelog feed, a coverage-gaps visualization, and an auto-generated flashcard quiz. Theming is driven by a YAML config: 7 palettes, 5 typography systems, dark/light mode, three motion levels, three density levels — all CSS custom properties on `:root`, so palette switching is a class change with no rebuild.

The LLM side is an MCP server that runs over stdio. Seven tools:

- `grimoire_query` — natural-language question → top-3 article excerpts with summary-preferring output
- `grimoire_list_topics` — the "routing table": every article's slug + summary so an LLM can scan and decide what to pull
- `grimoire_get_article` — fetch one article; auto mode returns a summary envelope if it's over 15KB
- `grimoire_get_section` — fetch just one H2 section of an article (case-insensitive heading match)
- `grimoire_open_questions` — unresolved questions parsed from `overview.md`
- `grimoire_coverage_gaps` — thin tags, thin articles, missing articles
- `grimoire_search` — full-text FlexSearch

The `list_topics` + `get_section` + `get_article` guard combination is where token efficiency lives. An LLM client running against a 50-article wiki doesn't have to dump the whole corpus into context to answer a question — it reads the routing table (cheap), picks the right article (free), and pulls just the relevant section (also cheap). A Karpathy-style LLM-wiki architecture built into an MCP server.

### Why local-first matters

Your grimoire is a directory of markdown files on your machine. There's no hosted service. No database. No account. No telemetry. The MCP server is a stdio subprocess you launch from your own client. You can put the directory in Git, branch it, diff changes, share it with collaborators, fork it.

That matters because knowledge accumulates over years and has to survive every SaaS shutdown and pricing change. Your brain's second memory shouldn't rent-seek.

### What it isn't

- Not a note-taking app (no daily notes, no fleeting thoughts)
- Not a CMS (no publishing workflow)
- Not a doc generator (doesn't read your codebase)
- Not a chatbot (it builds the knowledge base that answers questions, not the answerer)
- Not a framework (no runtime, no dependencies beyond what ships in the plugin bundle)

### What's in the box

```
/plugin marketplace add vedantggwp/athanor
/plugin install grimoire@athanor
/grimoire:init
```

6 skills auto-discover. Run them one at a time. Each stage produces editable markdown so humans stay in the loop.

Also in `examples/mcp/` of the repo: a real 5-article knowledge base about the Model Context Protocol itself, built as the v0.2.2 launch-readiness validation. Spin it up locally, run `serve` against it, and you have a meta knowledge base — a wiki about the protocol that powers the wiki.

### What's next

v0.2.2 is launch-ready for the core promise (produce a world-class KB that humans read and LLMs query efficiently). v0.3 is on the roadmap: end-to-end Claude Desktop MCP compatibility testing, cursor-style pagination on list tools, per-claim confidence + provenance metadata, and freshness telemetry (flag articles whose sources have drifted).

Contributions welcome. Repo: https://github.com/vedantggwp/grimoire. MIT licensed.

— Ved

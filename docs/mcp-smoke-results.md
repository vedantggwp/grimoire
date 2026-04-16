# Grimoire MCP smoke test — 2026-04-16

Protocol-level end-to-end validation of `dist/serve.js` against the real
`grimoire-wiki` workspace, exercising every registered tool via the
official `@modelcontextprotocol/sdk` stdio client. Same transport +
handshake Claude Desktop uses, so a clean pass here = a clean pass in any
MCP client. Runnable at any time via `node scripts/mcp-smoke-client.mjs`.

Closes the "Claude Desktop MCP end-to-end compatibility test" item
deferred through v0.2.2 → v0.3.0 in `docs/roadmap.md`.

## Result — PASS

- **9/9** probes returned valid MCP responses
- **7/7** tools registered and callable
- Handshake + `initialize` + `notifications/initialized` clean
- stderr logs: `serve: loaded 6 articles from "Grimoire (the plugin)"` —
  no verbose-topic bleed

## Bug surfaced + fixed in this run

`data.schemaInfo.topic` was used raw at 5 display sites in `lib/serve.ts`
(query-result prefix, list_topics header, no-results message, server
`instructions` metadata, startup log). SCHEMA topics are free-form and
often multi-line essays — the raw value was leaking the full paragraph
into every MCP client session. Extracted `shortTopic()` to
`lib/short-topic.ts` as a shared util and applied it at all 5 sites.
Hub + page-title call-sites already use it via the re-export in
`lib/present/hub.ts`.

Before → after:
```
serve: loaded 6 articles from "Grimoire (the plugin) — how it works
internally, why it exists given Karpathy's LLM-wiki pattern already
describes the shape of the solution, how it compares to the broader..."

                    ↓

serve: loaded 6 articles from "Grimoire (the plugin)"
```

## Raw transcript

- Server: `/Users/ved/Developer/grimoire/dist/serve.js`
- Workspace: `/Users/ved/Developer/grimoire-wiki`
- Transport: stdio (JSON-RPC 2.0)
- SDK: `@modelcontextprotocol/sdk ^1.29.0`

```
serve: loaded 6 articles from "Grimoire (the plugin)"
serve: MCP server running on stdio
```

## Handshake
- `initialize` → OK
- `notifications/initialized` → OK

## tools/list
Registered 7 tools:
- `grimoire_query` — Answer a natural-language question by finding the most relevant articles. Returns top-3 matches with summaries and slugs for deeper retrieval. Use this FIRST for factual questions. For keyword search, use grimoire_search instead.
- `grimoire_list_topics` — Get the routing table: every article slug, title, and one-line summary, plus tag categories with counts. Call this FIRST in a new session to understand what the wiki covers — summaries let you decide which articles to fetch without wasting tokens.
- `grimoire_get_article` — Retrieve a specific wiki article by slug. Large articles (>15KB) return a summary envelope by default to save tokens — pass mode:"full" to force the complete markdown, or use grimoire_get_section to fetch a single section.
- `grimoire_get_section` — Retrieve a specific section of an article (matched by H2 heading, case-insensitive). Use this instead of grimoire_get_article when you only need one part — token-efficient retrieval for large articles.
- `grimoire_open_questions` — List unresolved research questions extracted from the wiki overview. Use when asking what is still unknown, what needs more research, or where the knowledge base has gaps.
- `grimoire_coverage_gaps` — Identify structural weaknesses: tags with only one article, articles below median word count, and topics referenced but not yet written. Use when asking about wiki health or what to write next.
- `grimoire_search` — Keyword search across all article titles, summaries, tags, and body text. Returns scored results with excerpts. Use for specific terms to look up. For natural-language questions, prefer grimoire_query which adds synthesis.

## tools/call probes
### grimoire_list_topics — List all topics
- args: `{}`
- OK (2388 chars, 2ms)

```
## Topics in: Grimoire (the plugin)
Total articles: 6
Total tags: 29

### Articles

- **Grimoire vs. Obsidian, Notion, Perplexity, and the rest of the landscape** (`grimoire-vs-obsidian-notion-perplexity`) — The obvious alternatives all solve adjacent problems. None of them build a compounding, LLM-readable knowledge base from external sources.
- **ICM architecture: the five stages and why they're
... [truncated, total 2388 chars]
```

### grimoire_query — Synthesize: "what is grimoire"
- args: `{"query":"what is grimoire"}`
- OK (1353 chars, 2ms)

```
## Results for: "what is grimoire"
Knowledge base: Grimoire (the plugin)

### Roadmap, decisions, and where Grimoire is going (roadmap-and-decisions)

Where Grimoire is in its phased roadmap, the decisions that shaped it, and the open friction — including the one this meta-grimoire surfaced on its first end-to-end run.

_Fetch full article via `grimoire_get_article(slug: "roadmap-and-decisions")`,
... [truncated, total 1353 chars]
```

### grimoire_query — Synthesize: grimoire vs obsidian
- args: `{"query":"how does grimoire compare to obsidian"}`
- OK (1374 chars, 1ms)

```
## Results for: "how does grimoire compare to obsidian"
Knowledge base: Grimoire (the plugin)

### Grimoire vs. Obsidian, Notion, Perplexity, and the rest of the landscape (grimoire-vs-obsidian-notion-perplexity)

The obvious alternatives all solve adjacent problems. None of them build a compounding, LLM-readable knowledge base from external sources.

_Fetch full article via `grimoire_get_article(
... [truncated, total 1374 chars]
```

### grimoire_get_article — Get article (auto mode)
- args: `{"slug":"why-grimoire-exists","mode":"auto"}`
- OK (5225 chars, 0ms)

```
---
title: "Why Grimoire exists (given Karpathy's pattern already describes it)"
tags: [existence-justification, karpathy, llm-wiki, positioning, moat]
sources:
  - url: "file:///Users/ved/Developer/grimoire/SOUL.md"
    title: "Grimoire Product Bible"
    accessed: 2026-04-16
  - url: "file:///Users/ved/Developer/grimoire/docs/story.md"
    title: "The Grimoire Story"
    accessed: 2026-04-16
  -
... [truncated, total 5225 chars]
```

### grimoire_get_article — Get article (summary mode)
- args: `{"slug":"why-grimoire-exists","mode":"summary"}`
- OK (721 chars, 1ms)

```
# Why Grimoire exists (given Karpathy's pattern already describes it)

**Summary:** Karpathy named the shape of an LLM-maintained wiki. Grimoire ships the product — with scouting, checkpoints, a frontend, and an MCP server the pattern alone doesn't give you.

_Article is 5.1KB (≈1306 tokens). This is a summary envelope to save context. Use `grimoire_get_section(slug: "why-grimoire-exists", heading
... [truncated, total 721 chars]
```

### grimoire_get_section — Get section (heading-level slice)
- args: `{"slug":"the-mcp-moat","heading":"The seven tools"}`
- OK (1847 chars, 1ms)

```
# The MCP server is the moat

## The seven tools

| Tool | What it returns | Why it exists |
|---|---|---|
| `grimoire_list_topics` | Every article's slug + one-line summary + tag counts | **The routing table.** A client LLM scans this once, cheap, and decides what to actually read. This is the Karpathy pattern as a runtime interface. |
| `grimoire_query` | Top 3 matching articles with summaries (
... [truncated, total 1847 chars]
```

### grimoire_open_questions — Open questions from overview
- args: `{}`
- OK (52 chars, 0ms)

```
Open Questions section exists but contains no items.
```

### grimoire_coverage_gaps — Coverage gaps
- args: `{}`
- OK (1845 chars, 1ms)

```
## Coverage Gaps (24 issues)

### Thin Tags (single article)

- [THIN TAG] "competitive" has only 1 article: grimoire-vs-obsidian-notion-perplexity
- [THIN TAG] "obsidian" has only 1 article: grimoire-vs-obsidian-notion-perplexity
- [THIN TAG] "notion" has only 1 article: grimoire-vs-obsidian-notion-perplexity
- [THIN TAG] "perplexity" has only 1 article: grimoire-vs-obsidian-notion-perplexity
- [
... [truncated, total 1845 chars]
```

### grimoire_search — Full-text search: "karpathy pattern"
- args: `{"query":"karpathy pattern","limit":3}`
- OK (1367 chars, 0ms)

```
## Search: "karpathy pattern" (3 results)

- **The Karpathy LLM-wiki pattern, explained honestly** (the-karpathy-llm-wiki-pattern) — score: 12
  Andrej Karpathy has described the idea repeatedly: **an LLM-maintained knowledge base, stored as markdown, structured so the LLM can route token-efficiently between articles**. The pattern predates any specific product — it's a shape of solution, not a to
... [truncated, total 1367 chars]
```

## Summary
- 9/9 probes passed
- Total tools listed: 7
- Finished: 2026-04-16T23:06:02.978Z

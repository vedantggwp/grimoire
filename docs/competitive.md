# How Grimoire Compares

> A capabilities comparison for people choosing a knowledge-base tool.

## Tools that solve adjacent problems

| Tool | What it does | How Grimoire differs |
|------|-------------|---------------------|
| **Obsidian** | Personal knowledge management with backlinks | Note-taking for humans. Grimoire compiles knowledge bases from external sources, for LLMs and humans — with source scouting, confidence scoring, and synthesis. |
| **Notion** | Team workspace with databases | General-purpose. Grimoire is purpose-built for deep-dive knowledge: per-wiki MCP server, confidence scoring, gap analysis. |
| **GitBook / Docusaurus** | Documentation sites | These document your own material. Grimoire compiles knowledge from external sources. |
| **Roam / Logseq** | Networked thought, outliner-based | Human-first. No automated research, no LLM serving layer, no frontend generation. |
| **Perplexity** | AI search engine | Answers questions and moves on. Grimoire builds the knowledge base that answers questions — compounding instead of ephemeral. |
| **Agent memory layers** (mem0-class) | Auto-captured conversation memory | Accumulates chat history. Grimoire curates sources — human-auditable, provenance-first. |

## Tools in the same space

Several projects implement parts of the LLM-wiki pattern (sources in → compiled interlinked
markdown → queryable knowledge). Grimoire's position in that space is the complete pipeline:

| Capability | Typical LLM-wiki tools | Grimoire |
|---|---|---|
| Source discovery | you supply sources | automated scout with 6-signal confidence scoring |
| Raw preservation | rarely | verbatim-first fetch ladder, per-source fidelity labels |
| Compilation audit | rarely | backlink audit, gap analysis, citation enforcement |
| Human study surface | markdown files | generated study site (read, graph, search, feed, gaps, quiz) |
| LLM serving | sometimes | per-wiki MCP server, 7 tools, token-budgeted responses |
| Staying current | manual re-runs | scheduled, PR-gated self-updates with freshness tiers |

## What Grimoire optimizes for

1. **Provenance you can audit** — every article cites preserved raw sources; degraded capture is
   visibly labeled at every layer rather than hidden behind polish.
2. **Honest retrieval** — the MCP server abstains when the knowledge base doesn't cover a question
   instead of returning a confident wrong answer.
3. **Compounding** — backlinks, freshness tiers, and scheduled updates make the wiki more valuable
   over time, in your git history, on your machine.

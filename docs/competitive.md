# Competitive Landscape & Moat

> Updated 2026-07-05. The category shifted in April 2026 when Karpathy's "LLM Wiki" gist
> went viral (21M+ views) and spawned direct implementations. See docs/strategy.md for
> the full positioning thesis and distribution plan.

## Adjacent Tools (different job)

| Tool | What It Does | How Grimoire Differs |
|------|-------------|---------------------|
| **Obsidian** | Personal knowledge management with backlinks | Note-taking app for humans. Grimoire is a compilation engine for LLMs AND humans. Obsidian doesn't scout, score, or synthesize. |
| **Notion** | Team workspace with databases | General-purpose. Grimoire is purpose-built for deep-dive knowledge. No MCP server, no confidence scoring, no gap analysis. |
| **GitBook / Docusaurus** | Documentation sites | These document YOUR code. Grimoire compiles knowledge FROM external sources. Different input, different output. |
| **Roam / Logseq** | Networked thought, outliner-based | Human-first. No LLM integration, no automated research, no frontend generation. |
| **Perplexity** | AI search engine | Answers questions. Grimoire BUILDS the knowledge base that answers questions. Ephemeral vs. compounding. |
| **mem0-class memory** | Auto-captured agent memory | Accumulates chat exhaust. Grimoire curates sources — human-auditable, provenance-first. |

## Direct Competitors (same job: the LLM-wiki pattern)

| Project | Scout | Study frontend | MCP | Self-updating | Local-first |
|---|---|---|---|---|---|
| nashsu/llm_wiki (~13.7k★) | — | desktop app | ✓ | — | ✓ |
| SamurAIGPT/llm-wiki-agent (~3.1k★) | — | — | — | — | ✓ |
| lucasastorian/llmwiki (~1.3k★) | — | — | ✓ | — | ✓ |
| nvk/llm-wiki (~0.8k★) | partial | — | — | — | ✓ |
| Hjarni (hosted, paid) | — | ✓ | ✓ | — | — |
| **Grimoire** | **✓ confidence-scored** | **✓ 6 study modes** | **✓ 7 tools** | **✓ PR-gated (v0.4.0)** | **✓ git-native** |

Nobody else ships the complete pipeline. Hjarni publicly concedes git history, graph
view, and filesystem access — Grimoire is the local-first answer to their trade-off list.

## Five Compounding Advantages

1. **The Complete Pipeline** — scout → ingest → compile → present → serve → update. Every clone implements one or two slices.
2. **Scout + Confidence Scoring** — Automated research with transparent 6-signal scoring. Every clone assumes you hand it sources.
3. **The Study Frontend** — 6 study modes (read, graph, search, feed, gaps, quiz), 8 curated palettes, 6 typography systems, WCAG AA, zero runtime dependencies. Every clone stops at markdown files.
4. **The Living Grimoire** — Scheduled, PR-gated self-updates via GitHub Actions (v0.4.0). The only knowledge base in the category that keeps itself fresh.
5. **Compounding Backlinks** — Mandatory backlink audit on every ingest; the wiki gets more connected with every source.

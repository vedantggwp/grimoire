# The Grimoire Story

## The problem

Say you want to deeply understand a topic. Not skim it. Understand it. Reinforcement learning from human feedback, say. Or retrieval-augmented generation, or Kubernetes networking, or medieval liturgical music. The tools available all miss the specific shape of this job.

Obsidian and Roam are note-taking apps for humans. They assume you already have the knowledge and want a place to put your own thoughts. They do not scout sources, score them, or synthesize them. Perplexity will answer a question, but the answer evaporates — the next conversation starts from zero, and the knowledge never compounds. GitBook and Docusaurus document *your* code; they take source you already own and render it pretty. Notion is a general workspace — no confidence scoring, no gap analysis, no LLM integration. None of these tools build a compounding, LLM-readable knowledge base from external sources.

That is the gap Grimoire fills. Not a note-taking app. Not a CMS. Not a documentation generator. Not a chatbot. A knowledge base builder — one that scouts the web, ingests what it finds, compiles it into a cross-referenced wiki, renders a study-oriented frontend, and exposes the whole thing to any LLM over MCP.

## The insight

Knowledge bases for LLMs need to be structurally different from knowledge bases for humans. Machines want token-efficient markdown with semantic cross-references and explicit taxonomy. Humans want typography, navigation, graphs, and a sense of where they are. But both surfaces can share the same underlying files if the structure is rigorous enough. Build the wiki once, serve it twice.

That insight came from a real project. Before Grimoire existed, the author built an LLM-maintained wiki about "Claude Code for Design." A handful of conversations produced 65 curated URLs, seven compiled articles, 33 backlinks, an evolving overview with open questions, and a branded landing page. The system worked. The repeatable shape — scout, ingest, compile, present, serve — was sitting there waiting to be extracted. Grimoire is that extraction.

## The five stages

Grimoire is a pipeline of five stages, each packaged as a Claude Code skill, each doing exactly one job.

**scout** researches the web for sources on the topic. It scores each candidate on six signals — Authority, Credibility, Uniqueness, Depth, Recency, and Engagement — and tiers them P0 through P2. The human reviews the ranked list and approves what moves forward. The machine scouts; the human decides.

**ingest** fetches approved sources, preserves the raw text in an archive, and compiles each source into a wiki article. A mandatory checkpoint lets the human review takeaways before anything is written to `wiki/`. Backlinks get audited on every ingest — the wiki gets more connected with every addition.

**compile** runs a graph audit via Papyr Core. It finds orphaned notes, validates links, computes centrality, and identifies coverage gaps. It evolves the overview using the top five articles by centrality as grounding. It proposes an emergent taxonomy once enough sources have landed.

**present** generates a self-contained static frontend with six study modes: linear reading ordered by centrality, a D3 force-directed graph, client-side search, a changelog feed, a gap map, and auto-generated flashcards. Opens from `file://`. No server, no build step for the reader.

**serve** starts a stdio MCP server with seven tools: `grimoire_query`, `grimoire_list_topics`, `grimoire_get_article`, `grimoire_get_section`, `grimoire_open_questions`, `grimoire_coverage_gaps`, and `grimoire_search`. Any MCP client — Claude Desktop, Claude Code, an IDE agent — can query the wiki without reading every file.

Every handoff between stages is a plain markdown or JSON file. You can inspect it, edit it, and run the next stage. Scout, ingest, and present all have mandatory human checkpoints. No hidden state.

## The moat

Five things compound in Grimoire's favor.

The first and largest is the **MCP server**. Every Grimoire wiki ships its own knowledge engine. No other wiki builder does this. The server understands the wiki's shape — its taxonomy, its cross-references, its open questions, its gaps — not just its text. A generic semantic search tool can answer "find files about X." Grimoire can answer "what are the unresolved questions in this domain?" and "where is coverage thin?" because it was built against the wiki's structure.

The second is **LLM-native structure**. Markdown, semantic cross-references, token-budgeted context layers. Grimoire wikis are written for how LLMs consume information, not retrofitted from human-first formats.

The third is **compounding backlinks**. Every ingest runs a backlink audit. The wiki gets exponentially more connected as it grows — the opposite of the usual entropy where notes drift apart.

The fourth is **design quality**. Seven named palettes, five typography systems, motion levels, density levels, light and dark modes, all driven by a single `_config/design.md` file. The frontend does not look like a default Docusaurus template. It does not look like generic AI output.

The fifth is **scout with confidence scoring**. Automated research with transparent, six-signal scoring. The human controls which sources land; the machine does the grunt work of finding and ranking them.

## The build

Grimoire was built in roughly two days. April 8 and April 9, 2026.

Day one started with identity. The author wrote SOUL.md — the product bible — fixing the name, the five stages, the principles, and the boundaries of what Grimoire is and is not. He then evaluated Papyr Core, an npm package that bundles markdown parsing, graph construction, search indexing, and analytics. Papyr Core replaced twelve dependencies that would otherwise have needed hand-rolling, and its actual API turned out to be richer than documented — it already had `findOrphanedNotes`, `calculateCentrality`, `findHubs`, `getConnectedComponents`, and a full analytics engine. The decision was to orchestrate what existed, not reinvent it.

The project was restructured from numbered ICM stage directories into Claude Code plugin format — `.claude-plugin/plugin.json` plus `skills/*/SKILL.md` auto-discovery. Each ICM stage mapped cleanly to a plugin skill. The "one stage, one job" principle carried over intact.

Day two built the pipeline. `init`, `scout`, and `ingest` landed as Claude-driven workflows defined entirely in `SKILL.md` — the skill tells Claude what to ask, what to fetch, and when to checkpoint with the human. `compile`, `present`, and `serve` landed as a two-layer pattern: a TypeScript runtime in `lib/` does the computation, and a SKILL.md tells Claude how to interpret what the runtime produced. Machine computes, Claude judges.

`lib/compile.ts` orchestrates Papyr Core. `lib/present/` is a twelve-module static site generator that builds all six study modes from a single set of compile artifacts. `lib/serve.ts` is an MCP server built on `@modelcontextprotocol/sdk` with stdio transport and Zod-validated inputs.

One architectural decision the author walked away from was integration with SiYuan Note, a well-regarded block-based PKM tool. SiYuan is excellent at what it does — human personal knowledge management — but Grimoire solves a different problem, and integration would have violated the "plain text is the interface" principle. The takeaway was to learn from SiYuan's architecture (section-level retrieval, FTS5, FSRS for flashcards) and keep the option open for a future version, not to couple to it.

By end of day two there were 79 integration tests across three suites, a three-agent security audit had run, and every critical and high issue had been fixed in-session.

## The hardening

On April 10, Grimoire went through a pre-launch hardening pass. Three parallel audits reviewed the plugin: a pipeline audit checked skill handoffs and file contracts, a code audit scanned `lib/` for bugs and security, and a goal-alignment audit checked implementation against SOUL.md and the decision log. The audits surfaced XSS in the search mode, path traversal in the MCP server, a missing explicit `zod` dependency, a flat-directory scan that missed taxonomy subdirectories, stale stage-contract files, and several documentation drift issues. All fixed.

A separate pre-publish security scan swept every tracked and untracked file in the repo. Zero secrets, zero credentials, zero unwanted files. But it did surface four blockers: a missing `LICENSE` file, a stale `architecture.md` still describing the deleted ICM stage layout, README skill statuses all still marked "Stub," and a stale copy of the MCP spec. All four were fixed before publish.

The last pass was a dry-run against a realistic throwaway workspace — three actual articles about RLHF. This is where the lesson bit. All 79 tests passed. The dry-run found three bugs that the synthetic fixtures had not caught. Quiz cards dropped every bullet-list section because the sentence-extraction regex required terminal punctuation. The MCP `list_topics` tool reported inflated counts because support pages (`index`, `overview`, `log`) were being counted as articles. And `grimoire_query` failed on natural-language queries like "what is reward modeling" because FlexSearch's default matching is token-AND and the stop words never appeared in any article. All three were fixed. The same 79 tests still passed.

The lesson the author wrote into the decision log: synthetic fixtures are not enough. Dry-run against realistic content before shipping.

## What makes it distinctive

- **Compounding, not ephemeral.** Perplexity answers and forgets. Grimoire builds something that grows with every ingest.
- **Structured for machines and humans.** Obsidian is human-only. Grimoire builds both surfaces from the same markdown.
- **Ships its own MCP server per wiki.** No other wiki builder does this. Every Grimoire is a queryable knowledge engine.
- **Two-layer architecture.** Machine computation in `lib/` for graph analysis and search. Claude judgment in `SKILL.md` for what to fix, what to surface, and how to rewrite.
- **Six study modes designed for retention.** Linear reading, graph exploration, search, feed, gap map, and flashcards. Not just browsing.
- **Local-first, plain-text, editable at every stage.** Your files, your machine, your Git repo. Humans can intervene between any two stages.
- **Agentic onboarding.** `init` v0.2.0 detects existing project markers, reads the relevant files, and pre-fills the questionnaire for the user to confirm.
- **Seven palettes, five typography systems.** The frontend does not look like a default template.

## Where it's going

The immediate next step is a first real-project test — the author spinning up a fresh Claude Code session inside an existing codebase and driving a grimoire from empty to complete. Claude Desktop MCP compatibility testing sits alongside it. Both are on the Phase 6 launch checklist.

Mid-term items include two deferred frontend modes — comparison tables and learning paths — and a CLI wrapper so `grimoire init` and `grimoire scout` work from a terminal outside of Claude Code. A GitHub template repository will make spinning up a new grimoire one command.

The long-term vision from SOUL.md is a network of Grimoires. People publish and share their knowledge bases. Each one is a structured, searchable, beautiful body of knowledge that compounds over time. A library of grimoires, each a small cathedral of understanding about some specific thing.

## The author

Grimoire was built by Ved (GitHub: `vedantggwp`). The plugin was born from a real project — the "Claude Code for Design" wiki — that produced 65 curated URLs, seven compiled articles, 33 backlinks, and a branded landing page from a handful of conversations. That system worked. It deserved to be a product.

---

*Grimoire is MIT licensed. See the README for install instructions.*

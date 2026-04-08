# SOUL.md — Grimoire Product Bible

> The soul of the product. Identity, vision, boundaries, and principles.
> For detailed specs, see the `docs/` directory. This file stays lean.

---

## Identity

**Name:** Grimoire (grim-WAHR)

**Tagline:** Your knowledge, structured for machines and humans.

**One sentence:** Grimoire is a knowledge base builder that scouts sources, compiles them into interconnected wiki articles with emergent taxonomy, generates a study-oriented frontend, and exposes the knowledge to LLMs via a custom MCP server.

**Etymology:** A grimoire is a medieval manuscript of accumulated spells, formulas, and secret knowledge — kept by alchemists and scholars. The word comes from Old French *grammaire* (grammar), because in an age when most people couldn't read, a book of structured knowledge looked like magic. Today, a well-structured knowledge base gives your LLM powers it wouldn't otherwise have. Same principle, modern stack.

---

## Origin

Grimoire was born from a real project: building an LLM-maintained wiki about "Claude Code for Design." The process revealed a repeatable system:

1. **Scout** — Research the best sources on a topic across the web
2. **Ingest** — Fetch each source, preserve the raw text, compile it into interconnected wiki articles
3. **Compile** — Build cross-references, evolve an overview, identify gaps
4. **Present** — Generate a beautiful, study-oriented frontend
5. **Serve** — Expose the knowledge to LLMs via structured access

The first wiki produced 65 curated URLs, 7 compiled articles, 33 backlinks, an evolving overview with open questions, and a branded landing page — all from a handful of conversations. The system worked. It deserved to be a product.

---

## Vision

**Near-term:** Anyone can say "I want to deeply understand X" and Grimoire scaffolds a compounding knowledge base — LLM-readable markdown for machines, a beautiful frontend for humans.

**Mid-term:** Grimoire wikis ship with their own MCP server, making them queryable by any AI tool. Your Claude Desktop, your IDE agent, your terminal — all can tap into your curated knowledge.

**Long-term:** A network of Grimoires. People publish and share their knowledge bases. Each one a structured, searchable, beautiful body of knowledge that compounds over time.

---

## What It Is / What It Isn't

**IS:**
- A knowledge base builder — it creates wikis, not notes
- A research tool — it scouts, scores, and curates sources
- A compilation engine — it synthesizes sources into interconnected articles
- An LLM context system — markdown optimized for token-efficient retrieval
- A study platform — the frontend is designed for learning
- Local-first — your files, your machine, your Git repo

**IS NOT:**
- Not a note-taking app (no daily notes, no fleeting thoughts)
- Not a CMS (no publishing workflow, no editorial calendar)
- Not a documentation generator (it doesn't read your codebase)
- Not a chatbot (it builds the knowledge base that answers questions)
- Not a framework (no runtime, no dependencies, just files)

---

## Principles

1. **One stage, one job** — from ICM. Each stage has a single responsibility.
2. **Plain text is the interface** — markdown files are the contract between stages.
3. **Every output is editable** — humans can review and modify between stages.
4. **Configure the factory, not the product** — system-level setup happens once.
5. **The human stays in control** — scout, ingest, and present have mandatory checkpoints.

---

## Detailed Specs

| Doc | What it covers |
|-----|---------------|
| [docs/architecture.md](docs/architecture.md) | ICM layers, stages, contracts, handoffs |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP server tools, architecture, moat |
| [docs/design-engine.md](docs/design-engine.md) | Theming, palettes, design skills, rules |
| [docs/frontend-modes.md](docs/frontend-modes.md) | 6 core study modes + future modes |
| [docs/scout-spec.md](docs/scout-spec.md) | Research engine, confidence scoring, emergent taxonomy |
| [docs/integration.md](docs/integration.md) | CLAUDE.md integration rules |
| [docs/competitive.md](docs/competitive.md) | Competitive landscape + moat |
| [docs/roadmap.md](docs/roadmap.md) | Phased roadmap |

---

## References

- **ICM** — Jake Van Clief, 2026. [GitHub](https://github.com/RinDig/Interpreted-Context-Methdology). Folder structure as agent architecture.
- **LLM-Wiki Pattern** — Andrej Karpathy. LLM-maintained knowledge bases.
- **First Implementation** — Claude Code for Design wiki, 2026. The project that proved the system.

---

*This document is the source of truth for Grimoire's identity and boundaries. Detailed specs live in `docs/`. If reality diverges from these documents, update them — don't let the divergence persist silently.*

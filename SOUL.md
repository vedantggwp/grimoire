# SOUL.md — Grimoire Product Bible

> The central document that governs everything. Every design decision, architectural choice, and product boundary traces back here.

---

## 1. Identity

**Name:** Grimoire (grim-WAHR)

**Tagline:** Your knowledge, structured for machines and humans.

**One sentence:** Grimoire is a knowledge base builder that scouts sources, compiles them into interconnected wiki articles with emergent taxonomy, generates a study-oriented frontend, and exposes the knowledge to LLMs via a custom MCP server.

**Etymology:** A grimoire is a medieval manuscript of accumulated spells, formulas, and secret knowledge — kept by alchemists and scholars. The word comes from Old French *grammaire* (grammar), because in an age when most people couldn't read, a book of structured knowledge looked like magic. Today, a well-structured knowledge base gives your LLM powers it wouldn't otherwise have. Same principle, modern stack.

---

## 2. Origin Story

Grimoire was born from a real project: building an LLM-maintained wiki about "Claude Code for Design." The process revealed a repeatable system:

1. **Scout** — Research the best sources on a topic across the web
2. **Ingest** — Fetch each source, preserve the raw text, compile it into interconnected wiki articles
3. **Compile** — Build cross-references, evolve an overview, identify gaps
4. **Present** — Generate a beautiful, study-oriented frontend
5. **Serve** — Expose the knowledge to LLMs via structured access

The first wiki produced 65 curated URLs, 7 compiled articles, 33 backlinks, an evolving overview with open questions, and a branded landing page — all from a handful of conversations. The system worked. It deserved to be a product.

---

## 3. Vision

**Near-term:** Anyone can say "I want to deeply understand X" and Grimoire scaffolds a compounding knowledge base — LLM-readable markdown for machines, a beautiful frontend for humans.

**Mid-term:** Grimoire wikis ship with their own MCP server, making them queryable by any AI tool. Your Claude Desktop, your IDE agent, your terminal — all can tap into your curated knowledge.

**Long-term:** A network of Grimoires. People publish and share their knowledge bases. The design system engineer's Grimoire. The security researcher's Grimoire. The startup founder's Grimoire. Each one a structured, searchable, beautiful body of knowledge that compounds over time.

---

## 4. What It Is / What It Isn't

### What Grimoire IS:
- A **knowledge base builder** — it creates wikis, not notes
- A **research tool** — it scouts, scores, and curates sources
- A **compilation engine** — it synthesizes sources into interconnected articles, not just stores them
- An **LLM context system** — markdown structure optimized for token-efficient retrieval
- A **study platform** — the frontend is designed for learning, not just browsing
- **Local-first** — your files, your machine, your Git repo

### What Grimoire IS NOT:
- Not a note-taking app (no daily notes, no fleeting thoughts)
- Not a CMS (no publishing workflow, no editorial calendar)
- Not a documentation generator (it doesn't read your codebase)
- Not a chatbot (it doesn't answer questions — it builds the knowledge base that answers questions)
- Not a framework (no runtime, no dependencies, just files)

---

## 5. Architecture — ICM Foundation

Grimoire is built on the **Interpreted Context Methodology (ICM)** by Jake Van Clief. ICM replaces framework-level orchestration with filesystem structure. The folder hierarchy IS the agent architecture.

### Five Design Principles (from ICM)

1. **One stage, one job** — Each stage handles a single responsibility
2. **Plain text as interface** — Markdown files enable communication between stages
3. **Layered context loading** — Agents load only necessary context for their current stage
4. **Every output is editable** — Humans can review and modify between stages
5. **Configure the factory, not the product** — System-level setup happens once; each wiki run uses identical configuration

### Five-Layer Context Model

| Layer | File | Budget | Purpose |
|-------|------|--------|---------|
| **L0** | `CLAUDE.md` | ~800 tokens | "Where am I?" — Project identity, orientation |
| **L1** | `CONTEXT.md` | ~300 tokens | "Where do I go?" — Route to the right stage |
| **L2** | `stages/NN-name/CONTEXT.md` | ~200-500 tokens | "What do I do?" — Stage-specific instructions |
| **L3** | `_config/`, `shared/`, `templates/` | Variable | "What rules apply?" — Design system, templates, scoring rules |
| **L4** | `stages/NN-name/output/`, `raw/`, `wiki/` | Variable | "What am I working with?" — Sources, articles, artifacts |

**The critical distinction:** L3 material (design tokens, templates, scoring rules) requires *internalization as constraints*. L4 material (sources, articles) requires *processing as input for transformation*.

A complete pipeline stage delivers 2,000–8,000 tokens — well within optimal model performance. This contrasts with monolithic approaches that push 30,000–50,000 tokens, causing information loss.

### Five Stages

```
01-scout → 02-ingest → 03-compile → 04-present → 05-serve
   ↑            ↑           ↑            ↑           ↑
 human       human       automated     human      automated
checkpoint  checkpoint                checkpoint
```

| Stage | Job | Input | Output | Human Checkpoint? |
|-------|-----|-------|--------|-------------------|
| **01-scout** | Research sources, score confidence, present curated list | Topic + scope from questionnaire | Prioritized URL list with confidence scores | Yes — human approves/rejects/reprioritizes |
| **02-ingest** | Fetch source, preserve raw, compile wiki articles | Approved URLs from scout | `raw/` sources + `wiki/` articles | Yes — human reviews takeaways before writing |
| **03-compile** | Cross-reference audit, backlink generation, overview evolution | Wiki articles from ingest | Updated cross-refs, overview, gap analysis | No — deterministic |
| **04-present** | Generate study-oriented frontend from wiki content | Wiki articles + `design.md` config | HTML/CSS/JS frontend | Yes — human reviews design |
| **05-serve** | MCP server setup, local dev server, CLAUDE.md snippet | Wiki structure + MCP spec | Running MCP server + optional CLAUDE.md integration | No — automated |

### Stage Contracts

Every stage CONTEXT.md follows the ICM contract format:

```
## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|

## Process
1. Step one
2. Step two
   → CHECKPOINT: human reviews X before continuing
3. Step three

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|

## Audit (creative stages only)
- [ ] Check 1
- [ ] Check 2
```

### Stage Handoffs

Output folders connect sequential stages. Stage 01's `output/` contains the curated URL list that Stage 02 reads as input. Humans can edit intermediate outputs; the next stage picks up whatever remains.

---

## 6. The MCP Server

The custom MCP server is Grimoire's moat. It transforms a folder of markdown into a **knowledge engine** that any AI tool can query.

### Why Not Just QMD?

| | QMD (generic search) | Grimoire MCP (knowledge engine) |
|---|---|---|
| **Model** | Semantic search over markdown files | Wiki-aware: understands taxonomy, cross-refs, overview, open questions |
| **Query** | "Find files about X" | "What do I know about X?" — synthesizes from multiple articles |
| **Structure** | Returns raw file content | Returns structured answers with source attribution |
| **Context** | No understanding of relationships | Knows which articles link to each other, where gaps are |

### Tool Inventory

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `grimoire_query` | Synthesize an answer from wiki articles on a topic | Medium — returns focused synthesis |
| `grimoire_list_topics` | Return taxonomy with article counts per category | Low — structured list |
| `grimoire_get_article` | Return a specific article by slug | Low — single file |
| `grimoire_open_questions` | Return unresolved questions from overview | Low — focused list |
| `grimoire_coverage_gaps` | Return topics with thin or missing coverage | Low — gap analysis |
| `grimoire_search` | Full-text search across all wiki content | Medium — wraps QMD or native search |

### MCP Server Architecture

- Lightweight Node.js or Python server
- Reads wiki structure on startup, watches for changes
- Can wrap QMD for full-text search OR implement native search
- Exposes stdio transport (works with Claude Desktop, Claude Code, any MCP client)
- Ships with the wiki — `grimoire serve` starts it

### The Moat

Every Grimoire wiki ships with its own knowledge engine. This means:
- Claude Desktop users can query the wiki without opening a terminal
- IDE agents can access domain knowledge without reading every file
- Multi-project setups can have multiple Grimoires, each serving different domains
- The MCP server understands the wiki's SHAPE, not just its TEXT

---

## 7. Design System Engine

Grimoire frontends must be beautiful. Not "AI slop." Not generic templates. Distinctive, study-oriented, accessible.

### The design.md Configuration

Every Grimoire wiki has a `_config/design.md` that configures its visual identity:

```yaml
---
palette: midnight-teal       # or: noir-cinematic, cold-steel, warm-concrete, electric-dusk, smoke-light, obsidian-chalk, custom
typography: editorial        # or: technical, playful, brutalist, minimal
motion: subtle               # or: none, expressive
density: comfortable         # or: compact, spacious
accent: "#00a5ac"            # optional override
font-display: "Poppins"     # optional override
font-mono: "IBM Plex Mono"  # optional override
---
```

### Palette Generation Strategy

The system has access to a deep arsenal of design skills:

| Skill | What It Provides |
|-------|------------------|
| **ui-ux-pro-max** | 97 color palettes, 57 font pairings, 99 UX guidelines |
| **billion-dollar-design** | Agency-level design: opacity-based color, 3-font stacks, glass morphism, shadow stacking |
| **high-end-visual-design** | $150k+ agency aesthetics: double-bezel, nested CTAs, spatial rhythm, magnetic physics |
| **design-taste-frontend** | 5 perception layers, typography craft, optical alignment, copy discipline |
| **minimalist-ui** | Warm monochrome, bento grids, muted pastels, editorial interfaces |
| **industrial-brutalist-ui** | Swiss typographic + military aesthetics, rigid grids, CRT scanlines |
| **visual** | 13 aesthetic presets (linear, stripe, vercel, raycast, apple, figma, editorial, brutalist, retro, tactical, minimalist, industrial, warm-editorial) |
| **design-motion-principles** | Spring physics, cubic-bezier, scroll reveals, micro-interactions |
| **product-team/ui-design-system** | Token generation (CSS/SCSS/JSON), responsive calculations, type scales |

### Design Rules (Non-Negotiable)

These apply regardless of palette choice:

1. **Accessibility first** — WCAG AA contrast minimums, focus states, prefers-reduced-motion, keyboard navigation
2. **Type scale with rhythm** — Minor third (1.2) or major third (1.25) ratio with clamp() for fluid sizing
3. **Consistent spacing** — 4px/8px base grid, no arbitrary values
4. **Semantic color** — Success, warning, error, info states in every palette
5. **Dark/light modes** — Every palette must support both, even if one is primary
6. **Print-safe** — Content must render in print (no background-dependent text)
7. **Mobile-first** — Vertical scroll, single column, touch targets ≥44px
8. **No AI slop indicators** — No purple gradients, no Inter font (unless intentional), no generic hero sections, no "Welcome to..." headings

### Theme Switching

Palettes are CSS custom properties on `:root`. Switching themes is a single class change on `<html>`. No rebuild, no page reload. The `design.md` just sets defaults — the frontend includes a theme picker if multiple palettes are configured.

---

## 8. Frontend Modes

The study-oriented frontend is always generated. It consumes wiki markdown and produces a multi-mode learning interface.

### Core Modes (MVP)

| Mode | What It Does | Data Source |
|------|-------------|-------------|
| **Linear Reading** | Curated reading order, textbook-style progression with "next article" flow | Article metadata + manually defined sequence or auto-sorted by dependency |
| **Graph Exploration** | Interactive concept map — nodes are articles, edges are `[[cross-references]]` | Backlink graph extracted from wiki content |
| **Search + Answer** | Type a question, get a synthesized answer from wiki articles with source links | Full-text index + article content |
| **Changelog / Feed** | "What's new" — latest ingests, updated articles, chronological activity | `wiki/log.md` parsed into timeline |
| **Gap Map** | Visual of what's well-covered (dark) vs. thin (light) vs. empty (outline), guiding research | Article word counts + taxonomy coverage |
| **Flashcard / Quiz** | Auto-generated review questions from article content for active recall | Article content parsed into Q&A pairs |

### Future Modes (Post-MVP)

| Mode | What It Does |
|------|-------------|
| **Comparison Tables** | Side-by-side views of related tools/concepts (auto-generated from articles in same category) |
| **Learning Paths** | Guided sequences with prerequisites — "read X before Y" — defined in article frontmatter |

### Frontend Architecture

- **Single HTML file per mode** — no build step, no bundler, no framework
- **Reads wiki markdown at build time** — articles compiled to JSON index
- **Static output** — serveable from any file server, Netlify, GitHub Pages
- **Progressive enhancement** — works without JS (linear reading), JS adds interactivity (graph, search)
- **Theme-aware** — all modes respect `design.md` configuration

---

## 9. The Scout

The scout is Grimoire's research engine. It finds, evaluates, and presents sources for human curation.

### How It Works

1. **User provides topic + scope** (from questionnaire or direct input)
2. **Scout runs parallel web searches** across multiple angles:
   - Official documentation
   - Community tutorials and guides
   - Video resources
   - Social media threads (X/Twitter)
   - GitHub repositories
   - Academic/research sources
3. **Each source is scored** on 6 confidence signals
4. **Sources are deduplicated and ranked**
5. **Scout presents results to human** with scores and rationale
6. **Human approves, rejects, or reprioritizes** — this is the checkpoint
7. **Approved list becomes the ingest pipeline**

### Confidence Scoring (6 Signals)

| Signal | Weight | Description |
|--------|--------|-------------|
| **Source Authority** | High | Official docs > established blog > personal blog > tweet. Is the author/org authoritative on this topic? |
| **Author Credibility** | High | Known practitioner, core team member, or recognized expert? Track record? |
| **Uniqueness** | High | Does this add NEW information vs. repeating what we already have? Diminishing returns on the 5th "getting started" guide. |
| **Depth** | Medium | Tutorial with code examples > overview listicle > link roundup. How much actionable knowledge? |
| **Recency** | Medium | Published in last 6 months > last year > older. Fast-moving topics weight this higher. |
| **Engagement** | Medium | Stars, likes, shares, comments — social proof that the community found value. |

Each signal scored 1-5. Composite score determines tier:
- **P0 (18-30):** Must ingest — high authority, unique, deep
- **P1 (12-17):** Should ingest — adds perspective or depth
- **P2 (6-11):** Nice to have — supplementary or redundant

### Scout Output Format

```markdown
# Scout Report: [Topic]
Date: YYYY-MM-DD
Sources found: N
After dedup: M

## P0 — Must Ingest (N sources)
| # | URL | Title | Authority | Credibility | Uniqueness | Depth | Recency | Engagement | Score |
|---|-----|-------|-----------|-------------|------------|-------|---------|------------|-------|

## P1 — Should Ingest (N sources)
...

## P2 — Nice to Have (N sources)
...

## Gaps Identified
- [Topics with thin coverage despite searching]
```

---

## 10. Emergent Taxonomy

Categories are NOT predefined. They emerge from the sources.

### How It Works

1. **First 5-10 sources are ingested** into a flat `wiki/` folder (no subdirectories yet)
2. **After enough mass**, Grimoire analyzes the articles and proposes a taxonomy:
   - Groups articles by theme
   - Suggests 5-8 category names with descriptions
   - Shows which articles would go where
3. **Human approves, edits, or asks for a redo**
4. **Grimoire creates the subdirectories and reorganizes**
5. **Subsequent ingests auto-categorize** into the established taxonomy
6. **If a new category is needed**, Grimoire proposes it during ingest and waits for approval

### Alternative: User-Defined Taxonomy

If the user already knows their categories (from the questionnaire), they can define them upfront. The system supports both:
- **Emergent** — categories from sources (default)
- **Defined** — categories from user (optional override in questionnaire)

---

## 11. CLAUDE.md Integration

Grimoire can optionally generate a lightweight snippet for a project's CLAUDE.md that points to the wiki.

### Rules

- **Optional** — the system asks the user, never forces it
- **Lightweight** — 5-10 lines maximum. CLAUDE.md should be 50-150 lines total; the wiki reference must not bloat it
- **Semantic pointer** — references `wiki/index.md`, not individual articles
- **Hard rule, not suggestion** — the snippet must make it a rule to consult the wiki, not just a "you might want to check..."

### Example Snippet

```markdown
## Knowledge Base: [Topic]

This project has a Grimoire wiki at `wiki/`. When working on tasks related to [topic]:
1. Read `wiki/index.md` to find relevant articles
2. Consult specific articles before making decisions in this domain
3. If the wiki doesn't cover your question, flag it — don't guess

The wiki is the source of truth for [topic] knowledge. Model training data is not.
```

### Auto-Update

The snippet is generated once. It does NOT auto-update as the wiki grows — the index.md handles routing internally. This keeps CLAUDE.md stable.

---

## 12. Competitive Landscape

| Tool | What It Does | How Grimoire Differs |
|------|-------------|---------------------|
| **Obsidian** | Personal knowledge management with backlinks | Obsidian is a note-taking app for humans. Grimoire is a compilation engine for LLMs AND humans. Obsidian doesn't scout, score, or synthesize — you do all the work. |
| **Notion** | Team workspace with databases | Notion is a general-purpose tool. Grimoire is purpose-built for deep-dive knowledge on a single topic. Notion has no MCP server, no confidence scoring, no gap analysis. |
| **GitBook / Docusaurus** | Documentation sites | These document YOUR code. Grimoire compiles knowledge FROM external sources about a domain. Different input, different output. |
| **Roam / Logseq** | Networked thought, outliner-based | Same problem as Obsidian — human-first, no LLM integration, no automated research, no frontend generation. |
| **Perplexity** | AI search engine | Perplexity answers questions. Grimoire BUILDS the knowledge base that answers questions. Perplexity is ephemeral; Grimoire compounds. |

---

## 13. Moat

Five compounding advantages:

1. **The MCP Server** — Every Grimoire ships its own knowledge engine. No other wiki builder does this. Your AI tools can query your curated knowledge directly.

2. **LLM-Native Structure** — Markdown files, semantic cross-references, token-budgeted context layers. Built for how LLMs actually consume information, not retrofitted.

3. **Compounding Backlinks** — The mandatory backlink audit on every ingest means the wiki gets exponentially more connected over time. Early articles become richer as later articles link back.

4. **Design Quality** — Access to 97+ palettes, 57 font pairings, and agency-level design skills means the frontend doesn't look like a default template. It looks like someone paid for it.

5. **Scout + Confidence Scoring** — Automated research with transparent scoring. The human stays in control, but the machine does the legwork. No other knowledge tool scouts FOR you.

---

## 14. Roadmap

### Phase 1 — Foundation (Current)
- [x] Product bible (SOUL.md)
- [ ] ICM directory structure
- [ ] Stage CONTEXT.md contracts
- [ ] Shared references and templates
- [ ] D2 architecture diagrams
- [ ] Onboarding questionnaire

### Phase 2 — Core Pipeline
- [ ] Scout skill (01-scout) with confidence scoring
- [ ] Ingest skill (02-ingest) with raw preservation + article compilation
- [ ] Compile skill (03-compile) with backlink audit + overview evolution
- [ ] Emergent taxonomy engine
- [ ] QMD integration for semantic search

### Phase 3 — Frontend
- [ ] design.md configuration system
- [ ] Linear reading mode
- [ ] Search + answer mode
- [ ] Changelog / feed mode
- [ ] Gap map visualization
- [ ] Graph exploration (concept map)
- [ ] Theme switching (CSS custom properties)

### Phase 4 — MCP Server
- [ ] Core MCP server (grimoire_query, grimoire_list_topics, grimoire_get_article)
- [ ] Extended tools (grimoire_open_questions, grimoire_coverage_gaps, grimoire_search)
- [ ] Claude Desktop compatibility testing
- [ ] Documentation and setup guide

### Phase 5 — Polish & Distribution
- [ ] Flashcard / quiz mode
- [ ] Comparison tables
- [ ] Learning paths
- [ ] CLI wrapper (`grimoire init`, `grimoire scout`, etc.)
- [ ] GitHub template repository
- [ ] README and contribution guide

---

## 15. References

- **ICM (Interpreted Context Methodology)** — Jake Van Clief, 2026. [GitHub](https://github.com/RinDig/Interpreted-Context-Methdology). "Folder structure as agent architecture." The architectural foundation for Grimoire's stage-based pipeline and 5-layer context model.

- **LLM-Wiki Pattern** — Andrej Karpathy. The concept of LLM-maintained knowledge bases where the AI is both the reader and the writer. Grimoire extends this with automated scouting, confidence scoring, and an MCP server for structured access.

- **Model Workspace Protocol** — Van Clief, 2026. The academic treatment of ICM principles: separation of concerns applied to AI context windows instead of code modules.

- **Frontend Design Plugin** — Anthropic, 2025-2026. The ~400 token skill that counters distributional convergence in LLM design output. Grimoire's design engine builds on this principle: mid-altitude prompting that names anti-patterns explicitly.

- **First Implementation** — Claude Code for Design wiki, 2026. The project that proved the system works. 65 curated sources, 7 compiled articles, 33 backlinks, branded frontend, all from structured conversations.

---

*This document is the source of truth for Grimoire. All architectural decisions, feature boundaries, and design choices must be consistent with what is written here. If reality diverges from this document, update the document — don't let the divergence persist silently.*

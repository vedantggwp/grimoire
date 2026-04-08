# Decision Log

> Living document. Append new decisions at the top. Never delete entries — they're historical context.
> When making architectural, scope, or design decisions during a session, update this file before the session ends.

---

## 2026-04-08 — SOUL.md split for ICM compliance

**Decision:** Split SOUL.md (3500 words) into SOUL.md (~700 words) + 8 spec docs in docs/.

**Why:** SOUL.md violated ICM's <200 line reference file convention. A monolithic file also caused Codex agents to exhaust their token budget reading it before they could write anything.

**Trail:** Audit found SOUL.md at 420+ lines. ICM spec says reference files stay under 200. Ved confirmed the split approach.

---

## 2026-04-08 — Grimoire as the product name

**Decision:** Name the product "Grimoire."

**Why:** Ved wanted something that appeals to non-tech users, isn't "girly," is immediately evocative, and isn't taken. Grimoire = medieval knowledge manuscript. Etymology: Old French *grammaire* (grammar) — structured knowledge that looked like magic. Maps perfectly to a KB that gives LLMs power.

**Trail:** Rejected Lore, Grove, Cairn, Fern, Moss, Primer, Atlas (too common). Ved suggested the grimoire direction. We explored modern spins (Grimlore, Grym, Lumoire) but landed on the word itself — not taken in tech, everyone knows it from pop culture.

---

## 2026-04-08 — ICM as architectural foundation

**Decision:** Use Jake Van Clief's Interpreted Context Methodology (ICM) as the structural foundation.

**Why:** ICM's "folder structure as agent architecture" maps perfectly to Grimoire's staged pipeline. 5-layer context model keeps token budgets under control. Plain text interfaces make everything debuggable.

**Trail:** Ved asked if I knew ICM. I researched it, found the GitHub repo, read the full methodology. The 5 stages (scout → ingest → compile → present → serve) mapped directly to ICM's numbered stage directories.

---

## 2026-04-08 — Emergent taxonomy over predefined

**Decision:** Categories emerge from sources by default. User can override with predefined categories.

**Why:** Every subject has its own quirks. Predefined categories force a structure that may not fit. Ved: "categories must emerge from sources, ofc."

**Trail:** Asked whether taxonomy should be hardcoded vs. emergent. Ved chose emergent. Mechanical approach: first 5-10 sources go flat, then system proposes categories, human approves/edits/redoes.

---

## 2026-04-08 — Custom MCP server as the moat

**Decision:** Every Grimoire ships its own MCP server with 6 tools.

**Why:** QMD does generic semantic search. A custom MCP understands the wiki's shape — taxonomy, cross-refs, open questions, gaps. This makes Grimoire queryable from Claude Desktop (which can't use CLIs). Ved: "I like this suggestion; it actually gives it its own moat."

**Trail:** Discussed QMD limitations vs. a custom server. Ved confirmed the MCP direction. 6 tools defined: grimoire_query, grimoire_list_topics, grimoire_get_article, grimoire_open_questions, grimoire_coverage_gaps, grimoire_search.

---

## 2026-04-08 — design.md as theme config

**Decision:** Theming controlled by a single `_config/design.md` with palette, typography, motion, density options.

**Why:** The system has access to 97+ palettes and 9 design skills. Rather than hardcoding 3-5 themes, design.md is a lightweight config that tells the skills what to do. Ved: "a central theme.md will work very well."

**Trail:** Originally proposed hardcoded palettes. After scanning Ved's installed design skills (ui-ux-pro-max, billion-dollar-design, etc.), shifted to config-driven approach. 7 named palettes + custom option.

---

## 2026-04-08 — Frontend always included, presentations optional

**Decision:** Every Grimoire gets a study-oriented frontend. Presentation decks are a separate optional skill.

**Why:** Ved: "there will always be beautiful, study-oriented frontend. Presentations are going to be a skill that is optional."

**Trail:** Asked whether landing page and presentation were always part of the system. Ved separated them: frontend = core, presentations = optional.

---

## 2026-04-08 — 6 core frontend modes

**Decision:** Core modes: linear reading, graph exploration, search + answer, changelog/feed, gap map, flashcard/quiz. Future: comparison tables, learning paths.

**Why:** Ved wanted all 8 proposed modes. Prioritized 6 as core (MVP), 2 as post-MVP.

**Trail:** Proposed 8 modes. Ved: "I want all of them." Agreed on core vs. future split.

---

## 2026-04-08 — CLAUDE.md integration is optional and lightweight

**Decision:** The wiki reference in a project's CLAUDE.md is optional, ~10 lines, and only generated when the user says yes.

**Why:** Ved: "CLAUDE.md needs to be 50-150 lines max. All that should go in is a reference to the index, with very lightweight rules."

**Trail:** Proposed auto-generating a CLAUDE.md snippet. Ved pushed back on auto-updating and on including the full index. Settled on: optional, lightweight pointer to wiki/index.md, hard rule (not suggestion).

---

## 2026-04-08 — Confidence scoring with 6 signals

**Decision:** Scout scores sources on Authority (H), Credibility (H), Uniqueness (H), Depth (M), Recency (M), Engagement (M). Tiers: P0 18-30, P1 12-17, P2 6-11.

**Why:** Ved agreed these parameters give the human enough context to approve/reject/reprioritize. "The confidence threshold needs to have more parameters than just official docs and community content."

**Trail:** Proposed 6 signals with weights. Ved confirmed. Added that the flow should be collaborative — human gives topic + inclusions/exclusions, scout surfaces ranked results.

---

## 2026-04-08 — Single-author for now

**Decision:** Single-author wikis. Multi-user deferred.

**Why:** Reduces complexity. Conflict resolution, contributor attribution, and review workflows can come later.

**Trail:** Asked about multi-user. Ved: "for now, let's go single-author."

---

## 2026-04-08 — Local-first, host if you want

**Decision:** Grimoire is local-first. If someone wants to host, they can — it's static files.

**Why:** Ved: "local-first works. if someone wants to host, they can host it. its easy enough to figure out, innit?"

---

## 2026-04-08 — No hooks (token cost concern)

**Decision:** Do not implement custom hooks for Grimoire. The token cost of injecting hook context on every turn outweighs the benefit.

**Why:** Ved reviewed 5 proposed hooks and cancelled all of them: "Before implementing anything, think critically about whether this is going to cause a lot of token expense."

**Trail:** Proposed ICM router gate, decisions reminder, manifest sync, route check, context budget warning. All rejected for token cost reasons.

---

## 2026-04-08 — Packaging as Claude Code plugin

**Decision:** Package Grimoire as a Claude Code plugin (plugin.json format).

**Why:** Plugin format is the native distribution mechanism for Claude Code. Makes it installable, discoverable, and updatable.

**Trail:** Asked about packaging format (plugin vs. standalone skills). Ved chose plugin and asked to check latest Anthropic docs.

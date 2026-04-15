# Frontend Modes

The study-oriented frontend is always generated. It consumes wiki markdown and produces a multi-mode learning interface.

## Core Modes (MVP)

| Mode | What It Does | Data Source |
|------|-------------|-------------|
| **Linear Reading** | 3-column editorial layout (article nav · content max 680px · on-page TOC). Articles ordered by graph centrality. Reading progress bar, keyboard navigation. | Article metadata + centrality |
| **Graph Exploration** | D3 force-directed knowledge map. Force parameters scale with node count, collision radii account for label width, labels render below nodes with theme-aware stroke. | Backlink graph |
| **Search (command palette)** | ⌘K overlay. Default state: example queries from top-centrality articles, tag cloud with counts (click-to-filter), centrality-sorted article grid with summaries. Typing flips to live results. | Full-text index + articles |
| **Feed (timeline)** | Vertical timeline with spine line, dot markers, dates on left rail. Multi-tag action inference (scouted / ingested / compiled / edited can co-occur per entry). | `wiki/log.md` timeline |
| **Gap Map (D3 treemap)** | Real `d3.treemap()` sized by `articleCount × sqrt(totalWords)`. 4-tier classification: full (≥3 articles), partial (2), thin (1), missing (0). Legend and hover tooltip. | Word counts + tag graph |
| **Flashcard / Quiz (Anki-style)** | Auto-generated questions from article H2 sections. Question visible → "Show answer" button → inline reveal → "Got it / Review again". Shuffled deck, keyboard-navigable. | Article H2 sections → Q&A pairs |

## Future Modes (Post-MVP)

| Mode | What It Does |
|------|-------------|
| **Comparison Tables** | Side-by-side views of related tools/concepts |
| **Learning Paths** | Guided sequences with prerequisites ("read X before Y") |

## Architecture

- **Single HTML file per mode** — no build step, no bundler, no framework
- **Reads wiki at build time** — articles compiled to JSON index
- **Static output** — serveable from any file server
- **Progressive enhancement** — works without JS (linear reading), JS adds interactivity
- **Theme-aware** — all modes respect `design.md` configuration

## Diagram

- [frontend-modes.svg](architecture/frontend-modes.svg) — 6 modes with data sources

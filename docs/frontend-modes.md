# Frontend Modes

The study-oriented frontend is always generated. It consumes wiki markdown and produces a multi-mode learning interface.

## Core Modes (MVP)

| Mode | What It Does | Data Source |
|------|-------------|-------------|
| **Linear Reading** | Curated reading order, textbook-style with "next article" flow | Article metadata + sequence |
| **Graph Exploration** | Interactive concept map — nodes are articles, edges are cross-references | Backlink graph |
| **Search + Answer** | Type a question, get synthesized answer with source links | Full-text index + articles |
| **Changelog / Feed** | "What's new" — latest ingests, updated articles | `wiki/log.md` timeline |
| **Gap Map** | Visual coverage: well-covered (dark) vs. thin (light) vs. empty (outline) | Word counts + taxonomy |
| **Flashcard / Quiz** | Auto-generated review questions for active recall | Article content → Q&A pairs |

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

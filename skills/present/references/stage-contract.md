# 04-present

Turn the wiki into a study-oriented frontend that is theme-aware, navigable, and reviewable before finalization.

## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|
| `docs/design-engine.md` | L3 | All | Design rules, skill arsenal, theme switching |
| `docs/frontend-modes.md` | L3 | All | Required modes and architecture |
| `CLAUDE.md` | L0 | Core Rules | Preserve stage isolation and editable outputs |
| `CONTEXT.md` | L1 | Stage Map, Decision Tree | Confirm this task belongs to present |
| `_config/design.md` | L3 | Theme configuration | Sets palette, typography, motion, density, and accent rules |
| `wiki/**/*.md` plus `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | L4 | Articles, structure, synthesis, changelog | Supplies content, graph edges, search data, and gap signals |

## Process
1. Read `_config/design.md` and derive the theme, type system, motion rules, density, and accessibility constraints.
2. Read the full wiki and build a content model for linear reading, graph exploration, search, changelog, and gap map views.
3. Generate a draft frontend inside `stages/04-present/output/` using static HTML, CSS, JS, and any compiled JSON data needed by the UI.
4. Present the draft design and interaction model to the human reviewer.
   -> CHECKPOINT: human review is required before the frontend is treated as final.
5. Apply review feedback, then finalize the presentation bundle with production-ready navigation, theme handling, and study flows.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Frontend bundle | `stages/04-present/output/` | Static HTML/CSS/JS for the study interface |
| Compiled data | `stages/04-present/output/data/` | JSON or equivalent artifacts for search, graph, changelog, and gap views |
| Review notes | `stages/04-present/output/review-notes.md` | Draft-to-final decisions and human feedback log |

## Audit
- [ ] Respects `_config/design.md` and the non-negotiable design rules from `docs/design-engine.md`
- [ ] Includes linear reading, graph exploration, search, changelog, and gap map modes
- [ ] Works on mobile, supports keyboard navigation, and honors reduced-motion preferences

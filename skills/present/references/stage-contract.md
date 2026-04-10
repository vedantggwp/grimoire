# Present Stage Contract

Turn the compiled wiki into a self-contained static frontend with six study modes, themed from `_config/design.md`.

## Inputs
| Source | Purpose |
|--------|---------|
| `SCHEMA.md` | Topic, scope, audience — used for page titles and framing |
| `_config/design.md` | Palette, typography, motion, density — drives CSS generation |
| `wiki/**/*.md` | Article content and frontmatter |
| `wiki/.compile/notes.json` | Parsed article manifest (produced by compile) |
| `wiki/.compile/graph.json` | Nodes, edges, backlinks, centrality (produced by compile) |
| `wiki/.compile/search-index.json` | Serialized FlexSearch index (produced by compile) |
| `wiki/.compile/analytics.json` | Tag and gap analytics (produced by compile) |

## Process
1. Run the bundled present CLI: `node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace-path}`.
2. The generator reads `_config/design.md` and derives the theme (7 palettes, 5 type systems, dark/light, motion, density).
3. It loads the compile artifacts from `wiki/.compile/` and the full wiki tree.
4. It emits a static site under `{workspace}/site/` containing one page per study mode plus an index.
5. The output opens directly from `file://` — no server required to view it.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Frontend bundle | `{workspace}/site/` | Static HTML + CSS + inline JS |
| Index page | `{workspace}/site/index.html` | Landing page with mode navigation |
| Read mode | `{workspace}/site/read/index.html` | Linear reading ordered by centrality |
| Graph mode | `{workspace}/site/graph/index.html` | D3 force-directed concept map (loads D3 from CDN) |
| Search mode | `{workspace}/site/search/index.html` | Full-text search via bundled FlexSearch index |
| Feed mode | `{workspace}/site/feed/index.html` | Changelog of wiki updates |
| Gaps mode | `{workspace}/site/gaps/index.html` | Coverage gap visualization |
| Quiz mode | `{workspace}/site/quiz/index.html` | Auto-generated flashcards |
| Stylesheet | `{workspace}/site/assets/style.css` | Theme-derived CSS custom properties on `:root` |

## Audit
- [ ] Respects `_config/design.md` palette, typography, motion, and density
- [ ] Mobile-first, keyboard-navigable, reduced-motion aware
- [ ] All six modes render without console errors
- [ ] Internal links (article → article) resolve to `read/` page anchors

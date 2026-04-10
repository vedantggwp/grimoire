# Compile Stage Contract

Audit the wiki graph, repair deterministic issues, surface gaps, and build serialized indexes.

## Inputs
| Source | Purpose |
|--------|---------|
| `wiki/**/*.md` | All articles and support pages (full graph) |
| `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | Navigation, synthesis, change history |
| `SCHEMA.md` | Taxonomy, scope (for gap analysis) |

## Process
1. Run Papyr Core analysis: `node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace}/wiki`
2. Read JSON outputs from `wiki/.compile/` (audit, graph, analytics, search-index, notes)
3. Fix deterministic issues: broken links, one-directional backlinks, stale index entries, orphan pages
4. Surface heuristic issues: duplicate concepts, taxonomy gaps, missing cross-references, thin coverage
5. Propose taxonomy (conditional, Step 5.5) — only if 5+ tags, 5+ articles, taxonomy still emergent
6. Rewrite `wiki/overview.md` with current synthesis, open questions, coverage gaps
7. Write compile report to `wiki/.compile/compile-report.md`
8. Update `wiki/log.md`

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Repaired wiki | `wiki/**/*.md` | Deterministic fixes applied in-place |
| Updated overview | `wiki/overview.md` | Current synthesis + open questions + gaps |
| Compile report | `wiki/.compile/compile-report.md` | Audit results, fixes, heuristic issues |
| Graph data | `wiki/.compile/graph.json` | Nodes, edges, backlinks, statistics |
| Search index | `wiki/.compile/search-index.json` | Serialized FlexSearch index |
| Analytics | `wiki/.compile/analytics.json` | Content, graph, tag analytics |
| Notes manifest | `wiki/.compile/notes.json` | Article slugs, titles, tags, word counts |

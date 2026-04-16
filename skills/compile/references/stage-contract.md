# Compile Stage Contract

Audit the wiki graph, repair deterministic issues, surface gaps, and build serialized indexes.

## Inputs
| Source | Purpose |
|--------|---------|
| `wiki/**/*.md` | All articles and support pages (full graph) |
| `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` | Navigation, synthesis, change history |
| `SCHEMA.md` | Taxonomy, scope (for gap analysis) |

## Process
1. Run Papyr Core analysis: `node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace}` (auto-detects `wiki/` subdirectory; passing the wiki dir directly also works)
2. Read JSON outputs from `wiki/.compile/` (audit, graph, analytics, search-index, notes, overview-metadata; taxonomy-proposal if present)
3. Fix deterministic issues: broken links, one-directional backlinks, stale index entries, orphan pages
4. Surface heuristic issues: duplicate concepts, taxonomy gaps, missing cross-references, thin coverage
5. Propose taxonomy (conditional, Step 5.5) — driven by presence of `taxonomy-proposal.json` (emitted by `lib/compile.ts` when 5+ tags, 5+ content articles, and SCHEMA taxonomy not `"defined"`)
6. Rewrite `wiki/overview.md` grounded in `overview-metadata.json` — all slugs in `requiredCitations` must appear as `[[slug]]` wikilinks
7. Step 9 enforcement: audit overview citations, taxonomy-proposal presentation, overview freshness; loop back on any failure
8. Write compile report to `wiki/.compile/compile-report.md`
9. Update `wiki/log.md`

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Repaired wiki | `wiki/**/*.md` | Deterministic fixes applied in-place |
| Updated overview | `wiki/overview.md` | Current synthesis + open questions + gaps (required-citation slugs enforced by Step 9.1) |
| Compile report | `wiki/.compile/compile-report.md` | Audit results, fixes, heuristic issues |
| Graph data | `wiki/.compile/graph.json` | Nodes, edges, backlinks, statistics |
| Search index | `wiki/.compile/search-index.json` | Serialized FlexSearch index |
| Analytics | `wiki/.compile/analytics.json` | Content, graph, tag analytics |
| Notes manifest | `wiki/.compile/notes.json` | Article slugs, titles, tags, word counts |
| Overview metadata | `wiki/.compile/overview-metadata.json` | Enforcement evidence for Step 5 — top centrality, required citations, coverage stats, topic clusters |
| Taxonomy proposal | `wiki/.compile/taxonomy-proposal.json` | Enforcement trigger for Step 5.5 — deterministic tag-cooccurrence groupings. Conditional — absent when conditions not met |

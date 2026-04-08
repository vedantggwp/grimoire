# 05-serve

Expose the wiki through MCP tools, provide local serving for development, and emit optional integration guidance.

## Inputs
| File | Layer | Relevant Sections | Why |
|------|-------|-------------------|-----|
| `docs/mcp-spec.md` | L3 | All | MCP tool inventory, architecture, moat |
| `docs/integration.md` | L3 | All | CLAUDE.md snippet rules |
| `CLAUDE.md` | L0 | Core Rules | Keep serving focused on runtime and integration setup |
| `CONTEXT.md` | L1 | Stage Map, Decision Tree | Confirm this task belongs to serve |
| `wiki/` | L4 | Articles, index, overview, gaps | Primary knowledge source for MCP queries |
| `stages/04-present/output/` | L4 | Frontend bundle | Asset root for local preview serving |

## Process
1. Read the wiki structure and build whatever indexes the runtime needs for article lookup, synthesis, topic lists, gaps, and search.
2. Implement an MCP server that exposes exactly six tools: `grimoire_query`, `grimoire_list_topics`, `grimoire_get_article`, `grimoire_open_questions`, `grimoire_coverage_gaps`, and `grimoire_search`.
3. Set up a local dev server that serves the generated frontend and any compiled data needed for preview or testing.
4. Validate each MCP tool against live wiki content and ensure outputs stay aligned with the wiki, index, overview, and gap analysis.
5. Optionally generate a standalone `CLAUDE.md` snippet for the user to adopt manually; do not mutate `CLAUDE.md` automatically.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| MCP server | `stages/05-serve/output/mcp-server/` | Runnable server exposing the six Grimoire tools over stdio |
| Dev server | `stages/05-serve/output/dev-server/` | Local preview server for the generated frontend |
| Integration snippet | `stages/05-serve/output/claude-snippet.md` | Optional Markdown snippet for manual `CLAUDE.md` integration |
| Serve notes | `stages/05-serve/output/serve-report.md` | Markdown summary of tool coverage, run commands, and validation status |

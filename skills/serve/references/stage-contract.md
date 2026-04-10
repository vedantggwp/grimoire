# Serve Stage Contract

Expose the wiki through an MCP server that LLM clients can query over stdio, and optionally wire the wiki into a target project's `CLAUDE.md` so Claude Code consults it automatically.

## Inputs
| Source | Purpose |
|--------|---------|
| `SCHEMA.md` | Topic, scope, audience — read at startup for server identity |
| `wiki/**/*.md` | Articles, index, overview, gaps — primary knowledge source for MCP queries |
| `wiki/.compile/graph.json` | Graph and backlink data (produced by compile) |
| `wiki/.compile/search-index.json` | Serialized FlexSearch index (produced by compile) |
| `wiki/.compile/notes.json` | Parsed article manifest (produced by compile) |
| `wiki/.compile/analytics.json` | Tag analytics, orphan lists, centrality scores |

## Process
1. Start the bundled MCP server: `node ${CLAUDE_PLUGIN_ROOT}/dist/serve.js {workspace-path}`.
2. The server loads `wiki/.compile/*.json` once at startup (restart to pick up changes).
3. Register the six MCP tools: `grimoire_query`, `grimoire_list_topics`, `grimoire_get_article`, `grimoire_open_questions`, `grimoire_coverage_gaps`, `grimoire_search`.
4. Emit a stdio JSON-RPC stream compatible with Claude Desktop, Claude Code, and any MCP client.
5. Optionally update the target project's `CLAUDE.md` with a snippet pointing at the wiki and the MCP server (only with explicit user consent — same rule as init Q7).

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Running MCP server | stdio | JSON-RPC 2.0 over stdin/stdout |
| MCP client config snippet | (printed to chat) | JSON config for Claude Desktop / Claude Code `mcpServers` entry |
| CLAUDE.md integration | Target project's `CLAUDE.md` | Optional markdown section referencing the wiki (opt-in) |

## Audit
- [ ] All six tools respond successfully against the compiled indexes
- [ ] Server logs include the article count loaded at startup
- [ ] Staleness check warns if any `wiki/*.md` is newer than `wiki/.compile/graph.json`
- [ ] No mutation of the target project's code — only `CLAUDE.md` with explicit consent

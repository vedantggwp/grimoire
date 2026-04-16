# Launch Readiness Assessment — v0.2.2 target

> Written 2026-04-11. Consolidates findings from the pre-launch research + code audit session.
> This is a scratchpad, not a spec. It persists decisions so the executing agent doesn't re-derive them.

## Goal (2026-04-11)

> "Launch ready means the goal has been achieved: our plugin is able to deliver a world-class
> knowledge base for whatever thing the user tells it to. It should be readable by humans and
> queryable by LLMs, while saving a lot of token costs."

Claude Desktop MCP compatibility testing is **deferred to v0.3**. The MCP server itself must ship
because LLM-queryability is a launch criterion, but end-to-end Claude Desktop client verification
is not a launch blocker.

## Research findings (2026 state of the art)

Source: 5 parallel research agents run 2026-04-11.

### Plugin format — CURRENT ✓
- `.claude-plugin/plugin.json` schema is current. All required fields present.
- `SKILL.md` auto-discovery still canonical.
- Pre-built `dist/` bundles still the recommended approach.
- No launch-blocking plugin-format gaps.

### @modelcontextprotocol/sdk — CURRENT ✓ (1.29.0, published 2026-03-30)
- Version in `package.json` (`^1.29.0`) is latest stable. 2.0-alpha exists but not GA.
- stdio transport is correct for local KB servers.
- Zod is still canonical in 1.x. 2.0-alpha introduces Standard Schema (watch, don't act).
- **Launch-blocking gap: token efficiency patterns.**
  - Tool responses should stay under 25,000 tokens (Anthropic guidance for Claude Code clients).
  - `get_article` is unguarded — a long article can blow the cap.
  - No pagination on list-returning tools — deferred (scope discipline, not launch-blocking).
  - No `totalMatches`/`truncated` signaling — deferred.

### papyr-core — KEEP ✓
- v1.0.0 on npm, published 2026-01-10. 0 CVEs. Modern deps.
- Solo maintainer, low adoption, but codebase is ~123KB and trivially forkable if abandoned.
- No library has surpassed papyr-core's exact niche (markdown → graph + backlinks + search + analytics in one package).
- Safe to ship.

### KB best practices (2026) — GAPS EXIST
- **Karpathy LLM-wiki pattern dominates small/mid corpora.** `raw/` + `wiki/` + `index.md` router.
  Grimoire already matches this structure.
- **One-line routing summary per article is load-bearing.** Lets an LLM decide which files to
  pull without reading their bodies. **This is the single biggest token-efficiency lever
  available, and Grimoire does not enforce it.** — GAP
- **Section-level addressing** (article.md#section) over full-article returns. — GAP
- **Chunks 256-1024 tokens, metadata-enriched.** Grimoire's excerpts are already bounded.
- **Freshness telemetry** (lag-from-source, staleness flags) — deferred, needs time infra.
- **Per-claim confidence + provenance triples** — deferred, major architectural change.
- **Code-execution retrieval** (agent-writes-queries over KB) — deferred, architectural.

### Runtime code audit — verified issues

Cross-checked the Explore agent's claims against actual code. Downgraded over-reports.

**CONFIRMED REAL BUGS:**
1. `lib/serve.ts:81-83` — hard `throw` on search-index error sentinel. Server crashes instead of
   degrading to substring search. **HIGH.**
2. `lib/serve.ts:56-62` — `parseSchemamd` regex is naive. Multi-line scope format
   (`scope:\n  in: "..."\n  out: "..."`) and single-line SCHEMA template (`scope: [...]`) are
   inconsistent; parser handles neither cleanly. Current behavior: falls back to "Unknown"
   silently. **MEDIUM.**
3. `lib/present/data.ts:58-73` — `parseSchema` has the same weakness as `parseSchemamd`. Duplicate
   logic. **MEDIUM.**
4. `lib/compile.ts:173-182` — `notes.json` manifest does not include frontmatter fields
   (`summary`, `confidence`, `sources`). Downstream consumers (present, serve) have to fish them
   out of graph.json metadata, which may or may not be populated by papyr-core. **HIGH.**
5. `skills/init/assets/templates/article-template.md` — no `summary` field in frontmatter. **GAP.**
6. `skills/init/assets/templates/schema-template.md:10-14` — `scope` is a flat string, but
   parsers expect nested `scope.in` / `scope.out`. Inconsistency. **MEDIUM.**
7. Regression tests for 3 dry-run bugs (quiz bullet extraction, support-page filter, stop-word
   query fallback) — explicitly committed follow-up, not yet written. **DEBT.**

**DOWNGRADED / REJECTED FINDINGS:**
- Path traversal in `readArticle` — agent was wrong, the regex blocks `..` correctly.
- "Stale compile artifacts" — handled by SKILL.md workflow check, not a code bug.
- "Scout 0-results" — workflow issue, fix in SKILL.md guidance, not code.
- "Ingest assumes wiki/index.md exists" — actual ingest SKILL.md handles both cases fine.

## Launch-blocking decisions (v0.2.2 scope)

### MUST ship

1. **Add `summary` field end-to-end.** Schema template, article template, ingest instructions,
   compile manifest emission, serve surfacing, present rendering. This is the Karpathy
   routing-summary win.
2. **New MCP tool: `grimoire_get_section`.** Takes `slug` + `heading` (or `heading_index`),
   returns just that section. Uses `notes.json.headings` for dispatch.
3. **Token guard on `grimoire_get_article`.** If the article exceeds a configurable threshold
   (default ~20k chars ≈ 5k tokens, well under the 25k-token MCP cap), return a summary envelope:
   `summary` + `headings` + hint to use `get_section`. Full content still available via a
   `mode: "full"` param when the agent explicitly wants it.
4. **Compile emits frontmatter fields into `notes.json`.** `summary`, `confidence`, `sources`,
   plus preserve existing fields. Downstream consumers read from the manifest, not from
   `graph.json.metadata`. Cleaner contract.
5. **Fix serve search-index graceful degradation.** When compile's search-index export failed,
   serve should log a warning and fall back to substring search over `notes.json`, not crash.
6. **Fix `parseSchemamd` + `parseSchema` + schema template** so they're mutually consistent.
   One canonical format (nested `scope.in` / `scope.out`) writted by init, parsed correctly by
   both serve and present.
7. **Regression tests** for the 3 dry-run bugs.
8. **End-to-end real-project test** on a non-trivial topic. Topic: "Model Context Protocol for
   AI engineers" (narrow, dogfoody, high-signal). Must produce an actual, inspectable knowledge
   base artifact. Judge against world-class criteria. Fix anything that surfaces.
9. **Docs hygiene.** Roadmap update (stale checkboxes), changelog entry, MANIFEST.md update.

### DEFERRED (post-launch)

- Cursor pagination on list-returning tools (scope discipline; `get_section` + token guard
  already close the biggest leak).
- Per-claim confidence + provenance triples (architectural).
- Freshness/staleness telemetry (needs time infra).
- Code-execution retrieval pattern (architectural).
- CLI wrapper (`grimoire init` standalone binary).
- Comparison tables + learning paths study modes.
- Claude Desktop MCP end-to-end compatibility testing (explicitly deferred to v0.3).
- Launch announcement publication (draft in v0.2.2, published at the maintainer's discretion).

## Execution order

1. Regression tests (Task #3) — close committed debt
2. Frontmatter extension pass (Tasks #4, #7 partial) — summary field + compile.ts manifest
   emission + schema parser consolidation. Done as ONE cohesive change because they all
   touch the same data path.
3. MCP upgrades (Tasks #5, #6) — `get_section` + `get_article` token guard.
4. Runtime fragility fixes (Task #7 remainder) — serve search-index fallback.
5. Build + test pass (`npm run build && npm test`) — ensure nothing broke.
6. End-to-end real-project test (Task #8) — produce the KB, judge it, fix gaps.
7. Docs + MANIFEST (Task #9).
8. Final commit + report.

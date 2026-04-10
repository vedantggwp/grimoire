---
name: compile
description: >-
  Use this skill when the user wants to build cross-references, backlinks, update
  the overview, run gap analysis, or says "grimoire compile", "build links",
  "update overview", or "/grimoire:compile". Uses Papyr Core for graph analysis
  and cross-reference auditing.
version: 0.1.0
---

# compile

Audit the wiki graph, repair deterministic issues, surface gaps, and build
serialized indexes for downstream skills (present, serve).

## Prerequisites

- A grimoire workspace must exist — check for `SCHEMA.md` in the workspace root.
  If missing, tell the user to run `/grimoire:init` first.
- The `wiki/` directory must contain at least one article (not counting index.md,
  overview.md, or log.md). If empty, tell the user to run `/grimoire:ingest` first.

## Step 1 — Locate the Grimoire

Find the grimoire workspace:

1. Look for `SCHEMA.md` in the current directory first
2. If not found, ask the user: "Where is your grimoire? (path to the directory containing SCHEMA.md)"
3. Confirm the `wiki/` directory exists and contains markdown files
4. Read `SCHEMA.md` to understand the topic, scope, and taxonomy

## Step 2 — Run the Compile Script

Execute the Papyr Core analysis script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace}/wiki
```

This produces JSON artifacts in `{workspace}/wiki/.compile/`:

| File | Contents |
|------|----------|
| `audit.json` | Link validation, orphan analysis, centrality, components, hubs, authorities |
| `graph.json` | Full graph structure (nodes, edges, backlinks, orphans, statistics) |
| `search-index.json` | Serialized FlexSearch index (used by serve and present) |
| `analytics.json` | Content analytics (word distribution, reading time, tag analysis, graph metrics) |
| `notes.json` | Lightweight manifest (slug, title, tags, word count, headings, links) |

If the script fails, show the error to the user and stop. Do not proceed with partial data.

## Step 3 — Read and Interpret Audit Results

Read `{workspace}/wiki/.compile/audit.json` and `{workspace}/wiki/.compile/analytics.json`.

Classify every finding into one of two categories:

### Deterministic issues (auto-fixable)

These have one correct resolution. Fix them without asking:

1. **Broken internal links** — `orphanedLinks` in audit.json maps source → broken targets.
   For each broken link:
   - Check if the target is a close match to an existing slug (typo, case mismatch, old slug).
     Use `notes.json` to get the list of valid slugs.
   - If an unambiguous match exists, fix the wikilink in the source article.
   - If no match exists, remove the broken link and note it in the report.

2. **One-directional backlinks** — Read `graph.json` backlinks. For each edge A→B,
   check if B→A also exists. If not, add `[[A-slug]]` to B's See Also section with
   a brief relationship note.

3. **Stale index entries** — Compare `notes.json` slugs against `wiki/index.md`:
   - Articles in index.md that don't exist as files → remove from index
   - Articles that exist as files but aren't in index.md → add to index with their
     tags and confidence from frontmatter

4. **Orphan content articles** — Check `orphanedNotes` in audit.json. Ignore support
   pages (index, overview, log). For actual content articles with zero incoming links:
   - Find the most topically related article using `centrality` scores and shared tags
   - Add a cross-reference from that article's See Also section

### Heuristic issues (surface for human judgment)

These require domain knowledge. Report them but do not auto-fix:

1. **Potential duplicate concepts** — articles with overlapping tags AND overlapping
   headings (compare `notes.json` headings and tags across articles)

2. **Taxonomy gaps** — from `analytics.json` tag analysis:
   - Tags used by only 1 article (may indicate an under-explored area)
   - Large clusters in `components` that could be split into taxonomy categories

3. **Missing cross-references** — articles in the same connected component that
   share tags but have no direct link between them

4. **Coverage distribution** — from `analytics.json` content stats:
   - Articles with word count significantly below the median (thin coverage)
   - Articles with word count significantly above the median (may need splitting)

## Step 4 — Apply Deterministic Fixes

For each fix identified in Step 3, apply it to the wiki files:

- Edit articles to fix broken links, add backlinks, remove stale references
- Edit `wiki/index.md` to add missing entries or remove stale ones
- Count every fix applied

**Do not modify raw files.** Raw sources are immutable.
**Do not modify frontmatter** unless a field is clearly wrong (e.g., broken slug in sources).

## Step 5 — Update wiki/overview.md

Before writing the overview, read the full content of the top 5 articles by centrality
(from `audit.json` centrality scores). The analytics JSON has statistics but not prose —
the overview narrative must be grounded in actual article content, not just numbers.

Rewrite `wiki/overview.md` using the compile analysis. Structure:

```markdown
# {Topic} — Overview

{2-3 paragraph synthesis of what the wiki covers, informed by the articles and their
connections. Not a list of articles — a narrative about the state of knowledge.}

## Coverage

{Summary statistics: N articles, N sources, N cross-references, N words total.
Note the strongest clusters and most-connected articles.}

## Topic Clusters

{List the connected components or tag-based clusters. For each, name the key
articles and their relationships.}

## Open Questions

{Questions that the current articles raise but don't answer. Derived from:
- Gap analysis (thin areas, missing cross-references)
- Contradictions between articles
- Topics referenced but not covered}

## Coverage Gaps

{Taxonomy areas with few or no articles. Areas mentioned in articles but not
covered by their own article.}
```

Read the existing overview.md first. Preserve any human-written open questions
that are still relevant. Add new ones from the analysis.

## Step 5.5 — Propose Taxonomy (conditional, may be skipped)

> This step is conditional and inserted between Step 5 and Step 6. It does not
> renumber subsequent steps to avoid disrupting existing references.

**Run this step ONLY when ALL three conditions are true:**

1. `analytics.json` tag analytics show 5+ unique tags
2. There are 5+ content articles in the wiki (excluding index.md, overview.md, log.md)
3. `SCHEMA.md` has `taxonomy: "emergent"` (not already defined with categories)

If any condition is false, skip silently and proceed to Step 6.

### Logic

1. Read `{workspace}/wiki/.compile/analytics.json` — extract `tags.topTags`,
   `tags.relatedTags` (co-occurrence pairs), and `graph.clusters`.

2. Group tags by co-occurrence into candidate categories. Tags that frequently
   appear together on the same articles form a category. Use `relatedTags`
   co-occurrence counts as the primary signal and `graph.clusters` as a
   secondary grouping signal.

3. For each candidate category: propose a name, list the tags it contains,
   and list which articles would belong.

4. Present the proposal to the user. Format:

```
Taxonomy Proposal:

  Category: {name}
    Tags: {tag1, tag2, tag3}
    Articles: [[slug1]], [[slug2]]

  Category: {name}
    Tags: {tag1, tag2}
    Articles: [[slug3]]

  Uncategorized:
    Articles: [[slug4]]  (doesn't fit any cluster)
```

5. Ask: "Approve this taxonomy? (approve / edit / reject)"

6. If **approved**:
   - Update `SCHEMA.md`: change `taxonomy: "emergent"` to `taxonomy: "defined"`
     and add the categories list with their constituent tags.
   - Ask the user: "Would you like articles reorganized into subdirectories
     (`wiki/{category}/{slug}.md`)? **Important: make sure your workspace is
     committed to git first** — this restructures files and rewrites links."
   - If yes:
     1. Move all article files into category subdirectories first. Report the
        count: "Moved N files into M categories."
     2. Only after all moves succeed, update wikilinks across all articles to
        use the new `[[category/slug]]` paths.
     3. Update `wiki/index.md` to reflect the new structure.
     4. If any move or link update fails, stop and report which files still
        need manual attention.

7. If **rejected**, skip and continue to Step 6.

8. If **edited**, apply the user's changes to the proposal, re-present, and
   ask again (approve / edit / reject) until the user approves or rejects.

## Step 6 — Write Compile Report

Save the report to `{workspace}/wiki/.compile/compile-report.md`:

```markdown
# Compile Report — {date}

## Fixes Applied

{For each fix: what was wrong, what was changed, which file was edited}

## Heuristic Issues

{For each issue: description, affected articles, suggested action}

## Graph Summary

- Notes: {N}
- Cross-references: {N} total, {N} valid, {N} orphaned
- Orphan notes: {list or "none"}
- Connected components: {N}
- Most connected: {top 3 by centrality}
- Graph density: {N}

## Coverage Analysis

- Total words: {N}
- Average words per article: {N}
- Thinnest articles: {list with word counts}
- Tag distribution: {top tags with counts}

## Recommendations

{2-3 actionable next steps based on the analysis. Examples:
- "Consider writing an article on X — it's referenced by 3 articles but doesn't exist"
- "Articles A and B overlap significantly — consider merging"
- "The Y cluster has only 1 article — scout for more sources on this topic"}
```

## Step 7 — Update wiki/log.md

Append a compile entry:

```markdown
## {YYYY-MM-DD} — Compiled

- Fixes applied: {N} (backlinks: {N}, broken links: {N}, index entries: {N})
- Heuristic issues: {N} surfaced
- Graph: {N} notes, {N} links, {N} components
- Coverage gaps: {N} identified
```

## Step 8 — Report to User

Print a summary:

```
Compile complete.

  Fixes applied:     {N}
    Backlinks added: {N}
    Broken links:    {N} fixed, {N} removed
    Index updated:   {N} entries added, {N} removed

  Heuristic issues:  {N} (see compile report)
  Graph density:     {N}
  Coverage gaps:     {N}

  Outputs:
    wiki/.compile/compile-report.md  — full audit report
    wiki/.compile/graph.json         — graph for present
    wiki/.compile/search-index.json  — index for serve
    wiki/.compile/analytics.json     — stats for present

Next steps:
  - Review heuristic issues in the compile report
  - Run /grimoire:scout to fill coverage gaps
  - Run /grimoire:present to generate the frontend
  - Run /grimoire:serve to start the MCP server
```

## Validation Rules

- Never modify files in `raw/` — raw sources are immutable
- Never skip the compile script — always run Step 2 before making changes
- All dates use ISO 8601 (YYYY-MM-DD)
- Support pages (index.md, overview.md, log.md) are expected orphans — do not
  "fix" them by adding unnecessary cross-references
- The `.compile/` directory is a build artifact. It can be deleted and regenerated.
  Add `wiki/.compile/` to `.gitignore` if not already present.
- Use `${CLAUDE_PLUGIN_ROOT}` for all internal paths to the compile script
- Output files go in the grimoire workspace, not inside the plugin directory
- If the wiki has fewer than 2 content articles, skip graph analysis and just
  update the index and overview. Report: "Not enough articles for meaningful graph analysis."

## Re-running Compile

Compile is idempotent. Running it again should:
- Find fewer deterministic issues (previous fixes persist)
- Update analytics with current state
- Refresh the search index
- Overwrite the compile report with current findings

The second run validates the first run's fixes.

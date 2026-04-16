---
name: ingest
description: >-
  Use this skill when the user wants to fetch and process approved sources, create
  raw archives, compile wiki articles, or says "grimoire ingest", "process sources",
  "fetch and compile", or "/grimoire:ingest". Fetches approved URLs, preserves raw
  text, and compiles structured wiki articles with frontmatter.
version: 0.2.0
---

# ingest

Fetch approved sources, preserve raw text, and compile structured wiki articles
with frontmatter and cross-references.

## Prerequisites

- A grimoire workspace must exist — check for `SCHEMA.md` in the workspace root.
  If it is missing, tell the user to run `/grimoire:init` first.
- Either `approved-sources.md` exists in the workspace (produced by scout),
  OR the user provides a direct source (URL, local file path, or pasted text).
- Read `SCHEMA.md` before doing anything else — it defines the taxonomy, naming
  conventions, and confidence tiers that govern every output.

## Step 1 — Identify the Source

Check for `approved-sources.md` in the workspace root.

- If it exists, find the next source with `status: pending`. Pick the highest
  priority first (P0 before P1 before P2). Announce which source you are about
  to process and its tier.
- If no `approved-sources.md` exists, accept a direct source from the user:
  a URL, a local file path, or pasted text. Ask if none has been provided.
- If the user says "ingest all" or similar, do not batch silently. Process one
  source at a time in priority order. After completing Step 7 for each source,
  print the summary and ask: "Process the next source? ({N} remaining, next: {title})"
  before continuing.
- **Batch mode (orchestrated flow):** When invoked as part of `/grimoire:run` or
  when the user explicitly requests batch processing ("ingest all sources without
  asking", "batch ingest", "process everything"), process all pending sources in
  priority order without per-source confirmation. For each source: fetch raw
  (Step 2), extract takeaways (Step 3), write articles using best judgment
  (Step 5), and update source status (Step 7) — skipping Step 4's human
  checkpoint. After ALL sources are processed, print a single summary:
  ```
  Batch ingest complete: {N} sources processed.
    Created: {slugs}
    Updated: {slugs}
    Failed:  {slugs with reasons}
    Backlinks added: {N}
  ```
  Then run Step 6 (update navigators) once for the full batch. If any source
  fails to fetch, mark it as `failed` and continue with remaining sources.

Normalize whatever you have to four fields before continuing:

| Field | Description |
|-------|-------------|
| `url` | Source URL or file path (or `pasted` for pasted text) |
| `title` | Human-readable title of the source |
| `type` | article, documentation, tutorial, video-transcript, thread, repository, paper |
| `tier` | P0, P1, P2, or `direct` if user-supplied without a tier |

## Step 2 — Fetch and Preserve Raw

Retrieve the full source content.

- **URL**: Use WebFetch to retrieve the page. Extract clean markdown text — remove
  navigation chrome, ads, and repeated boilerplate. Preserve the substantive prose
  and code blocks verbatim. If WebFetch returns an error, a 404, or empty content,
  mark the source as `failed` in `approved-sources.md`, explain the failure to the
  user, and move on to the next pending source.
- **Local file**: Read the file directly using the Read tool. If the path does not
  exist, ask the user to confirm the correct path before continuing.
- **Pasted text**: Use as-is.

Save the raw file using the template at:
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/raw-template.md`

File location in the workspace:

```
raw/{topic-slug}/{YYYY-MM-DD}-{source-slug}.md
```

- `topic-slug` — best-fit taxonomy category slug from SCHEMA.md, or `uncategorized`
  if no taxonomy has been defined yet.
- `source-slug` — slugified source title (lowercase, hyphens, no spaces).

Populate all frontmatter fields:

- `source_url` — original URL or file path
- `collected` — today's date (ISO 8601)
- `published` — extract from source metadata if detectable; otherwise omit the field
- `type` — normalized type from Step 1
- `author` — extract from source if present; otherwise omit
- `title` — full original title

**Raw files are immutable once written.** Never edit a raw file after this step.
All interpretation happens in the wiki articles that reference it.

## Step 3 — Extract Takeaways

Read the full raw file you just saved. Do not summarize from memory — read the file.

Surface 3-5 concrete takeaways. For each one identify:

- The key concept, capability, technique, pattern, limitation, or trade-off
- Which existing wiki article it should update (if any) — scan `wiki/index.md`
  and the relevant articles before deciding
- Whether it warrants a new standalone article
- Where in the taxonomy it would live (category from SCHEMA.md)

Relationships matter. If a takeaway overlaps with a topic already in the wiki,
note the overlap explicitly — that is context for the merge decision in Step 4.

## Step 4 — Present Takeaways (CHECKPOINT)

Display the proposed actions in this format:

```
Source: {source-title}
Tier:   {P0|P1|P2|direct}

Proposed actions:
  NEW:    {article-title} — {reason this warrants its own article}
  UPDATE: [[{existing-article-slug}]] — {what new information to add}
  SKIP:   {takeaway} — {reason, e.g. already covered in [[slug]]}
```

Then ask: "Do these takeaways look right? Approve, edit, or reject before I write anything."

**Hard checkpoint: do not write or update any wiki article without explicit user confirmation.**
If the user edits the proposed actions, apply their changes exactly before proceeding.

## Step 5 — Write or Update Wiki Articles

Execute only the confirmed actions from Step 4.

### New articles

Use the article template at:
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/article-template.md`

Populate frontmatter:

- `title` — clear, specific article title
- `summary` — **required.** One sentence under 180 characters describing what the
  article covers. This is load-bearing: LLMs querying the wiki use it to decide
  which articles to fetch in full, so token-efficient retrieval depends on every
  article having a crisp, specific summary. Write it like the first line of a
  dictionary entry, not like marketing copy. No article ships without one.
- `tags` — relevant taxonomy tags from SCHEMA.md
- `sources` — list with `url`, `title`, and `accessed` (today's date)
- `updated` — today's date
- `confidence` — use the tier value directly: P0, P1, or P2 (matches the article template exactly; `direct` sources default to P1)

Write the full body: Overview, Key Capabilities, How It Works, Usage Examples,
Limitations, See Also. Each section must have real content — no placeholder text.

### Writing the summary field

Good summary: `"How Svelte's compile-time transformation eliminates the virtual DOM and ships minimal runtime code."`

Bad summary (vague): `"An article about Svelte."`
Bad summary (marketing): `"The revolutionary new framework changing how we build apps."`
Bad summary (too long): anything over 180 characters.

Derive the summary after you have written the article body, not before — the
summary should accurately reflect what ended up in the article.

File location:

```
wiki/{taxonomy-dir}/{slug}.md
```

If no taxonomy has been defined yet, use `wiki/{slug}.md` and note the category
as a candidate for the next SCHEMA.md update.

### Updated articles

Read the existing article first. Merge new information into the appropriate
sections — do not overwrite, extend. Add the new source to the frontmatter
`sources` list. Set `updated` to today's date. If the article's scope has
meaningfully shifted, rewrite the `summary` field to reflect the new coverage.

### Cross-references and backlinks

- Add wikilinks in the See Also section of every article you touch (new or updated).
  Format depends on whether taxonomy exists:
  - With taxonomy subdirectories: `[[category/slug]]`
  - Flat wiki (no taxonomy yet): `[[slug]]`
- After writing, check both directions: if article A links to B, verify that B's
  See Also links back to A. Fix any one-directional links created by this ingest.
  Count and report how many backlinks you fixed.
- Every new article must have at least one cross-reference. No orphan pages.

## Step 6 — Update Wiki Navigators

Update three files in the workspace. Do not skip any of them.

**wiki/index.md** — If the file is missing (user deleted it, or this workspace
was not scaffolded by init), create it first using the index template at
`${CLAUDE_PLUGIN_ROOT}/skills/init/assets/templates/index-template.md`, then
populate. Otherwise, add new articles to the correct category table, update
the summary line and date for any modified articles, and increment the total
article count if you created new articles.

**wiki/overview.md** — If this is the first ingest run (overview.md is still a
stub), write an initial 2-4 paragraph synthesis of what the wiki now covers.
If articles already exist, update the overview to incorporate the new knowledge —
revise the relevant paragraph rather than appending a new one.

**wiki/log.md** — Append an entry in this format:

```markdown
## {YYYY-MM-DD} — Ingested: {source-title}

- Source: {url or file path}
- Tier: {P0|P1|P2|direct}
- Actions: Created {slug}, Updated {slug}
- Raw: raw/{topic-slug}/{date}-{source-slug}.md
```

## Step 7 — Update Source Status and Report

If working from `approved-sources.md`, mark the source's `status` from `pending`
to `ingested`. Do not touch the status of any other source.

Print a summary:

```
Ingested: {source-title}
Raw saved: raw/{topic-slug}/{date}-{source-slug}.md

Articles created: {comma-separated slugs, or "none"}
Articles updated: {comma-separated slugs, or "none"}
Backlinks fixed:  {N}

Next steps:
  - Run /grimoire:ingest to process the next source ({N} remaining)
  - Run /grimoire:compile to rebuild cross-references and gap analysis
```

If the approved-sources list is exhausted, say so clearly and recommend
`/grimoire:compile` as the next step.

## Validation Rules

- Never modify a file in `raw/` after initial creation — raw sources are immutable
- All wiki articles must have complete frontmatter: title, **summary**, tags, sources, updated, confidence
- The `summary` field is required, one sentence, under 180 characters — this is a hard rule, not a nice-to-have
- All dates use ISO 8601 (YYYY-MM-DD)
- All filenames are slugified: lowercase, hyphens, no spaces
- One article per concept — do not create mega-articles covering multiple distinct topics
- Every new article must have at least one cross-reference in See Also (no orphan pages)
- Always read existing wiki content before writing — duplication is a bug
- Human checkpoint before writing articles is mandatory — never skip Step 4
- Use `${CLAUDE_PLUGIN_ROOT}` for all internal template and reference paths
- Output files go in the grimoire workspace (`wiki/`, `raw/`), not inside the plugin directory
- Do not create `stages/` paths or `ingest-report.md` — the log lives in `wiki/log.md`

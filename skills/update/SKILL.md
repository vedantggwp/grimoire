---
name: update
description: >-
  Use this skill when the user wants to refresh an existing grimoire with what's
  new, run a scheduled/automated update, check for stale articles, or says
  "update my grimoire", "what's new", "refresh the wiki", "run the update",
  or "/grimoire:update". Headless-capable: runs without human checkpoints,
  governed by the _config/update.md policy file, and ships changes as a
  PR-gated branch by default.
version: 0.1.0
---

# update

The scheduled editorial pass. Find what's new since the last run, ingest the
best of it under policy, mine new connections between existing articles,
detect staleness, and ship everything as a reviewable digest + pull request.

This is the "maintained" half of the LLM-maintained wiki: `run` builds a
grimoire, `update` keeps it alive.

## Headless contract (read first)

**NEVER use AskUserQuestion in this skill. Never pause for approval.**

This skill is invoked by schedulers (GitHub Actions cron, local cron) where no
human can answer. The policy file `_config/update.md` is the substitute for
human judgment; PR review is the substitute for taste checkpoints. On any
ambiguity, choose the conservative option and record the decision in the
digest's "Attention Needed" section. All progress is communicated through
printed status lines and the digest — never through questions.

The two principles that survive automation:

1. **The human stays in control** — control relocates from blocking
   checkpoints to (a) the authored policy and (b) async PR review. The engine
   never commits to the default branch.
2. **Plain text is the interface** — every decision this skill makes is
   visible in the digest, the PR diff, and the policy file.

## Prerequisites

- An existing grimoire workspace (`SCHEMA.md` present). If missing, print an
  error directing the user to `/grimoire:new` — **never scaffold from here**.
- The plugin's compiled runtime: `${CLAUDE_PLUGIN_ROOT}/dist/compile.js` (and
  `dist/present.js` when a site exists).

## Flags

Parsed from natural language, like `run`:

| Flag | Behavior |
|------|----------|
| `--dry-run` | Full analysis, zero writes: no raw/ files, no wiki edits, no source-file changes, no git operations. Derived `.compile/` artifacts may regenerate (they're gitignored). Digest printed to stdout with a `DRY RUN` banner instead of written to `_updates/`. |
| `--workspace <path>` | Workspace root when not the current directory. |
| `--setup` | Install the scheduling adapter instead of running an update — see Step 12. |

"preview the update" → `--dry-run` · "set up scheduled updates" → `--setup`.

## Step 1 — Locate and load

1. Find `SCHEMA.md`: the `--workspace` path if given, else the current
   directory, else immediate child directories. Not found → print
   `No grimoire workspace found. Run /grimoire:new first.` and stop.
2. Run compile pass 1 to refresh context artifacts:
   `node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace}`
3. Read:
   - `wiki/.compile/update-context.json` — resolved policy, `lastUpdate`,
     `knownUrls` (the cross-run dedup ledger)
   - `wiki/.compile/freshness.json` — staleness tiers
   - `wiki/overview.md` — Open Questions and Coverage Gaps sections
   - `SCHEMA.md` — topic and scope (scope.out still excludes results)
4. Print the run header:

```
Grimoire update — {short topic}
Since: {lastUpdate or "never"} | Policy: {autonomy}, min score {minScore}, max {maxSourcesPerRun} sources{ | DRY RUN}
```

## Step 2 — Delta scout

Invoke the scout skill's **Delta Mode** (see `skills/scout/SKILL.md`,
"Delta Mode" section) with the loaded context. In short:

- Angles come from: "what's new since {lastUpdate}", the top Open Questions,
  the coverage gaps, and every policy Watchlist entry (URLs in the watchlist
  are fetched directly — this is also the fallback when WebSearch is
  unavailable in the execution environment).
- Every candidate whose normalized URL appears in `knownUrls` is dropped
  before scoring.
- Score survivors with the standard 6-signal rubric.

Print: `Delta scout: {N} candidates, {M} after cross-run dedup`.

## Step 3 — Auto-curate by policy

No human checkpoint — the policy decides:

1. Keep candidates with composite score ≥ `minScore`.
2. Sort by score descending; truncate to `maxSourcesPerRun`.
3. Record EVERY decision for the digest: kept (with score), below threshold
   (with score — the reviewer can promote it), over cap.

Zero qualifying sources → print `No new sources met policy this run.` and
continue to Step 5 (connections and freshness still run; an update with no
new sources can still improve the wiki).

## Step 4 — Record and ingest

1. Append kept sources to `approved-sources.md` with status `pending`,
   matching the file's existing column format (do not normalize other rows).
2. Note in `scout-notes.md`: `Added by update run {YYYY-MM-DD}: {urls}`.
3. Run the ingest skill in **batch mode** exactly as specified in
   `skills/ingest/SKILL.md` (orchestrated flow — no per-source takeaway
   checkpoints). Raw preservation rules apply unchanged: every fetched source
   is archived immutably under `raw/` before any wiki write.
4. Fetch failures: mark the source `failed` in `approved-sources.md`, list it
   in the digest, continue with the rest.

## Step 5 — Compile pass 2 + deterministic fixes

1. Re-run compile: `node ${CLAUDE_PLUGIN_ROOT}/dist/compile.js {workspace}`.
2. Apply the compile skill's deterministic fixes (broken links, missing
   backlinks, orphan connections — `skills/compile/SKILL.md` Steps 3–4).
3. Rewrite `wiki/overview.md` per compile SKILL Step 5, including the
   required-citations audit (Step 9.1) and freshness audit (Step 9.3).
4. **Skip the taxonomy proposal** (Step 5.5/9.2) — reorganizing the wiki's
   category structure needs a human. If `taxonomy-proposal.json` exists, add
   to the digest's Attention Needed: `Taxonomy proposal pending — run
   /grimoire:compile interactively to review it.`

## Step 6 — Connection pass

If `wiki/.compile/connection-candidates.json` exists (already
exclusion-filtered, scored, capped by the policy's engine):

1. For each candidate pair, read both articles' summaries (sections via the
   manifest if needed) and judge: would a cross-reference genuinely help a
   reader, or is the overlap incidental?
2. **Accept** at most `maxConnectionsPerRun`: add a `[[wikilink]]` entry to
   BOTH articles' "See Also" sections with a one-line relationship note
   (e.g. `[[mcp-transports]] — the transport layer these patterns assume`).
3. **Reject**: append to `_config/update.md` under `## Connection exclusions`
   as `- {a} <-> {b} — {reason}` so the pair is never proposed again. This is
   the ONLY edit this skill may make to the policy file.
4. Print: `Connections: {accepted} added, {rejected} excluded`.

## Step 7 — Freshness pass

1. Re-read `wiki/.compile/freshness.json` (compile pass 2 refreshed it).
2. Stale and aging articles go in the digest with ages and a one-line note on
   why each matters (what is likely to have changed in the field).
3. If the policy sets `verify_stale: true`: for the `maxStaleChecks` stalest
   articles, re-fetch each article's top source:
   - Content unchanged in substance → set `checked: {today}` in the article's
     frontmatter. **Never bump `checked:` without an actual verification.**
   - Materially changed → treat the source as a new candidate within this
     run's remaining caps (back through Steps 3–5 for it).

## Step 8 — Present

If `site/` exists in the workspace (the user uses the frontend), regenerate:
`node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace}`. If it does not
exist, skip — don't introduce a site the user never asked for.

## Step 9 — Digest

1. Compose the digest from `references/digest-template.md`. Substance counts:
   sources ingested, articles created/changed, connections added, `checked:`
   bumps, exclusions appended.
2. **No substantive changes at all** → this is a **no-op run**: print
   `No-op update: nothing new since {lastUpdate}. Checked {N} candidates, {M} known.`
   Write nothing, create no branch, open no PR (a weekly empty PR is noise —
   the printed digest and the scheduler's log are the record). Stop here.
3. Otherwise (not dry-run):
   - Write `_updates/{YYYY-MM-DD}-update.md` (create `_updates/` if needed).
   - Append to `wiki/log.md` in EXACTLY this shape (the feed mode renders
     these entries as update digests):

```markdown
## {YYYY-MM-DD} — Update run (automated)
- sources-added: {N}
- articles-changed: {N}
- connections-made: {N}
- {one free-form line per notable action}
```

4. Print the digest to stdout (CI job summaries capture it).
5. `--dry-run` → print the digest with the `DRY RUN` banner and stop here.

## Step 10 — Ship per autonomy

Work down the **degradation ladder**, naming every downgrade explicitly in
the final summary — never degrade silently:

| Situation | Effective mode |
|-----------|---------------|
| `autonomy: digest-only` | Stop after Step 9. |
| Not a git repository | digest-only (print: `Not a git repo — digest written, nothing committed.`) |
| Git repo, but no remote or `gh` unauthenticated | branch (print: `No usable remote/gh — branch committed locally, open the PR manually.`) |
| Everything available, `autonomy: pr` | branch + PR |

For `branch` and `pr`:

1. Never operate on the default branch. Branch name: `grimoire/update-{YYYY-MM-DD}`.
   - Branch already exists with an open PR (same-day re-run): check it out and
     push a follow-up commit — cross-run dedup makes the rerun near-empty, so
     this is naturally idempotent.
2. Stage **only workspace paths** (`git add {workspace files changed}`) —
   never `git add -A`; local runs may have unrelated dirt elsewhere.
3. Commit: `chore(grimoire): scheduled update {YYYY-MM-DD}`.
4. For `pr`: push the branch and create the PR with
   `gh pr create --title "Grimoire update — {short topic} — {YYYY-MM-DD}" --body-file {digest}`,
   where the body is the digest plus the reviewer checklist from
   `references/pr-template.md`.
5. Print the PR URL (or branch name) as the final line.

## Step 11 — Final summary

Always end with a compact, factual block:

```
Update complete — {short topic}
  Sources:     {found} found · {deduped} known · {ingested} ingested · {failed} failed
  Articles:    {created} created · {updated} updated
  Connections: {added} added · {excluded} excluded
  Freshness:   {fresh}/{aging}/{stale}/{evergreen}/{unknown}
  Shipped:     {PR url | branch name | digest-only | no-op}
```

## Step 12 — `--setup` (install the scheduler)

When invoked with `--setup`, do not run an update. Instead:

1. Confirm the workspace is inside a git repo with a GitHub remote (the
   flagship adapter targets GitHub Actions). If not, point the user at
   `docs/self-updating.md` for the local cron/launchd alternative and stop.
2. Copy `${CLAUDE_PLUGIN_ROOT}/skills/update/assets/github-workflow.yml` to
   `.github/workflows/grimoire-update.yml` in the repo root, replacing
   `{{WORKSPACE_PATH}}` with the workspace path relative to the repo root
   (`.` when they're the same).
3. Ensure `_config/update.md` exists — scaffold it from
   `${CLAUDE_PLUGIN_ROOT}/skills/new/assets/templates/update-config.md` if
   missing.
4. Ensure `.claude/settings.json` in the repo declares the Athanor
   marketplace and enables the grimoire plugin, so the headless CI run
   auto-loads it (merge keys into an existing file, never clobber):

```json
{
  "extraKnownMarketplaces": {
    "athanor": { "source": { "source": "github", "repo": "vedantggwp/athanor" } }
  },
  "enabledPlugins": { "grimoire@athanor": true }
}
```

5. Print the remaining manual steps verbatim:

```
Scheduled updates installed. Three things GitHub needs from you:
  1. Run `claude setup-token` here, then add the result as the
     CLAUDE_CODE_OAUTH_TOKEN Actions secret — this runs the scheduled
     updates on your Claude subscription, no API key needed.
     (API billing instead? Add ANTHROPIC_API_KEY and swap the input
     in the workflow file.)
  2. Settings → Actions → General → enable "Allow GitHub Actions to create and approve pull requests".
  3. Commit .github/workflows/grimoire-update.yml, _config/update.md, and .claude/settings.json.
The schedule is weekly (Mon 06:00 UTC) — edit the cron line to taste.
Test it: Actions tab → Grimoire Update → Run workflow.
Prefer zero cloud credentials? Skip all of this and use the local cron
adapter in docs/self-updating.md — it runs on your existing Claude login.
```

## Validation Rules

- NEVER use AskUserQuestion or otherwise block on human input.
- NEVER modify files under `raw/` (immutable archive; ingest appends only).
- NEVER edit `_config/update.md` except appending to `## Connection exclusions`.
- NEVER commit to the default branch; never `git add -A`.
- NEVER bump an article's `checked:` date without re-fetching and verifying
  its source in the same run.
- Respect `scope.out` from SCHEMA.md in every search angle.
- All standard skill rules apply (ISO 8601 dates, slugified filenames,
  mandatory summary frontmatter, `${CLAUDE_PLUGIN_ROOT}` for plugin paths,
  outputs into the workspace).
- If any step fails, say which step, what was already written, and what a
  human should look at — then still produce the digest with what happened.

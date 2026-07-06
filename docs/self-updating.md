# Self-Updating Grimoires

A grimoire built once decays: sources go stale, the field moves, new
connections go unmade. `/grimoire:update` is the scheduled editorial pass
that keeps a wiki alive — delta scout for what's new, policy-gated ingest,
connection mining, staleness detection — shipped as a reviewable PR.

## How control works without checkpoints

The interactive pipeline pauses twice for taste (source curation, final
review). A scheduled run can't pause, so control relocates:

| Interactive flow | Scheduled flow |
|------------------|----------------|
| Checkpoint 1 — approve sources | `_config/update.md` policy: score floor + per-run caps |
| Checkpoint 2 — final review | PR review: the update never touches the default branch |

The autonomy ladder in `_config/update.md`:

- `pr` (default) — branch + commit + open a PR with the digest as body
- `branch` — branch + commit, you open the PR
- `digest-only` — analyze and report, write no git history

A run with nothing to do is a **no-op**: no branch, no empty PR — the
scheduler log holds the printed digest.

## What a run does

1. Compile refreshes `update-context.json` (policy + known-URL ledger +
   last-update date), `freshness.json`, and `connection-candidates.json`.
2. Delta scout derives angles from "what's new since {last update}", the
   overview's Open Questions, coverage gaps, and your policy Watchlist —
   then drops every URL the workspace already knows.
3. Candidates scoring ≥ `min_score` (capped at `max_sources_per_run`) are
   ingested through the standard batch pipeline — raw text preserved
   immutably, articles compiled, graph rebuilt.
4. Connection mining proposes unlinked article pairs with real overlap; the
   update accepts the best as bidirectional See Also links and records
   rejections in the policy file so they never come back.
5. Stale articles (past the policy windows) are reported with ages; with
   `verify_stale: true` the top sources are re-fetched and verified.
6. Everything lands in `_updates/{date}-update.md`, `wiki/log.md`, and the
   PR body — sources found, deduped, approved, skipped (with scores, so you
   can promote them), articles changed, connections made, freshness counts.

## Flagship setup — GitHub Actions

From the wiki's repo:

```
/grimoire:update --setup
```

This installs `.github/workflows/grimoire-update.yml` (weekly cron +
manual trigger), scaffolds `_config/update.md` if missing, and writes
`.claude/settings.json` so the headless runner auto-loads the grimoire
plugin from the Athanor marketplace. Then, on GitHub:

1. **Auth** — GitHub's runner is a fresh VM with no Claude login on it, so
   it needs one credential. Your **Claude subscription covers it**: run
   `claude setup-token` locally and add the result as the
   `CLAUDE_CODE_OAUTH_TOKEN` Actions secret. No API key required. (If you'd
   rather meter usage through the API instead, add `ANTHROPIC_API_KEY` and
   swap the input in the workflow.)
2. **Permissions** — Settings → Actions → General → check *Allow GitHub
   Actions to create and approve pull requests* (without it, `gh pr create`
   gets a 403).
3. **Commit** the three files the setup created/changed.

Test immediately: Actions tab → *Grimoire Update* → *Run workflow*. The
first run is a good time to confirm the plugin auto-loads in CI; if the
runner doesn't trust the folder automatically, pin the plugin instead by
checking out `vedantggwp/grimoire` as a second checkout step and passing
`--plugin-dir` in `claude_args`.

Two GitHub facts worth knowing:

- PRs created with the default `GITHUB_TOKEN` don't trigger the repo's own
  `on: pull_request` workflows (recursion guard). If your repo runs CI on
  PRs and you want it on update PRs, use a PAT for `GH_TOKEN`.
- If WebSearch is unavailable in the CI environment, the delta scout
  degrades to fetching the policy Watchlist URLs directly — keep the
  watchlist stocked with the field's release/blog pages and updates still
  flow.

## Local alternative — cron / launchd (zero extra credentials)

The engine is trigger-agnostic, and a local scheduler needs **no
credentials at all** — `claude -p` runs on the same login as your
interactive sessions, exactly like every other Grimoire skill. The only
trade-off versus Actions is that your machine has to be awake when the
job fires. Any scheduler that can run Claude Code headlessly works:

```cron
# crontab -e — weekly, Monday 06:00
0 6 * * 1 cd ~/wikis/my-grimoire && claude -p "/grimoire:update" --permission-mode acceptEdits >> ~/.grimoire-update.log 2>&1
```

macOS launchd equivalent: a `~/Library/LaunchAgents/com.grimoire.update.plist`
with `ProgramArguments` running the same command and a `StartCalendarInterval`.
Caveats: the machine must be awake; `claude` must be on the PATH cron uses
(use an absolute path if not); auth comes from your local Claude session.

## After merging an update PR

The MCP server (`/grimoire:serve`) loads `.compile/` artifacts **once at
startup**. After merging:

```
/grimoire:compile        # rebuild artifacts from the merged wiki
```

then restart the MCP client (Claude Desktop, etc.) so the server picks up
the new knowledge.

## Tuning

Everything lives in `_config/update.md` (see the template comments):
`min_score` is the big lever — 18 means P0-only sources, 12 (default)
admits good P1 community material. `staleness.fresh/aging` should match the
field's velocity: a fast-moving API wiki might use 14/45; a history wiki
might mark everything `evergreen: true` in frontmatter and never see a
staleness flag. The Watchlist is the place to encode "always check the
official changelog" knowledge.

---
# _config/update.md — standing policy for /grimoire:update runs.
# This file is the human judgment that replaces interactive checkpoints
# when updates run headlessly (cron, GitHub Actions). Every field is
# optional; missing fields fall back to the defaults shown.

# How often updates are intended to run. Documentation for humans and
# schedulers — the engine itself is trigger-agnostic.
cadence: weekly

# What happens to the changes:
#   pr          — branch + commit + open a PR for review (default)
#   branch      — branch + commit only (no PR)
#   digest-only — analyze and report, write no git history
autonomy: pr

# Composite 6-signal score floor (6-30) for auto-approving a source.
#   18 = P0-only (strictest) · 12 = P1 and up (default) · 6 = everything
min_score: 12

# Caps per run — keep scheduled runs bounded and reviewable.
max_sources_per_run: 5
max_connections_per_run: 5

# Staleness windows in days, measured from each article's updated/checked
# date: within `fresh` = fresh · within `aging` = aging · beyond = stale.
staleness:
  fresh: 30
  aging: 90

# When true, the update re-fetches the top source of the stalest articles
# to verify them (bumps `checked:` if unchanged). Costs extra fetches.
verify_stale: false
max_stale_checks: 3
---

# Update Policy

## Watchlist

<!-- Standing interests the delta scout always covers. Plain phrases become
     search angles; URLs are fetched directly each run. One per line. -->

## Connection exclusions

<!-- Article pairs the editor rejected — connection mining never proposes
     them again. The update skill appends rejections here automatically.
     Format: - slug-a <-> slug-b — reason -->

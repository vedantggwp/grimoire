# Digest Template

The update digest is written to `_updates/{YYYY-MM-DD}-update.md` in the
workspace and doubles as the PR body. Keep every section even when empty —
reviewers scan for absences as much as presences. Replace `{placeholders}`;
drop table rows that don't apply, never whole sections.

```markdown
# Update Report — {topic}

Date: {YYYY-MM-DD} | Mode: {pr|branch|digest-only}{ | DRY RUN}
Since: {lastUpdate or "first update run"} | Policy: min score {minScore}, max {maxSourcesPerRun} sources ({policy source: defaults|file})

## What's New

{One paragraph, written for a human catching up: what changed in the field
since the last run, and what this update did about it. If nothing new was
found, say that plainly and what WAS checked.}

## Sources

Found {N} candidates · {D} already known (deduped) · {A} auto-approved · {I} ingested · {F} failed

| URL | Score | Decision |
|-----|-------|----------|
| {url} | {score} | ingested → [[{slug}]] |
| {url} | {score} | below threshold ({minScore}) |
| {url} | {score} | over per-run cap |

{Below-threshold and over-cap sources stay in the table — the reviewer can
promote them manually by adding them to approved-sources.md.}

## Articles

- Created: [[{slug}]] — {one-line summary}
- Updated: [[{slug}]] — {what changed and why}

## New Connections

- [[{a}]] <-> [[{b}]] — {relationship note written into both See Also sections}

Rejected {N} candidate(s); reasons appended to `_config/update.md` Connection exclusions.

## Freshness

{fresh} fresh · {aging} aging · {stale} stale · {evergreen} evergreen · {unknown} unknown

- [STALE] [[{slug}]] — {age} days since last verified. {Why it matters / what likely changed.}
- [AGING] [[{slug}]] — {age} days.

{If verify_stale ran: which articles were re-verified, which got `checked:`
bumped, which sources changed materially.}

## Attention Needed

- {Anything the policy could not decide — taxonomy proposal pending, ambiguous
  source, failed fetch worth retrying, scope question for the editor.}
- {If none: "Nothing — this run was fully covered by policy."}
```

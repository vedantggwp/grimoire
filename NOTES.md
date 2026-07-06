# Init-to-New Rename Notes

## Survivor scan

The live skill rename is complete: the skill now lives under `skills/new/`,
live command references point at the new slash command, and live template
references point at the new skill asset directory.

Remaining old-name mentions are intentional:

- `SPEC.md` — task specification and acceptance criteria for this rename.
- `MANIFEST.md` Recent Changes entries — dated historical ledger entries;
  the spec explicitly says not to edit past Recent Changes.
- `docs/decisions.md` — historical decision log entries; explicitly excluded
  by the acceptance grep.
- `docs/changelog.md` — historical changelog entries; explicitly excluded by
  the acceptance grep.
- `docs/launch-readiness.md` — historical launch-readiness scratchpad from an
  older release train.
- `docs/launch-announcement-draft.md` — stale launch-post draft intentionally
  left for a separate docs pass, matching the reference patch's skip.

## Git operation note

`git mv` could not be used in this sandbox because the worktree index lock is
outside the writable root. The directory was moved inside the worktree with a
filesystem move instead; no commit or staging was performed.

# Fidelity Honesty Report

Generated: 2026-07-12

## Scope

Implemented SPEC.md fidelity honesty fixes for compile, serve, and present:

- `unknown` is now a first-class article source-fidelity state.
- Articles with zero sources, all-unmatched sources, or pre-fidelity raw captures no longer masquerade as `full`.
- Articles with matched full captures plus unmatched sources can remain `full`, with `unknownSourceCount` exposed in `notes.json`.
- Raw source matching indexes both `source_url` and `final_url`.
- Duplicate raw captures resolve deterministically by best fidelity (`full` > `extract` > `failed` > `unknown`), then latest frontmatter date.
- Duplicate raw URL collisions are logged during compile.
- Serve retrieval warnings remain limited to `degraded`; `unknown` appears in `grimoire_coverage_gaps` as untracked provenance.
- Present gives `unknown` articles no badge; hub stats include untracked provenance counts.

## Verification

- `npm test` — 24 files passed, 373 tests passed.
- `npm run build` — rebuilt `dist/compile.js`, `dist/serve.js`, `dist/present.js`, `dist/research.js`, and source maps.

## New Coverage

Tests cover:

- Zero-source article compiles to `sourceFidelity: "unknown"`.
- All-unmatched article compiles to `sourceFidelity: "unknown"`.
- Pre-fidelity raw capture compiles to `sourceFidelity: "unknown"`.
- `final_url` bridges redirect mismatch between cited URL and raw archive.
- Duplicate captures prefer the best fidelity and log the collision.
- Serve does not append false warnings for `unknown` provenance.
- Serve coverage gaps lists unknown provenance separately from degraded captures.
- Present suppresses badges for `unknown` and reports untracked provenance in hub stats.

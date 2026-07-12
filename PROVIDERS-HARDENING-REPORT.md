# Providers Hardening Report

Date: 2026-07-12

## Summary

Implemented the ADV-2, ADV-3, ADV-7, ADV-8, and ADV-10 provider hardening fixes from `SPEC.md`.

## Fixes

- ADV-2 md-variant construction: `.md` candidates are now built by mutating only `URL.pathname`, origin-root URLs skip the variant, query strings are preserved, and the host is not crossed into `.md`.
- ADV-3 llms.txt content ladder: `/llms.txt` and `/llms-full.txt` are no longer attempted or emitted as full page-content capture methods.
- ADV-8 entity decoding: numeric entities above `0x10FFFF` and lone surrogate code points now decode to `U+FFFD` in both fetch and search extraction paths instead of throwing.
- ADV-7 search failures: `searchWeb` now returns a discriminated result. HTTP failures, thrown/network failures, and DuckDuckGo anomaly/CAPTCHA pages are structured errors; genuine empty result pages remain successful empty results.
- ADV-10 redirect/resource edges: fetch redirects now enforce `http:`/`https:` on the initial URL and every redirect hop, DuckDuckGo `uddg` URLs reject non-HTTP(S) schemes, redirect chains share a single deadline, and oversized streamed responses call `reader.cancel()`.

## Tests Added

- md-variant origin-root skip.
- md-variant query-string preservation.
- md-variant normal page path.
- md-variant trailing-slash page path coverage.
- llms.txt not accepted as page content.
- fetch entity clamp for out-of-range and surrogate numeric entities.
- search entity clamp for out-of-range and surrogate numeric entities.
- search `uddg` scheme allowlist.
- search HTTP failure discrimination.
- search thrown/network failure discrimination.
- DuckDuckGo anomaly/CAPTCHA blocked-page discrimination.
- genuine empty search result behavior.
- research CLI structured search error stderr + nonzero exit.
- research CLI genuine empty output.
- cross-scheme redirect rejection.
- redirect limit enforcement.
- shared abort signal across redirect chains.
- size-cap reader cancellation.

## Verification

- `npm test` passed: 24 test files, 385 tests.
- `npm run build` passed and rebuilt `dist/*`.

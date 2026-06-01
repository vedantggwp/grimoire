# Contributing to Grimoire

Thanks for helping improve Grimoire. The project is a local-first Claude Code plugin that builds inspectable knowledge bases and exposes them to LLM clients over MCP.

## Good First Areas

- Frontend presentation bugs in `lib/present/`
- MCP server behavior in `lib/serve.ts`
- Test coverage for existing public issues
- Documentation for plugin installation and example workspaces

## Local Setup

```bash
git clone https://github.com/vedantggwp/grimoire.git
cd grimoire
npm ci
npm test
npm run build
```

The committed `dist/` bundles are part of the plugin distribution. If you change files under `lib/`, run `npm run build` and include the updated bundles in the same PR.

## Pull Request Checklist

- Keep the change focused on one bug, feature, or doc improvement.
- Add or update tests when behavior changes.
- Run `npm test` before opening a PR.
- Run `npm run build` when touching runtime source under `lib/`.
- Explain the user-visible effect and link the issue when one exists.

## Reporting Issues

Please include:

- the Grimoire command or stage involved;
- Node.js version;
- operating system;
- a minimal workspace shape or fixture when possible;
- expected output and actual output.

Avoid sharing private source material, API keys, or proprietary knowledge-base contents in public issues.

# CLAUDE.md

You are in **Grimoire**, a local-first **knowledge base builder** built on ICM (Interpreted Context Methodology). Grimoire turns a topic into a structured knowledge base by scouting sources, ingesting and compiling them into wiki articles, generating a study-oriented frontend, and optionally serving the result to LLM tools through MCP.

This file is **L0 context**. Its job is only to answer: **Where am I?**
It loads on every conversation, so it must stay lean and stable.

Start here, then route immediately:
- Read `CONTEXT.md` next to decide **which stage owns the task**
- Read `SOUL.md` when you need the full product bible, architecture, boundaries, or source-of-truth clarification

## Core Rules

1. **Follow ICM strictly.**
   The filesystem is the agent architecture. Work through stage boundaries, not ad hoc across the repo.

2. **One stage, one job.**
   Keep responsibilities isolated. Do not mix scouting, ingestion, compilation, presentation, and serving behavior unless the user explicitly asks for cross-stage work.

3. **Route before acting.**
   Do not skip `CONTEXT.md`. Decide the stage first, then load that stage's context and only the files needed for that job.

4. **Plain text is the interface.**
   Markdown files are the contract between stages. Prefer transparent, editable artifacts over hidden state, implicit memory, or framework-like orchestration.

5. **Keep outputs editable and local.**
   Humans must be able to inspect and modify stage outputs between steps. Preserve that property.

6. **Respect context layering.**
   This file is orientation only. Stage instructions belong in `stages/NN-name/CONTEXT.md`. Product doctrine belongs in `SOUL.md`. Do not collapse those layers together.

## Workspace Convention

Maintain `MANIFEST.md` as the workspace change ledger. Update it whenever files are created, edited, renamed, or deleted. The manifest should track what changed so later work can orient quickly.

## What This Project Is

Grimoire is:
- A knowledge base builder, not a notes app
- A staged pipeline, not a monolithic prompt
- LLM-readable and human-readable
- Local-first, file-based, and reviewable

## What Not To Do

- Do not bloat this file
- Do not put stage-specific process instructions here
- Do not skip `CONTEXT.md` routing
- Do not treat this file as a second `SOUL.md`
- Do not break stage isolation without an explicit reason
- Do not replace markdown interfaces with opaque hidden workflow

If you are unsure what to do next, the answer is usually:
1. Read `CONTEXT.md`
2. Enter exactly one stage
3. Load only that stage's instructions and inputs

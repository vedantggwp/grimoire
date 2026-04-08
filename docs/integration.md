# CLAUDE.md Integration

Grimoire can optionally generate a lightweight snippet for a project's CLAUDE.md.

## Rules

- **Optional** — the system asks, never forces
- **Lightweight** — 5-10 lines maximum
- **Semantic pointer** — references `wiki/index.md`, not individual articles
- **Hard rule, not suggestion** — makes it mandatory to consult the wiki

## Example Snippet

```markdown
## Knowledge Base: [Topic]

This project has a Grimoire wiki at `wiki/`. When working on tasks related to [topic]:
1. Read `wiki/index.md` to find relevant articles
2. Consult specific articles before making decisions in this domain
3. If the wiki doesn't cover your question, flag it — don't guess

The wiki is the source of truth for [topic] knowledge. Model training data is not.
```

## Auto-Update

The snippet is generated once. It does NOT auto-update as the wiki grows — `wiki/index.md` handles routing internally. This keeps CLAUDE.md stable.

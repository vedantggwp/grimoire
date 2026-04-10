---
name: present
description: >-
  Use this skill when the user wants to generate the study-oriented frontend,
  build the HTML/CSS/JS presentation layer, or says "grimoire present",
  "build frontend", "generate site", or "/grimoire:present". Creates a static
  site with 6 study modes from compiled wiki content and design configuration.
version: 0.1.0
---

# present

Generate a study-oriented static frontend from compiled wiki content and
the design configuration.

## Prerequisites

- A grimoire workspace must exist — check for `SCHEMA.md`.
  If missing, tell the user to run `/grimoire:init` first.
- The `wiki/.compile/` directory must exist with JSON artifacts.
  If missing, tell the user to run `/grimoire:compile` first.
- The `_config/design.md` file should exist. If missing, use defaults
  (midnight-teal palette, editorial typography, subtle motion, comfortable density).

## Step 1 — Locate the Grimoire

1. Look for `SCHEMA.md` in the current directory first
2. If not found, ask the user for the workspace path
3. Verify `wiki/.compile/` exists and contains `notes.json`, `graph.json`,
   `analytics.json`
4. Read `SCHEMA.md` for topic and scope context

## Step 2 — Run the Present Script

Execute the static site generator:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/present.js {workspace-path}
```

This reads:
- `_config/design.md` — palette, typography, motion, density settings
- `wiki/.compile/*.json` — compile artifacts (notes, graph, analytics)
- `wiki/*.md` — article content (converted to HTML)
- `wiki/log.md` — changelog entries for feed mode

And generates a complete static site in `{workspace}/site/`:

| File | Mode |
|------|------|
| `site/index.html` | Hub page with mode navigation and wiki stats |
| `site/read/index.html` | Linear reading — articles in reading order with TOC |
| `site/graph/index.html` | Graph exploration — force-directed concept map |
| `site/search/index.html` | Search + answer — full-text search with results |
| `site/feed/index.html` | Changelog — timeline of ingest/compile activity |
| `site/gaps/index.html` | Gap map — coverage visualization by topic |
| `site/quiz/index.html` | Flashcard — auto-generated Q&A from article content |
| `site/assets/style.css` | Generated CSS from design config |

If the script fails, show the error and stop.

## Step 3 — Preview (CHECKPOINT)

After generation, tell the user how to preview:

```
Site generated at {workspace}/site/

  To preview, open in your browser:
    open {workspace}/site/index.html

  Modes: read | graph | search | feed | gaps | quiz

  Design: {palette} palette, {typography} typography, {motion} motion, {density} density
```

Ask: "Open the site and let me know if anything needs adjusting — layout, colors,
reading order, content."

**Wait for feedback before proceeding.** The user may want to:
- Change the palette or typography in `_config/design.md` and re-run
- Adjust reading order
- Fix content issues in wiki articles

If the user requests design changes:
1. Edit `_config/design.md` with the requested changes
2. Re-run the present script
3. Ask for feedback again

## Step 4 — Final Report

Once the user is satisfied, print:

```
Frontend complete.

  Site:     {workspace}/site/
  Pages:    {N} HTML files
  Size:     {total size}
  Palette:  {palette}
  Articles: {N}

  The site is fully static — no server needed. Open index.html in any browser.
  Works offline. Works from file:// protocol.

Next steps:
  - Run /grimoire:serve to expose the wiki via MCP server
  - Deploy site/ to any static hosting (Netlify, Vercel, GitHub Pages)
  - Share the site/ folder — it's self-contained
```

## Step 5 — Update wiki/log.md

Append:

```markdown
## {YYYY-MM-DD} — Frontend Generated

- Palette: {palette}
- Typography: {typography}
- Modes: read, graph, search, feed, gaps, quiz
- Output: site/
```

## Design Engine Reference

The design configuration at `_config/design.md` controls the visual output.

**Palettes:** midnight-teal, noir-cinematic, cold-steel, warm-concrete,
electric-dusk, smoke-light, obsidian-chalk, custom

**Typography:** editorial (serif headings), technical (monospace-forward),
playful (rounded sans), brutalist (bold oversized), minimal (neutral sans)

**Motion:** none, subtle, expressive

**Density:** compact, comfortable, spacious

All palettes support dark/light modes. All output meets WCAG AA contrast.
Mobile-first responsive. Print-safe.

## Validation Rules

- Never modify wiki articles — present is read-only
- The `site/` directory is a build artifact. It can be deleted and regenerated.
- Add `site/` to `.gitignore` if not already present
- All internal links must be relative (site works from `file://` protocol)
- Use `${CLAUDE_PLUGIN_ROOT}` for the present script path
- If the wiki has fewer than 2 content articles, generate only read mode and search mode
  (graph/gaps/quiz need more data to be meaningful)

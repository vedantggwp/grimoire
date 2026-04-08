# Design System Engine

Grimoire frontends must be beautiful. Not "AI slop." Not generic templates. Distinctive, study-oriented, accessible.

## design.md Configuration

Every Grimoire wiki has `_config/design.md` that sets visual identity:

```yaml
palette: midnight-teal
typography: editorial
motion: subtle
density: comfortable
```

See `_config/design.md` for all options and descriptions.

## Available Design Skills

The system has access to a deep arsenal of installed skills:

| Skill | What It Provides |
|-------|------------------|
| **ui-ux-pro-max** | 97 color palettes, 57 font pairings, 99 UX guidelines |
| **billion-dollar-design** | Agency-level: opacity-based color, 3-font stacks, glass morphism |
| **high-end-visual-design** | $150k+ agency aesthetics: double-bezel, spatial rhythm, magnetic physics |
| **design-taste-frontend** | 5 perception layers, typography craft, optical alignment |
| **minimalist-ui** | Warm monochrome, bento grids, muted pastels, editorial |
| **industrial-brutalist-ui** | Swiss typographic + military aesthetics, rigid grids |
| **visual** | 13 aesthetic presets (linear, stripe, vercel, raycast, apple, etc.) |
| **design-motion-principles** | Spring physics, cubic-bezier, scroll reveals |
| **product-team/ui-design-system** | Token generation (CSS/SCSS/JSON), type scales |

## Non-Negotiable Design Rules

These apply regardless of palette choice:

1. **Accessibility first** — WCAG AA contrast, focus states, prefers-reduced-motion, keyboard nav
2. **Type scale with rhythm** — Minor third (1.2) or major third (1.25) with clamp()
3. **Consistent spacing** — 4px/8px base grid, no arbitrary values
4. **Semantic color** — Success, warning, error, info in every palette
5. **Dark/light modes** — Every palette supports both
6. **Print-safe** — Content renders in print (no background-dependent text)
7. **Mobile-first** — Vertical scroll, single column, touch targets ≥ 44px
8. **No AI slop** — No purple gradients, no Inter (unless intentional), no generic heroes

## Theme Switching

Palettes are CSS custom properties on `:root`. Switching is a single class change on `<html>`. No rebuild, no page reload. `design.md` sets defaults — the frontend includes a theme picker if multiple palettes are configured.

---
# ============================================================
# Grimoire Design Configuration
# ============================================================
# This file controls the visual identity of the generated frontend.
# Edit values below and re-run the present stage to apply changes.
# ============================================================

# PALETTE
# Controls the overall color scheme. Each palette defines background,
# surface, text, and accent colors for both light and dark modes.
#
#   midnight-teal   — Dark background, teal accents, editorial feel
#   noir-cinematic  — High contrast black, warm gold highlights, dramatic
#   cold-steel      — Cool grays, blue accents, technical/clinical
#   warm-concrete   — Warm grays, amber accents, approachable
#   electric-dusk   — Deep purple-blue, electric accents, energetic
#   smoke-light     — Light background, soft grays, minimal and clean
#   obsidian-chalk  — Pure black and white, stark, typographic
#   custom          — Define your own colors using the overrides below
#
palette: midnight-teal

# TYPOGRAPHY
# Controls font pairing and typographic personality.
#
#   editorial   — Serif headings, sans body. Magazine feel. Weighted toward readability.
#   technical   — Monospace-forward. Code-heavy wikis. Clean grid alignment.
#   playful     — Rounded sans-serif. Friendly, approachable. Good for non-technical audiences.
#   brutalist   — Bold, oversized type. High contrast. Statement-making.
#   minimal     — Neutral sans-serif throughout. Lets content speak. No personality from type.
#
typography: editorial

# MOTION
# Controls animation and transition behavior. Applied for real since v0.4.0:
# duration tokens, view transitions, scroll reveals, hero parallax, card
# tilt all scale with this setting. prefers-reduced-motion always wins.
#
#   none        — No animations, no view transitions, no ambient canvas motion.
#   subtle      — Editorial defaults: 120-560ms tokens, gentle reveals, 2deg tilt.
#   expressive  — Same choreography, x1.25 durations, 4deg tilt, fuller stagger.
#
motion: subtle

# DENSITY
# Controls spacing, padding, and information density via semantic tokens
# (4px grid). Applied for real since v0.4.0.
#
#   compact     — Tight spacing. More content visible. Power-user friendly.
#   comfortable — Balanced spacing. Default reading experience.
#   spacious    — Generous whitespace. Breathable. Better for long-form reading.
#
density: comfortable

# MODES
# Which study modes to generate. Comma-separated; omit the line for all six.
# `read` is the spine of the site and cannot be disabled.
#
#   modes: read, graph, search, feed, gaps, quiz
#
# modes: read, graph, search

# ============================================================
# OPTIONAL OVERRIDES
# ============================================================
# These override the palette/typography defaults. Leave commented
# out to use the palette's built-in values.

# accent: "#00a5ac"
#   Override the primary accent color. Must meet WCAG AA contrast
#   against both light and dark backgrounds.

# font-heading: "Poppins"
#   Override the display/heading font. Must be available via
#   Google Fonts or included as a local asset.
#   (font-display is accepted as a legacy alias.)

# font-body: "Karla"
#   Override the body text font independently of the heading font.

# font-mono: "IBM Plex Mono"
#   Override the monospace font used for code blocks and
#   technical content.

---

<!-- Design rules applied regardless of configuration:
  1. WCAG AA contrast minimums on all text
  2. Minor third (1.2) or major third (1.25) type scale with clamp()
  3. 4px/8px base grid for spacing
  4. Semantic colors for success, warning, error, info states
  5. Dark/light mode support for every palette
  6. Print-safe rendering (no background-dependent text)
  7. Mobile-first, touch targets >= 44px
  8. No AI slop: no purple gradients, no generic hero sections
-->

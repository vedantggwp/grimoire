# Visual Reference Catalog

Research date: 2026-04-13. All references verified via live web search.

This catalog maps specific design decisions from best-in-class products
to each Grimoire frontend mode. Every recommendation includes the source,
what makes it excellent, and the exact design value to adopt.

---

## 1. Hub / Landing Page

### Reference: Linear (linear.app)
- **Layout**: Dark background (`#08090a`), vertical rhythm with generous whitespace
- **Typography**: Inter Variable, semibold headings, tabular-nums for stats
- **Cards**: Multi-layer shadow system: `0 0 0 1px #ffffff0d` (border glow), `0px 4px 4px -1px` (depth)
- **Hover states**: Background shifts to `#38393d` with enhanced shadow depth
- **Transitions**: Custom speed tokens `--speed-highlightFadeIn/Out`
- **URL**: https://linear.app

### Reference: Vercel Geist Design System
- **Font**: Geist Sans (body) + Geist Mono (code). Swiss-inspired, optimized for dev tools.
- **Color system**: OKLCh-based tokens for perceptual uniformity. Dark background `oklch(0.145 0 0)`, card `oklch(0.205 0 0)`, muted foreground `oklch(0.708 0 0)`
- **Spacing**: Grid-based with responsive breakpoints (xs, sm, smd, md, lg)
- **Components**: 60+ components. Command Menu component built in.
- **URL**: https://vercel.com/geist/introduction

### Reference: Bento Grid Layout Pattern (Apple, Samsung, Microsoft)
- Bento grids deliver 23% higher click-through rate and 23% faster task completion on feature pages
- Variable aspect ratios, lightweight looping video tiles replacing static icons
- Use for the hub page mode cards: each mode (read, graph, search, feed, gaps, quiz) as a bento cell
- **Sources**: https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026

### Adopt for Grimoire Hub
- Bento grid layout for the 6 mode cards
- Dark surface elevation: base `#0F0F0F`, raised cards `#1A1A1A`, overlay `#252525`
- Multi-layer box shadows from Linear for card depth
- Geist Sans + Geist Mono font stack
- Stats rendered with `font-variant-numeric: tabular-nums`
- Glassmorphism on mode cards: `backdrop-filter: blur(12px); background: rgba(26,26,26,0.8)`

---

## 2. Read Mode (Documentation / Articles)

### Reference: Stripe Documentation
- **Layout**: Three-column — nav tree (left), content (center), code samples (right)
- **Interaction**: Hovering a paragraph highlights relevant code lines, bridging explanation and implementation
- **Personalization**: Code samples inject user's API key; language selector persists across pages
- **Architecture**: Custom Markdoc syntax for interactive, app-like docs
- **URL**: https://docs.stripe.com

### Reference: Mintlify Developer Docs
- Beautiful out-of-the-box with code samples, API playground, changelogs
- Clean typography with generous line height
- Sidebar nav with collapsible sections and search integration
- **URL**: https://www.mintlify.com

### Reference: shadcn/ui Theming (Tailwind v4)
- OKLCh color tokens for dark mode:
  - `--background: oklch(0.145 0 0)` (near-black)
  - `--card: oklch(0.205 0 0)` (raised surface)
  - `--border: oklch(0.275 0 0)` (subtle divider)
  - `--muted-foreground: oklch(0.708 0 0)` (secondary text)
  - `--foreground: oklch(0.985 0 0)` (primary text, not pure white)
- **URL**: https://ui.shadcn.com/docs/theming, https://tweakcn.com

### Adopt for Grimoire Read Mode
- Two-column layout: TOC sidebar (left), article content (right). Three-column if articles have metadata/cross-refs.
- Stripe's paragraph-highlight-on-hover pattern for cross-references
- Off-white text `#E5E5E5` on near-black `#0F0F0F` (never pure white/black, reduces eye strain)
- Line height 1.65, body font 15-17px
- Smooth scroll with `scroll-behavior: smooth` and `scroll-padding-top` for header offset
- View Transitions API for page-to-page navigation (Baseline Newly Available Oct 2025): https://developer.chrome.com/docs/web-platform/view-transitions

---

## 3. Graph Mode (Knowledge Graph Visualization)

### Reference: vasturiano/3d-force-graph
- WebGL + ThreeJS force-directed graph with post-processing composer for glow/bloom effects
- React bindings: `react-force-graph-2d`, `react-force-graph-3d`
- Supports zoom, pan, node hover, click interaction
- **URL**: https://github.com/vasturiano/3d-force-graph

### Reference: D3.js Force Graph with SVG Glow Filter
- SVG glow implementation:
  ```
  <filter id="glow">
    <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  ```
- Apply via `style("filter", "url(#glow)")` on nodes
- Works on circles, rects, paths (not lines)
- **Source**: https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization/

### Reference: D3 Force Simulation Parameters (2025 best practice)
- Charge: `d3.forceManyBody().strength(-100)` (repulsion)
- Center: `d3.forceCenter(width/2, height/2)`
- Nodes: teal `#69b3a2`, radius 5px, white stroke 1.5px
- Links: gray `#999`, opacity 0.6
- Canvas: 800x600 SVG container
- **Source**: https://dev.to/nigelsilonero/how-to-implement-a-d3js-force-directed-graph-in-2025-5cl1

### Reference: Obsidian Graph View
- Custom CSS via `data-attribute` selectors for node colors by type
- Cluster detection and radial layout for ego-centric exploration
- Advanced Canvas plugin: custom node shapes, edge colors, export to SVG/PNG
- **Source**: https://publish.obsidian.md/hub/04+-+Guides,+Workflows,+&+Courses/Guides/Graph+view+customization

### Adopt for Grimoire Graph Mode
- D3 force-directed 2D graph (already inline, no CDN). Dark canvas background `#0A0A0A`
- SVG glow filter on nodes with `stdDeviation: 2.5-4` for neon effect
- Color nodes by article category using Stripe's accessible color methodology (CIELAB perceptual uniformity, 5 levels apart = guaranteed AA contrast): https://stripe.com/blog/accessible-color-systems
- Node size proportional to backlink count (from compile analytics)
- Hover: expand node, show title tooltip, highlight connected edges
- Edge opacity 0.3 default, 0.8 on connected-node hover
- Subtle ambient animation: nodes drift slightly when idle (low-force simulation continues)

---

## 4. Search Mode (Command Palette / Full-Text Search)

### Reference: Raycast / macOS Spotlight
- Command palette pattern: `Cmd+K` global shortcut
- Two-column with preview for files/documents
- Multi-panel layouts for complex filtering
- Fuzzy search with result grouping by category
- **URL**: https://www.raycast.com

### Reference: cmdk (React command menu primitives)
- Unstyled, composable, accessible React component
- `data-cmdk-*` attributes for styling hooks
- Animate height: `--cmdk-list-height` CSS variable, `transition: height 100ms ease`
- **URL**: https://cmdk.paco.me

### Reference: Command Palette Design Patterns (Mobbin, 440+ examples)
- `Cmd+K` as web standard shortcut (alternative: `Cmd+/`)
- Query prefixes: `@` for people/tags, `:` for navigation modes, `>` for commands
- Togglable behavior: launch shortcut also dismisses
- Results grouped by type with section headers
- **Sources**: https://mobbin.com/glossary/command-palette, https://nicelydone.club/pages/command-palette

### Reference: Algolia InstantSearch
- Composable UI components for search: autocomplete, facets, pagination
- Inline dropdown for lightweight contexts, full-page for deep exploration
- Highlight matching text in results
- **URL**: https://www.algolia.com/products/features/ui-component-libraries

### Adopt for Grimoire Search Mode
- `Cmd+K` to open search overlay from any page (global)
- Centered modal: `max-width: 640px`, `border-radius: 12px`
- Backdrop: `background: rgba(0,0,0,0.6); backdrop-filter: blur(8px)`
- Input: large (18px font), no border, placeholder "Search articles, concepts..."
- Results grouped: Articles, Concepts, Tags with section headers
- Highlight matching text with accent color background
- Keyboard navigation: arrow keys, Enter to select, Escape to close
- Animation: scale from 0.95 + fade in, `transition: 150ms ease-out`
- Height animates with content: `transition: height 100ms ease` (cmdk pattern)

---

## 5. Feed Mode (Changelog / Timeline)

### Reference: Linear Changelog
- Vertical timeline, date labels in micro typography
- Rich heading hierarchy: feature announcements distinct from fixes
- Embedded imagery with responsive scaling (DPR 2 optimization)
- Multi-layer shadow on cards: border glow + depth + definition layers
- Background: `#08090a` primary, `#2d2e31` secondary elements
- Text: `#e4e5e9` primary, `rgba(255,255,255,0.48)` quaternary
- **URL**: https://linear.app/changelog

### Reference: Framer / Lemon Squeezy Changelogs
- Alternating layout: dates/titles left, visuals/descriptions right
- Lemon Squeezy alternates background color between posts for visual breathing room
- Framer uses two-column with strong imagery on opposing sides
- **Source**: https://saaslandingpage.com/articles/superb-changelog-examples-for-design-inspiration/

### Reference: Notion Changelog
- Storytelling approach with GIFs illustrating updates
- Each entry is a visual-first card with glorified UI screenshots
- Conversational tone in copy
- **Source**: https://usersnap.com/blog/changelog-examples/

### Adopt for Grimoire Feed Mode
- Vertical timeline with subtle left-border line (`border-left: 2px solid #252525`)
- Date badges: muted foreground, `font-variant-numeric: tabular-nums`, small caps
- Entry cards: slightly raised surface (`#1A1A1A`), `border-radius: 8px`, `padding: 24px`
- Tag badges for entry type: "ingested" (blue), "compiled" (green), "edited" (amber)
- Alternating subtle background shift every other entry for scan rhythm
- Most recent entry has a subtle glow ring: `box-shadow: 0 0 0 1px rgba(accent, 0.3)`

---

## 6. Gaps Mode (Coverage / Gap Analysis Visualization)

### Reference: GitHub Contribution Calendar Heatmap
- Grid of cells, color intensity = activity level
- Clean, recognizable pattern. 31 CSS themes available in Cal-Heatmap library.
- D3-based with zoom for details-on-demand (year/month/week/day views)
- **Sources**: https://github.com/kevinsqi/react-calendar-heatmap, https://github.com/g1eb/calendar-heatmap

### Reference: Waffle Chart (D3)
- Grid of small cells, colored cells = coverage proportion
- Better than pie charts for showing part-to-whole relationships
- Each cell is countable and tangible
- **Source**: https://datavizproject.com/data-type/percentage-grid/

### Reference: Treemap (D3 Hierarchy)
- Rectangles sized by content volume, colored by coverage/completeness
- Squarified tiling (golden aspect ratio) for readability
- Nested hierarchy: topic > subtopic > article
- **URL**: https://d3js.org/d3-hierarchy/treemap

### Reference: Heatmap UI Patterns
- Color gradation: cool-to-warm palette, min/max value range
- Customizable cell size/shape, transparency for readability
- Borders and spacing between cells for clarity
- **Source**: https://dribbble.com/tags/heatmap

### Adopt for Grimoire Gaps Mode
- Treemap layout: rectangles sized by expected article count per topic
- Color gradient: `#1a1a2e` (0% coverage, dark blue-black) through `#16213e` (25%), `#0f3460` (50%), `#533483` (75%), `#e94560` (100%, vivid accent)
- Hover: cell expands slightly (`transform: scale(1.02)`), tooltip shows "Topic X: 3/8 articles, 37% coverage"
- Waffle chart alternative for summary: 10x10 grid showing overall wiki completeness
- Missing topics glow with a subtle pulse animation: `animation: pulse 2s ease-in-out infinite`
- Click a gap cell to see suggested articles for that topic

---

## 7. Quiz Mode (Flashcards / Spaced Repetition)

### Reference: Duolingo Design System
- **Colors**:
  - Green CTA: `#58cc02`, dark hover: `#58a700`
  - Blue info: `#1cb0f6`
  - Red errors: `#ff4b4b`
  - Orange streaks: `#ff9600`
  - Yellow rewards: `#ffc800`
  - Purple premium: `#ce82ff`
- **Buttons**: `border-radius: 16px`, 4px bottom border (3D raised), active = border gone + `margin-top: 4px` (physical press)
- **Progress bar**: 16px height, `border-radius: 8px`, `transition: width 300ms ease-out`
- **Animations**: Flame idle 2s, urgent 0.8s, slide-up feedback 200ms, progress 300ms
- **Feedback**: Green banner for correct (with check icon), red banner for wrong (shows answer inline, progress still advances)
- **Philosophy**: "Safety over punishment" - wrong answers trigger education, not shame
- **URL**: https://blakecrosley.com/guides/design/duolingo

### Reference: Brain Buzz UI Kit (Dribbble)
- 230+ screens, 30+ components for quiz/flashcard
- Clean card-based layouts with progress tracking
- **URL**: https://dribbble.com/shots/23750819-Brain-Buzz-Quiz-Flashcards-App-UI-Kit

### Reference: Ankimin Theme
- Clean, minimal flashcard template with light/dark modes
- Distraction-free revision focus
- **URL**: https://github.com/ctrlaltwill/Ankimin

### Adopt for Grimoire Quiz Mode
- Card flip animation: `transform: rotateY(180deg)`, `transition: transform 500ms ease`, `backface-visibility: hidden`
- Card: `max-width: 600px`, centered, `border-radius: 16px`, raised surface with Duolingo-style 4px bottom border
- Correct feedback: green accent (`#58cc02`), slide-up 200ms, check icon
- Wrong feedback: soft red (`#ff4b4b`), show correct answer inline, progress still advances
- Progress bar: full-width top, 8px height, `border-radius: 4px`, smooth width transition 300ms
- "Difficulty" buttons (Easy/Medium/Hard) use Duolingo's 3D button pattern: raised border + press animation
- Streak counter in corner with subtle fire animation for consecutive correct answers
- Session summary: cards correct/total, time spent, suggested review topics

---

## 8. Global CSS Techniques

### Dark Mode Color Tokens (Semantic System)
```
--color-surface-base:    #0F0F0F    /* page background */
--color-surface-raised:  #1A1A1A    /* cards, panels */
--color-surface-overlay: #252525    /* modals, dropdowns */
--color-text-primary:    #E5E5E5    /* body text (not pure white) */
--color-text-secondary:  #A3A3A3    /* muted text */
--color-text-tertiary:   #666666    /* disabled, timestamps */
--color-border-default:  #2A2A2A    /* subtle dividers */
--color-border-hover:    #3A3A3A    /* interactive borders */
--color-accent:          #4A9EFF    /* links, active states */
--color-accent-muted:    rgba(74,158,255,0.15)  /* accent backgrounds */
--color-success:         #58cc02    /* correct, complete */
--color-error:           #ff4b4b    /* wrong, missing */
--color-warning:         #ff9600    /* attention, streaks */
```
Sources: https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/, https://colorhero.io/blog/dark-mode-color-palettes-2025

### Recommended Palettes for Grimoire
| Palette | Base | Surface | Accent | Vibe |
|---------|------|---------|--------|------|
| midnight-teal | `#0F0F0F` | `#1A1A1A` | `#2dd4bf` | Default. Clean, focused. |
| deep-navy-electric | `#0C1120` | `#141D30` | `#3A82FF` | Technical, precise. |
| warm-charcoal-gold | `#1C1917` | `#292524` | `#D4A574` | Scholarly, warm. |
| obsidian-chalk | `#0A0A0A` | `#161616` | `#FFFFFF` | Maximum contrast. |
| electric-dusk | `#0F172A` | `#1E293B` | `#22D3EE` | Gradient-friendly, modern. |

### Glassmorphism (2026 — Now Practical)
- `backdrop-filter: blur(12px)` runs smoothly on mid-range mobile GPUs in 2026
- Pair with dynamic background blur that shifts on scroll
- Use for overlays, search modal, card hover states
- **Source**: https://www.digitalupward.com/blog/2026-web-design-trends-glassmorphism-micro-animations-ai-magic/

### View Transitions API
- Same-document transitions: Baseline Newly Available (Oct 2025, Firefox 144)
- Cross-document transitions: Chrome 126+
- Use for mode switching (read -> graph -> search) with smooth crossfade
- CSS: `::view-transition-old/new` pseudo-elements for custom animations
- **Source**: https://developer.chrome.com/docs/web-platform/view-transitions

### Scroll-Driven Animations
- `animation-timeline: scroll()` for progress-linked animations
- Use for: reading progress bar, parallax on hub page, fade-in on scroll for feed entries
- **Source**: https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026

### Typography Scale
```
--text-xs:    12px / 1.5
--text-sm:    14px / 1.5
--text-base:  16px / 1.65
--text-lg:    18px / 1.6
--text-xl:    20px / 1.5
--text-2xl:   24px / 1.4
--text-3xl:   30px / 1.3
--text-4xl:   36px / 1.2
```
Font stack: `'Geist Sans', 'Inter', system-ui, -apple-system, sans-serif`
Mono stack: `'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace`

### Animation Defaults
```
--ease-out:       cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out:    cubic-bezier(0.65, 0, 0.35, 1)
--duration-fast:  100ms
--duration-base:  200ms
--duration-slow:  300ms
--duration-enter: 150ms
--duration-exit:  100ms
```

---

## Source Index

All URLs verified 2026-04-13.

### Documentation Design
- [Stripe Docs](https://docs.stripe.com/) — three-column layout, code highlighting, personalization
- [Mintlify](https://www.mintlify.com/) — beautiful defaults, API playground
- [Stripe Accessible Color Systems](https://stripe.com/blog/accessible-color-systems) — CIELAB perceptual uniformity methodology
- [Stripe Docs Analysis (Mintlify)](https://www.mintlify.com/blog/stripe-docs) — cultural/structural breakdown

### Design Systems
- [Vercel Geist](https://vercel.com/geist/introduction) — OKLCh tokens, Geist font, 60+ components
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) — Tailwind v4 dark mode tokens
- [tweakcn Theme Editor](https://tweakcn.com/) — shadcn/ui theme customizer with OKLCh values

### Dark Mode
- [Dark Mode Design Systems Guide (Muzli)](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/) — semantic tokens, surface elevation, hex values
- [Dark Mode Palettes 2025 (Colorhero)](https://colorhero.io/blog/dark-mode-color-palettes-2025) — 5 complete palettes with hex values

### Knowledge Graph
- [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph) — WebGL 3D force graph with post-processing
- [vasturiano/react-force-graph](https://github.com/vasturiano/react-force-graph) — React bindings for 2D/3D
- [D3 Glow Filter (Visual Cinnamon)](https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization/) — SVG glow technique
- [D3 Force Graph 2025](https://dev.to/nigelsilonero/how-to-implement-a-d3js-force-directed-graph-in-2025-5cl1) — current best-practice params
- [Obsidian Graph Customization](https://publish.obsidian.md/hub/04+-+Guides,+Workflows,+&+Courses/Guides/Graph+view+customization) — CSS theming for graph views

### Command Palette / Search
- [cmdk](https://cmdk.paco.me/) — unstyled React command menu primitives
- [Command Palette Interfaces (Philip Davis)](https://philipcdavis.com/writing/command-palette-interfaces) — UX patterns (Things 3, Notion, Framer, Raycast)
- [Designing Command Palettes (Destiner)](https://destiner.io/blog/post/designing-a-command-palette/) — implementation spec with color values
- [Command Palette Examples (Mobbin)](https://mobbin.com/glossary/command-palette) — 440+ real examples
- [Command Palette Examples (Nicelydone)](https://nicelydone.club/pages/command-palette) — SaaS examples gallery

### Changelog / Timeline
- [Linear Changelog](https://linear.app/changelog) — dark theme, rich cards, multi-layer shadows
- [Changelog Examples (Usersnap)](https://usersnap.com/blog/changelog-examples/) — 10 examples with design patterns
- [Changelog Examples (SaaS Landing Page)](https://saaslandingpage.com/articles/superb-changelog-examples-for-design-inspiration/) — layout patterns, alternating designs

### Quiz / Flashcard
- [Duolingo Design Breakdown](https://blakecrosley.com/guides/design/duolingo) — full color palette, button specs, animation timings
- [Brain Buzz UI Kit (Dribbble)](https://dribbble.com/shots/23750819-Brain-Buzz-Quiz-Flashcards-App-UI-Kit) — 230+ screen quiz/flashcard kit
- [Flashcard Designs (Dribbble)](https://dribbble.com/tags/flashcards) — 200+ designs
- [Ankimin Theme](https://github.com/ctrlaltwill/Ankimin) — minimal dark/light flashcard CSS

### Gap / Coverage Visualization
- [react-calendar-heatmap](https://github.com/kevinsqi/react-calendar-heatmap) — GitHub-style SVG heatmap
- [D3 Treemap](https://d3js.org/d3-hierarchy/treemap) — hierarchical area visualization
- [Waffle Chart](https://datavizproject.com/data-type/percentage-grid/) — part-to-whole grid
- [Heatmap Designs (Dribbble)](https://dribbble.com/tags/heatmap) — UI inspiration gallery

### CSS Techniques (2025-2026)
- [View Transitions API (Chrome)](https://developer.chrome.com/docs/web-platform/view-transitions) — smooth page transitions
- [View Transitions 2025 Update](https://developer.chrome.com/blog/view-transitions-in-2025) — Firefox support, Interop 2025
- [2026 UI Trends (WriterDock)](https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026) — bento grids, glassmorphism, scroll-driven animations
- [2026 Web Design Trends](https://www.digitalupward.com/blog/2026-web-design-trends-glassmorphism-micro-animations-ai-magic/) — glassmorphism + micro-animations
- [Scrollytelling (Flourish)](https://flourish.studio/blog/no-code-scrollytelling/) — immersive data storytelling

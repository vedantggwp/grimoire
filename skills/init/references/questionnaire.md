# Grimoire Onboarding Questionnaire

> One-time setup. Answer all 7 questions. Your answers configure the entire workspace.

---

## Q1: Topic / Domain

What subject do you want to build a knowledge base about?

Be specific. "Machine learning" is too broad. "Reinforcement learning for robotics" is good. "RLHF techniques for language model alignment" is better.

**Examples:**
- "Design systems for React component libraries"
- "Kubernetes networking and service mesh patterns"
- "Claude Code workflows for frontend development"

**Your answer:**

```
topic: ___
```

---

## Q2: Scope

What boundaries should the knowledge base respect? What's explicitly OUT of scope?

Scope prevents the scout from drifting. Define what you want covered AND what you don't.

**Examples:**
- IN: "Production deployment patterns for Next.js on Vercel and Netlify"
- OUT: "General React tutorials, beginner JavaScript, non-Next.js frameworks"

**Your answer:**

```
in_scope: ___
out_of_scope: ___
```

---

## Q3: Audience + Technical Level

Who will use this knowledge base? What can they already do?

This shapes article depth, assumed vocabulary, and whether articles need prerequisite explanations.

**Levels:**
- **Beginner** — Needs definitions, step-by-step, minimal jargon
- **Intermediate** — Knows fundamentals, wants patterns and best practices
- **Advanced** — Wants edge cases, internals, trade-off analysis
- **Expert** — Wants primary sources, novel techniques, research-grade depth

**Examples:**
- "Senior engineers evaluating service mesh options — advanced level"
- "Product managers learning about LLM capabilities — intermediate level"

**Your answer:**

```
audience: ___
technical_level: ___
```

---

## Q4: Initial Sources

Provide any URLs, documentation links, GitHub repos, or documents you already know are valuable. These seed the scout's first run.

Leave blank if you want the scout to start from scratch.

**Examples:**
- `https://docs.anthropic.com/en/docs/claude-code`
- `https://github.com/someone/relevant-repo`
- A local file path: `~/Documents/research-notes.md`

**Your answer:**

```
sources:
  - ___
  - ___
  - ___
```

---

## Q5: Taxonomy Preference

How should the wiki organize its categories?

| Option | How It Works |
|--------|-------------|
| **Emergent** (default) | Categories emerge after 5-10 sources are ingested. The system proposes a taxonomy and you approve it. Best when you don't know the shape of the domain yet. |
| **Defined** | You specify categories upfront. The system uses them immediately. Best when you already have a mental model of the domain. |

If choosing **defined**, list your categories:

**Examples (defined):**
- `fundamentals`, `architecture`, `tooling`, `patterns`, `case-studies`
- `theory`, `implementation`, `evaluation`, `deployment`

**Your answer:**

```
taxonomy: emergent | defined
categories:  # only if defined
  - ___
  - ___
```

---

## Q6: Design Preference

Choose a palette direction for the frontend. You can change this later in `_config/design.md`.

| Palette | Vibe |
|---------|------|
| `midnight-teal` | Dark background, teal accents, editorial feel |
| `noir-cinematic` | High contrast black, warm highlights, dramatic |
| `cold-steel` | Cool grays, blue accents, technical/clinical |
| `warm-concrete` | Warm grays, amber accents, approachable |
| `electric-dusk` | Deep purple-blue, electric accents, energetic |
| `smoke-light` | Light background, soft grays, minimal |
| `obsidian-chalk` | Pure black and white, stark, typographic |
| `custom` | Define your own in `_config/design.md` |

**Your answer:**

```
palette: ___
```

---

## Q7: CLAUDE.md Integration

Should Grimoire add a snippet to your project's CLAUDE.md that points LLMs to the wiki?

- **yes** — Adds a 5-10 line rule block so Claude Code consults the wiki before guessing
- **no** — Wiki stays standalone, no CLAUDE.md modification

**Your answer:**

```
claude_md_integration: yes | no
target_claude_md: ___  # path to CLAUDE.md, only if yes
```

---

## Output Map

Your answers populate the workspace as follows:

| Answer | Populates |
|--------|-----------|
| Q1 topic | `SCHEMA.md` domain field, scout search queries, wiki identity |
| Q2 scope | `SCHEMA.md` scope field, scout boundary rules, overview framing |
| Q3 audience | Article depth calibration, vocabulary decisions, `SCHEMA.md` audience |
| Q4 sources | `scout-queue.md` — seed URLs loaded by scout as pre-approved candidates |
| Q5 taxonomy | `SCHEMA.md` taxonomy table (empty if emergent, populated if defined) |
| Q6 palette | `_config/design.md` palette field |
| Q7 CLAUDE.md | Target project's `CLAUDE.md` gets wiki reference snippet |

---

*Run once at wiki creation. Edit `_config/` and `SCHEMA.md` directly for later changes.*

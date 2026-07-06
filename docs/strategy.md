# Grimoire Growth Strategy — July 2026

> Owner-grade positioning thesis and distribution plan. Target: 2,000+ GitHub stars.
> Written 2026-07-05 from three inputs: repo audit, meta-wiki digest, fresh market research.
> Decisions here supersede docs/competitive.md where they conflict.

---

## 1. Situation

**Product is ahead of distribution by a mile.** v0.3.1 on main (193 tests), v0.4.0 verified and pending merge (338 tests, self-updating engine, Editorial Constellation frontend). Repo has 2 stars.

**The category exploded while we were building.** Karpathy's "LLM Wiki" gist (April 2026, 21M+ views on X) describes Grimoire's exact loop — sources → LLM compiles → persistent interlinked markdown wiki → query over time. Clones followed fast:

| Project | Stars (July 2026) | Has scout? | Has frontend? | Has MCP? | Self-updating? |
|---|---|---|---|---|---|
| nashsu/llm_wiki | ~13,700 (3 months) | no | desktop app | yes | no |
| SamurAIGPT/llm-wiki-agent | ~3,100 | no | no | no | no |
| lucasastorian/llmwiki | ~1,300 | no | no | yes | no |
| nvk/llm-wiki | ~800 | partial | no | no | no |
| Hjarni (hosted, paid) | n/a | no | yes | yes | no |
| **Grimoire** | 2 | **yes, confidence-scored** | **yes, study-oriented** | **yes, 7 tools** | **yes (v0.4.0)** |

**Read on this:** "agent-built wiki" is no longer a novel pitch — but the reference class is *proven to star fast* (1.3k–13.7k in 1–3 months), and search/attention for the pattern is high. We are late to the announcement, not to the product: nobody has shipped the complete pipeline, and nobody has a wiki that maintains itself.

## 2. Positioning Thesis

**Claim the pattern, then out-complete it.**

> **Grimoire is the complete, living implementation of the LLM-wiki pattern.** It scouts its own sources (confidence-scored), compiles an interconnected wiki you can audit, generates a study site you'd actually read, serves everything to your agents over MCP — and then keeps itself fresh with PR-gated updates on a schedule. Local-first, git-native, MIT.

Three differentiators no clone has (defend these; don't compete on what's commoditized):

1. **Scout** — automated multi-source research with transparent confidence scoring. Every clone assumes you hand it sources.
2. **Present** — the study frontend. Every clone stops at markdown files. Grimoire produces something you'd send to a friend.
3. **Update (v0.4.0)** — the Living Grimoire. Scheduled GitHub Actions runs delta-scout, opens a PR when the world changes. A knowledge base with a pulse. **This is the viral hook.**

Against **Hjarni** (hosted): they publicly concede git history, graph view, and filesystem access. We are the local-first answer to their own trade-off list.

Against **mem0-class memory**: memory tools accumulate chat exhaust; Grimoire curates sources. Human-auditable beats vector soup when the knowledge matters.

**One-line hooks** (for README hero / launch posts):

- "The knowledge base that researches itself."
- "Karpathy sketched the LLM wiki. This is the whole thing — scout, compile, study, serve, self-update."
- "Deep research that compounds instead of evaporating."

## 3. Launch Sequence

**Phase 0 — Ship the substrate (this week)**
- Merge v0.4.0 (verified: 338/338, 0 behind main, bundles clean). *Awaiting maintainer approval.*
- Post-merge QA: the three live-run unknowns from docs/self-updating.md (`/grimoire:update --dry-run`, plugin auto-load in headless CI, WebSearch under Actions runner).
- Fix trust debt: correct inflated claims in docs/competitive.md (8 palettes, not "97+"; 6 typography systems, not "57 pairings"). Update badges (version, test count).

**Phase 1 — Launch surface (days 2–5)**
- **Demo video first, GIF second.** Remotion's skill launch (6M+ views, 25k installs week one) and Superpowers (150k stars) both led with video. 60–90s: `/grimoire "topic"` → wiki builds → study site tour → *cut to a GitHub PR opened by the grimoire itself a week later.* The PR-authored-by-your-wiki shot is the shareable moment.
- **Hosted demo**: publish `examples/mcp` site via GitHub Pages at a stable URL; "View a live grimoire" button in README.
- **README hero**: rewrite first screen — hook line, video embed, comparison table from §2, install in two commands. Social preview image.
- **Zero-friction install path**: keep Athanor, but submit to `anthropics/claude-plugins-official` so install is one discoverable step.

**Phase 2 — Distribution burst (days 5–10)**
Ordered by leverage:
1. `anthropics/claude-plugins-official` submission (the Superpowers unlock).
2. `hesreallyhim/awesome-claude-code` PR (48k-star list).
3. `awesome-mcp-servers` + MCP registries (PulseMCP, Glama, mcp.so, Smithery) — the serve stage qualifies us.
4. **Show HN**: "Show HN: Grimoire – a self-updating knowledge base your AI tools can query" — lead with the living-wiki demo, be explicit about the Karpathy lineage (HN rewards honest prior-art framing).
5. **X launch thread** quoting the Karpathy gist directly — ride the existing conversation; reply to the gist with the living demo.
6. Reddit: r/ClaudeAI, r/LocalLLaMA (local-first angle lands here).

**Phase 3 — Compounding engine (ongoing)**
- **Public living grimoires as marketing.** Stand up 2–3 self-updating grimoires on real topics people track (e.g., "MCP ecosystem", "Claude Code plugins", "AI evals"). Each is a hosted site + queryable MCP endpoint + a repo whose PR history *demonstrates the product*. Every weekly self-update PR is organic proof.
- **Grimoire Gallery**: curate community wikis in README; each shared grimoire is an inbound link.
- Weekly release cadence; every release gets a changelog post.

## 4. Star Math (sanity check)

Reference class: MCP-paired Karpathy clones hit 1.3k–3.1k organically in 1–3 months without a frontend or scout. With the complete pipeline + official marketplace listing + video-led launch, 2,000 stars in 60–90 days is the *median* outcome, not the stretch. The stretch case (nashsu-scale, 10k+) requires the living-wiki demo to hit on X/HN.

## 5. Operating System (who does what, when)

**Roles:** Fable (this agent) = brain: strategy, review gates, QA verdicts, launch copy. **Opus/Claude Code** = product execution arm (features, frontend, launch surface). **GPT-5.5/Codex** = second-implementation and adversarial arm (QA sweeps, cross-checking compile output quality, demo-asset rendering).

**Cadence:**
| When | Routine | Output |
|---|---|---|
| Daily 09:00 | Triage: issues, PRs, mentions, star delta | Responses + prioritized queue |
| Daily 17:00 | Distribution rep: one artifact/day (post, gallery entry, directory submission, demo polish) | Shipped artifact |
| Weekly Mon | Release train: merge week's work, bump, changelog, announce | Tagged release |
| Weekly Fri | Retro + metrics: stars, installs, traffic, what moved | Adjusted plan |

**Gates that stay human (Ved):** merges to main, anything published under his name (HN/X posts), marketplace submissions.

## 6. Risks

1. **Clone velocity** — nashsu shipped a desktop app to 13.7k in 3 months. Mitigation: ship the living-wiki story before anyone else does; it's the only undemonstrated claim left in the category.
2. **Marketplace acceptance latency** — official listing took Superpowers 3 months. Mitigation: don't block launch on it; awesome-claude-code and HN don't gate.
3. **Single-maintainer trust** — big adopters check bus factor. Mitigation: CI badge, weekly releases, fast issue responses (the triage routine is the moat here).
4. **Claim inflation** — the "97 palettes" class of error is lethal on HN. Mitigation: audit every number in public docs before launch (Phase 0).

# Confidence Scoring

> 6 signals scored 1-5. Composite score determines ingest priority tier.
> Used by the scout stage to rank sources and by humans to approve/reject.

---

## Signal 1: Source Authority (Weight: High)

How authoritative is the publishing source on this topic?

| Score | Description |
|-------|-------------|
| **5** | Official documentation or specification from the project/org itself |
| **4** | Established publication with editorial standards (major tech blog, peer-reviewed venue) |
| **3** | Respected community resource (well-known blog, popular tutorial site) |
| **2** | Personal blog or independent publication with some track record |
| **1** | Unknown source, no reputation signals, user-generated content without moderation |

---

## Signal 2: Author Credibility (Weight: High)

Is the author a recognized practitioner or expert in this domain?

| Score | Description |
|-------|-------------|
| **5** | Core team member, original creator, or primary maintainer of the technology |
| **4** | Recognized expert with published work, conference talks, or significant contributions |
| **3** | Active practitioner with demonstrated experience (portfolio, open-source contributions) |
| **2** | Professional in adjacent field writing about this topic, or anonymous with quality content |
| **1** | No identifiable author, no credentials, or author with no relevant track record |

---

## Signal 3: Uniqueness (Weight: High)

Does this source add NEW information versus what we already have?

| Score | Description |
|-------|-------------|
| **5** | Entirely new angle, technique, or information not covered by any existing source |
| **4** | Significant new depth or perspective on a partially covered topic |
| **3** | Adds useful nuance or examples to an already-covered topic |
| **2** | Mostly redundant with existing sources but from a different author/angle |
| **1** | Near-duplicate of content already ingested, no new information |

---

## Signal 4: Depth (Weight: Medium)

How much actionable, detailed knowledge does this source provide?

| Score | Description |
|-------|-------------|
| **5** | Comprehensive deep-dive with code examples, architecture diagrams, and trade-off analysis |
| **4** | Detailed tutorial or guide with working examples and edge cases covered |
| **3** | Solid overview with some practical examples or concrete recommendations |
| **2** | High-level summary or listicle with surface-level coverage |
| **1** | Mention or link roundup with no substantive content of its own |

---

## Signal 5: Recency (Weight: Medium)

How current is the information? Weight this higher for fast-moving topics.

| Score | Description |
|-------|-------------|
| **5** | Published within the last 3 months, covers latest version/release |
| **4** | Published within the last 6 months, still current |
| **3** | Published within the last year, mostly still applicable |
| **2** | Published 1-2 years ago, some information may be outdated |
| **1** | Published 2+ years ago, likely outdated for fast-moving topics |

---

## Signal 6: Engagement (Weight: Medium)

Has the community validated this source? Social proof that others found value.

| Score | Description |
|-------|-------------|
| **5** | Viral reach (10k+ stars/likes/shares), widely cited by other sources |
| **4** | Strong engagement (1k-10k), frequently referenced in community discussions |
| **3** | Moderate engagement (100-1k), some community discussion |
| **2** | Low engagement (10-100), limited but present community response |
| **1** | No measurable engagement, no comments, shares, or citations |

---

## Composite Scoring

### Calculation

Sum all 6 signals (range: 6-30). High-weight signals are not multiplied — they guide human judgment when scores are close, not the arithmetic.

### Priority Tiers

| Tier | Score Range | Action | Description |
|------|-------------|--------|-------------|
| **P0** | 18-30 | Must ingest | High authority, unique, deep. These are the sources that define the knowledge base. |
| **P1** | 12-17 | Should ingest | Adds perspective or depth. Worth including if capacity allows. |
| **P2** | 6-11 | Nice to have | Supplementary or redundant. Ingest only if the topic is thin on other sources. |

### Tie-Breaking Rules

When sources share the same composite score:

1. Higher **Uniqueness** wins — avoid redundancy
2. Higher **Authority** wins — prefer primary sources
3. Higher **Depth** wins — prefer actionable content
4. Higher **Recency** wins — prefer current information

---

*This scoring system is used by the `scout` skill. The scout presents scores transparently so humans can override with judgment.*

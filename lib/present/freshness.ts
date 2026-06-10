/**
 * present — Freshness report loader
 *
 * Reads wiki/.compile/freshness.json (emitted by compile v0.4.0+) into a
 * slug-indexed lookup for badges and the gaps freshness lens. Tolerant by
 * design: workspaces compiled before v0.4.0 have no report, and a corrupt
 * one must never break site generation — both degrade to null.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const FreshnessArticleSchema = z.object({
  slug: z.string(),
  tier: z.enum(['fresh', 'aging', 'stale', 'evergreen', 'unknown']),
  effectiveDate: z.string().nullable(),
  ageDays: z.number().nullable(),
  checked: z.string().nullable().optional(),
  updated: z.string().nullable().optional(),
});

const FreshnessFileSchema = z.object({
  generatedAt: z.string(),
  policy: z.object({ freshDays: z.number(), agingDays: z.number() }),
  articles: z.array(FreshnessArticleSchema),
});

export type FreshnessTier = 'fresh' | 'aging' | 'stale' | 'evergreen' | 'unknown';

export interface ArticleFreshnessInfo {
  readonly tier: FreshnessTier;
  readonly effectiveDate: string | null;
  readonly ageDays: number | null;
}

export interface SiteFreshness {
  readonly generatedAt: string;
  readonly policy: { readonly freshDays: number; readonly agingDays: number };
  readonly bySlug: Readonly<Record<string, ArticleFreshnessInfo>>;
}

export function loadFreshness(compileDir: string): SiteFreshness | null {
  let raw: string;
  try {
    raw = readFileSync(join(compileDir, 'freshness.json'), 'utf-8');
  } catch {
    return null;
  }

  const parsed = FreshnessFileSchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) return null;

  const bySlug: Record<string, ArticleFreshnessInfo> = {};
  for (const article of parsed.data.articles) {
    bySlug[article.slug] = {
      tier: article.tier,
      effectiveDate: article.effectiveDate,
      ageDays: article.ageDays,
    };
  }

  return {
    generatedAt: parsed.data.generatedAt,
    policy: parsed.data.policy,
    bySlug,
  };
}

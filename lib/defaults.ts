import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface SchemaDefaults {
  readonly topic: string;
  readonly scope: { readonly in: string; readonly out: string };
  readonly audience: string;
  readonly level: string;
  readonly taxonomy: 'emergent';
  readonly palette: string;
  readonly typography: string;
  readonly claudeMdPath: string | null;
}

const ADVANCED_KEYWORDS = ['engineer', 'developer', 'architect', 'senior', 'advanced'];
const BEGINNER_KEYWORDS = ['beginner', 'intro', '101', 'getting started'];

function classifyAudience(prompt: string): { readonly audience: string; readonly level: string } {
  const lower = prompt.toLowerCase();

  if (BEGINNER_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { audience: 'learners', level: 'beginner' };
  }

  if (ADVANCED_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { audience: 'engineers/developers', level: 'advanced' };
  }

  return { audience: 'practitioners', level: 'intermediate' };
}

function cleanTopic(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function inferSchemaFromPrompt(prompt: string): SchemaDefaults {
  const topic = cleanTopic(prompt);
  const { audience, level } = classifyAudience(prompt);

  return {
    topic,
    scope: {
      in: `All aspects of ${topic}`,
      out: `Topics unrelated to ${topic}`,
    },
    audience,
    level,
    taxonomy: 'emergent',
    palette: 'linear-editorial',
    typography: 'linear-editorial',
    claudeMdPath: null,
  };
}

export function detectClaudeMd(cwd: string): string | null {
  const absPath = resolve(cwd);
  const candidate = join(absPath, 'CLAUDE.md');
  return existsSync(candidate) ? candidate : null;
}

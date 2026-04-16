import { describe, expect, it } from 'vitest';

import { parseSchema } from '../lib/present/data.js';

describe('parseSchema', () => {
  it('throws when topic field is missing', () => {
    const content = `# SCHEMA.md

## Domain

audience: "advanced readers"
scope:
  in: "frontend systems"
  out: "backend systems"
`;

    expect(() => parseSchema(content)).toThrow(/missing required field: topic/i);
  });

  it('captures multi-line topic without truncation from a fenced domain block', () => {
    const content = `# SCHEMA.md

## Domain

\`\`\`
topic: Grimoire (the plugin) — how it works internally, why it exists given
       Karpathy's LLM-wiki pattern already describes the shape of the
       solution
scope:
  in: "LLM wiki products"
  out: "Generic plugin tutorials"
audience: advanced readers evaluating whether to adopt
          or maintain the project
\`\`\`
`;

    const schema = parseSchema(content);

    expect(schema.topic).toBe(
      "Grimoire (the plugin) — how it works internally, why it exists given\nKarpathy's LLM-wiki pattern already describes the shape of the\nsolution",
    );
    expect(schema.audience).toBe(
      'advanced readers evaluating whether to adopt\nor maintain the project',
    );
  });

  it('parses legacy flat scope blocks without dropping the in/out text', () => {
    const content = `# SCHEMA.md

## Domain

\`\`\`
topic: "Legacy workspace"
scope: IN —
       • Current pipeline
       • Frontend modes

       OUT —
       • Unrelated projects
audience: "advanced"
\`\`\`
`;

    const schema = parseSchema(content);

    expect(schema.scope.in).toContain('Current pipeline');
    expect(schema.scope.out).toContain('Unrelated projects');
  });
});

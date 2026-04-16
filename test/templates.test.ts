import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTemplate, applyTemplate, type GrimoireTemplate, type TemplateDefaults } from '../lib/templates.js';

const MCP_EXAMPLE = join(__dirname, '../examples/mcp');

describe('loadTemplate', () => {
  it('extracts palette and typography from examples/mcp', () => {
    const tpl = loadTemplate(MCP_EXAMPLE);
    expect(tpl).not.toBeNull();
    expect(tpl!.palette).toBe('linear-editorial');
    expect(tpl!.typography).toBe('linear-editorial');
  });

  it('extracts density and motion from examples/mcp', () => {
    const tpl = loadTemplate(MCP_EXAMPLE)!;
    expect(tpl.density).toBe('comfortable');
    expect(tpl.motion).toBe('subtle');
  });

  it('extracts audience from SCHEMA.md domain block', () => {
    const tpl = loadTemplate(MCP_EXAMPLE)!;
    expect(tpl.audience).toBe('Senior engineers building MCP servers or clients');
  });

  it('infers level from audience text', () => {
    const tpl = loadTemplate(MCP_EXAMPLE)!;
    expect(tpl.level).toBe('advanced');
  });

  it('extracts taxonomy style from SCHEMA.md', () => {
    const tpl = loadTemplate(MCP_EXAMPLE)!;
    expect(tpl.taxonomyStyle).toBe('emergent');
  });

  it('returns null for nonexistent path', () => {
    expect(loadTemplate('/tmp/grimoire-nonexistent-path-xyz')).toBeNull();
  });

  it('returns null when _config/design.md is missing', () => {
    const tmp = join(tmpdir(), `grimoire-test-no-design-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    writeFileSync(join(tmp, 'SCHEMA.md'), '# SCHEMA.md\n## Domain\ntopic: "test"\n');
    try {
      expect(loadTemplate(tmp)).toBeNull();
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });

  it('returns null when SCHEMA.md is missing', () => {
    const tmp = join(tmpdir(), `grimoire-test-no-schema-${Date.now()}`);
    mkdirSync(join(tmp, '_config'), { recursive: true });
    writeFileSync(join(tmp, '_config', 'design.md'), '---\npalette: cold-steel\n---\n');
    try {
      expect(loadTemplate(tmp)).toBeNull();
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});

describe('applyTemplate', () => {
  const template: GrimoireTemplate = {
    palette: 'noir-cinematic',
    typography: 'brutalist',
    density: 'compact',
    motion: 'expressive',
    audience: 'designers',
    level: 'intermediate',
    taxonomyStyle: 'defined',
  };

  const defaults: TemplateDefaults = {
    palette: 'midnight-teal',
    typography: 'editorial',
    audience: 'engineers',
    level: 'advanced',
  };

  it('template values override defaults', () => {
    const result = applyTemplate(template, defaults);
    expect(result.palette).toBe('noir-cinematic');
    expect(result.typography).toBe('brutalist');
    expect(result.audience).toBe('designers');
    expect(result.level).toBe('intermediate');
  });

  it('carries density, motion, and taxonomyStyle from template', () => {
    const result = applyTemplate(template, defaults);
    expect(result.density).toBe('compact');
    expect(result.motion).toBe('expressive');
    expect(result.taxonomyStyle).toBe('defined');
  });

  it('falls back to defaults when template fields are empty', () => {
    const emptyTemplate: GrimoireTemplate = {
      palette: '',
      typography: '',
      density: 'comfortable',
      motion: 'subtle',
      audience: '',
      level: '',
      taxonomyStyle: 'emergent',
    };
    const result = applyTemplate(emptyTemplate, defaults);
    expect(result.palette).toBe('midnight-teal');
    expect(result.typography).toBe('editorial');
    expect(result.audience).toBe('engineers');
    expect(result.level).toBe('advanced');
  });

  it('does not mutate inputs', () => {
    const templateCopy = { ...template };
    const defaultsCopy = { ...defaults };
    applyTemplate(template, defaults);
    expect(template).toStrictEqual(templateCopy);
    expect(defaults).toStrictEqual(defaultsCopy);
  });
});

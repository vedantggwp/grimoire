import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseDesignConfig, resolveTypography } from '../lib/present/config.js';
import type { DesignConfig } from '../lib/present/types.js';

function withConfig<T>(frontmatter: string, fn: (config: DesignConfig) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'grimoire-design-'));
  try {
    const path = join(dir, 'design.md');
    writeFileSync(path, `---\n${frontmatter}\n---\n`);
    return fn(parseDesignConfig(path));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('design config — motion/density validation', () => {
  it('accepts the documented values', () => {
    withConfig('motion: expressive\ndensity: compact', config => {
      expect(config.motion).toBe('expressive');
      expect(config.density).toBe('compact');
    });
  });

  it('falls back to defaults with a warning on unknown values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withConfig('motion: bouncy\ndensity: cozy', config => {
      expect(config.motion).toBe('subtle');
      expect(config.density).toBe('comfortable');
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown motion "bouncy"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown density "cozy"'));
    warn.mockRestore();
  });
});

describe('design config — individual font overrides (issue #3)', () => {
  it('overrides heading, body, and mono fonts independently', () => {
    withConfig('font-heading: Lora\nfont-body: Karla\nfont-mono: Fira Code', config => {
      const typo = resolveTypography(config);
      expect(typo.headings).toBe('Lora');
      expect(typo.body).toBe('Karla');
      expect(typo.mono).toBe('Fira Code');
    });
  });

  it('keeps font-display as a back-compat alias for font-heading', () => {
    withConfig('font-display: Lora', config => {
      expect(resolveTypography(config).headings).toBe('Lora');
    });
  });

  it('font-heading wins over font-display when both are present', () => {
    withConfig('font-display: Lora\nfont-heading: Spectral', config => {
      expect(resolveTypography(config).headings).toBe('Spectral');
    });
  });

  it('body override leaves the preset heading/mono untouched', () => {
    withConfig('font-body: Karla', config => {
      const typo = resolveTypography(config);
      expect(typo.body).toBe('Karla');
      expect(typo.headings).toBe('Source Serif 4');
      expect(typo.mono).toBe('JetBrains Mono');
    });
  });
});

describe('design config — mode disabling (issue #9)', () => {
  it('defaults to all six modes in canonical order', () => {
    withConfig('palette: midnight-teal', config => {
      expect(config.modes).toEqual(['read', 'graph', 'search', 'feed', 'gaps', 'quiz']);
    });
  });

  it('enables only the listed modes, normalized to canonical order', () => {
    withConfig('modes: quiz, read, graph', config => {
      expect(config.modes).toEqual(['read', 'graph', 'quiz']);
    });
  });

  it('forces read on with a warning when omitted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withConfig('modes: graph, search', config => {
      expect(config.modes).toEqual(['read', 'graph', 'search']);
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('read mode cannot be disabled'));
    warn.mockRestore();
  });

  it('warns about unknown mode names and drops them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withConfig('modes: read, flashcards', config => {
      expect(config.modes).toEqual(['read']);
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('flashcards'));
    warn.mockRestore();
  });
});

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface GrimoireTemplate {
  readonly palette: string;
  readonly typography: string;
  readonly density: string;
  readonly motion: string;
  readonly audience: string;
  readonly level: string;
  readonly taxonomyStyle: 'emergent' | 'defined';
}

export interface TemplateDefaults {
  readonly palette: string;
  readonly typography: string;
  readonly audience: string;
  readonly level: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.+)$/i);
    if (kv) out[kv[1].toLowerCase()] = kv[2].trim();
  }
  return out;
}

function parseDomainField(content: string, field: string): string {
  const i = content.search(/^##\s+Domain\s*$/m);
  if (i === -1) return '';
  const section = content.slice(i);
  const j = section.slice(1).search(/^##\s/m);
  const block = j === -1 ? section : section.slice(0, j + 1);
  const m = block.match(new RegExp(`^\\s*${field}:\\s*"?([^"\\n]+)"?`, 'mi'));
  return m ? m[1].trim() : '';
}

function inferLevel(audience: string): string {
  const l = audience.toLowerCase();
  if (['beginner', 'intro', '101', 'getting started'].some((k) => l.includes(k))) return 'beginner';
  if (['senior', 'advanced', 'architect', 'expert'].some((k) => l.includes(k))) return 'advanced';
  return 'intermediate';
}

export function loadTemplate(grimoirePath: string): GrimoireTemplate | null {
  const designPath = join(grimoirePath, '_config', 'design.md');
  const schemaPath = join(grimoirePath, 'SCHEMA.md');
  if (!existsSync(designPath) || !existsSync(schemaPath)) return null;
  const design = parseFrontmatter(readFileSync(designPath, 'utf-8'));
  const schema = readFileSync(schemaPath, 'utf-8');
  const audience = parseDomainField(schema, 'audience');
  return {
    palette: design['palette'] ?? 'midnight-teal',
    typography: design['typography'] ?? 'editorial',
    density: design['density'] ?? 'comfortable',
    motion: design['motion'] ?? 'subtle',
    audience,
    level: inferLevel(audience),
    taxonomyStyle: parseDomainField(schema, 'taxonomy') === 'defined' ? 'defined' : 'emergent',
  };
}

export function applyTemplate(
  template: GrimoireTemplate,
  defaults: TemplateDefaults,
): TemplateDefaults & Pick<GrimoireTemplate, 'density' | 'motion' | 'taxonomyStyle'> {
  return {
    palette: template.palette || defaults.palette,
    typography: template.typography || defaults.typography,
    audience: template.audience || defaults.audience,
    level: template.level || defaults.level,
    density: template.density,
    motion: template.motion,
    taxonomyStyle: template.taxonomyStyle,
  };
}

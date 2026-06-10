/**
 * present — Shared HTML escape helper
 *
 * Single source of truth for HTML escaping across all generators.
 */

export function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

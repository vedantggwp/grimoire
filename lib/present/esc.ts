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

/**
 * Serialize a value for embedding inside an inline <script> element.
 * JSON.stringify does NOT escape "<", so untrusted strings (frontmatter
 * titles/summaries/tags arrive from scouted web sources) could contain
 * "</script>" and break out of the script context — stored XSS. Escaping
 * "<" to \u003c closes that hole; U+2028/2029 keep old parsers happy.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

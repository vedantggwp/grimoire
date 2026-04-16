/**
 * shortTopic — extract a concise display name from the verbose SCHEMA.md
 * topic field.
 *
 * SCHEMA topics are free-form — often an essay explaining what the wiki
 * covers. That full string is useful for ingest/scouting but leaks into
 * display surfaces (hub title, page titles, MCP server routing metadata)
 * where only a short handle is wanted.
 *
 * Rules:
 *   1. If the topic contains "X — Y" / "X – Y" / "X - Y", return "X".
 *   2. Otherwise return the first line, truncated to ~60 chars with "…".
 *
 * Pure function — no I/O, safe to share between the present and serve
 * layers.
 */
export function shortTopic(topic: string): string {
  const delimiters = [' — ', ' – ', ' - '];
  for (const d of delimiters) {
    const idx = topic.indexOf(d);
    if (idx > 0) return topic.slice(0, idx).trim();
  }
  const firstLine = topic.split('\n')[0].trim();
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '…' : firstLine;
}

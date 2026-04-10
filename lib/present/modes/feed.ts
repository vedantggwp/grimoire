/**
 * present — Feed mode
 *
 * Vertical timeline of changelog entries.
 * Most recent at top. Mostly static HTML.
 */

import type { SiteData, DesignConfig } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTimelineEntry(entry: {
  readonly date: string;
  readonly action: string;
  readonly details: readonly string[];
}): string {
  const detailItems = entry.details.map(d => {
    // Detect source URLs
    const urlMatch = d.match(/^Source:\s*(https?:\/\/\S+)/);
    if (urlMatch) {
      return `<li>Source: <a href="${esc(urlMatch[1])}" target="_blank" rel="noopener">${esc(urlMatch[1])}</a></li>`;
    }
    return `<li>${esc(d)}</li>`;
  }).join('\n          ');

  return `<div class="timeline-entry">
    <div style="display:flex;gap:var(--space-3);align-items:baseline;margin-bottom:var(--space-2)">
      <time style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-muted);white-space:nowrap">${esc(entry.date)}</time>
      <h3 style="font-size:var(--text-base);font-weight:600">${esc(entry.action)}</h3>
    </div>
    <ul style="font-size:var(--text-sm);color:var(--color-muted);padding-left:var(--space-4);margin:0">
      ${detailItems}
    </ul>
  </div>`;
}

export function generateFeedMode(data: SiteData, config: DesignConfig): string {
  const sorted = [...data.logEntries].reverse();

  const entries = sorted.length > 0
    ? sorted.map(buildTimelineEntry).join('\n')
    : '<p style="color:var(--color-muted)">No changelog entries yet.</p>';

  const body = `
<div style="padding:var(--space-6) 0">
  <div class="content-column">
    <h1 style="margin-bottom:var(--space-6)">Feed</h1>
    <div class="timeline">
      ${entries}
    </div>
  </div>
</div>`;

  return pageShell(`${data.schema.topic} — Feed`, 'feed', body, config, data);
}

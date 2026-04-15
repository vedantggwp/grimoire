/**
 * present — Feed mode
 *
 * Vertical timeline of changelog entries.
 * Option F: Linear Editorial — left-dated timeline with border-left spine.
 * Most recent at top.
 */

import type { SiteData, DesignConfig, LogEntry } from '../types.js';
import { pageShell } from '../html.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return esc(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Infer tags from the full entry (action + details). A single log entry can
 * touch multiple pipeline phases (a "rebuilt" entry often mixes scout + ingest
 * + compile), so we return every matching tag rather than guessing one.
 */
const TAG_RULES: ReadonlyArray<{
  readonly label: string;
  readonly cls: string;
  readonly patterns: readonly RegExp[];
}> = [
  { label: 'scouted', cls: 'scouted', patterns: [/\bscout/i, /\bsearch(ed)?\b/i, /\bsources\b/i] },
  { label: 'ingested', cls: 'ingested', patterns: [/\bingest/i, /\bfetch/i, /\braw\s+source/i] },
  { label: 'compiled', cls: 'compiled', patterns: [/\bcompile/i, /\brebuild/i, /\bbuilt\b/i, /\bbootstrap/i] },
  { label: 'edited', cls: 'edited', patterns: [/\bedit/i, /\bupdate/i, /\bfix/i, /\brewrite/i] },
];

function inferTags(entry: LogEntry): ReadonlyArray<{ readonly label: string; readonly cls: string }> {
  const haystack = `${entry.action}\n${entry.details.join('\n')}`;
  const matched = TAG_RULES.filter(rule =>
    rule.patterns.some(p => p.test(haystack)),
  );
  if (matched.length === 0) {
    return [{ label: 'compiled', cls: 'compiled' }];
  }
  return matched.map(m => ({ label: m.label, cls: m.cls }));
}

function buildTimelineEntry(entry: LogEntry): string {
  const tags = inferTags(entry);
  const tagRow = `<div class="feed-tags">${tags
    .map(t => `<span class="feed-tag ${esc(t.cls)}">${esc(t.label)}</span>`)
    .join('')}</div>`;

  const detailLines = entry.details.map(d => {
    const urlMatch = d.match(/^Source:\s*(https?:\/\/\S+)/);
    if (urlMatch) {
      return `Source: <a href="${esc(urlMatch[1])}" target="_blank" rel="noopener">${esc(urlMatch[1])}</a>`;
    }
    return esc(d).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }).join('<br>');

  return `<div class="feed-entry">
      <div class="feed-date">${formatDate(entry.date)}</div>
      ${tagRow}
      <h4>${esc(entry.action)}</h4>
      <p>${detailLines}</p>
    </div>`;
}

export function generateFeedMode(data: SiteData, config: DesignConfig): string {
  const sorted = [...data.logEntries].sort((a, b) => {
    const da = new Date(a.date).getTime() || 0;
    const db = new Date(b.date).getTime() || 0;
    return db - da;
  });

  const entries = sorted.length > 0
    ? sorted.map(buildTimelineEntry).join('\n')
    : '<p class="feed-empty">No changelog entries yet.</p>';

  const body = `
<div class="feed-wrap">
  <h2>Activity Feed</h2>
  <div class="feed-timeline">
    ${entries}
  </div>
</div>`;

  return pageShell(`${data.schema.topic} — Feed`, 'feed', body, config, data);
}

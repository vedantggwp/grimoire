/**
 * present — Feed mode
 *
 * Vertical timeline of changelog entries.
 * Option F: Linear Editorial — left-dated timeline with border-left spine.
 * Most recent at top.
 */

import type { SiteData, DesignConfig, LogEntry } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';
import { esc } from '../esc.js';

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

// Update runs log structured count lines (the contract pinned in
// skills/update/SKILL.md Step 9). Entries that match render as digest
// cards with a stat row; anything else degrades to a normal entry.
const DIGEST_ACTION = /update (run|digest)/i;
const DIGEST_COUNTS: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { key: 'sources-added', label: 'sources' },
  { key: 'articles-changed', label: 'articles' },
  { key: 'connections-made', label: 'connections' },
];

interface DigestStats {
  readonly chips: readonly { readonly value: number; readonly label: string }[];
  readonly rest: readonly string[];
}

export function parseDigestEntry(entry: LogEntry): DigestStats | null {
  if (!DIGEST_ACTION.test(entry.action)) return null;

  const chips: { value: number; label: string }[] = [];
  const rest: string[] = [];

  for (const detail of entry.details) {
    const match = detail.match(/^([a-z-]+):\s*(\d+)$/i);
    const count = match ? DIGEST_COUNTS.find(c => c.key === match[1].toLowerCase()) : undefined;
    if (match && count) {
      chips.push({ value: Number(match[2]), label: count.label });
    } else {
      rest.push(detail);
    }
  }

  if (chips.length === 0) return null;
  return { chips, rest };
}

function buildDetailLines(details: readonly string[]): string {
  return details.map(d => {
    const urlMatch = d.match(/^Source:\s*(https?:\/\/\S+)/);
    if (urlMatch) {
      return `Source: <a href="${esc(urlMatch[1])}" target="_blank" rel="noopener">${esc(urlMatch[1])}</a>`;
    }
    return esc(d).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }).join('<br>');
}

function buildTimelineEntry(entry: LogEntry): string {
  const digest = parseDigestEntry(entry);

  if (digest) {
    const chips = digest.chips
      .map(c => `<span class="feed-digest__chip"><strong>+${c.value}</strong> ${esc(c.label)}</span>`)
      .join('');
    const rest = digest.rest.length > 0 ? `<p>${buildDetailLines(digest.rest)}</p>` : '';
    return `<div class="feed-entry feed-entry--digest">
      <div class="feed-date">${formatDate(entry.date)}</div>
      <div class="feed-tags"><span class="feed-tag updated">update run</span></div>
      <h4>${esc(entry.action)}</h4>
      <div class="feed-digest__chips">${chips}</div>
      ${rest}
    </div>`;
  }

  const tags = inferTags(entry);
  const tagRow = `<div class="feed-tags">${tags
    .map(t => `<span class="feed-tag ${esc(t.cls)}">${esc(t.label)}</span>`)
    .join('')}</div>`;

  return `<div class="feed-entry">
      <div class="feed-date">${formatDate(entry.date)}</div>
      ${tagRow}
      <h4>${esc(entry.action)}</h4>
      <p>${buildDetailLines(entry.details)}</p>
    </div>`;
}

export function generateFeedMode(data: SiteData, config: DesignConfig): string {
  const sorted = [...data.logEntries].sort((a, b) => {
    const da = new Date(a.date).getTime() || 0;
    const db = new Date(b.date).getTime() || 0;
    return db - da;
  });

  const hasEntries = sorted.length > 0;
  const entries = hasEntries
    ? sorted.map(buildTimelineEntry).join('\n')
    : '';

  const emptyState = !hasEntries
    ? `<div class="feed-empty">
        <p>No activity yet.</p>
        <p style="font-size:13px;color:var(--text-tertiary);margin-top:8px">
          Entries appear here as articles are scouted, ingested, and compiled.
        </p>
      </div>`
    : '';

  const body = hasEntries
    ? `<div class="feed-wrap">
  <h2>Activity Feed</h2>
  <div class="feed-timeline">
    ${entries}
  </div>
</div>`
    : `<div class="feed-wrap">
  <h2>Activity Feed</h2>
  ${emptyState}
</div>`;

  return pageShell(`${shortTopic(data.schema.topic)} — Feed`, 'feed', body, config, data);
}

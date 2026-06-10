/**
 * present/css — Feed mode: changelog timeline
 */

export const FEED_CSS = `/* === Feed — Timeline === */
.feed-wrap {
  max-width: 820px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.feed-wrap h2 {
  font-family: var(--font-heading);
  font-size: clamp(22px, 1vw + 18px, 28px);
  margin-bottom: clamp(20px, 3vw, 36px);
}
.feed-timeline {
  position: relative;
  max-width: 680px;
  margin-left: clamp(0px, 10vw, 120px);
  padding-left: 0;
}
.feed-timeline::before {
  content: '';
  position: absolute;
  left: 0; top: 10px; bottom: 10px;
  width: 2px;
  background: var(--border-hover);
}
.feed-entry {
  position: relative;
  padding: 18px 0 18px 32px;
}
.feed-entry + .feed-entry { border-top: 1px dashed var(--border); }
.feed-entry::before {
  content: '';
  width: 11px; height: 11px;
  background: var(--color-bg);
  border: 2px solid var(--text-tertiary);
  border-radius: 50%;
  position: absolute;
  left: -5.5px; top: 24px;
  z-index: 1;
  transition: background 200ms, border-color 200ms;
}
.feed-entry:first-child::before {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--accent-muted);
}
.feed-date {
  position: absolute;
  left: -130px; top: 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  width: 108px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.feed-entry h4 {
  font-family: var(--font-heading);
  font-size: clamp(16px, 0.4vw + 14px, 18px);
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text);
}
.feed-entry p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  max-width: 62ch;
}
.feed-entry p + p { margin-top: 8px; }
.feed-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.feed-tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
}
.feed-tag.scouted { background: rgba(59,130,246,0.12); color: #3B82F6; }
.feed-tag.compiled { background: rgba(16,163,74,0.12); color: var(--color-success); }
.feed-tag.ingested { background: rgba(168,85,247,0.12); color: #A855F7; }
.feed-tag.edited { background: rgba(245,158,11,0.12); color: #F59E0B; }
.theme-dark .feed-tag.scouted { background: rgba(96,165,250,0.14); color: #93C5FD; }
.theme-dark .feed-tag.compiled { background: rgba(74,222,128,0.14); color: #6EE7B7; }
.theme-dark .feed-tag.ingested { background: rgba(192,132,252,0.14); color: #C4B5FD; }
.theme-dark .feed-tag.edited { background: rgba(251,191,36,0.14); color: #FCD34D; }

/* Legacy timeline compat */
.mode-feed .timeline-entry {
  padding: 20px 0 20px 28px;
  border-left: 2px solid var(--border);
  margin-left: 16px;
  position: relative;
}
.mode-feed .timeline-entry::before {
  content: ''; position: absolute;
  left: -6px; top: 24px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
}`;

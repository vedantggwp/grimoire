/**
 * present/css — Hub page: hero, stats, bento grid
 */

export const HUB_CSS = `/* === Hub — Bento grid === */
.hub-hero {
  text-align: center;
  padding: clamp(28px, 5vw, 60px) 0 clamp(18px, 2.5vw, 32px);
}
.hub-hero .hub-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: clamp(32px, 3vw + 20px, 52px);
  line-height: 1.1;
  color: var(--color-text);
  letter-spacing: -1px;
  margin: 0 0 clamp(10px, 1.5vw, 18px);
}
.hub-hero .hub-lead {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: clamp(15px, 0.4vw + 13px, 17px);
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 52ch;
  margin: 0 auto clamp(20px, 3vw, 34px);
  text-wrap: balance;
}
.hub-hero p {
  color: var(--text-secondary);
  max-width: 58ch; margin: 0 auto clamp(20px, 3vw, 32px);
  font-size: clamp(14px, 0.4vw + 12px, 16px); line-height: 1.65;
  text-wrap: pretty;
}
.hub-stats {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: clamp(14px, 3vw, 40px);
  margin-bottom: clamp(28px, 5vw, 52px);
  padding: clamp(14px, 2vw, 22px) 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.hub-stat { font-size: 12.5px; color: var(--text-secondary); text-align: center; }
.hub-stat strong {
  font-family: var(--font-heading);
  font-size: clamp(20px, 1vw + 16px, 26px); font-weight: 600;
  color: var(--color-text);
  display: block; margin-bottom: 2px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: min-content;
  align-items: start;
  gap: var(--gap-grid);
}
.bento-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--pad-card);
  cursor: pointer;
  transition: transform 200ms var(--ease), box-shadow 200ms var(--ease);
  box-shadow: var(--shadow-card);
  position: relative; overflow: hidden;
  text-decoration: none; color: inherit;
  display: flex; flex-direction: column; gap: 6px;
  align-self: start;
}
.bento-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}
.bento-card.featured {
  grid-column: span 2;
  grid-row: span 2;
  padding: var(--pad-card-lg);
}
.bento-preview {
  list-style: none; margin: 18px 0 0; padding: 0;
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.bento-preview li {
  display: flex; align-items: baseline; gap: 12px;
  font-family: var(--font-heading);
  font-size: clamp(14px, 0.3vw + 13px, 16px);
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.35;
}
.bento-preview__num {
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 500;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 16px;
}
.bento-card.featured .when {
  margin-top: auto;
}
.bento-card .icon {
  font-size: clamp(24px, 1.4vw + 18px, 30px);
  margin-bottom: 14px; display: block;
}
.bento-card h3 { font-size: clamp(16px, 0.4vw + 14px, 18px); margin-bottom: 4px; }
.bento-card p {
  font-size: clamp(13px, 0.25vw + 12px, 14px);
  color: var(--text-secondary); line-height: 1.55;
}
.bento-card .when {
  font-size: 12px; color: var(--text-tertiary);
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid var(--border);
}
.bento-card.featured .icon { font-size: clamp(30px, 2vw + 22px, 38px); }
.bento-card.featured h3 { font-size: clamp(19px, 0.8vw + 16px, 23px); }
.bento-card.featured .badge {
  display: inline-block;
  background: var(--accent-muted); color: var(--color-accent);
  font-size: 11px; font-weight: 600;
  font-family: var(--font-mono);
  padding: 3px 8px; border-radius: 4px;
  margin-bottom: 14px;
  letter-spacing: 0.3px;
}
.bento-card.featured p { font-size: clamp(14px, 0.3vw + 13px, 15px); }

/* Hub card compat */
.hub-card { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px; }
.hub-card__icon { font-size: 28px; margin-bottom: 16px; }
.hub-card__when { font-size: 12px; color: var(--text-tertiary); margin-top: auto; }
.hub-card--recommended { border-color: var(--color-accent); border-width: 2px; }

.feed-empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 40px 20px;
  font-style: italic;
}`;

/**
 * present/css — Search mode: command palette, default state, results
 */

export const SEARCH_CSS = `/* === Search — Command palette + default state === */
.search-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.search-hero {
  max-width: 760px;
  margin: 0 auto clamp(24px, 4vw, 40px);
}
.search-hint-top {
  text-align: center;
  margin-bottom: 14px;
  color: var(--text-tertiary); font-size: 12.5px;
}
.search-hint-top kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
}
.search-empty {
  padding: 28px 16px;
  text-align: center; color: var(--text-tertiary);
  font-size: 14px;
}
.search-empty strong { color: var(--color-text); }
.search-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
}
.search-examples__label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-tertiary);
  margin-right: 4px;
}
.search-example {
  font-family: var(--font-body);
  font-size: 12.5px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 150ms var(--ease), color 150ms var(--ease), background 150ms var(--ease);
  white-space: nowrap;
}
.search-example:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.search-default {
  display: flex;
  flex-direction: column;
  gap: clamp(28px, 4vw, 48px);
}
.search-section__title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-tertiary);
  margin-bottom: 14px;
}
.search-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.search-tag-pill {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.search-tag-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.search-tag-pill.active {
  background: var(--accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.search-tag-pill__count {
  font-size: 10px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.search-article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(12px, 1.5vw, 18px);
}
.search-article-card {
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  cursor: pointer;
  transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-article-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-card-hover);
}
.search-article-card h3 {
  font-family: var(--font-heading);
  font-size: clamp(15px, 0.3vw + 14px, 17px);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
}
.search-article-card p {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.search-article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
  padding-top: 8px;
}
.search-article-card__tag {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-tertiary);
}
.search-result__content {
  margin-top: 16px; padding-top: 16px;
  border-top: 1px solid var(--border);
}

.search-overlay {
  background: var(--color-bg);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  max-width: 640px; margin: 0 auto;
  overflow: hidden;
  box-shadow: var(--shadow-overlay);
}
.search-input-wrap {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 12px;
}
.search-input-wrap .search-icon { color: var(--text-tertiary); font-size: 18px; }
.search-input-wrap input {
  flex: 1; background: none; border: none;
  color: var(--color-text); font-size: 16px;
  font-family: var(--font-body); outline: none;
}
.search-input-wrap input::placeholder { color: var(--text-tertiary); }
.search-input-wrap kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
  color: var(--text-tertiary);
}
.search-results { padding: 8px; }
.search-group { padding: 8px 12px; }
.search-group-title {
  font-family: var(--font-heading);
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-tertiary); margin-bottom: 8px;
}
.search-result {
  padding: 10px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: background 100ms;
}
.search-result:hover { background: var(--surface-hover); }
.search-result .title { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
.search-result .excerpt { font-size: 12px; color: var(--text-tertiary); }
.search-result .match {
  background: var(--accent-strong); color: var(--color-text);
  padding: 0 2px; border-radius: 2px;
}

/* Legacy search compat */
.mode-search .search-input {
  width: 100%; font-size: 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text); outline: none;
  transition: border-color 150ms;
}
.mode-search .search-input:focus { border-color: var(--color-accent); }`;

export const SEARCH_MODE_OVERRIDE_CSS = `/* === Mode: Search — results spacing === */
.mode-search .search-results { margin-top: 16px; }
.mode-search .search-result { padding: 12px; cursor: pointer; }
.mode-search .search-result:hover { background: var(--surface-hover); }`;

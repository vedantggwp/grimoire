/**
 * present/css — Read mode: 3-column layout, article body, TOC rail
 */

export const READ_CSS = `/* === Read — 3-column layout === */
.read-3col {
  display: grid;
  grid-template-columns: 210px 1fr 180px;
  gap: 36px;
}
.read-sidebar { position: sticky; top: 72px; align-self: flex-start; }
.read-sidebar h4 {
  font-family: var(--font-heading);
  font-size: 12px; font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 14px;
}
.read-sidebar ul { list-style: none; }
.read-sidebar li {
  padding: 7px 12px; font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer; border-radius: var(--radius-sm);
  transition: all 150ms; margin-bottom: 2px;
}
.read-sidebar li:hover { background: var(--color-surface); color: var(--color-text); }
.read-sidebar li.active {
  background: var(--accent-muted);
  color: var(--color-accent); font-weight: 500;
}

/* Sidebar items are real links on per-article pages */
.read-sidebar li:has(> a) { padding: 0; }
.read-sidebar a {
  display: block;
  padding: 7px 12px; font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: background 150ms var(--ease), color 150ms var(--ease);
}
.read-sidebar a:hover { background: var(--color-surface); color: var(--color-text); opacity: 1; }
.read-sidebar a[aria-current="page"] {
  background: var(--accent-muted);
  color: var(--color-accent); font-weight: 500;
}

.read-content { max-width: var(--content-max); }
.article-meta {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px; flex-wrap: wrap;
}

.read-content h1 {
  font-size: 30px; letter-spacing: -0.3px;
  line-height: 1.2; margin-bottom: 8px;
}
.read-content .summary {
  font-size: 15px; color: var(--text-secondary);
  font-style: italic; line-height: 1.7;
  margin-bottom: 20px;
}
.read-content h2 {
  font-size: 22px; font-weight: 600;
  margin-top: 36px; margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.read-content h3 { margin-top: 24px; }
.read-content p { line-height: 1.7; }
.read-content strong { color: var(--color-text); }

.read-content ul, .read-content ol {
  padding-left: 24px; margin-bottom: 14px;
}
.read-content li { margin-bottom: 6px; color: var(--text-secondary); }

.read-content blockquote {
  border-left: 3px solid var(--color-accent);
  padding: 12px 16px;
  margin: 14px 0;
  color: var(--text-secondary);
  background: var(--accent-muted);
}

.read-toc-right { position: sticky; top: 72px; align-self: flex-start; }
.read-toc-right h4 {
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.2px;
  color: var(--text-tertiary); margin-bottom: 12px;
  font-family: var(--font-mono);
}
.read-toc-right ul { list-style: none; border-left: 2px solid var(--border); }
.read-toc-right li {
  padding: 4px 0 4px 12px; font-size: 12px;
  color: var(--text-tertiary); cursor: pointer;
  transition: all 150ms;
}
.read-toc-right li:hover { color: var(--text-secondary); }
.read-toc-right li.active {
  color: var(--color-accent);
  border-left: 2px solid var(--color-accent);
  margin-left: -2px;
}
.read-toc-right a {
  color: inherit;
  text-decoration: none;
}
.read-toc-right a:hover { opacity: 1; }

/* === Reading index (site/read/index.html) === */
.read-index-header {
  max-width: 720px;
  margin: 0 auto;
  padding: clamp(16px, 3vw, 32px) 0 clamp(12px, 2vw, 20px);
}
.read-index-header h1 {
  margin-bottom: 8px;
}
.read-index-lead {
  color: var(--text-secondary);
  max-width: 56ch;
  text-wrap: pretty;
}
.read-index {
  list-style: none;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 0 var(--pad-section);
}
.read-row + .read-row { border-top: 1px solid var(--border); }
.read-row__link {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-2);
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);
  transition: background var(--dur-1) var(--ease-out);
}
.read-row__link:hover { background: var(--color-surface); opacity: 1; }
.read-row__link:hover .read-row__arrow {
  transform: translateX(4px);
  color: var(--color-accent);
}
.read-row__num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.read-row__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.read-row__title {
  font-family: var(--font-heading);
  font-size: clamp(17px, 0.5vw + 15px, 20px);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}
.read-row .summary {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.read-row__meta {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.read-row__arrow {
  margin-left: auto;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out);
}
.article__nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  margin-top: var(--space-6);
  border-top: 1px solid var(--border);
}
.article-meta__words {
  color: var(--text-tertiary);
  font-size: 12px;
  font-family: var(--font-mono);
}

/* === Article (legacy compat) === */
.article {
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}
.article h1 { font-size: 30px; }
.article h2 { font-size: 22px; margin-top: 36px; }
.article h3 { font-size: 17px; margin-top: 24px; }
.article ul, .article ol { padding-left: 24px; margin-bottom: 14px; }
.article li { margin-bottom: 6px; }
.article blockquote {
  border-left: 3px solid var(--color-accent);
  padding: 12px 16px; margin: 14px 0;
  color: var(--text-secondary); background: var(--accent-muted);
}`;

export const READ_MODE_OVERRIDE_CSS = `/* === Mode: Read — progress bar === */
.mode-read .read-progress {
  height: 3px;
  background: var(--color-accent);
  position: fixed;
  top: var(--nav-height, 56px);
  left: 0;
  right: 0;
  z-index: 101;
  width: 0%;
  transition: width 200ms;
}`;

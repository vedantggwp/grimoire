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

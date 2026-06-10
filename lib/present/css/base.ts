/**
 * present/css — Reset, base typography, layout chrome, shared components
 *
 * Four ordered blocks: reset, base (html/nav/skip-link/focus),
 * shared components (tags/badges/code/buttons/cards), and tail
 * (generic grid/footer/screen visibility).
 */

export const RESET_CSS = `/* === Reset === */
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; overflow-x: hidden; }
body {
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: hidden;
  max-width: 100vw;
}
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }`;

export const BASE_CSS = `/* === Base === */
html {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: clamp(15px, 0.2vw + 14.5px, 16.5px);
  transition: background 200ms, color 200ms;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.2;
  text-wrap: balance;
}

h1 { font-size: clamp(28px, 2vw + 20px, 42px); letter-spacing: -0.5px; margin-bottom: 14px; }
h2 { font-size: clamp(19px, 0.7vw + 15px, 25px); font-weight: 600; margin-bottom: 12px; }
h3 { font-size: clamp(16px, 0.3vw + 14px, 18px); font-weight: 600; margin-bottom: 6px; }
h4 { font-size: clamp(15px, 0.2vw + 14px, 17px); font-weight: 600; margin-bottom: 6px; }

p { margin-bottom: 14px; color: var(--text-secondary); line-height: 1.7; }
p strong { color: var(--color-text); }
a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
a:hover { opacity: 0.85; }

/* === Layout === */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: clamp(20px, 3vw, 40px) clamp(16px, 4vw, 32px);
}

/* === Skip link === */
.skip-link {
  position: absolute; left: -9999px; top: auto;
  width: 1px; height: 1px; overflow: hidden;
  z-index: 999; padding: 6px 16px;
  background: var(--color-surface); color: var(--color-text);
  border: 2px solid var(--color-accent); border-radius: 4px;
  font-size: 13px; text-decoration: none;
}
.skip-link:focus {
  position: fixed; left: 16px; top: 8px;
  width: auto; height: auto; overflow: visible;
}

/* === Nav === */
nav, .nav {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 10px clamp(16px, 4vw, 28px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0;
  background: var(--bg-nav);
  backdrop-filter: blur(14px);
  z-index: 100;
  transition: background 200ms, border-color 200ms;
}

.brand, .nav__title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: clamp(14px, 0.4vw + 12px, 16.5px);
  color: var(--color-text);
  text-decoration: none;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(48vw, 420px);
}

.tabs, .nav__tabs, .nav__links {
  display: flex; gap: 2px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 3px;
  list-style: none;
  transition: background 200ms;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs::-webkit-scrollbar,
.nav__tabs::-webkit-scrollbar,
.nav__links::-webkit-scrollbar { display: none; }
.tabs, .nav__tabs, .nav__links {
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);
  mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);
}

.tab, .nav__tab, .nav__link {
  padding: 8px 14px; border-radius: 7px;
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none; cursor: pointer;
  transition: color 150ms var(--ease), background 150ms var(--ease);
  border: none; background: none;
  font-family: var(--font-body);
  display: inline-flex; align-items: center;
  min-height: 36px; white-space: nowrap;
}
.tab:hover, .nav__tab:hover, .nav__link:hover {
  color: var(--color-text); background: var(--surface-hover);
}
.tab.active, .nav__tab--active, .nav__link--active {
  color: var(--color-text);
  background: var(--surface-hover);
  box-shadow: 0 0 0 1px var(--border);
}

.nav-right, .nav__right {
  display: flex; align-items: center; gap: 12px;
}

.nav-right kbd, .nav__right kbd {
  font-family: var(--font-mono); font-size: 11px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 2px 6px; border-radius: 4px;
  color: var(--text-tertiary);
}

/* === Theme toggle === */
.theme-toggle {
  background: none; border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px; cursor: pointer;
  font-size: 14px; line-height: 1;
  transition: all 150ms;
  color: var(--text-secondary);
}
.theme-toggle:hover { border-color: var(--border-hover); color: var(--color-text); }

/* === Focus visible === */
.tab:focus-visible,
.nav__tab:focus-visible,
.nav__link:focus-visible,
.bento-card:focus-visible,
.theme-toggle:focus-visible,
.tag:focus-visible,
.quiz-btn:focus-visible {
  outline: 2px solid var(--color-accent); outline-offset: 2px;
}`;

export const COMPONENTS_CSS = `/* === Tags === */
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }
.tag {
  display: inline-block;
  font-family: var(--font-mono); font-size: 11px;
  background: var(--accent-muted); color: var(--color-accent);
  padding: 3px 8px; border-radius: 4px;
  text-decoration: none;
}

/* === Confidence badges === */
.confidence-badge {
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 600;
  padding: 3px 8px; border-radius: 4px;
  display: inline-block;
}
.confidence-badge.p0,
.confidence-badge--p0 { background: var(--success-muted); color: var(--color-success); }
.confidence-badge.p1,
.confidence-badge--p1 { background: var(--warning-muted); color: var(--color-warning); }
.confidence-badge.p2,
.confidence-badge--p2 { background: var(--error-muted); color: var(--color-error); }

.source-count {
  font-size: 12px; color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* === Code === */
code {
  font-family: var(--font-mono); font-size: 13px;
  background: var(--code-bg); color: var(--code-color);
  padding: 2px 6px; border-radius: 4px;
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px; overflow-x: auto;
  margin: 14px 0;
}
pre code {
  background: none; padding: 0;
  font-size: 13px; line-height: 1.7;
  color: var(--color-text);
}

/* === Buttons === */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 150ms var(--ease);
}
.btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn--primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn--primary:hover { opacity: 0.9; color: #fff; }

/* === Cards (generic) === */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--pad-card);
  box-shadow: var(--shadow-card);
  transition: box-shadow 200ms var(--ease), transform 200ms var(--ease);
}
.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}`;

export const TAIL_CSS = `/* === Grid (generic) === */
.grid { display: grid; gap: 12px; }
.grid--2 { grid-template-columns: 1fr; }
.grid--3 { grid-template-columns: 1fr; }

/* === Footer === */
footer, .footer {
  text-align: center; padding: 32px 28px;
  font-size: 12px; color: var(--text-tertiary);
  font-family: var(--font-mono);
  border-top: 1px solid var(--border);
  margin-top: 48px;
}

/* === Screen visibility === */
.screen { display: none; }
.screen.active { display: block; }`;

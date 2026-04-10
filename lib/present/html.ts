/**
 * present — Shared HTML utilities
 *
 * Reusable head, nav, footer, and page shell for all mode generators.
 */

import type { DesignConfig, SiteData } from './types.js';
import { resolveTypography, getGoogleFontsUrl } from './config.js';

// --- Escape helper ---

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Components ---

export function htmlHead(title: string, config: DesignConfig): string {
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);

  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="Grimoire">
  <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#f8fafb" media="(prefers-color-scheme: light)">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fontsUrl}">
  <link rel="stylesheet" href="../assets/style.css">
</head>`;
}

export function hubHead(title: string, config: DesignConfig): string {
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);

  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="Grimoire">
  <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#f8fafb" media="(prefers-color-scheme: light)">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fontsUrl}">
  <link rel="stylesheet" href="assets/style.css">
</head>`;
}

const MODES = [
  { id: 'read', label: 'Read' },
  { id: 'graph', label: 'Graph' },
  { id: 'search', label: 'Search' },
  { id: 'feed', label: 'Feed' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'quiz', label: 'Quiz' },
] as const;

export function navBar(currentMode: string, data: SiteData): string {
  const links = MODES.map(m => {
    const active = m.id === currentMode ? ' nav__link--active' : '';
    const href = m.id === currentMode ? '#' : `../${m.id}/`;
    return `<a href="${href}" class="nav__link${active}">${m.label}</a>`;
  }).join('\n      ');

  return `<nav class="nav container">
  <a href="../" class="nav__title">${esc(data.schema.topic)}</a>
  <div class="nav__links">
    ${links}
  </div>
  <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
    <span id="theme-icon">&#9790;</span>
  </button>
</nav>`;
}

export function hubNav(data: SiteData): string {
  const links = MODES.map(m => {
    return `<a href="${m.id}/" class="nav__link">${m.label}</a>`;
  }).join('\n      ');

  return `<nav class="nav container">
  <a href="./" class="nav__title">${esc(data.schema.topic)}</a>
  <div class="nav__links">
    ${links}
  </div>
  <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
    <span id="theme-icon">&#9790;</span>
  </button>
</nav>`;
}

export function footer(data: SiteData): string {
  const date = new Date().toISOString().slice(0, 10);
  const count = data.articles.length;

  return `<footer class="footer container">
  <p>Generated ${date} &middot; ${count} article${count !== 1 ? 's' : ''} &middot; Built with Grimoire</p>
</footer>`;
}

export function themeToggleScript(): string {
  return `<script>
(function() {
  var KEY = 'grimoire-theme';
  var toggle = document.getElementById('theme-toggle');
  var icon = document.getElementById('theme-icon');
  var root = document.documentElement;

  function getStored() {
    try { return localStorage.getItem(KEY); } catch(e) { return null; }
  }

  function apply(theme) {
    root.classList.remove('theme-light', 'theme-dark');
    if (theme) root.classList.add('theme-' + theme);
    icon.textContent = theme === 'dark' ? '\\u2600' : '\\u263E';
    try { localStorage.setItem(KEY, theme || ''); } catch(e) {}
  }

  var stored = getStored();
  if (stored) apply(stored);

  toggle.addEventListener('click', function() {
    var isDark = root.classList.contains('theme-dark') ||
      (!root.classList.contains('theme-light') &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    apply(isDark ? 'light' : 'dark');
  });
})();
</script>`;
}

export function pageShell(
  title: string,
  mode: string,
  bodyContent: string,
  config: DesignConfig,
  data: SiteData,
): string {
  return `<!DOCTYPE html>
<html lang="en">
${htmlHead(title, config)}
<body class="mode-${mode}">
${navBar(mode, data)}
<main class="container">
${bodyContent}
</main>
${footer(data)}
${themeToggleScript()}
</body>
</html>`;
}

export function hubShell(
  title: string,
  bodyContent: string,
  config: DesignConfig,
  data: SiteData,
): string {
  return `<!DOCTYPE html>
<html lang="en">
${hubHead(title, config)}
<body>
${hubNav(data)}
<main class="container">
${bodyContent}
</main>
${footer(data)}
${themeToggleScript()}
</body>
</html>`;
}

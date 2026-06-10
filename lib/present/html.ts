/**
 * present — Shared HTML utilities
 *
 * Reusable head, nav, footer, and page shell for all mode generators.
 */

import type { DesignConfig, SiteData } from './types.js';
import { resolveTypography, getGoogleFontsUrl } from './config.js';
import { shortTopic } from './hub.js';
import { esc } from './esc.js';
import { themeToggleScript } from './js/runtime.js';

export { themeToggleScript };

// --- Components ---

export function htmlHead(title: string, config: DesignConfig): string {
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);

  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="Grimoire">
  <meta name="theme-color" content="#0F0F0F" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
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
  <meta name="theme-color" content="#0F0F0F" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
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
  const tabs = MODES.map(m => {
    const active = m.id === currentMode ? ' active' : '';
    const href = m.id === currentMode ? '#' : `../${m.id}/index.html`;
    return `<a href="${href}" class="tab${active}">${m.label}</a>`;
  }).join('\n        ');

  return `<nav>
  <a href="../index.html" class="brand">${esc(shortTopic(data.schema.topic))}</a>
  <div class="tabs">
    ${tabs}
  </div>
  <div class="nav-right">
    <kbd>&#8984;K</kbd>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
      <span id="theme-icon">&#9681;</span>
    </button>
  </div>
</nav>`;
}

export function hubNav(data: SiteData): string {
  const tabs = MODES.map(m => {
    return `<a href="${m.id}/index.html" class="tab">${m.label}</a>`;
  }).join('\n        ');

  return `<nav>
  <a href="index.html" class="brand">${esc(shortTopic(data.schema.topic))}</a>
  <div class="tabs">
    ${tabs}
  </div>
  <div class="nav-right">
    <kbd>&#8984;K</kbd>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
      <span id="theme-icon">&#9681;</span>
    </button>
  </div>
</nav>`;
}

export function footer(data: SiteData): string {
  const date = new Date().toISOString().slice(0, 10);
  const count = data.articles.length;

  return `<footer class="footer container">
  <p>Generated ${date} &middot; ${count} article${count !== 1 ? 's' : ''} &middot; Built with Grimoire</p>
</footer>`;
}

export function pageShell(
  title: string,
  mode: string,
  bodyContent: string,
  config: DesignConfig,
  data: SiteData,
): string {
  const progressBar = mode === 'read'
    ? '<div class="read-progress" id="read-progress"></div>'
    : '';

  return `<!DOCTYPE html>
<html lang="en">
${htmlHead(title, config)}
<body class="mode-${mode}">
<a href="#main" class="skip-link">Skip to content</a>
${navBar(mode, data)}
${progressBar}
<main id="main" class="container">
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
<a href="#main" class="skip-link">Skip to content</a>
${hubNav(data)}
<main id="main" class="container">
${bodyContent}
</main>
${footer(data)}
${themeToggleScript()}
</body>
</html>`;
}

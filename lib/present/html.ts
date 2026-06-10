/**
 * present — Shared HTML utilities
 *
 * Reusable head, nav, footer, and page shell for all mode generators.
 */

import type { DesignConfig, SiteData } from './types.js';
import { resolveTypography, getGoogleFontsUrl } from './config.js';
import { shortTopic } from './hub.js';
import { esc } from './esc.js';
import { motionRuntimeScript, themeToggleScript } from './js/runtime.js';

export { themeToggleScript };

// --- Components ---

// depth = directory levels below the site root (modes are 1, article pages 2).
export function htmlHead(title: string, config: DesignConfig, depth = 1): string {
  const typo = resolveTypography(config);
  const fontsUrl = getGoogleFontsUrl(typo);
  const up = '../'.repeat(depth);

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
  <link rel="stylesheet" href="${up}assets/style.css">
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

const MODE_LABELS: Readonly<Record<string, string>> = {
  read: 'Read',
  graph: 'Graph',
  search: 'Search',
  feed: 'Feed',
  gaps: 'Gaps',
  quiz: 'Quiz',
};

// Issue #9 — nav renders only the modes enabled in the design config.
function enabledModes(config: DesignConfig): readonly { id: string; label: string }[] {
  return config.modes.map(id => ({ id, label: MODE_LABELS[id] ?? id }));
}

export function navBar(
  currentMode: string,
  data: SiteData,
  config: DesignConfig,
  depth = 1,
): string {
  const up = '../'.repeat(depth);
  const tabs = enabledModes(config).map(m => {
    const active = m.id === currentMode ? ' active' : '';
    const href = m.id === currentMode && depth === 1 ? '#' : `${up}${m.id}/index.html`;
    return `<a href="${href}" class="tab${active}">${m.label}</a>`;
  }).join('\n        ');

  return `<nav>
  <a href="${up}index.html" class="brand">${esc(shortTopic(data.schema.topic))}</a>
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

export function hubNav(data: SiteData, config: DesignConfig): string {
  const tabs = enabledModes(config).map(m => {
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
  depth = 1,
): string {
  const progressBar = mode === 'read'
    ? '<div class="read-progress" id="read-progress"></div>'
    : '';

  return `<!DOCTYPE html>
<html lang="en" class="motion-${config.motion} density-${config.density}">
${htmlHead(title, config, depth)}
<body class="mode-${mode}">
${motionRuntimeScript()}
<a href="#main" class="skip-link">Skip to content</a>
${navBar(mode, data, config, depth)}
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
<html lang="en" class="motion-${config.motion} density-${config.density}">
${hubHead(title, config)}
<body>
${motionRuntimeScript()}
<a href="#main" class="skip-link">Skip to content</a>
${hubNav(data, config)}
<main id="main" class="container">
${bodyContent}
</main>
${footer(data)}
${themeToggleScript()}
</body>
</html>`;
}

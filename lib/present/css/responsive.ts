/**
 * present/css — Responsive breakpoints (1024 / 767 / 479 / 640+ / 1024+)
 */

export const RESPONSIVE_CSS = `/* === Responsive === */
@media (max-width: 1024px) {
  .read-3col {
    grid-template-columns: 1fr;
    gap: clamp(20px, 3vw, 32px);
  }
  .read-sidebar, .read-toc-right { position: static; }
  .read-toc-right { display: none; }
  .read-sidebar {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .read-sidebar ul {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .read-sidebar li { margin-bottom: 0; }
  .bento { grid-template-columns: repeat(2, 1fr); }
  .bento-card.featured {
    grid-column: span 2;
    grid-row: auto;
  }
  .treemap { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 767px) {
  nav, .nav { padding: 10px 16px; gap: 10px; }
  .brand, .nav__title { max-width: 40vw; }
  .tabs, .nav__tabs, .nav__links {
    overflow-x: auto; flex-wrap: nowrap;
    max-width: 60vw;
  }
  .bento { grid-template-columns: 1fr; }
  .bento-card.featured {
    grid-column: span 1;
    grid-row: auto;
  }
  .treemap { grid-template-columns: repeat(2, 1fr); }
  .feed-timeline { margin-left: 16px; }
  .feed-date {
    position: static; width: auto;
    text-align: left; margin-bottom: 4px;
  }
  .graph-wrap { flex-direction: column; height: auto; }
  .graph-sidebar { width: 100%; }
  .graph-sidebar__toggle { display: block; }
  .graph-canvas { min-height: 360px; }
  .grid--2 { grid-template-columns: repeat(2, 1fr); }
  .hub-stats { gap: 14px 24px; padding: 14px 0; }
}

@media (max-width: 479px) {
  .brand, .nav__title {
    max-width: 36vw;
    font-size: 12.5px;
  }
  .tab, .nav__tab, .nav__link {
    padding: 8px 10px;
    font-size: 12px;
    min-height: 34px;
  }
  .hub-stats { gap: 10px 18px; }
  .hub-stat strong { font-size: 18px; }
  .hub-stat { font-size: 11.5px; }
  .treemap { grid-template-columns: 1fr; }
  .grid--2 { grid-template-columns: 1fr; }
}

@media (min-width: 640px) {
  .grid--2 { grid-template-columns: repeat(2, 1fr); }
  .grid--3 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid--3 { grid-template-columns: repeat(3, 1fr); }
}`;

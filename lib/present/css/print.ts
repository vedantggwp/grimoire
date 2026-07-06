/**
 * present/css — Print stylesheet
 */

export const PRINT_CSS = `/* === Print === */
@media print {
  .nav, .theme-toggle, .footer, footer, .mode-graph svg, .mode-quiz,
  .graph-wrap, .search-overlay, .quiz-wrap { display: none; }
  body { color: #000; background: #fff; font-size: 11pt; }
  a { color: #000; text-decoration: underline; }
  .article, .read-content { break-inside: avoid; }
  pre { border: 1px solid #ccc; }
  .bento-card { box-shadow: none; border: 1px solid #ccc; }
}`;

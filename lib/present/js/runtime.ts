/**
 * present/js — Shared client runtime script builders
 *
 * Inline vanilla-JS snippets embedded into every generated page.
 * Phase 3 will grow this module with the motion guard, reveal
 * observer, and count-up helpers.
 */

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

/**
 * present/js — Shared client runtime script builders
 *
 * Inline vanilla-JS snippets embedded into every generated page.
 */

/**
 * Runs first on every page: flags JS presence (the CSS reveal utility only
 * hides elements under html.js — no-JS readers always see content), defines
 * the single motion predicate every animation script must check, and runs
 * the IntersectionObserver that reveals `.reveal` elements.
 */
export function motionRuntimeScript(): string {
  return `<script>
(function() {
  var root = document.documentElement;
  root.classList.add('js');

  window.GRIMOIRE_MOTION_OK = function() {
    if (root.className.indexOf('motion-none') !== -1) return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  function revealAll() {
    document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('revealed'); });
  }

  function start() {
    if (!window.GRIMOIRE_MOTION_OK() || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { io.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
</script>`;
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

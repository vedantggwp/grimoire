/**
 * present/js — Shared client runtime script builders
 *
 * Inline vanilla-JS snippets embedded into every generated page.
 */

import { jsonForScript } from '../esc.js';

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

/**
 * Count-up animation for hub stats: elements with `data-count` tick from 0
 * to their value when first scrolled into view. Reduced motion or no IO
 * support → values render instantly (they're already in the markup).
 */
export function countUpScript(): string {
  return `<script>
(function() {
  var els = document.querySelectorAll('[data-count]');
  if (els.length === 0) return;
  if (!window.GRIMOIRE_MOTION_OK || !window.GRIMOIRE_MOTION_OK() || !('IntersectionObserver' in window)) return;

  function animate(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    var suffix = el.dataset.countSuffix || '';
    var start = null;
    var DURATION = 600;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        animate(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  els.forEach(function(el) { io.observe(el); });
})();
</script>`;
}

/**
 * Pointer tilt + specular glow for cards. Sets --rx/--ry/--mx/--my on the
 * hovered element; the CSS does the perspective transform and gradient.
 * Gated to fine pointers with motion on.
 */
export function tiltScript(selector: string): string {
  return `<script>
(function() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (!window.GRIMOIRE_MOTION_OK || !window.GRIMOIRE_MOTION_OK()) return;

  var raf = null;
  document.querySelectorAll(${jsonForScript(selector)}).forEach(function(card) {
    card.classList.add('tiltable');
    card.addEventListener('pointermove', function(e) {
      if (raf) return;
      raf = requestAnimationFrame(function() {
        raf = null;
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.setProperty('--rx', ((0.5 - py) * 2) + '');
        card.style.setProperty('--ry', ((px - 0.5) * 2) + '');
      });
    });
    card.addEventListener('pointerleave', function() {
      card.style.setProperty('--rx', '0');
      card.style.setProperty('--ry', '0');
    });
  });
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

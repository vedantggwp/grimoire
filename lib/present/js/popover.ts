/**
 * present/js — Wikilink hover previews
 *
 * Wikipedia-style preview cards for internal links on article pages.
 * Data is page-local (window.LINK_PREVIEWS holds only the slugs this page
 * references), so the payload stays tiny. Uses the native Popover API for
 * top-layer rendering when available, a fixed-position card otherwise.
 * Hover-intent delayed, keyboard accessible (focus shows, Escape hides),
 * skipped entirely on touch devices (tap should just navigate).
 */

export function popoverScript(): string {
  return `<script>
(function() {
  var previews = window.LINK_PREVIEWS;
  if (!previews) return;
  if (window.matchMedia('(hover: none)').matches) return;

  var HOVER_DELAY = 250;
  var card = null;
  var showTimer = null;
  var hideTimer = null;
  var currentLink = null;
  var supportsPopover = typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function ensureCard() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'link-preview';
    card.setAttribute('role', 'tooltip');
    if (supportsPopover) card.setAttribute('popover', 'manual');
    document.body.appendChild(card);
    card.addEventListener('pointerenter', function() { clearTimeout(hideTimer); });
    card.addEventListener('pointerleave', scheduleHide);
    return card;
  }

  function show(link, slug) {
    var p = previews[slug];
    if (!p) return;
    var el = ensureCard();
    var meta = [p.readingTime ? p.readingTime + ' min' : null]
      .concat(p.tags || []).filter(Boolean).join(' \\u00b7 ');
    el.innerHTML =
      '<span class="link-preview__title">' + esc(p.title) + '</span>' +
      (p.summary ? '<span class="link-preview__summary">' + esc(p.summary) + '</span>' : '') +
      (meta ? '<span class="link-preview__meta">' + esc(meta) + '</span>' : '');

    var rect = link.getBoundingClientRect();
    var top = rect.bottom + 8;
    if (supportsPopover) { el.showPopover(); } else { el.style.display = 'block'; }
    var cardHeight = el.offsetHeight;
    if (top + cardHeight > window.innerHeight - 16) {
      top = rect.top - cardHeight - 8;
    }
    var left = Math.min(
      Math.max(rect.left, 12),
      window.innerWidth - el.offsetWidth - 12
    );
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.classList.add('visible');
    currentLink = link;
  }

  function hide() {
    if (!card) return;
    card.classList.remove('visible');
    if (supportsPopover) {
      try { card.hidePopover(); } catch(e) {}
    } else {
      card.style.display = 'none';
    }
    currentLink = null;
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 120);
  }

  function bind(link) {
    var slug = link.dataset.wikilinkSlug;
    if (!slug || !previews[slug]) return;

    link.addEventListener('pointerenter', function() {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      showTimer = setTimeout(function() { show(link, slug); }, HOVER_DELAY);
    });
    link.addEventListener('pointerleave', scheduleHide);
    link.addEventListener('focus', function() { show(link, slug); });
    link.addEventListener('blur', scheduleHide);
  }

  document.querySelectorAll('.article-body a[data-wikilink-slug], .article-backlinks a[data-wikilink-slug]')
    .forEach(bind);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener('scroll', function() { if (currentLink) hide(); }, { passive: true });
})();
</script>`;
}

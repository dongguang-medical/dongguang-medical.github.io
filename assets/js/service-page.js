/* =====================================================
   SERVICE PAGE — Smooth scroll helper
   ===================================================== */
var DG = DG || {};

DG.sp = (function () {
  function scrollTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 60;
    var top = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  return { scrollTo: scrollTo };
})();

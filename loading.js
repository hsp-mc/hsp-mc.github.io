(() => {
  const root = document.documentElement;
  const started = performance.now();
  root.classList.add('site-loading');

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    root.classList.remove('site-loading');
    const loader = document.getElementById('site-loader');
    if (loader) {
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => loader.remove(), 250);
    }
  };

  // A stalled CDN must never trap visitors behind the entrance screen.
  const fallback = window.setTimeout(dismiss, 6000);
  document.addEventListener('DOMContentLoaded', () => {
    if (dismissed) {
      document.getElementById('site-loader')?.remove();
      return;
    }
    const minimum = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2600;
    window.setTimeout(() => {
      window.clearTimeout(fallback);
      dismiss();
    }, Math.max(0, minimum - (performance.now() - started)));
  }, { once: true });
})();

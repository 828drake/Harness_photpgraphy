/** Shared navigation, API requests, alerts, and date/time utilities. */
(() => {
  const header = document.getElementById('site-header');
  const nav = document.getElementById('main-nav');
  const toggle = document.querySelector('.menu-toggle');
  // Responsive navigation
  if (toggle && nav) {
    const close = () => { nav.classList.remove('is-open'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); };
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open); toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  if (header?.classList.contains('header--overlay')) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  // JSON API requests and reusable interface utilities
  async function api(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, credentials:'same-origin' });
    } catch { throw new Error('Could not reach the server. Please try again.'); }
    let data;
    try { data = await response.json(); } catch { throw new Error('Unexpected server response.'); }
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  function alertBox(id, message, type = 'error') {
    const box = document.getElementById(id);
    if (!box) return;
    box.hidden = !message;
    box.className = `form-alert ${type}`;
    box.textContent = message;
  }
  const esc = input => String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  const formatTime = hhmm => new Date(`2000-01-01T${hhmm}:00Z`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'});
  window.HP = { api, alertBox, esc, formatDate, formatTime };
})();

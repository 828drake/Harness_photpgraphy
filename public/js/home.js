/** Homepage: rotating hero images, controls, and featured gallery photos. */
(() => {
  const container = document.querySelector('.hero-slides');
  if (!container) return;
  let slides = [...container.querySelectorAll('.hero-slide')];
  const counter = document.getElementById('hero-current');
  const total = document.getElementById('hero-total');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer;
  // Control the visible image, manual arrows, and autoplay.
  const show = index => {
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    counter.textContent = String(current + 1).padStart(2, '0');
  };
  const start = () => { if (!reducedMotion && slides.length > 1) timer = setInterval(() => show(current + 1), 5500); };
  const move = by => { clearInterval(timer); show(current + by); start(); };
  document.getElementById('hero-prev').addEventListener('click', () => move(-1));
  document.getElementById('hero-next').addEventListener('click', () => move(1));
  document.addEventListener('visibilitychange', () => { clearInterval(timer); if (!document.hidden) start(); });
  start();
  // Featured photographs added by the admin automatically feed the home slideshow.
  // Load featured gallery photos once the Node.js API is available.
  window.HP.api('/api/gallery').then(({ photos }) => {
    const featured = photos.filter(photo => photo.featured && typeof photo.src === 'string').slice(0, 8);
    if (!featured.length) return;
    clearInterval(timer);
    container.replaceChildren();
    slides = featured.map((photo, i) => {
      const slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
      slide.style.backgroundImage = `url(${JSON.stringify(photo.src)})`;
      container.append(slide);
      return slide;
    });
    current = 0; counter.textContent = '01'; total.textContent = String(slides.length).padStart(2, '0');
    start();
  }).catch(() => { /* Static starter photos are the fallback. */ });
})();

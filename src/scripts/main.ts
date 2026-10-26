// Menú móvil
const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
const nav = document.querySelector<HTMLElement>('[data-nav]');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav?.classList.toggle('is-open', !open);
});
nav?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    toggle?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }),
);

// El idioma conserva el ancla (#carta, #vinos…) para que el enlace siga siendo compartible.
document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const code = a.dataset.langLink;
    if (code !== 'es' && code !== 'en') return;
    e.preventDefault();
    const url = new URL(location.href);
    url.searchParams.set('lang', code);
    url.hash = location.hash;
    location.href = url.pathname + url.search + url.hash;
  });
});

// Cabecera sólida al hacer scroll
const header = document.querySelector('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Resalta el día actual en la tabla de horario
const today = new Date().getDay();
document.querySelector(`[data-hours] tr[data-day="${today}"]`)?.classList.add('is-today');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// Reveal al hacer scroll
const reveals = document.querySelectorAll<HTMLElement>('.reveal');
if (reduced || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  reveals.forEach((el) => io.observe(el));
}

// Parallax suave del hero (solo transform, con rAF)
const media = document.querySelector<HTMLElement>('[data-parallax]');
if (media && !reduced) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, window.innerHeight);
      media.style.setProperty('--py', `${y * 0.25}px`);
      ticking = false;
    });
  }, { passive: true });
}

// Pestañas de la carta (patrón ARIA tabs, con flechas de teclado)
const tablist = document.querySelector<HTMLElement>('[data-menu-tabs]');
const mtabs = Array.from(tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
const select = (tab: HTMLButtonElement, focus = false) => {
  mtabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')!)?.setAttribute('data-active', String(on));
  });
  if (focus) tab.focus();
};
mtabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
      e.preventDefault();
      const n = k === 'Home' ? 0 : k === 'End' ? mtabs.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + mtabs.length) % mtabs.length;
      select(mtabs[n], true);
    }
  });
});

// Carrusel de galería (scroll-snap + botones)
const track = document.querySelector<HTMLElement>('[data-gal-track]');
const step = () => (track?.querySelector('li')?.getBoundingClientRect().width ?? 300) + 16;
document.querySelector('[data-gal-prev]')?.addEventListener('click', () => track?.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
document.querySelector('[data-gal-next]')?.addEventListener('click', () => track?.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));

// Carrusel de reseñas: autoplay suave (se pausa al interactuar / pasar el ratón / foco; sin autoplay con reduced-motion)
const rv = document.querySelector<HTMLElement>('[data-rv]');
if (rv) {
  const rTrack = rv.querySelector<HTMLElement>('[data-rv-track]')!;
  const slides = Array.from(rv.querySelectorAll<HTMLElement>('[data-rv-slide]'));
  const dots = Array.from(rv.querySelectorAll<HTMLButtonElement>('[data-rv-dot]'));
  let idx = 0;
  let timer: number | undefined;
  const perView = () => (window.matchMedia('(min-width: 960px)').matches ? 2 : 1);
  const maxIdx = () => Math.max(0, slides.length - perView());
  const go = (n: number) => {
    idx = n > maxIdx() ? 0 : n < 0 ? maxIdx() : n;
    rTrack.style.transform = `translateX(-${slides[idx].offsetLeft}px)`;
    dots.forEach((d, i) => {
      d.setAttribute('aria-selected', String(i === idx));
      d.hidden = i > maxIdx();
    });
    slides.forEach((s, i) => s.toggleAttribute('inert', i < idx || i >= idx + perView()));
  };
  const stop = () => window.clearInterval(timer);
  const start = () => { if (!reduced) { stop(); timer = window.setInterval(() => go(idx + 1), 7000); } };
  rv.querySelector('[data-rv-prev]')?.addEventListener('click', () => { go(idx - 1); stop(); });
  rv.querySelector('[data-rv-next]')?.addEventListener('click', () => { go(idx + 1); stop(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); stop(); }));
  rv.addEventListener('mouseenter', stop);
  rv.addEventListener('mouseleave', start);
  rv.addEventListener('focusin', stop);
  // swipe táctil
  let x0: number | null = null;
  rTrack.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  rTrack.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  // Leer más
  const moreLabel = rv.dataset.more || 'Leer más';
  const lessLabel = rv.dataset.less || 'Leer menos';
  rv.querySelectorAll<HTMLButtonElement>('[data-rv-more]').forEach((b) => b.addEventListener('click', () => {
    const text = document.getElementById(b.getAttribute('aria-controls')!);
    const open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open));
    b.textContent = open ? moreLabel : lessLabel;
    text?.classList.toggle('is-open', !open);
    stop();
  }));
  window.addEventListener('resize', () => go(Math.min(idx, maxIdx())));
  go(0);
  start();
}

// Mapa de Google: solo se carga si el visitante lo pide (Google puede instalar cookies).
const map = document.querySelector<HTMLElement>('[data-map]');
const loadMap = () => {
  if (!map || map.querySelector('iframe')) return;
  const f = document.createElement('iframe');
  f.title = 'Mapa: La Ximenera - Rooftop, C/ Regiment Biscaia 2, Ático, Alcoy';
  f.src = map.dataset.src!;
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  f.allowFullscreen = true;
  map.querySelector('[data-map-consent]')?.remove();
  map.append(f);
};
map?.querySelector('[data-map-load]')?.addEventListener('click', () => {
  try { localStorage.setItem('lx-maps-ok', '1'); } catch { /* sin almacenamiento */ }
  loadMap();
});
try { if (localStorage.getItem('lx-maps-ok') === '1') loadMap(); } catch { /* sin almacenamiento */ }

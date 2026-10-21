// Fixed nav: scrolled state, active link, mobile overlay menu with focus trap.
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function initNav() {
  const nav = document.getElementById('nav');
  const btn = nav.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-menu');
  const close = menu.querySelector('.mm-close');
  let lastFocus = null;

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function open() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('menutoggle', { detail: { open: true } }));
    requestAnimationFrame(() => menu.querySelector(FOCUSABLE)?.focus());
  }
  function shut({ restore = true } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    window.dispatchEvent(new CustomEvent('menutoggle', { detail: { open: false } }));
    if (restore) lastFocus?.focus?.();
  }

  btn.addEventListener('click', open);
  close.addEventListener('click', () => shut());
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]')) shut({ restore: false });
  });
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      shut();
    } else if (e.key === 'Tab') {
      const items = [...menu.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => e.matches && shut({ restore: false }));

  const links = [...document.querySelectorAll('.nav-links a, .mm-links a')];
  let current = '';
  return {
    setActive(key) {
      if (key === current) return;
      current = key;
      links.forEach((a) => {
        const on = a.dataset.nav === key;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    },
  };
}

// Light/dark state, persistence, OS-follow, and the `themechange` event (Section 10).
const KEY = 'iept-theme';
const root = document.documentElement;
const BG = { light: '#ECEAE4', dark: '#0C0D0B' };
let animTimer = 0;

export function getTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}

export function setTheme(theme, { persist = true } = {}) {
  if (theme !== 'dark' && theme !== 'light') return;
  if (theme === getTheme()) return;
  root.classList.add('theme-anim');
  clearTimeout(animTimer);
  animTimer = setTimeout(() => root.classList.remove('theme-anim'), 800);
  root.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {
      /* storage blocked — theme still applies for this visit */
    }
  }
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', BG[theme]));
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', BG[getTheme()]));
  try {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (!stored()) setTheme(e.matches ? 'dark' : 'light', { persist: false });
    });
  } catch (e) {
    /* old browsers: no live follow */
  }
}

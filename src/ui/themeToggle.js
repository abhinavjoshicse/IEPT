import { getTheme, toggleTheme } from '../theme.js';

export function initThemeToggles() {
  const toggles = [...document.querySelectorAll('.theme-toggle')];
  const sync = () => toggles.forEach((t) => t.setAttribute('aria-checked', String(getTheme() === 'dark')));
  toggles.forEach((t) => t.addEventListener('click', toggleTheme));
  window.addEventListener('themechange', sync);
  sync();
}

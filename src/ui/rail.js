// Right-side story rail (7.3).
export function initRail() {
  const rail = document.querySelector('.rail');
  const items = [...rail.querySelectorAll('a')];
  let active = -1;
  let shown = true;
  return {
    update(index, p) {
      rail.classList.toggle('is-quiet', p > 0.37 && p < 0.59);
      rail.classList.toggle('is-dim', p >= 0.6); // slab reaches the right edge: rail steps back
      if (index !== active) {
        active = index;
        items.forEach((a, i) => {
          a.classList.toggle('is-active', i === index);
          if (i === index) a.setAttribute('aria-current', 'step');
          else a.removeAttribute('aria-current');
        });
      }
      const vis = p <= 0.98;
      if (vis !== shown) {
        shown = vis;
        rail.style.opacity = vis ? '' : '0';
        rail.style.visibility = vis ? '' : 'hidden';
      }
    },
  };
}

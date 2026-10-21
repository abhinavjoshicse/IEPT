// Bottom-left progress + hero scroll hint (7.3).
export function initProgress() {
  const box = document.querySelector('.progress');
  const bar = box.querySelector('.p-bar i');
  const num = box.querySelector('.p-num');
  const hint = document.querySelector('.scroll-hint');
  let lastPct = -1;
  let shown = true;
  let hintShown = true;
  [box, hint].forEach((el) => (el.style.transition = 'opacity 320ms cubic-bezier(.22,1,.36,1), visibility 320ms'));
  const vis = (el, v) => {
    el.style.opacity = v ? '' : '0';
    el.style.visibility = v ? '' : 'hidden';
  };
  return {
    update(p) {
      const pct = Math.round(p * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        num.textContent = `${pct}%`;
      }
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      if (p > 0.98 === shown) vis(box, (shown = !shown));
      if (p > 0.03 === hintShown) vis(hint, (hintShown = !hintShown));
    },
  };
}

// Count-up for About stat tiles (once, when in view). Works with placeholder values
// like "000+" or "00 km": digits count up, non-digit prefix/suffix preserved.
export function initStats({ animate = true } = {}) {
  const els = [...document.querySelectorAll('[data-count]')];
  if (!animate || !('IntersectionObserver' in window)) return;
  const parse = (s) => {
    const m = s.match(/^(\D*)([\d,.]+)(.*)$/);
    return m ? { pre: m[1], num: m[2], post: m[3] } : null;
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const p = parse(el.textContent);
        if (!p) return;
        const target = parseFloat(p.num.replace(/,/g, '')) || 0;
        const width = p.num.length;
        const t0 = performance.now();
        const dur = 1400;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          const e = 1 - Math.pow(1 - k, 3);
          const n = Math.round(target * e);
          el.textContent = p.pre + String(n).padStart(width, '0') + p.post;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

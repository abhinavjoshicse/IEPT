// Layer callouts: each row of the services list is linked by a leader line to its layer on the
// road's cut face. Reads happen before writes each frame; writes are transform-only.
import { Vector3 } from 'three';

export function createLabels(anchors, camera) {
  const labels = [...document.querySelectorAll('#layer-labels .label')];
  const rows = [...document.querySelectorAll('#beat-services .layer-list li')]; // top → bottom: BC … SUBGRADE
  const els = labels.map((el, k) => ({
    layer: +el.dataset.layer,
    row: rows[k],
    dot: el.querySelector('.l-dot'),
    line: el.querySelector('.l-line'),
  }));
  const box = document.getElementById('layer-labels');
  const v = new Vector3();
  let compact = null;
  return {
    update(visible, w, h) {
      if (!visible) return;
      const c = w < 1100; // stacked layouts: dots only (the list sits above the road)
      if (c !== compact) {
        compact = c;
        box.classList.toggle('is-compact', c);
      }
      // reads
      const boxR = box.getBoundingClientRect();
      for (const e of els) {
        v.copy(anchors[e.layer]).project(camera);
        e.x = ((v.x + 1) / 2) * w;
        e.y = ((1 - v.y) / 2) * h;
        const r = e.row ? e.row.getBoundingClientRect() : null;
        e.rx = r ? r.right - boxR.left + 10 : e.x;
        e.ry = r ? r.top + r.height / 2 - boxR.top : e.y;
      }
      // writes
      for (const e of els) {
        e.dot.style.transform = `translate3d(${e.x.toFixed(1)}px,${e.y.toFixed(1)}px,0)`;
        const dx = e.x - 5 - e.rx;
        const dy = e.y - e.ry;
        const len = Math.max(0, Math.hypot(dx, dy));
        e.line.style.transform = `translate3d(${e.rx.toFixed(1)}px,${e.ry.toFixed(1)}px,0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${len.toFixed(1)})`;
      }
    },
  };
}

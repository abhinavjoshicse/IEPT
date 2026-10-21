// Procedural layer texture painter (6.5). Shared by main thread and worker.
// Atlas per layer: W×W canvas. Rows [0, W/2) = TOP face (lane markings on BC),
// rows [W/2, W) = SIDE faces (same generator, no markings).
import { LAYERS } from './layerData.js';
import { parkMiller } from './rng.js';

function speckles(ctx, rng, layer, y0, w, h, scale) {
  const { count, size, speckles: cols } = layer;
  const n = Math.round(count * scale * scale);
  const smax = Math.max(0.6, size * scale);
  for (let i = 0; i < n; i++) {
    const cx = rng() * w;
    const cy = y0 + rng() * h;
    ctx.globalAlpha = 0.4 + rng() * 0.6;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    const a0 = rng() * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const a = a0 + (k / 5) * Math.PI * 2 + (rng() - 0.5) * 0.9;
      const r = 0.5 + rng() * (smax - 0.5);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function lanes(ctx, w, scale) {
  // spec coordinates are for a 1024×512 face
  const s = scale;
  ctx.fillStyle = '#F2F2EE';
  ctx.fillRect(0, 34 * s, w, 8 * s);
  ctx.fillRect(0, 470 * s, w, 8 * s);
  ctx.fillStyle = '#F5B301';
  for (let x = 30 * s; x < w; x += 150 * s) ctx.fillRect(x, 250 * s, 90 * s, 10 * s);
  // light wear on markings: a few dark speckles over the paint
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#1C1C1D';
  const rng = parkMiller(97);
  for (let i = 0; i < 900 * s; i++) {
    const y = [34, 470, 250][i % 3] * s + rng() * 10 * s;
    ctx.fillRect(rng() * w, y, 1.5 * s, 1.5 * s);
  }
  ctx.globalAlpha = 1;
}

/** Paint all 5 atlases. `make(w,h)` returns a canvas-like object with getContext('2d'). */
export function paintAll(size, make) {
  const rng = parkMiller(11);
  const scale = size / 1024;
  return LAYERS.map((layer, i) => {
    const c = make(size, size);
    const ctx = c.getContext('2d');
    const half = size / 2;
    ctx.fillStyle = layer.base;
    ctx.fillRect(0, 0, size, size);
    speckles(ctx, rng, layer, 0, size, half, scale); // top face
    if (i === LAYERS.length - 1) lanes(ctx, size, scale);
    speckles(ctx, rng, layer, half, size, half, scale); // side faces
    return c;
  });
}

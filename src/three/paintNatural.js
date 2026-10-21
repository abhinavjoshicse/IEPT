// Natural-looking layer materials, painted procedurally (runs in a Worker or on the main thread).
// For each layer: an albedo canvas + a normal map derived from a height field, both seamless.
// A tile is W × W/2 px and represents 7 × 3.5 world units.
import { parkMiller } from './rng.js';

// matrix (binder/fines) colour, stone colours, stone size range [px @ 1024], density, relief
export const NATURAL = [
  // SUBGRADE — compacted earth: fine grains, a few pebbles, moist patches
  { base: '#6a5440', stones: ['#8a7862', '#5b4a39', '#7a6650', '#4d3e30'], size: [1.5, 4.5], count: 1400, grain: 26000, grainCols: ['#5e4a38', '#7b6750', '#4a3b2d'], relief: 0.8, blotch: 0.05, angular: true },
  // GSB — granular sub-base: coarse rounded gravel in sandy fines
  { base: '#9a8f7c', stones: ['#b7ae9d', '#877d6d', '#6f675b', '#a59b89', '#c8c0b1', '#7d7466'], size: [6, 15], count: 2400, grain: 18000, grainCols: ['#aa9f8b', '#8a806f'], relief: 2.0, blotch: 0.08, angular: true },
  // WMM — wet-mix macadam: angular crushed stone, grey, tightly packed
  { base: '#77736b', stones: ['#9c988f', '#6b675f', '#b1ada3', '#5c5953', '#88847b'], size: [5, 12], count: 3600, grain: 16000, grainCols: ['#6d6a63', '#86827a'], relief: 1.9, blotch: 0.07, angular: true },
  // DBM — dense bituminous macadam: bitumen-coated aggregate
  { base: '#242321', stones: ['#4a4843', '#3d3b38', '#57544e', '#33312f'], size: [3, 8], count: 4200, grain: 20000, grainCols: ['#1c1b1a', '#302f2c'], relief: 2.2, blotch: 0.05, angular: true },
  // BC — bituminous concrete: fine aggregate, worn surface
  { base: '#2b2b2a', stones: ['#474642', '#524f4a', '#3c3b38', '#5a5853'], size: [1.2, 3.4], count: 7000, grain: 30000, grainCols: ['#262625', '#343432', '#3d3c3a'], relief: 1.2, blotch: 0.05, angular: true },
];

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function valueNoise(w, h, cells, rng) {
  // tileable bilinear value noise, 3 octaves → Float32Array in [-1, 1]
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < 3; o++) {
    const cx = cells * (1 << o);
    const cy = Math.max(1, Math.round(cx * (h / w)));
    const grid = new Float32Array(cx * cy).map(() => rng() * 2 - 1);
    for (let y = 0; y < h; y++) {
      const gy = (y / h) * cy;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const r0 = (y0 % cy) * cx;
      const r1 = ((y0 + 1) % cy) * cx;
      for (let x = 0; x < w; x++) {
        const gx = (x / w) * cx;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const x1 = (x0 + 1) % cx;
        const a = grid[r0 + (x0 % cx)] + (grid[r0 + x1] - grid[r0 + (x0 % cx)]) * sx;
        const b = grid[r1 + (x0 % cx)] + (grid[r1 + x1] - grid[r1 + (x0 % cx)]) * sx;
        out[y * w + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function stonePath(ctx, cx, cy, r, rng, angular) {
  const n = angular ? 5 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 4);
  const a0 = rng() * Math.PI * 2;
  const squash = 0.65 + rng() * 0.35;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2 + (rng() - 0.5) * (angular ? 0.8 : 0.3);
    const rr = r * (angular ? 0.7 + rng() * 0.45 : 0.85 + rng() * 0.2);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Paints one layer. `make(w,h)` returns a canvas-like object. Returns { albedo, normal }. */
export function paintLayer(i, W, make) {
  const L = NATURAL[i];
  const H = W / 2;
  const s = W / 1024;
  const rng = parkMiller(101 + i * 17);
  const albedo = make(W, H);
  const height = make(W, H);
  const ca = albedo.getContext('2d');
  const ch = height.getContext('2d');

  ca.fillStyle = L.base;
  ca.fillRect(0, 0, W, H);
  ch.fillStyle = 'rgb(90,90,90)';
  ch.fillRect(0, 0, W, H);

  // fine grains (fines / sand) — albedo only, plus tiny height bumps
  for (let k = 0; k < L.grain * s * s; k++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = (0.5 + rng() * 1.1) * s;
    ca.globalAlpha = 0.35 + rng() * 0.5;
    ca.fillStyle = L.grainCols[k % L.grainCols.length];
    ca.fillRect(x, y, r, r);
    if (k % 3 === 0) {
      const v = 95 + Math.floor(rng() * 40);
      ch.fillStyle = `rgb(${v},${v},${v})`;
      ch.fillRect(x, y, r, r);
    }
  }
  ca.globalAlpha = 1;

  // aggregate stones: contact shadow → stone body → highlight; height: domed bump
  const n = Math.round(L.count * s * s);
  for (let k = 0; k < n; k++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const t = rng();
    const r = (L.size[0] + (L.size[1] - L.size[0]) * t * t) * s;
    const col = L.stones[k % L.stones.length];
    const seed = rng() * 1e6;
    for (const dx of [-W, 0, W]) {
      for (const dy of [-H, 0, H]) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < -r * 2 || x > W + r * 2 || y < -r * 2 || y > H + r * 2) continue;
        const pr = parkMiller(Math.floor(seed) + 1);
        // contact shadow
        if (r > 2 * s) {
          ca.globalAlpha = 0.32;
          ca.fillStyle = '#000';
          stonePath(ca, x + r * 0.12, y + r * 0.18, r * 1.12, parkMiller(Math.floor(seed) + 1), L.angular);
          ca.fill();
        }
        // body
        ca.globalAlpha = 1;
        ca.fillStyle = col;
        stonePath(ca, x, y, r, pr, L.angular);
        ca.fill();
        if (r > 3.5 * s) {
          // soft highlight (top-left) + domed height, only where it is visible
          const g = ca.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r * 1.1);
          g.addColorStop(0, 'rgba(255,255,255,0.22)');
          g.addColorStop(0.6, 'rgba(255,255,255,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.18)');
          ca.fillStyle = g;
          stonePath(ca, x, y, r, parkMiller(Math.floor(seed) + 1), L.angular);
          ca.fill();
          const hg = ch.createRadialGradient(x, y, 0, x, y, r);
          hg.addColorStop(0, 'rgb(235,235,235)');
          hg.addColorStop(0.7, 'rgb(190,190,190)');
          hg.addColorStop(1, 'rgb(120,120,120)');
          ch.fillStyle = hg;
        } else {
          ch.fillStyle = 'rgb(200,200,200)';
        }
        stonePath(ch, x, y, r, parkMiller(Math.floor(seed) + 1), L.angular);
        ch.fill();
      }
    }
  }

  // large-scale tonal variation (moisture, compaction, wear)
  const noise = valueNoise(W, H, 10, rng);
  const img = ca.getImageData(0, 0, W, H);
  const d = img.data;
  for (let p = 0, q = 0; p < d.length; p += 4, q++) {
    const m = 1 + noise[q] * L.blotch * 1.6;
    d[p] = Math.max(0, Math.min(255, d[p] * m));
    d[p + 1] = Math.max(0, Math.min(255, d[p + 1] * m));
    d[p + 2] = Math.max(0, Math.min(255, d[p + 2] * m));
  }
  ca.putImageData(img, 0, 0);

  // normal map from height (Sobel, wrapped)
  const hraw = ch.getImageData(0, 0, W, H).data;
  const hf = new Float32Array(W * H);
  for (let q = 0; q < hf.length; q++) hf[q] = hraw[q << 2] / 255;
  const normal = make(W, H);
  const cn = normal.getContext('2d');
  const out = cn.createImageData(W, H);
  const o = out.data;
  const k = L.relief * s;
  for (let y = 0; y < H; y++) {
    const ym = ((y - 1 + H) % H) * W;
    const y0 = y * W;
    const yp = ((y + 1) % H) * W;
    for (let x = 0; x < W; x++) {
      const xm = (x - 1 + W) % W;
      const xp = (x + 1) % W;
      const gx = hf[ym + xp] + 2 * hf[y0 + xp] + hf[yp + xp] - hf[ym + xm] - 2 * hf[y0 + xm] - hf[yp + xm];
      const gy = hf[yp + xm] + 2 * hf[yp + x] + hf[yp + xp] - hf[ym + xm] - 2 * hf[ym + x] - hf[ym + xp];
      let nx = -gx * k;
      let ny = gy * k;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const j = (y * W + x) << 2;
      o[j] = (nx * 0.5 + 0.5) * 255;
      o[j + 1] = (ny * 0.5 + 0.5) * 255;
      o[j + 2] = (nz * 0.5 + 0.5) * 255;
      o[j + 3] = 255;
    }
  }
  cn.putImageData(out, 0, 0);
  return { albedo, normal };
}

export function paintAllNatural(W, make) {
  return NATURAL.map((_, i) => paintLayer(i, W, make));
}
export { hex };

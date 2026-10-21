// Ambient dust (6.8) — GPU-drifted points.
import { Points, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { pointsMaterial } from './points.js';
import { parkMiller } from './rng.js';

export function createDust(cfg) {
  const max = 500;
  const rng = parkMiller(5);
  const pos = new Float32Array(max * 3);
  const seed = new Float32Array(max * 4);
  const size = new Vector3(18, 9, 8);
  const min = new Vector3(-9, 1.5 - 4.5, -4);
  for (let i = 0; i < max; i++) {
    pos[i * 3] = min.x + rng() * size.x;
    pos[i * 3 + 1] = min.y + rng() * size.y;
    pos[i * 3 + 2] = min.z + rng() * size.z;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = rng();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4));
  geo.setDrawRange(0, cfg.dust);
  const mat = pointsMaterial('dust', { uBoxMin: { value: min }, uBoxSize: { value: size } });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    mat,
    setCount(n) {
      geo.setDrawRange(0, Math.min(max, n));
    },
  };
}

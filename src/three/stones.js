// Instanced aggregate stones (6.7): idle swirl (time) + scroll-driven absorb (state).
import { InstancedMesh, IcosahedronGeometry, MeshStandardMaterial, Color, Matrix4, Vector3, Quaternion, DynamicDrawUsage } from 'three';
import { H, GROUND_Y } from './layerData.js';
import { parkMiller } from './rng.js';

const COLORS = ['#8A7454', '#6B604F', '#A08A66', '#4A4238', '#B8A888', '#5C5347'];
const R = 2.05; // spec 2.3 — slightly tighter cloud at the closer hero framing
const RX = R * 1.6;
const RY = R * 0.55;
const RZ = R;
const CY = 2.8; // spec 3.1 — lowered with the closer hero camera (CHANGELOG)

export function createStones(cfg, layerMeshes) {
  const max = 380;
  const mesh = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshStandardMaterial({ roughness: 0.8, metalness: 0, flatShading: true }),
    max,
  );
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.castShadow = cfg.stoneShadows;
  mesh.frustumCulled = false;
  mesh.count = cfg.stones;
  const rng = parkMiller(23);
  const c = new Color();

  // per-instance data
  const rho = new Float32Array(max);
  const th0 = new Float32Array(max);
  const hy = new Float32Array(max);
  const w = new Float32Array(max);
  const phase = new Float32Array(max);
  const axis = [];
  const spin = new Float32Array(max);
  const sc = new Float32Array(max * 3);
  const start = new Float32Array(max);
  const lx = new Float32Array(max);
  const lz = new Float32Array(max);
  const tgt = new Uint8Array(max);

  for (let i = 0; i < max; i++) {
    // uniform point in unit sphere → ellipsoid
    let x, y, z;
    do {
      x = rng() * 2 - 1;
      y = rng() * 2 - 1;
      z = rng() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    rho[i] = Math.hypot(x, z);
    th0[i] = Math.atan2(z, x);
    hy[i] = CY + y * RY;
    w[i] = 0.15 + 0.1 * rng();
    phase[i] = rng() * Math.PI * 2;
    axis.push(new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize());
    spin[i] = 0.3 + rng() * 0.9;
    const s = 0.13 * (0.4 + rng() * 1.2);
    sc[i * 3] = s * (0.8 + rng() * 0.45);
    sc[i * 3 + 1] = s * (0.65 + rng() * 0.4);
    sc[i * 3 + 2] = s * (0.8 + rng() * 0.4);
    start[i] = rng() * 0.7; // arrival waves
    lx[i] = (rng() - 0.5) * 6.2;
    lz[i] = (rng() - 0.5) * 2.8;
    // layer that is dropping when this stone lands (p = 0.10 + absorb·0.30)
    const p = 0.1 + (start[i] + 0.3) * 0.3;
    tgt[i] = p < 0.18 ? 1 : p < 0.24 ? 2 : p < 0.3 ? 3 : 4;
    mesh.setColorAt(i, c.set(COLORS[i % COLORS.length]));
  }
  mesh.instanceColor.needsUpdate = true;

  const m4 = new Matrix4();
  const pos = new Vector3();
  const land = new Vector3();
  const q = new Quaternion();
  const s3 = new Vector3();
  const easeInCubic = (t) => t * t * t;

  return {
    mesh,
    setCount(n) {
      mesh.count = Math.min(max, n);
    },
    update(absorb, time) {
      if (absorb >= 0.999) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const n = mesh.count;
      for (let i = 0; i < n; i++) {
        const a = th0[i] + w[i] * time;
        pos.set(RX * rho[i] * Math.cos(a), hy[i] + 0.12 * Math.sin(time * 2 * Math.PI * 0.6 + phase[i]), RZ * rho[i] * Math.sin(a));
        let k = (absorb - start[i]) / 0.3;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        let shrink = 1;
        if (k > 0) {
          const L = layerMeshes[tgt[i]];
          land.set(lx[i], L.position.y + H[tgt[i]] / 2, lz[i]);
          pos.lerp(land, easeInCubic(k));
          if (k > 0.85) shrink = 1 - (k - 0.85) / 0.15;
        }
        q.setFromAxisAngle(axis[i], spin[i] * time + phase[i]);
        s3.set(sc[i * 3] * shrink, sc[i * 3 + 1] * shrink, sc[i * 3 + 2] * shrink);
        m4.compose(pos, q, s3);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
export { GROUND_Y };

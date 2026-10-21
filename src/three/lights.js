// Light rig + per-theme values (6.6). Theme is a mix value m: 0 = light, 1 = dark.
import { HemisphereLight, DirectionalLight, PointLight, Color, Mesh, PlaneGeometry, ShadowMaterial } from 'three';

export const THEME_VALUES = {
  light: {
    hemiSky: '#FFFFFF', hemiGround: '#B8AE9E', hemiI: 1.1,
    keyC: '#FFF6E8', keyI: 2.4,
    rimC: '#B8C9B0', rimI: 0.6,
    fillC: '#FFE2B0', fillI: 3,
    shadow: 0.16, exposure: 1.1,
    floorC: '#D5D1C6', floorA: 0.12, ao: 0.3, fogC: '#ECEAE4', markGlow: 0,
    terrainC: '#F4F0E6', hillC: '#DCD6C6', lampGlow: 0.0, lampPool: 0.0,
    dustC: '#8A857A', dustO: 0.35,
    seal: '#E8940F', glowPeak: 0.9, glowSettle: 0.35, glowHalo: 0.25,
    moteC: '#2F8F4E',
  },
  dark: {
    hemiSky: '#8E8E88', hemiGround: '#2A1E10', hemiI: 0.95,
    keyC: '#FFD9A0', keyI: 3.4,
    rimC: '#C9CDD4', rimI: 0.8,
    fillC: '#FFA040', fillI: 9,
    shadow: 0.45, exposure: 1.25,
    floorC: '#0E0F0D', floorA: 0.2, ao: 0.5, fogC: '#1B1913', markGlow: 0.55,
    terrainC: '#433F32', hillC: '#2A2820', lampGlow: 1.0, lampPool: 0.22,
    dustC: '#F5C862', dustO: 0.55,
    seal: '#FFB13B', glowPeak: 1.6, glowSettle: 0.6, glowHalo: 1.0,
    moteC: '#8FD694',
  },
};

// pre-parse colours once
const PARSED = {};
for (const t of ['light', 'dark']) {
  PARSED[t] = {};
  for (const [k, v] of Object.entries(THEME_VALUES[t])) PARSED[t][k] = typeof v === 'string' ? new Color(v) : v;
}

/** Writes the mixed theme values into `out` (reused object — no allocations per frame). */
export function mixTheme(m, out) {
  const a = PARSED.light;
  const b = PARSED.dark;
  for (const k in a) {
    if (a[k] instanceof Color) {
      if (!out[k]) out[k] = new Color();
      out[k].copy(a[k]).lerp(b[k], m);
    } else out[k] = a[k] + (b[k] - a[k]) * m;
  }
  out.additive = m >= 0.5; // blending swaps at the tween midpoint
  return out;
}

export function createLights(scene, cfg) {
  const hemi = new HemisphereLight();
  const key = new DirectionalLight();
  key.position.set(9, 11, 4); // low warm sun raking across the road
  key.castShadow = cfg.shadows;
  key.shadow.mapSize.set(cfg.shadowMap, cfg.shadowMap);
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -18;
  sc.right = sc.top = 18;
  sc.near = 1;
  sc.far = 60;
  key.target.position.set(0, 0, -10);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  key.shadow.blurSamples = 12;
  const rim = new DirectionalLight();
  rim.position.set(-8, 4, -6);
  const fill = new PointLight();
  fill.distance = 20;
  fill.position.set(-2, 3, 8);
  scene.add(hemi, key, key.target, rim, fill);

  const ground = new Mesh(new PlaneGeometry(80, 80), new ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.receiveShadow = true;
  ground.visible = false; // terrain receives the shadows now
  scene.add(ground);

  return {
    key,
    ground,
    apply(v) {
      hemi.color.copy(v.hemiSky);
      hemi.groundColor.copy(v.hemiGround);
      hemi.intensity = v.hemiI;
      key.color.copy(v.keyC);
      key.intensity = v.keyI;
      rim.color.copy(v.rimC);
      rim.intensity = v.rimI;
      fill.color.copy(v.fillC);
      fill.intensity = v.fillI;
      ground.material.opacity = v.shadow;
    },
  };
}

// Crack groove + sealant tube + glow (6.9) — the product moment.
// All three curves (main path + 2 branches) are merged into ONE geometry per mesh.
// Per-vertex `aFillAt` says at which `sealFill` value that vertex becomes visible:
//   main:     aFillAt = u                       (u = 0…1 along the curve)
//   branch 1: aFillAt = 0.35 + 0.2·u   ⇔  clamp((sealFill − 0.35)/0.2) ≥ u
//   branch 2: aFillAt = 0.60 + 0.2·u   ⇔  clamp((sealFill − 0.60)/0.2) ≥ u
import {
  CatmullRomCurve3, Vector3, TubeGeometry, BufferGeometry, Float32BufferAttribute, Mesh, Group,
  MeshStandardMaterial, ShaderMaterial, SphereGeometry, MeshBasicMaterial, Points, Color,
  AdditiveBlending, NormalBlending, DoubleSide,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pointsMaterial } from './points.js';
import { parkMiller } from './rng.js';

const MAIN = [[-2.6, -0.6], [-1.8, -0.1], [-1.2, -0.5], [-0.4, 0.3], [0.3, -0.2], [1.0, 0.4], [1.8, 0.0], [2.6, 0.5]];
const B1 = [[-1.2, -0.5], [-1.02, -0.78], [-1.0, -1.1]];
const B2 = [[1.0, 0.4], [1.18, 0.7], [1.25, 1.05]];
const Y_SEAL = 0.012;

const curveOf = (pts, y) => new CatmullRomCurve3(pts.map(([x, z]) => new Vector3(x, y, z)), false, 'catmullrom', 0);
const FILL = [
  (u) => u,
  (u) => 0.35 + 0.2 * u,
  (u) => 0.6 + 0.2 * u,
];

function tubeWithFill(curve, segs, radius, radial, fillFn) {
  const g = new TubeGeometry(curve, segs, radius, radial, false);
  const uv = g.attributes.uv;
  const f = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) f[i] = fillFn(uv.getX(i));
  g.setAttribute('aFillAt', new Float32BufferAttribute(f, 1));
  return g;
}

function groove(curve, segs, halfW, rng, fillFn) {
  const pos = [];
  const off = [];
  const idx = [];
  const fa = [];
  const p = new Vector3();
  const t = new Vector3();
  let wobble = 1;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    const nx = -t.z;
    const nz = t.x;
    const nl = Math.hypot(nx, nz) || 1;
    wobble = wobble * 0.7 + (0.55 + rng() * 0.9) * 0.3;
    const taper = Math.min(1, u * 8, (1 - u) * 8);
    const w = halfW * wobble * (0.25 + 0.75 * taper);
    for (const s of [-1, 1]) {
      pos.push(p.x, p.y, p.z);
      off.push((s * w * nx) / nl, 0, (s * w * nz) / nl);
      fa.push(fillFn(u));
    }
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aOff', new Float32BufferAttribute(off, 3));
  g.setAttribute('aFillAt', new Float32BufferAttribute(fa, 1));
  g.setIndex(idx);
  return g;
}

export function createCrack(topY) {
  const group = new Group();
  group.position.y = topY; // local to the BC mesh: y = top face
  const rng = parkMiller(31);

  const curves = [curveOf(MAIN, Y_SEAL), curveOf(B1, Y_SEAL), curveOf(B2, Y_SEAL)];
  const grooveCurves = [curveOf(MAIN, 0.004), curveOf(B1, 0.004), curveOf(B2, 0.004)];

  const uniforms = {
    uFill: { value: 0 },
    uGlow: { value: 0 },
    uTime: { value: 0 },
    uOpen: { value: 0 },
    uHalo: { value: 1 },
    uSeal: { value: new Color('#FFB13B') },
  };

  // 1) groove — flat black ribbon; width grows with crackOpen
  const gGeo = mergeGeometries([
    groove(grooveCurves[0], 180, 0.035, rng, FILL[0]),
    groove(grooveCurves[1], 24, 0.026, rng, FILL[1]),
    groove(grooveCurves[2], 24, 0.026, rng, FILL[2]),
  ]);
  const gMat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uOpen;
      attribute vec3 aOff;
      void main() {
        vec3 p = position + aOff * uOpen;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `void main(){ gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0); }`,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: DoubleSide,
  });
  const grooveMesh = new Mesh(gGeo, gMat);
  grooveMesh.renderOrder = 1;

  // 2) sealant — lit tube, clipped at uFill, brighter flowing head, faint shimmer
  const sGeo = mergeGeometries([
    tubeWithFill(curves[0], 200, 0.035, 8, FILL[0]),
    tubeWithFill(curves[1], 30, 0.03, 8, FILL[1]),
    tubeWithFill(curves[2], 30, 0.03, 8, FILL[2]),
  ]);
  const sMat = new MeshStandardMaterial({ color: '#FFB13B', emissive: '#FFB13B', roughness: 0.35, metalness: 0 });
  sMat.onBeforeCompile = (sh) => {
    sh.uniforms.uFill = uniforms.uFill;
    sh.uniforms.uGlow = uniforms.uGlow;
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFillAt;\nvarying float vFillAt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFillAt = aFillAt;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFill;\nuniform float uGlow;\nuniform float uTime;\nvarying float vFillAt;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFillAt > uFill) discard;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float head = smoothstep(uFill - 0.04, uFill, vFillAt) * step(uFill, 0.999);
        totalEmissiveRadiance *= uGlow * (1.0 + 2.0 * head) * (1.0 + 0.05 * sin(uTime * 7.54));`,
      );
  };
  sMat.customProgramCacheKey = () => 'iept-sealant';
  const sealMesh = new Mesh(sGeo, sMat);
  sealMesh.renderOrder = 2;

  // 3) glow — wide halo tube
  const hGeo = mergeGeometries([
    tubeWithFill(curves[0], 160, 0.12, 8, FILL[0]),
    tubeWithFill(curves[1], 24, 0.1, 8, FILL[1]),
    tubeWithFill(curves[2], 24, 0.1, 8, FILL[2]),
  ]);
  const hMat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aFillAt;
      varying float vFillAt;
      varying float vFres;
      void main() {
        vFillAt = aFillAt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFres = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFill;
      uniform float uGlow;
      uniform float uHalo;
      uniform float uTime;
      uniform vec3 uSeal;
      varying float vFillAt;
      varying float vFres;
      void main() {
        if (vFillAt > uFill) discard;
        float head = smoothstep(uFill - 0.05, uFill, vFillAt) * step(uFill, 0.999);
        float a = pow(vFres, 2.0) * uGlow * uHalo * (0.45 + 0.9 * head) * (1.0 + 0.05 * sin(uTime * 7.54));
        gl_FragColor = vec4(uSeal, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const glowMesh = new Mesh(hGeo, hMat);
  glowMesh.renderOrder = 3;

  // head bead
  const bead = new Mesh(new SphereGeometry(0.06, 14, 10), new MeshBasicMaterial({ color: '#FFD27A' }));
  bead.renderOrder = 4;

  // dust puff along the crack as it opens (60 points)
  const puffN = 60;
  const pp = new Float32Array(puffN * 3);
  const ps = new Float32Array(puffN * 4);
  const v = new Vector3();
  for (let i = 0; i < puffN; i++) {
    curves[0].getPointAt(rng(), v);
    pp.set([v.x, 0.02, v.z], i * 3);
    ps.set([rng(), rng(), rng(), rng()], i * 4);
  }
  const puffGeo = new BufferGeometry();
  puffGeo.setAttribute('position', new Float32BufferAttribute(pp, 3));
  puffGeo.setAttribute('aSeed', new Float32BufferAttribute(ps, 4));
  const puffMat = pointsMaterial('puff');
  puffMat.uniforms.uColor.value.set('#9A978C');
  puffMat.uniforms.uSize.value = 0.06;
  const puff = new Points(puffGeo, puffMat);
  puff.frustumCulled = false;

  group.add(grooveMesh, sealMesh, glowMesh, bead, puff);

  return {
    group,
    curve: curves[0],
    puffMat,
    update(S, T, time) {
      const open = S.crackOpen;
      grooveMesh.visible = open > 0.001;
      uniforms.uOpen.value = open;
      puff.visible = open > 0.001 && open < 0.999;
      puffMat.uniforms.uProgress.value = open;

      const fill = S.sealFill;
      uniforms.uFill.value = fill;
      uniforms.uTime.value = time;
      const g = S.glowA * (T.glowSettle + (T.glowPeak - T.glowSettle) * S.glowB);
      uniforms.uGlow.value = g;
      uniforms.uHalo.value = T.glowHalo;
      uniforms.uSeal.value.copy(T.seal);
      sMat.color.copy(T.seal);
      sMat.emissive.copy(T.seal);
      const has = fill > 0.0005;
      sealMesh.visible = has;
      glowMesh.visible = has && g > 0.001;
      const b = T.additive ? AdditiveBlending : NormalBlending;
      if (hMat.blending !== b) {
        hMat.blending = b;
        hMat.needsUpdate = true;
      }
      bead.visible = fill > 0.0005 && fill < 0.999;
      if (bead.visible) {
        curves[0].getPointAt(fill, bead.position);
        bead.scale.setScalar(0.85 + 0.15 * Math.sin(time * 9));
      }
    },
  };
}

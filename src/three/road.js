// The road: a real embankment profile (layers widen with depth, 1 : 1.5 side slopes, a grass berm)
// extruded from the viewer (z = 0, the cut face) to the horizon (z = −LEN).
// Each layer is *paved* from the horizon toward the viewer: fragments beyond the paving front are
// discarded, a moving cap closes the open end, and a glowing edge marks the paver.
import {
  Shape, ShapeGeometry, ExtrudeGeometry, Mesh, MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, Group,
  CanvasTexture, SRGBColorSpace, RepeatWrapping, PlaneGeometry, Float32BufferAttribute,
  InstancedMesh, ConeGeometry, Object3D, Color, InstancedBufferAttribute, ShaderMaterial, Vector3, Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAYERS } from './layerData.js';
import { parkMiller } from './rng.js';

export const LEN = 140; // road length — runs out to the horizon hills
export const S = 1.3; // vertical exaggeration of layer thickness
export const HALF_TOP = 3.6; // half carriageway width (two lanes)
export const BERM = 1.2; // grass berm on top of the subgrade
const H = LAYERS.map((l) => l.h * S);
export const Y = []; // [y0, y1] per layer
{
  let y = 0;
  H.forEach((h) => {
    Y.push([y, y + h]);
    y += h;
  });
}
export const TOP = Y[Y.length - 1][1];
/** half width of layer i at height y */
export const halfW = (i, y) => HALF_TOP + (TOP - y) * 1.5 + (i === 0 ? BERM : 0);

function profile(i, y0, y1) {
  const N = 1;
  const pts = [];
  pts.push([-halfW(i, y0), y0], [halfW(i, y0), y0]);
  for (let k = 1; k <= N; k++) {
    const y = y0 + ((y1 - y0) * k) / N;
    pts.push([halfW(i, y), y]);
  }
  for (let k = 0; k <= N - 1; k++) {
    const y = y1 - ((y1 - y0) * k) / N;
    pts.push([-halfW(i, y), y]);
  }
  const shape = new Shape();
  pts.forEach(([x, y], k) => (k ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  return shape;
}
const ROUGH = [0.97, 0.95, 0.92, 0.86, 0.8];

function clipMaterial(map, normalMap, roughness, uniforms, key) {
  const m = new MeshStandardMaterial({ map, normalMap, normalScale: new Vector2(1.1, 1.1), roughness, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFront = uniforms.uFront;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = position.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFront;\nvarying float vZ;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vZ > uFront + 0.001) discard;');
  };
  m.customProgramCacheKey = () => 'road-clip-' + key;
  return m;
}

export function createRoad(natural, cfg) {
  const group = new Group();
  const layers = LAYERS.map((L, i) => {
    const mk = (canvas, srgb) => {
      const t = new CanvasTexture(canvas);
      if (srgb) t.colorSpace = SRGBColorSpace;
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(1 / 7, 1 / 3.5);
      t.anisotropy = 8;
      return t;
    };
    const tex = mk(natural[i].albedo, true);
    const nrm = mk(natural[i].normal, false);
    const [y0, y1] = Y[i];
    const shape = profile(i, y0, y1);
    const uniforms = { uFront: { value: i === 0 ? 0 : -LEN - 1 } };
    const mat = clipMaterial(tex, nrm, ROUGH[i], uniforms, i);
    const hiddenCaps = new MeshBasicMaterial({ visible: false });
    const geo = new ExtrudeGeometry(shape, { depth: LEN, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -LEN);
    const body = new Mesh(geo, [hiddenCaps, mat]);
    body.castShadow = body.receiveShadow = cfg.shadows;
    // moving front cap (becomes the cut face when paving completes)
    const capGeo = new ShapeGeometry(shape);
    const cap = new Mesh(
      capGeo,
      new MeshStandardMaterial({ map: tex, normalMap: nrm, normalScale: new Vector2(1.1, 1.1), roughness: ROUGH[i] }),
    );
    cap.receiveShadow = cfg.shadows;
    // paver edge glow
    const edge = new Mesh(
      new BoxGeometry(halfW(i, y1) * 2 + 0.02, 0.035, 0.07),
      new MeshBasicMaterial({ color: '#FFC54A', toneMapped: false, transparent: true }),
    );
    edge.position.y = y1 + 0.01;
    group.add(body, cap, edge);
    return { body, cap, edge, uniforms, y0, y1 };
  });

  // ── lane markings (paint themselves from the viewer toward the horizon) ──
  const markU = { uPaint: { value: 1 }, uGlow: { value: 0 } };
  const parts = [];
  const plane = (x, z, w, l, col) => {
    const g = new PlaneGeometry(w, l);
    g.rotateX(-Math.PI / 2);
    g.translate(x, TOP + 0.006, z);
    const c = new Color(col);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) arr.set([c.r, c.g, c.b], k * 3);
    g.setAttribute('color', new Float32BufferAttribute(arr, 3));
    parts.push(g);
  };
  plane(-(HALF_TOP - 0.3), -LEN / 2, 0.13, LEN, '#F2F2EE');
  plane(HALF_TOP - 0.3, -LEN / 2, 0.13, LEN, '#F2F2EE');
  for (let z = -0.9; z > -LEN; z -= 3.2) plane(0, z, 0.13, 1.8, '#F5B301');
  const markMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0 });
  markMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, markU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = position.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPaint;\nuniform float uGlow;\nvarying float vZ;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vZ < uPaint) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * uGlow * (1.0 + 3.0 * smoothstep(uPaint + 1.5, uPaint, vZ));');
  };
  markMat.customProgramCacheKey = () => 'road-marks';
  markMat.polygonOffset = true;
  markMat.polygonOffsetFactor = -2;
  const marks = new Mesh(mergeGeometries(parts), markMat);
  marks.receiveShadow = cfg.shadows;
  group.add(marks);

  // ── grass tufts on the berm + embankment slope (grow near → far) ──
  const tuftN = cfg.tufts;
  const tuftGeo = new ConeGeometry(0.09, 0.2, 5, 1);
  tuftGeo.translate(0, 0.1, 0);
  const tuftMat = new MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  const growU = { uGrow: { value: 0 } };
  tuftMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrow = growU.uGrow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uGrow;\nattribute float aDelay;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat g = clamp((uGrow * 1.6 - aDelay) / 0.35, 0.0, 1.0);\ng = g * g * (3.0 - 2.0 * g);\ntransformed *= g;',
      );
  };
  tuftMat.customProgramCacheKey = () => 'road-tufts';
  const tufts = new InstancedMesh(tuftGeo, tuftMat, tuftN);
  const rng = parkMiller(71);
  const o = new Object3D();
  const delay = new Float32Array(tuftN);
  const col = new Color();
  const bermY = Y[0][1];
  const bermIn = halfW(1, bermY);
  const bermOut = halfW(0, bermY);
  const footOut = halfW(0, 0);
  for (let k = 0; k < tuftN; k++) {
    const side = rng() < 0.5 ? -1 : 1;
    const z = -Math.pow(rng(), 1.6) * 34;
    let x;
    let y;
    if (rng() < 0.62) {
      x = bermIn + 0.1 + rng() * (bermOut - bermIn - 0.1);
      y = bermY;
    } else {
      const t = rng();
      x = bermOut + t * (footOut - bermOut);
      y = bermY * (1 - t);
    }
    o.position.set(side * x, y, z);
    o.rotation.set((rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4);
    o.scale.setScalar(0.6 + rng() * 0.9);
    o.updateMatrix();
    tufts.setMatrixAt(k, o.matrix);
    delay[k] = (-z / 34) * 1.1 + rng() * 0.15;
    tufts.setColorAt(k, col.setHSL(0.27 + rng() * 0.07, 0.38 + rng() * 0.2, 0.24 + rng() * 0.12));
  }
  tuftGeo.setAttribute('aDelay', new InstancedBufferAttribute(delay, 1));
  tufts.castShadow = false;
  tufts.frustumCulled = false;
  group.add(tufts);

  // ── ground: page-coloured earth that fades out, with contact shade along the embankment ──
  const floorU = {
    uColor: { value: new Color() },
    uAlpha: { value: 0.6 },
    uAO: { value: 0.3 },
    uHalf: { value: new Vector2(halfW(0, 0), LEN / 2) },
    uCenter: { value: new Vector3(0, 0, -LEN / 2) },
    uFocus: { value: new Vector3(0, 0, -8) },
  };
  const floor = new Mesh(
    new PlaneGeometry(160, 160),
    new ShaderMaterial({
      uniforms: floorU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uAlpha; uniform float uAO; uniform vec2 uHalf; uniform vec3 uCenter; uniform vec3 uFocus;
        varying vec3 vW;
        void main() {
          vec2 d = abs(vW.xz - uCenter.xz) - uHalf;
          float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
          float ao = (1.0 - smoothstep(-0.3, 2.2, sdf)) * uAO;
          float fade = 1.0 - smoothstep(10.0, 34.0, length(vW.xz - uFocus.xz));
          gl_FragColor = vec4(mix(uColor, vec3(0.0), clamp(ao * 1.3, 0.0, 0.6)), clamp(fade * uAlpha + ao * fade, 0.0, 1.0));
          #include <colorspace_fragment>
        }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.004;
  floor.renderOrder = -1;
  group.add(floor);

  // label anchors on the cut face, mid-height of each layer
  const anchors = LAYERS.map((_, i) => {
    const ym = (Y[i][0] + Y[i][1]) / 2;
    return new Vector3(-2.2, ym, 0.02); // a clean vertical column on the cut face
  });

  return {
    group,
    anchors,
    update(St, T) {
      for (let i = 0; i < layers.length; i++) {
        const L = layers[i];
        const p = i === 0 ? 1 : St[`pave${i}`];
        const front = -LEN + p * LEN; // horizon → viewer
        L.uniforms.uFront.value = p <= 0.0001 ? -LEN - 1 : front;
        L.body.visible = p > 0.0001;
        L.cap.visible = p > 0.0001;
        L.cap.position.z = front;
        L.edge.visible = p > 0.0001 && p < 0.9995;
        L.edge.position.z = front + 0.04;
        L.edge.material.opacity = Math.min(1, (1 - p) * 12);
      }
      markU.uPaint.value = 0.5 - St.paint * (LEN + 1);
      markU.uGlow.value = T.markGlow;
      marks.visible = St.paint > 0.0001;
      growU.uGrow.value = St.ecoGrow;
      tufts.visible = St.ecoGrow > 0.0001;
      floorU.uColor.value.copy(T.floorC);
      floorU.uAlpha.value = T.floorA;
      floorU.uAO.value = T.ao;
    },
  };
}

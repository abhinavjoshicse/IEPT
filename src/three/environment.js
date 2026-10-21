// The world around the road: lit terrain that fades into the haze, low hills on the horizon,
// and streetlights along the berms that rise and switch on (near → far) once the road is done.
import {
  Mesh, PlaneGeometry, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, RepeatWrapping, Color,
  InstancedMesh, CylinderGeometry, BoxGeometry, Object3D, InstancedBufferAttribute, Group,
  BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, AdditiveBlending, NormalBlending,
  IcosahedronGeometry, CircleGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { parkMiller } from './rng.js';
import { Y, halfW, TOP, HALF_TOP } from './road.js';

function terrainCanvas(size = 512) {
  // mottled ground: soft patches + fine grain, greyscale (tinted by the material colour per theme)
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rng = parkMiller(5);
  g.fillStyle = '#d2d2d2';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 12 + rng() * 60;
    const v = 175 + Math.floor(rng() * 55);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.2)`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.save();
      g.translate(dx, dy);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.floor(rng() * 90);
    g.fillStyle = `rgba(${v},${v},${v},${0.15 + rng() * 0.25})`;
    g.fillRect(rng() * size, rng() * size, 1 + rng() * 1.5, 1 + rng() * 1.5);
  }
  return c;
}

export function createEnvironment(cfg, LEN) {
  const group = new Group();

  // ── terrain ──
  const tex = new CanvasTexture(terrainCanvas());
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(26, 26);
  tex.anisotropy = 8;
  const terrainMat = new MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
  const terrain = new Mesh(new PlaneGeometry(320, 320), terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(0, -0.02, -90);
  terrain.receiveShadow = cfg.shadows;
  group.add(terrain);

  // ── horizon hills (low-poly ridges, softened by fog into silhouettes) ──
  const rng = parkMiller(19);
  const hills = [];
  for (let k = 0; k < 14; k++) {
    const g = new IcosahedronGeometry(1, 1);
    const sx = 18 + rng() * 34;
    const sy = 3 + rng() * 7;
    const sz = 10 + rng() * 14;
    g.scale(sx, sy, sz);
    const side = k % 2 ? 1 : -1;
    g.translate(side * (16 + rng() * 80), -sy * 0.3, -LEN + 10 - rng() * 45);
    hills.push(g);
  }
  const hillMat = new MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true });
  const hillMesh = new Mesh(mergeGeometries(hills), hillMat);
  group.add(hillMesh);

  // ── streetlights on both berms ──
  const bermY = Y[0][1];
  const poleX = halfW(1, bermY) + 0.45;
  const spacing = 10;
  const posts = [];
  for (let z = -3; z > -LEN + 4; z -= spacing) {
    posts.push([-poleX, z, 1], [poleX, z - spacing / 2, -1]);
  }
  const n = posts.length;
  const poleH = 6.2;
  const armL = 2.3;
  const pole = new CylinderGeometry(0.07, 0.1, poleH, 8).translate(0, poleH / 2, 0);
  const arm = new BoxGeometry(armL, 0.08, 0.08).translate(armL / 2, poleH - 0.05, 0);
  const head = new BoxGeometry(0.75, 0.12, 0.26).translate(armL - 0.2, poleH - 0.14, 0);
  const lampGeo = mergeGeometries([pole, arm, head]);
  const delay = new Float32Array(n);
  posts.forEach((p, i) => (delay[i] = Math.min(1, -p[1] / LEN) * 0.85));
  lampGeo.setAttribute('aDelay', new InstancedBufferAttribute(delay, 1));
  const poleU = { uRise: { value: 0 } };
  const poleMat = new MeshStandardMaterial({ color: '#4a4c48', roughness: 0.5, metalness: 0.5 });
  poleMat.onBeforeCompile = (sh) => {
    sh.uniforms.uRise = poleU.uRise;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uRise;\nattribute float aDelay;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat r = clamp((uRise * 1.9 - aDelay) / 0.35, 0.0, 1.0);\nr = r * r * (3.0 - 2.0 * r);\ntransformed.y *= r;\ntransformed.xz *= step(0.001, r);',
      );
  };
  poleMat.customProgramCacheKey = () => 'env-poles';
  const lamps = new InstancedMesh(lampGeo, poleMat, n);
  const o = new Object3D();
  posts.forEach(([x, z, dir], i) => {
    o.position.set(x, bermY, z);
    o.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
    o.updateMatrix();
    lamps.setMatrixAt(i, o.matrix);
  });
  lamps.castShadow = cfg.shadows;
  lamps.frustumCulled = false;
  group.add(lamps);

  // lamp glow sprites + light pools on the carriageway (fake lights: no per-pixel cost)
  const headPos = new Float32Array(n * 3);
  const poolPos = new Float32Array(n * 3);
  const d2 = new Float32Array(n);
  posts.forEach(([x, z, dir], i) => {
    const hx = x + dir * (armL - 0.2);
    headPos.set([hx, bermY + poleH - 0.25, z], i * 3);
    poolPos.set([Math.sign(x) * (HALF_TOP - 1.1), TOP + 0.02, z], i * 3);
    d2[i] = delay[i];
  });
  const glowU = { uOn: { value: 0 }, uSize: { value: 1.6 }, uViewH: { value: 900 }, uColor: { value: new Color('#FFC66B') }, uAlpha: { value: 1 } };
  const glowGeo = new BufferGeometry();
  glowGeo.setAttribute('position', new Float32BufferAttribute(headPos, 3));
  glowGeo.setAttribute('aDelay', new Float32BufferAttribute(d2, 1));
  const glowMat = new ShaderMaterial({
    uniforms: glowU,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uOn; uniform float uSize; uniform float uViewH;
      attribute float aDelay; varying float vA;
      void main() {
        vA = clamp((uOn * 1.9 - aDelay - 0.25) / 0.2, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * projectionMatrix[1][1] * uViewH * 0.5 / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.12, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.35;
        float a = (core + halo) * vA * uAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * (1.0 + core), a);
        #include <colorspace_fragment>
      }`,
  });
  const glows = new Points(glowGeo, glowMat);
  glows.frustumCulled = false;
  group.add(glows);

  const poolGeos = posts.map((_, i) => {
    const g = new CircleGeometry(2.6, 24);
    g.rotateX(-Math.PI / 2);
    g.translate(poolPos[i * 3], poolPos[i * 3 + 1], poolPos[i * 3 + 2]);
    const a = new Float32Array(g.attributes.position.count).fill(delay[i]);
    g.setAttribute('aDelay', new Float32BufferAttribute(a, 1));
    return g;
  });
  const poolU = { uOn: { value: 0 }, uColor: { value: new Color('#FFB24A') }, uAlpha: { value: 0.22 } };
  const poolMat = new ShaderMaterial({
    uniforms: poolU,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    vertexShader: /* glsl */ `
      uniform float uOn; attribute float aDelay; varying float vA; varying vec2 vL;
      void main() {
        vA = clamp((uOn * 1.9 - aDelay - 0.25) / 0.2, 0.0, 1.0);
        vL = uv - 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; varying float vA; varying vec2 vL;
      void main() {
        float f = smoothstep(0.5, 0.0, length(vL));
        gl_FragColor = vec4(uColor, f * f * vA * uAlpha);
        #include <colorspace_fragment>
      }`,
  });
  const pools = new Mesh(mergeGeometries(poolGeos), poolMat);
  pools.renderOrder = 3;
  group.add(pools);

  return {
    group,
    glowMat,
    update(S, T) {
      terrainMat.color.copy(T.terrainC);
      hillMat.color.copy(T.hillC);
      poleU.uRise.value = S.lights;
      lamps.visible = S.lights > 0.0005;
      glowU.uOn.value = S.lights;
      glowU.uAlpha.value = T.lampGlow;
      glows.visible = S.lights > 0.0005 && T.lampGlow > 0.01;
      poolU.uOn.value = S.lights;
      poolU.uAlpha.value = T.lampPool;
      pools.visible = glows.visible && T.lampPool > 0.005;
      const b = T.additive ? AdditiveBlending : NormalBlending;
      if (glowMat.blending !== b) {
        glowMat.blending = b;
        glowMat.needsUpdate = true;
      }
    },
  };
}

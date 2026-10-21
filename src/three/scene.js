// Renderer, camera, resize, per-frame update. Loaded lazily after first paint.
// Scene: a road embankment running from the viewer (cut face, z = 0) to the horizon.
import {
  WebGLRenderer, Scene, PerspectiveCamera, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap,
  Vector3, Vector2, Fog,
} from 'three';
import { TIER, isSoftwareGL } from './quality.js';
import { makeNaturalCanvases } from './textures.js';
import { createLights, mixTheme } from './lights.js';
import { createDust } from './dust.js';
import { createCrack } from './crack.js';
import { createEco } from './eco.js';
import { createLabels } from './labels.js';
import { setBlend } from './points.js';
import { createRoad, TOP, LEN } from './road.js';
import { createEnvironment } from './environment.js';

const QA = new URLSearchParams(location.search);

/** Responsive framing: canonical keyframes are authored for 1440 × 900. */
function framing(w, mode, h = 900) {
  const tall = h / Math.max(1, w);
  if (mode === 'figure') return { k: 1, fov: 34, shift: 0, tgtY: 0, tgtX: null };
  if (w >= 1100) return { k: Math.min(1.4, Math.max(1, (1440 / w) ** 1.5)), fov: 34, shift: Math.max(0, 1440 - w) * 0.55, tgtY: 0, tgtX: null };
  if (w >= 600) return { k: 1.35, fov: 36, shift: 0, tgtY: 3.2 + Math.max(0, tall - 1) * 3, tgtX: 1.2 };
  return { k: 1.7, fov: 42, shift: 0, tgtY: 4 + Math.max(0, tall - 1.6) * 3, tgtX: 1.6 };
}

export async function createScene({ canvas, S, tier, theme, container }) {
  const cfg = { ...TIER[tier] };
  const minFrameMs = isSoftwareGL() ? 1000 / 20 : 0;
  let lastFrame = -1e9;
  const renderer = new WebGLRenderer({ canvas, antialias: cfg.aa, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = cfg.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene(); // transparent: the CSS gradient shows through
  scene.fog = new Fog(0xffffff, 20, 70);
  const camera = new PerspectiveCamera(34, 1, 0.1, 300);
  const target = new Vector3();

  const natural = await makeNaturalCanvases(cfg.tex >= 1024 ? 768 : 384);
  const road = createRoad(natural, cfg);
  scene.add(road.group);
  const env = createEnvironment(cfg, LEN);
  scene.add(env.group);
  const lights = createLights(scene, cfg);
  const dust = createDust(cfg);
  dust.points.position.set(1, 1.5, -6);
  scene.add(dust.points);

  // crack + sealant on the carriageway, running along the road near the viewer
  const crack = createCrack(0);
  crack.group.position.set(0.2, TOP, -6.5);
  crack.group.rotation.y = Math.PI / 2;
  scene.add(crack.group);
  const eco = createEco(crack.curve, 0, cfg);
  crack.group.add(eco.group);

  const labels = createLabels(road.anchors, camera);

  // Warm-up: compile every program now (incl. objects that appear later) so nothing stalls mid-scroll.
  const hidden = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch (e) {
    /* compile lazily */
  }
  hidden.forEach((o) => (o.visible = false));

  const themeMix = { m: theme === 'dark' ? 1 : 0 };
  const T = {};

  let W = 1;
  let Hh = 1;
  let fr = framing(1440, 'story');
  let mode = 'story';
  let lastShift = -1;
  function applyShift() {
    // screen-space shift: moves the subject right of the copy column without changing perspective
    const d = Math.round((fr.shift || 0) + (mode === 'story' && W >= 1100 ? W * S.viewX : 0));
    if (d === lastShift) return;
    lastShift = d;
    camera.aspect = (W + 2 * d) / Hh;
    if (d > 0) camera.setViewOffset(W + 2 * d, Hh, 0, 0, W, Hh);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function setSize(w, h) {
    W = Math.max(1, w);
    Hh = Math.max(1, h);
    renderer.setSize(W, Hh, false);
    fr = framing(W, mode, Hh);
    camera.fov = fr.fov;
    lastShift = -1;
    applyShift();
    const vh = renderer.getDrawingBufferSize(new Vector2()).y;
    dust.mat.uniforms.uViewH.value = vh;
    crack.puffMat.uniforms.uViewH.value = vh;
    eco.moteMat.uniforms.uViewH.value = vh;
    env.glowMat.uniforms.uViewH.value = vh;
  }

  let ro = null;
  if (container && 'ResizeObserver' in window) {
    let t = 0;
    ro = new ResizeObserver((entries) => {
      clearTimeout(t);
      const r = entries[0].contentRect;
      t = setTimeout(() => setSize(r.width, r.height), 100);
    });
    ro.observe(container);
    const r = container.getBoundingClientRect();
    setSize(r.width, r.height);
  }

  function apply(time) {
    mixTheme(themeMix.m, T);
    lights.apply(T);
    renderer.toneMappingExposure = T.exposure;

    road.update(S, T);
    env.update(S, T);

    const tx = fr.tgtX !== null ? fr.tgtX : S.camTgt.x;
    target.set(tx, S.camTgt.y + fr.tgtY + S.shake, S.camTgt.z);
    // slow idle drift keeps the frame alive when the user stops scrolling
    const drift = mode === 'story' ? 1 : 0;
    camera.position.set(
      target.x + (S.camPos.x - S.camTgt.x) * fr.k + Math.sin(time * 0.21) * 0.18 * drift,
      target.y - S.shake + (S.camPos.y - S.camTgt.y) * fr.k + Math.sin(time * 0.17 + 1) * 0.1 * drift,
      target.z + (S.camPos.z - S.camTgt.z) * fr.k,
    );
    camera.lookAt(target);
    if (mode === 'story') applyShift();

    const du = dust.mat.uniforms;
    du.uTime.value = time;
    du.uOpacity.value = T.dustO * S.dustOpacity;
    du.uColor.value.copy(T.dustC);
    setBlend(dust.mat, T.additive);

    crack.update(S, T, time);
    eco.update(S, T, time);
    const dist = camera.position.distanceTo(target);
    scene.fog.color.copy(T.fogC);
    scene.fog.near = dist + 6;
    scene.fog.far = dist + 170;
    scene.updateMatrixWorld();
  }

  let first = true;
  function render(time) {
    apply(time);
    renderer.render(scene, camera);
    if (mode === 'story') labels.update(S.labelsOpacity > 0.001, W, Hh);
    if (first) {
      first = false;
      canvas.classList.add('is-ready');
    }
  }

  // Adaptive resolution: trade pixels, never smoothness.
  const dprMax = Math.min(window.devicePixelRatio || 1, cfg.dpr);
  let dpr = dprMax;
  let ema = 16.7;
  let prev = 0;
  let slow = 0;
  let fast = 0;
  const locked = QA.has('tier');
  function setDpr(v) {
    dpr = Math.max(1, Math.min(dprMax, v));
    renderer.setPixelRatio(dpr);
    setSize(W, Hh);
  }
  function downgrade() {
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      lights.key.castShadow = false;
      scene.traverse((o) => o.material && [].concat(o.material).forEach((m) => (m.needsUpdate = true)));
    }
    dust.setCount(TIER.low.dust);
  }
  function monitor(now) {
    const dt = prev ? now - prev : 16.7;
    prev = now;
    if (dt > 100 || locked) return;
    ema += (dt - ema) * 0.1;
    if (ema > 19) {
      fast = 0;
      if (++slow > 45) {
        slow = 0;
        if (dpr > 1) setDpr(dpr - 0.25);
        else if (ema > 28) downgrade();
      }
    } else if (ema < 13) {
      slow = 0;
      if (++fast > 240 && dpr < dprMax) {
        fast = 0;
        setDpr(dpr + 0.25);
      }
    } else slow = fast = 0;
  }

  return {
    renderer,
    themeMix,
    frame(timeSec, nowMs) {
      if (minFrameMs && nowMs - lastFrame < minFrameMs) return;
      lastFrame = nowMs;
      render(timeSec);
      monitor(nowMs);
    },
    still(w, h, type = 'image/webp') {
      const prevMode = mode;
      mode = 'figure';
      renderer.setPixelRatio(1);
      setSize(w, h);
      render(0);
      const url = canvas.toDataURL(type, 0.86);
      mode = prevMode;
      return url;
    },
    resize: setSize,
    dispose() {
      ro?.disconnect();
      renderer.dispose();
    },
  };
}

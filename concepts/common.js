// Shared setup for concept stills (not part of the site build).
import * as THREE from 'three';
import { paintAll } from '../src/three/paint.js';
import { LAYERS } from '../src/three/layerData.js';

export { THREE, LAYERS };
export const theme = new URLSearchParams(location.search).get('theme') || 'light';
export const dark = theme === 'dark';
document.body.style.margin = 0;
document.body.style.background = dark
  ? 'radial-gradient(ellipse at 62% 60%, #1c3a25 0%, #0f1f15 40%, #0b120e 75%)'
  : 'radial-gradient(ellipse at 62% 60%, #ffffff 0%, #f5f6f0 70%)';
document.body.style.height = '100vh';
document.body.style.overflow = 'hidden';

export function setup({ fov = 32 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.05 : 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(dark ? 0x10211a : 0xeef1e9, 14, 42);
  const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 200);
  const hemi = new THREE.HemisphereLight(dark ? 0x8899aa : 0xffffff, dark ? 0x1a1208 : 0xb8ae9e, dark ? 0.6 : 1.05);
  const key = new THREE.DirectionalLight(dark ? 0xfff0dc : 0xfff6e8, dark ? 2.6 : 2.3);
  key.position.set(5, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight(0x8fd694, dark ? 1.6 : 0.6);
  rim.position.set(-8, 4, -6);
  scene.add(hemi, key, rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: dark ? 0.4 : 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return { renderer, scene, camera, ground, key };
}

/** Layer textures as canvases (top half = top face, bottom half = sides). */
export function layerCanvases(size = 1024) {
  return paintAll(size, (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  });
}

export function tex(canvas, { repeat = [1, 1], half = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (half === 'top') {
    t.repeat.set(repeat[0], 0.5 * repeat[1]);
    t.offset.set(0, 0.5);
  } else if (half === 'side') {
    t.repeat.set(repeat[0], 0.5 * repeat[1]);
    t.offset.set(0, 0);
  } else t.repeat.set(...repeat);
  return t;
}

export function softFloor(scene, y, color, alpha, r0 = 3, r1 = 13) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { c: { value: new THREE.Color(color) }, a: { value: alpha } },
    vertexShader: 'varying vec2 p; void main(){ p = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 c; uniform float a; varying vec2 p; void main(){ float f = 1.-smoothstep(${r0.toFixed(1)}, ${r1.toFixed(1)}, length(p)); gl_FragColor = vec4(c, f*a);
#include <colorspace_fragment>
}`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y - 0.003;
  mesh.renderOrder = -1;
  scene.add(mesh);
  return mesh;
}

export function done(renderer, scene, camera) {
  renderer.render(scene, camera);
  window.__ready = true;
}

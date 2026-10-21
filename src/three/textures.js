// Builds layer textures once at boot — off the main thread when OffscreenCanvas is available.
import { CanvasTexture, SRGBColorSpace, LinearMipmapLinearFilter } from 'three';
import { paintAll } from './paint.js';

function finish(tex, renderer) {
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function mainThread(size, renderer) {
  const canvases = paintAll(size, (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  });
  // flipY = true (default): canvas row 0 → v = 1, so TOP region is v ∈ [0.5, 1]
  return { textures: canvases.map((c) => finish(new CanvasTexture(c), renderer)), topHigh: true };
}

export async function makeLayerTextures(size, renderer) {
  const forceMain = new URLSearchParams(location.search).get('tex') === 'main';
  if (!forceMain && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const bitmaps = await new Promise((resolve, reject) => {
        const w = new Worker(new URL('./texture.worker.js', import.meta.url), { type: 'module' });
        const to = setTimeout(() => (w.terminate(), reject(new Error('texture worker timeout'))), 8000);
        w.onmessage = (e) => {
          clearTimeout(to);
          w.terminate();
          resolve(e.data.bitmaps);
        };
        w.onerror = (err) => {
          clearTimeout(to);
          w.terminate();
          reject(err);
        };
        w.postMessage({ size });
      });
      // Copy each bitmap into a regular canvas (one drawImage each). Uploading ImageBitmaps
      // from OffscreenCanvas directly proved unreliable on some GPU/driver stacks (black or
      // missing textures), so the upload path stays the well-trodden CanvasTexture one.
      const textures = bitmaps.map((b) => {
        const c = document.createElement('canvas');
        c.width = b.width;
        c.height = b.height;
        c.getContext('2d').drawImage(b, 0, 0);
        b.close?.();
        return finish(new CanvasTexture(c), renderer);
      });
      return { textures, topHigh: true };
    } catch (e) {
      /* fall through to main thread */
    }
  }
  return mainThread(size, renderer);
}

/** Natural layer materials: [{ albedo: canvas, normal: canvas }] × 5 (worker when possible). */
export async function makeNaturalCanvases(size) {
  const toCanvas = (b) => {
    const c = document.createElement('canvas');
    c.width = b.width;
    c.height = b.height;
    c.getContext('2d').drawImage(b, 0, 0);
    b.close?.();
    return c;
  };
  const forceMain = new URLSearchParams(location.search).get('tex') === 'main';
  if (!forceMain && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const bitmaps = await new Promise((resolve, reject) => {
        const w = new Worker(new URL('./texture.worker.js', import.meta.url), { type: 'module' });
        const to = setTimeout(() => (w.terminate(), reject(new Error('texture worker timeout'))), 15000);
        w.onmessage = (e) => {
          clearTimeout(to);
          w.terminate();
          resolve(e.data.bitmaps);
        };
        w.onerror = (err) => {
          clearTimeout(to);
          w.terminate();
          reject(err);
        };
        w.postMessage({ size, kind: 'natural' });
      });
      const out = [];
      for (let i = 0; i < bitmaps.length; i += 2) out.push({ albedo: toCanvas(bitmaps[i]), normal: toCanvas(bitmaps[i + 1]) });
      return out;
    } catch (e) {
      /* fall through */
    }
  }
  const { paintAllNatural } = await import('./paintNatural.js');
  return paintAllNatural(size, (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  });
}

// Device tier detection (6.12). `?tier=high|mid|low` overrides (QA / screenshots).
export function detectTier() {
  const q = new URLSearchParams(location.search).get('tier');
  if (q === 'high' || q === 'mid' || q === 'low') return q;
  const c = document.createElement('canvas');
  const gl2 = !!c.getContext('webgl2');
  if (isSoftwareGL()) return 'low';
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (!gl2 || cores <= 4 || saveData) return 'low';
  if (!mobile && (window.devicePixelRatio || 1) <= 2 && cores >= 8) return 'high';
  return 'mid';
}

/** Software rasteriser (no GPU): SwiftShader / llvmpipe. Rendering there costs main-thread CPU. */
export function isSoftwareGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return /swiftshader|llvmpipe|software|basic render/i.test(String(r));
  } catch (e) {
    return false;
  }
}

/** Cheap capability check (no context creation — that is expensive on software GL).
 *  If context creation later fails, main.js falls back to the static story. */
export function hasWebGL() {
  return typeof window.WebGLRenderingContext !== 'undefined';
}

export const TIER = {
  high: { dpr: 2, shadows: true, stoneShadows: false, stones: 380, dust: 500, tex: 1024, aa: true, motes: 120, shadowMap: 2048, tufts: 900 },
  mid: { dpr: 1.5, shadows: true, stoneShadows: false, stones: 240, dust: 300, tex: 1024, aa: true, motes: 120, shadowMap: 1024, tufts: 600 },
  low: { dpr: 1.5, shadows: false, stoneShadows: false, stones: 120, dust: 120, tex: 512, aa: false, motes: 50, shadowMap: 1024, tufts: 300 },
};

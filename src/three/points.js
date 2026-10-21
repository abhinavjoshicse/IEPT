// Small GPU-animated point materials (dust, crack puff, eco motes). Motion lives in
// the vertex shader, so the CPU does no per-particle work each frame.
import { ShaderMaterial, Color, AdditiveBlending, NormalBlending } from 'three';

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

const HEAD = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uViewH;
  uniform float uOpacity;
  attribute vec4 aSeed;
  varying float vAlpha;
  float sizeFor(vec4 mv) { return uSize * projectionMatrix[1][1] * uViewH * 0.5 / max(0.1, -mv.z); }
`;

const VERT = {
  dust: /* glsl */ `
    ${HEAD}
    uniform vec3 uBoxMin;
    uniform vec3 uBoxSize;
    void main() {
      vec3 p = position;
      float y = mod(p.y - uBoxMin.y + uTime * 0.05 * (0.6 + aSeed.x * 0.8), uBoxSize.y);
      p.y = uBoxMin.y + y;
      p.x += sin(uTime * 0.3 + aSeed.y * 6.283) * 0.15;
      float edge = smoothstep(0.0, 0.8, y) * smoothstep(uBoxSize.y, uBoxSize.y - 0.8, y);
      vAlpha = uOpacity * edge * (0.5 + 0.5 * aSeed.z);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = sizeFor(mv) * (0.6 + aSeed.w * 0.8);
      gl_Position = projectionMatrix * mv;
    }
  `,
  puff: /* glsl */ `
    ${HEAD}
    void main() {
      float t = uProgress;
      vec3 p = position;
      p.y += 0.4 * t * (0.6 + aSeed.x * 0.6);
      p.x += (aSeed.y - 0.5) * 0.35 * t;
      p.z += (aSeed.z - 0.5) * 0.35 * t;
      vAlpha = uOpacity * sin(3.14159 * t) * (0.5 + 0.5 * aSeed.w);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = sizeFor(mv) * (0.7 + aSeed.w * 0.9) * (1.0 + t);
      gl_Position = projectionMatrix * mv;
    }
  `,
  motes: /* glsl */ `
    ${HEAD}
    void main() {
      float o = aSeed.x * 0.5;
      float t = clamp((uProgress - o) / 0.5, 0.0, 1.0);
      vec3 p = position;
      p.y += 1.2 * t;
      p.x += sin(t * 6.0 + aSeed.y * 6.283 + uTime * 0.8) * 0.08 * t;
      p.z += cos(t * 5.0 + aSeed.z * 6.283) * 0.05 * t;
      vAlpha = uOpacity * sin(3.14159 * t);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = sizeFor(mv) * (0.7 + aSeed.w * 0.6);
      gl_Position = projectionMatrix * mv;
    }
  `,
};

export function pointsMaterial(kind, extraUniforms = {}) {
  return new ShaderMaterial({
    vertexShader: VERT[kind],
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: 0.05 },
      uViewH: { value: 900 },
      uOpacity: { value: 1 },
      uColor: { value: new Color('#8FD694') },
      ...extraUniforms,
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
}

export function setBlend(mat, additive) {
  const b = additive ? AdditiveBlending : NormalBlending;
  if (mat.blending !== b) {
    mat.blending = b;
    mat.needsUpdate = true;
  }
}

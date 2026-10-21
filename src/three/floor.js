// Soft ground that fades into the page: a large transparent disc whose colour matches the
// page background, plus a contact-shadow (ambient-occlusion) band hugging the slab footprint.
// This is what makes the slab sit *in* the page instead of floating on top of it.
import { Mesh, PlaneGeometry, ShaderMaterial, Color, Vector2, Vector3 } from 'three';
import { L, D, GROUND_Y } from './layerData.js';

export function createFloor() {
  const uniforms = {
    uColor: { value: new Color() },
    uAlpha: { value: 0.5 },
    uAO: { value: 0.3 },
    uSlab: { value: new Vector3() },
    uRot: { value: 0 },
    uHalf: { value: new Vector2(L / 2, D / 2) },
  };
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uAO;
      uniform float uRot;
      uniform vec3 uSlab;
      uniform vec2 uHalf;
      varying vec3 vW;
      void main() {
        vec2 q = vW.xz - uSlab.xz;
        float c = cos(uRot), s = sin(uRot);
        vec2 p = vec2(c * q.x - s * q.y, s * q.x + c * q.y);   // world → slab-local
        vec2 d = abs(p) - uHalf;
        float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        float ao = (1.0 - smoothstep(-0.2, 1.8, sdf)) * uAO;
        float fade = 1.0 - smoothstep(2.5, 12.0, length(q));
        float a = clamp(fade * uAlpha + ao, 0.0, 1.0);
        gl_FragColor = vec4(mix(uColor, vec3(0.0), clamp(ao * 1.4, 0.0, 0.6)), a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(60, 60), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = GROUND_Y - 0.004;
  mesh.renderOrder = -1;
  return {
    mesh,
    update(slab, T) {
      uniforms.uSlab.value.copy(slab.position);
      uniforms.uRot.value = slab.rotation.y;
      uniforms.uColor.value.copy(T.floorC);
      uniforms.uAlpha.value = T.floorA;
      uniforms.uAO.value = T.ao;
    },
  };
}

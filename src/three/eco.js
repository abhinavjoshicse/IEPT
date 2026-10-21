// Eco touch (6.10): green motes from the sealed crack + one tiny sprout. Nothing else.
import {
  Points, BufferGeometry, Float32BufferAttribute, Vector3, CylinderGeometry, SphereGeometry,
  Mesh, MeshStandardMaterial, Color, Group,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pointsMaterial, setBlend } from './points.js';
import { parkMiller } from './rng.js';

function colored(geo, hex) {
  const c = new Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo.index ? geo.toNonIndexed() : geo;
}

export function createEco(curve, topY, cfg) {
  const group = new Group();
  const rng = parkMiller(41);

  // motes
  const n = cfg.motes;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    curve.getPointAt(rng(), v);
    pos.set([v.x, topY + 0.03, v.z], i * 3);
    seed.set([rng(), rng(), rng(), rng()], i * 4);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4));
  const moteMat = pointsMaterial('motes');
  moteMat.uniforms.uSize.value = 0.055;
  const motes = new Points(geo, moteMat);
  motes.frustumCulled = false;

  // sprout — stem + two leaves, merged (1 draw call), grows via scale
  const stem = colored(new CylinderGeometry(0.012, 0.018, 0.35, 6).translate(0, 0.175, 0), '#58C46B');
  const leafA = new SphereGeometry(1, 8, 6);
  leafA.scale(0.1, 0.018, 0.045).translate(0.085, 0, 0).rotateZ(0.45).translate(0.005, 0.3, 0);
  const leafB = new SphereGeometry(1, 8, 6);
  leafB.scale(0.085, 0.016, 0.04).translate(-0.075, 0, 0).rotateZ(-0.5).rotateY(0.6).translate(-0.005, 0.25, 0);
  const sproutGeo = mergeGeometries([stem, colored(leafA, '#7AD98A'), colored(leafB, '#7AD98A')]);
  const sprout = new Mesh(
    sproutGeo,
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, flatShading: true }),
  );
  sprout.position.set(3.1, topY, 1.3);
  sprout.castShadow = cfg.shadows;
  sprout.visible = false;

  group.add(motes, sprout);

  return {
    group,
    moteMat,
    setMoteColor() {},
    update(S, T, time) {
      motes.visible = S.ecoMotes > 0.001 && S.ecoMotes < 0.999;
      moteMat.uniforms.uProgress.value = S.ecoMotes;
      moteMat.uniforms.uTime.value = time;
      moteMat.uniforms.uColor.value.copy(T.moteC);
      moteMat.uniforms.uOpacity.value = T.additive ? 0.9 : 0.8;
      setBlend(moteMat, T.additive);

      const s = S.ecoSprout;
      sprout.visible = s > 0.001;
      if (sprout.visible) {
        sprout.scale.setScalar(Math.max(0.0001, s));
        sprout.rotation.z = Math.sin(time * 1.6) * 0.052; // ±3° sway
      }
    },
  };
}

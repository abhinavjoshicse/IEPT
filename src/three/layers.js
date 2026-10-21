// Five pavement layers (6.4): one mesh + one material + one draw call each.
import { BoxGeometry, Mesh, MeshStandardMaterial, Group } from 'three';
import { LAYERS, H, L, D, GROUND_Y } from './layerData.js';

// Box face order: [+x, −x, +y, −y, +z, −z]; each face = 4 vertices (1 segment).
// Atlas is 7 × 3.5 world units per half; `topHigh` says which half holds the TOP face.
function remapUVs(geo, h, topHigh) {
  const uv = geo.attributes.uv;
  const topLo = topHigh ? 0.5 : 0;
  const sideLo = topHigh ? 0 : 0.5;
  const faces = [
    { w: D, hh: h, off: 0.05 },
    { w: D, hh: h, off: 0.3 },
    null, // top
    { w: L, hh: D, off: 0 },
    { w: L, hh: h, off: 0.45 },
    { w: L, hh: h, off: 0.62 },
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (f === 2) {
        uv.setXY(i, u, topLo + v * 0.5);
      } else {
        const fc = faces[f];
        const vv = f === 3 ? v * 0.97 : fc.off + (v * fc.hh) / 3.5;
        uv.setXY(i, (u * fc.w) / L, sideLo + Math.min(vv, 0.999) * 0.5);
      }
    }
  }
  uv.needsUpdate = true;
  geo.clearGroups(); // single material → single draw call
}

export function createLayers(textures, topHigh, cfg) {
  const slab = new Group();
  slab.name = 'slab';
  const meshes = LAYERS.map((layer, i) => {
    const geo = new BoxGeometry(L, layer.h, D);
    remapUVs(geo, layer.h, topHigh);
    const mat = new MeshStandardMaterial({
      map: textures[i],
      roughness: i === LAYERS.length - 1 ? 0.75 : 0.95,
      metalness: 0,
      transparent: i !== 0,
      opacity: i === 0 ? 1 : 0,
    });
    const m = new Mesh(geo, mat);
    m.name = layer.code;
    m.castShadow = cfg.shadows;
    m.receiveShadow = cfg.shadows;
    slab.add(m);
    return m;
  });

  const drop = [0, 0, 0, 0, 0];
  const op = [1, 0, 0, 0, 0];
  return {
    slab,
    meshes,
    /** Stack function (6.4) — single source of truth for layer y positions. */
    layoutStack(gap, dropArr) {
      let y = GROUND_Y;
      meshes.forEach((m, i) => {
        y += H[i] / 2;
        m.position.y = y + i * gap + dropArr[i];
        y += H[i] / 2;
      });
    },
    update(S) {
      drop[1] = S.drop1;
      drop[2] = S.drop2;
      drop[3] = S.drop3;
      drop[4] = S.drop4;
      op[1] = S.op1;
      op[2] = S.op2;
      op[3] = S.op3;
      op[4] = S.op4;
      // gap never goes negative (no interpenetration); the back.out overshoot
      // becomes a tiny vertical squash of the whole stack instead.
      const gap = Math.max(0, S.gap);
      this.layoutStack(gap, drop);
      const squash = Math.min(0, S.gap);
      slab.scale.y = 1 + squash * 0.35;
      slab.position.y = GROUND_Y * (1 - slab.scale.y); // keep the bottom planted on the ground
      for (let i = 1; i < 5; i++) {
        const o = op[i];
        meshes[i].visible = o > 0.001;
        // transparent stays fixed (no program switch mid-scroll → no hitch)
        const mat = meshes[i].material;
        mat.opacity = o;
        mat.depthWrite = o > 0.98;
      }
    },
  };
}

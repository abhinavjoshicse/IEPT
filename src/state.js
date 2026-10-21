// Single animated state object. The GSAP timeline writes it, Three.js reads it every frame.
export function createState() {
  return {
    camPos: { x: 22, y: 11, z: 30 }, // hero: front-right, the embankment recedes to the horizon
    camTgt: { x: -2, y: 1, z: -8 },
    shake: 0,
    viewX: 0.2, // horizontal screen shift (fraction of width, desktop only)
    // paving progress per layer (0 = not started, 1 = reached the cut face); subgrade is built
    pave1: 0, pave2: 0, pave3: 0, pave4: 0,
    lights: 0, // streetlights rise and switch on (near → far)
    paint: 0, // lane markings painted (0 → 1, viewer → horizon)
    labelsOpacity: 0,
    crackOpen: 0,
    sealFill: 0,
    glowA: 0,
    glowB: 1,
    ecoMotes: 0,
    ecoGrow: 0, // grass on the verges
    ecoSprout: 0,
    dustOpacity: 1,
  };
}

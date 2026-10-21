// Layer data (6.4) — bottom → top. MUST use these values.
export const LAYERS = [
  { code: 'SUBGRADE', h: 0.9, base: '#5E4A38', speckles: ['#44362A', '#7A644C', '#524030'], count: 9000, size: 3 },
  { code: 'GSB', h: 0.55, base: '#8B8272', speckles: ['#5C564B', '#B0A690', '#6F675A', '#9E9584'], count: 7000, size: 6 },
  { code: 'WMM', h: 0.45, base: '#77736B', speckles: ['#57534C', '#948F85', '#65615A'], count: 9000, size: 4 },
  { code: 'DBM', h: 0.38, base: '#2C2B29', speckles: ['#4A4843', '#1C1B1A', '#5D5A53'], count: 9000, size: 3 },
  { code: 'BC', h: 0.26, base: '#1C1C1D', speckles: ['#2E2E30', '#111111', '#3A3A3C'], count: 12000, size: 1.8 },
];
export const H = LAYERS.map((l) => l.h);
export const L = 7; // road length (x)
export const D = 3.4; // road depth (z)
export const GROUND_Y = -1.6;

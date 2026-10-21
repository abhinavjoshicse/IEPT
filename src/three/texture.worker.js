import { paintAll } from './paint.js';
import { paintAllNatural } from './paintNatural.js';

self.onmessage = (e) => {
  const { size, kind } = e.data;
  const make = (w, h) => new OffscreenCanvas(w, h);
  if (kind === 'natural') {
    const layers = paintAllNatural(size, make);
    const bitmaps = [];
    layers.forEach((l) => bitmaps.push(l.albedo.transferToImageBitmap(), l.normal.transferToImageBitmap()));
    self.postMessage({ bitmaps }, bitmaps);
    return;
  }
  const canvases = paintAll(size, make);
  const bitmaps = canvases.map((c) => c.transferToImageBitmap());
  self.postMessage({ bitmaps }, bitmaps);
};

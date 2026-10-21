// Master timeline. Duration 1.0 → time === story progress.
import { gsap } from 'gsap';

export function buildTimeline(S, { dom = true } = {}) {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const hero = $('#beat-hero');
  const services = $('#beat-services');
  const products = $('#beat-products');
  const eco = $('#beat-eco');
  const cards = $$('#beat-products .product-card');
  const labels = $$('#layer-labels .label');

  if (dom) {
    gsap.set([services, products, eco], { autoAlpha: 0 });
    gsap.set(services, { y: 30 });
    gsap.set(cards, { autoAlpha: 0, y: 20 });
    gsap.set(labels, { autoAlpha: 0 });
  }

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const seg = (target, vars, a, b) => tl.to(target, { ...vars, duration: b - a }, a);
  const html = (target, vars, a, b) => dom && seg(target, vars, a, b);
  const cam = (pos, tgt, a, b, ease = 'power2.inOut') => {
    seg(S.camPos, { ...pos, ease }, a, b);
    seg(S.camTgt, { ...tgt, ease }, a, b);
  };
  tl.to({ v: 0 }, { v: 1, duration: 1 }, 0);

  // 0.08–0.14 hero copy leaves
  html(hero, { autoAlpha: 0, y: -40, ease: 'power2.in' }, 0.08, 0.14);

  // 0.10–0.40 paving: each layer is laid from the horizon to the viewer
  [
    [0.1, 0.2],
    [0.17, 0.27],
    [0.24, 0.34],
    [0.31, 0.41],
  ].forEach(([a, b], k) => seg(S, { [`pave${k + 1}`]: 1, ease: 'power2.out' }, a, b));
  // camera swings round to the cut face
  cam({ x: 10, y: 7, z: 30 }, { x: -0.5, y: 1.6, z: -2 }, 0.08, 0.42);
  seg(S, { viewX: 0.15, ease: 'power2.inOut' }, 0.08, 0.42);

  // 0.40–0.58 services: labels on the cut face
  seg(S, { labelsOpacity: 1 }, 0.4, 0.45);
  if (dom) tl.to(labels, { autoAlpha: 1, duration: 0.03, stagger: 0.01, ease: 'power1.out' }, 0.4);
  html(services, { autoAlpha: 1, y: 0, ease: 'power3.out' }, 0.39, 0.45);
  cam({ x: 9.4, y: 6.7, z: 28.5 }, { x: -0.5, y: 1.6, z: -2 }, 0.45, 0.55, 'none'); // slow push-in
  seg(S, { labelsOpacity: 0 }, 0.55, 0.58);
  html(labels, { autoAlpha: 0 }, 0.55, 0.58);
  html(services, { autoAlpha: 0, y: -20, ease: 'power2.in' }, 0.55, 0.58);

  // 0.56–0.68 camera rises above the carriageway; lane markings paint themselves
  cam({ x: 10, y: 16, z: 16 }, { x: -1, y: TOPY, z: -14 }, 0.56, 0.68);
  seg(S, { viewX: 0.14, ease: 'power2.inOut' }, 0.56, 0.68);
  seg(S, { paint: 1, ease: 'power1.inOut' }, 0.57, 0.69);
  seg(S, { lights: 1, ease: 'power1.inOut' }, 0.58, 0.72);
  seg(S, { dustOpacity: 0.6 }, 0.56, 0.68);

  // 0.68–0.88 products: close on the crack; it opens, sealant flows
  cam({ x: 9, y: 11, z: 6 }, { x: -1.5, y: TOPY, z: -8 }, 0.66, 0.74);
  seg(S, { viewX: 0.24, ease: 'power2.inOut' }, 0.66, 0.74);
  seg(S, { shake: 0.03, ease: 'sine.out' }, 0.69, 0.6933);
  seg(S, { shake: -0.03, ease: 'sine.inOut' }, 0.6933, 0.6967);
  seg(S, { shake: 0, ease: 'sine.in' }, 0.6967, 0.7);
  seg(S, { crackOpen: 1, ease: 'power2.out' }, 0.68, 0.73);
  html(products, { autoAlpha: 1, ease: 'power2.out' }, 0.72, 0.76);
  cards.forEach((c, i) => html(c, { autoAlpha: 1, y: 0, ease: 'power3.out' }, 0.76 + i * 0.03, 0.79 + i * 0.03));
  seg(S, { sealFill: 1 }, 0.73, 0.86);
  seg(S, { glowA: 1, ease: 'power1.out' }, 0.73, 0.75);
  seg(S, { glowB: 0, ease: 'power2.inOut' }, 0.86, 0.88);

  // 0.88–0.97 eco: pull back wide; grass grows along the verges
  html(products, { autoAlpha: 0 }, 0.9, 0.92);
  html(eco, { autoAlpha: 1, ease: 'power2.out' }, 0.92, 0.94);
  cam({ x: 24, y: 14, z: 26 }, { x: -3, y: 1, z: -12 }, 0.88, 0.97);
  seg(S, { viewX: 0.16, ease: 'power2.inOut' }, 0.88, 0.97);
  seg(S, { ecoGrow: 1, ease: 'power1.out' }, 0.89, 0.98);
  seg(S, { ecoMotes: 1 }, 0.9, 0.97);
  seg(S, { ecoSprout: 1, ease: 'back.out(1.7)' }, 0.91, 0.96);
  seg(S, { dustOpacity: 0.3 }, 0.97, 1);

  return tl;
}
const TOPY = 3.3;

/** Nav section for a story progress value. */
export function railIndex(p) {
  if (p < 0.3) return 0;
  if (p < 0.62) return 1;
  if (p < 0.9) return 2;
  return 3;
}

/** Anchor targets inside the story. */
export const STORY_ANCHORS = { top: 0, services: 0.49, products: 0.82, 'beat-eco': 0.955 };

// Scroll → story mapping. Hero → services (p 0 → 0.49) takes half the scroll it used to;
// everything after services keeps its original scroll length. Story height shrinks to match
// (600vh → 478vh desktop, 500vh → 402vh mobile).
export const SERVICES_P = 0.49;
export const SERVICES_S = 0.3245; // scroll fraction at which services is reached
export function scrollToProgress(s) {
  return s <= SERVICES_S ? (s / SERVICES_S) * SERVICES_P : SERVICES_P + ((s - SERVICES_S) / (1 - SERVICES_S)) * (1 - SERVICES_P);
}
export function progressToScroll(p) {
  return p <= SERVICES_P ? (p / SERVICES_P) * SERVICES_S : SERVICES_S + ((p - SERVICES_P) / (1 - SERVICES_P)) * (1 - SERVICES_S);
}
/** Wraps the story timeline so scroll maps to it piecewise-linearly (see above). */
export function scrollDriver(tl) {
  const drv = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  drv.fromTo(tl, { progress: 0 }, { progress: SERVICES_P, duration: SERVICES_S, immediateRender: false });
  drv.to(tl, { progress: 1, duration: 1 - SERVICES_S });
  return drv;
}

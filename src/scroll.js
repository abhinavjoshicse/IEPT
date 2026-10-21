// Lenis smooth scroll wired to GSAP ScrollTrigger (Section 2 rules), plus in-page navigation.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { STORY_ANCHORS, progressToScroll } from './timeline.js';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let pinned = false;

export function initScroll({ smooth }) {
  pinned = smooth;
  if (smooth) {
    lenis = new Lenis({ autoRaf: false, syncTouch: false, lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.addEventListener('menutoggle', (e) => (e.detail.open ? lenis.stop() : lenis.start()));
  }
  document.addEventListener('click', onAnchorClick);
  return { lenis, ScrollTrigger };
}

export function setPinned(v) {
  pinned = v;
  if (!v && lenis) {
    lenis.destroy();
    lenis = null;
  }
}

function storyY(p) {
  const story = document.getElementById('story');
  const top = story.getBoundingClientRect().top + window.scrollY;
  return top + p * (story.offsetHeight - window.innerHeight);
}

export function goTo(key, { immediate = false } = {}) {
  const reduce = document.documentElement.classList.contains('static-story');
  let y;
  if (pinned && !reduce && key in STORY_ANCHORS) {
    y = storyY(progressToScroll(STORY_ANCHORS[key]));
  } else {
    const el = document.getElementById(key);
    if (!el) return;
    y = key === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - (key === 'contact' || key === 'about' ? 0 : 72);
  }
  if (lenis && !immediate) lenis.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: 'auto' });

  // move focus for keyboard / screen-reader users (without scrolling again)
  const target = document.getElementById(key === 'top' ? 'main' : key);
  if (target && key !== 'top') {
    const f = target.matches('.anchor') ? target.closest('article') : target;
    if (f) {
      if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1');
      f.focus({ preventScroll: true });
    }
  }
}

function onAnchorClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const key = a.getAttribute('href').slice(1);
  if (!key) return; // href="#" placeholders
  if (key === 'main') return; // skip link: native behaviour
  e.preventDefault();
  goTo(key);
  if (history.replaceState) history.replaceState(null, '', key === 'top' ? location.pathname : `#${key}`);
}

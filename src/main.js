import './styles/redesign.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initTheme } from './theme.js';
import { initThemeToggles } from './ui/themeToggle.js';
import { initNav } from './ui/nav.js';
import { initForm } from './ui/form.js';

gsap.registerPlugin(ScrollTrigger);

initTheme();
initThemeToggles();
initForm();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = initNav();

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
});

const sectionKeys = ['home', 'services', 'products', 'about', 'contact'];
const sections = sectionKeys.map((key) => document.getElementById(key)).filter(Boolean);
const setActiveSection = () => {
  const line = window.innerHeight * 0.36;
  let current = sections[0]?.id || '';
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= line) current = section.id;
  });
  nav.setActive(current);
};
window.addEventListener('scroll', setActiveSection, { passive: true });
setActiveSection();

if (!reduceMotion) {
  // Page progress and a calm hide/reveal header response to scroll direction.
  const progress = document.querySelector('.page-progress i');
  let lastScrollY = window.scrollY;
  const updateScrollChrome = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    const currentY = window.scrollY;
    document.getElementById('nav').classList.toggle('nav-hidden', currentY > lastScrollY && currentY > 220);
    lastScrollY = Math.max(0, currentY);
  };
  window.addEventListener('scroll', updateScrollChrome, { passive: true });
  updateScrollChrome();

  gsap.utils.toArray('.reveal').forEach((element) => {
    gsap.fromTo(
      element,
      { y: 42, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      },
    );
  });

  gsap.to('.hero-media', {
    yPercent: 9,
    ease: 'none',
    scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true },
  });

  gsap.fromTo(
    '.hero-content > *',
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.85, stagger: 0.11, ease: 'power3.out', delay: 0.15 },
  );

  // The three approach cards arrive as a single visual sequence.
  gsap.fromTo(
    '.image-card',
    { y: 64, opacity: 0, scale: 0.96 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.85,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.hero-cards', start: 'top 92%', once: true },
    },
  );

  // Count every statistic exactly once when the band first enters the viewport.
  document.querySelectorAll('[data-count]').forEach((element) => {
    const original = element.textContent.trim();
    const match = original.match(/^(\D*)([\d,.]+)(.*)$/);
    if (!match) return;
    const [, prefix, digits, suffix] = match;
    const target = Number(digits.replace(/,/g, ''));
    const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
    const leading = digits.replace(/,/g, '').split('.')[0].length;
    const counter = { value: 0 };
    element.textContent = prefix + '0'.padStart(leading, '0') + suffix;
    gsap.to(counter, {
      value: target,
      duration: 1.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      onUpdate: () => {
        const next = decimals ? counter.value.toFixed(decimals) : Math.round(counter.value).toString();
        const [whole, fraction] = next.split('.');
        element.textContent = prefix + whole.padStart(leading, '0') + (fraction ? `.${fraction}` : '') + suffix;
      },
      onComplete: () => {
        element.textContent = original;
        gsap.fromTo(element, { scale: 1.08 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' });
      },
    });
  });

  // Layered parallax keeps large photographic surfaces moving at different rates.
  gsap.to('.cta-image', {
    yPercent: 10,
    ease: 'none',
    scrollTrigger: { trigger: '.cta-panel', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.to('.layer-visual figure img', {
    scale: 1.08,
    yPercent: 4,
    ease: 'none',
    scrollTrigger: { trigger: '.about-section', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Fine-pointer interactions: magnetic CTAs, tactile ripples, and shallow card tilt.
  if (matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn, .nav-cta').forEach((button) => {
      button.classList.add('is-magnetic');
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, {
          x: (event.clientX - rect.left - rect.width / 2) * 0.12,
          y: (event.clientY - rect.top - rect.height / 2) * 0.16,
          duration: 0.35,
          ease: 'power2.out',
        });
      });
      button.addEventListener('pointerleave', () => gsap.to(button, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, .45)' }));
      button.addEventListener('pointerdown', (event) => {
        const ripple = document.createElement('i');
        const rect = button.getBoundingClientRect();
        ripple.className = 'button-ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.append(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      });
    });

    document.querySelectorAll('.product-card, .image-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
        gsap.to(card, { rotateY: x * 4, rotateX: y * -4, y: -6, duration: 0.35, ease: 'power2.out', transformPerspective: 900 });
      });
      card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: 0.6, ease: 'power3.out' }));
    });
  }

  const layerVisual = document.querySelector('.layer-visual');
  if (layerVisual && matchMedia('(pointer: fine)').matches) {
    layerVisual.addEventListener('pointermove', (event) => {
      const rect = layerVisual.getBoundingClientRect();
      const rx = (event.clientY - rect.top) / rect.height - 0.5;
      const ry = (event.clientX - rect.left) / rect.width - 0.5;
      gsap.to(layerVisual.querySelector('figure'), {
        rotateX: rx * -3,
        rotateY: ry * 4,
        duration: 0.5,
        ease: 'power2.out',
        transformPerspective: 900,
      });
    });
    layerVisual.addEventListener('pointerleave', () => {
      gsap.to(layerVisual.querySelector('figure'), { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'power3.out' });
    });
  }
}

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

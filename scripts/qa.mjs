// Automated acceptance checks (Section 16 subset). Needs `npm run preview` on :4173.
// node scripts/qa.mjs
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = [];
const ok = (name, pass, info = '') => out.push(`${pass ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`);
const errors = [];

// 1. OS theme on first visit + persistence
for (const scheme of ['dark', 'light']) {
  const ctx = await b.newContext({ colorScheme: scheme });
  const pg = await ctx.newPage();
  await pg.goto(base, { waitUntil: 'domcontentloaded' });
  ok(`first visit follows OS (${scheme})`, (await pg.evaluate(() => document.documentElement.dataset.theme)) === scheme);
  await ctx.close();
}
{
  const ctx = await b.newContext({ colorScheme: 'light' });
  const pg = await ctx.newPage();
  await pg.goto(base, { waitUntil: 'load' });
  await pg.click('#nav .nav-actions .theme-toggle');
  await pg.reload({ waitUntil: 'domcontentloaded' });
  ok('toggle persists after reload', (await pg.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  await ctx.close();
}

// 2. Story: reversibility, flick, rail, anchors
{
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  pg.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(base + '?tier=low', { waitUntil: 'networkidle' });
  await pg.waitForFunction(() => window.__iept, null, { timeout: 30000 });
  const snap = () =>
    pg.evaluate(() => {
      const S = window.__iept.S;
      const o = {};
      for (const k in S) if (k[0] !== '_') o[k] = typeof S[k] === 'number' ? +S[k].toFixed(3) : [S[k].x, S[k].y, S[k].z].map((v) => +(+v).toFixed(3)).join(',');
      return JSON.stringify(o);
    });
  const s0 = await snap();
  const scrollP = (p) =>
    pg.evaluate((p) => {
      const st = document.getElementById('story');
      window.scrollTo(0, st.offsetTop + p * (st.offsetHeight - innerHeight));
    }, p);
  for (const p of [0.3, 0.6, 0.9, 1]) {
    await scrollP(p);
    await pg.waitForTimeout(250);
  }
  await pg.waitForTimeout(1800);
  const end = await pg.evaluate(() => window.__iept.S.sealFill);
  ok('flick to end → sealed', end === 1, `sealFill=${end}`);
  await scrollP(0);
  await pg.waitForTimeout(2200);
  ok('scroll back to top restores initial state exactly', (await snap()) === s0);
  const heroVis = await pg.evaluate(() => getComputedStyle(document.getElementById('beat-hero')).visibility);
  ok('hero beat visible again', heroVis === 'visible');

  await pg.click('#nav .nav-links a[data-nav="products"]');
  await pg.waitForTimeout(3200);
  const pr = await pg.evaluate(() => window.__iept.tl.progress());
  ok('nav "Products" lands at p≈0.82', Math.abs(pr - 0.82) < 0.02, pr.toFixed(3));
  await pg.click('#nav .nav-links a[data-nav="services"]');
  await pg.waitForTimeout(3200);
  const ps = await pg.evaluate(() => window.__iept.tl.progress());
  ok('nav "Services" lands at p≈0.49', Math.abs(ps - 0.49) < 0.02, ps.toFixed(3));
  const labelsOk = await pg.evaluate(() => [...document.querySelectorAll('#layer-labels .label')].every((l) => getComputedStyle(l).visibility === 'visible'));
  ok('5 labels visible at services', labelsOk);
  // every callout dot sits on screen, right of the list, and each list row is visible
  const call = await pg.evaluate(() => {
    const rows = [...document.querySelectorAll('#beat-services .layer-list li')].map((r) => r.getBoundingClientRect());
    const dots = [...document.querySelectorAll('#layer-labels .l-dot')].map((d) => d.getBoundingClientRect());
    return dots.every((d, k) => d.left > rows[k].right && d.right < innerWidth && d.top > 0 && d.bottom < innerHeight) && rows.every((r) => r.height > 0);
  });
  ok('layer list rows link to dots on the cut face', call);
  await pg.close();
}

// 3. No horizontal scroll at QA widths
for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 740]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(base + '?tier=low', { waitUntil: 'networkidle' });
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
  ok(`no horizontal scroll ${w}×${h}`, sw <= w, `scrollWidth ${sw}`);
  await pg.close();
}

// 4. Mobile menu keyboard
{
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  await pg.goto(base, { waitUntil: 'load' });
  await pg.click('.menu-btn');
  await pg.waitForTimeout(150);
  const open = await pg.evaluate(() => !document.getElementById('mobile-menu').hidden && document.getElementById('mobile-menu').contains(document.activeElement));
  for (let i = 0; i < 12; i++) await pg.keyboard.press('Tab');
  const trapped = await pg.evaluate(() => document.getElementById('mobile-menu').contains(document.activeElement));
  await pg.keyboard.press('Escape');
  const closed = await pg.evaluate(() => document.getElementById('mobile-menu').hidden && document.activeElement.classList.contains('menu-btn'));
  ok('mobile menu opens with focus inside', open);
  ok('focus trapped while open', trapped);
  ok('Esc closes and returns focus', closed);
  await pg.close();
}

// 5. Form validation
{
  const pg = await b.newPage();
  await pg.goto(base, { waitUntil: 'load' });
  await pg.click('#quote-form button[type=submit]');
  const errs = await pg.evaluate(() => [...document.querySelectorAll('#quote-form .err')].filter((e) => e.textContent).length);
  ok('empty submit shows inline errors', errs === 4, `${errs} errors`);
  await pg.fill('#f-name', 'A');
  await pg.fill('#f-email', 'a@b.co');
  await pg.selectOption('#f-service', { index: 1 });
  await pg.fill('#f-message', 'Hi');
  await pg.click('#quote-form button[type=submit]');
  ok('valid submit shows success', await pg.isVisible('.form-success'));
  await pg.close();
}

// 6. Reduced motion + no WebGL + no JS keep all content
for (const [name, opts, q] of [
  ['reduced motion', { reducedMotion: 'reduce' }, ''],
  ['no WebGL', {}, '?webgl=0'],
  ['no JS', { javaScriptEnabled: false }, ''],
]) {
  const ctx = await b.newContext(opts);
  const pg = await ctx.newPage();
  await pg.goto(base + q, { waitUntil: 'load' });
  const r = await pg.evaluate(() => ({
    h: document.getElementById('story').offsetHeight < innerHeight * 6,
    txt: ['Every layer, engineered.', 'Crack Sealing Material', 'Lorem ipsum stabilisation', 'sustainable by design'].every((t) => document.body.innerText.includes(t)),
  }));
  ok(`${name}: static story, all text readable`, r.h && r.txt);
  await ctx.close();
}

ok('no console errors/warnings during story run', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close();
console.log(out.join('\n'));

// QA screenshots: node scripts/shoot.mjs <baseUrl> <outDir> [shotsJSON]
// Each shot: { name, w, h, theme, p?, sel?, query? }
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'docs/progress';
const shots = JSON.parse(process.argv[4] || '[]');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const logs = [];
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 1,
    reducedMotion: s.reduced ? 'reduce' : 'no-preference',
    colorScheme: s.theme,
    isMobile: s.w < 600,
    hasTouch: s.w < 600,
    javaScriptEnabled: s.nojs ? false : true,
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('iept-theme', t);
    } catch (e) {}
  }, s.theme);
  const page = await ctx.newPage();
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${s.name}] ${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[${s.name}] pageerror: ${e.message}`));
  await page.goto(base + (s.query || '?tier=high'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(s.nojs ? 300 : 800);
  if (!s.nojs && !s.reduced && !(s.query || '').includes('webgl=0')) await page.waitForFunction(() => document.getElementById('webgl').classList.contains('is-ready'), null, { timeout: 90000 }).catch(() => {});
  if (s.p !== undefined) {
    await page.evaluate((p) => {
      const st = document.getElementById('story');
      const top = st.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top + p * (st.offsetHeight - innerHeight));
    }, s.p);
    await page.waitForTimeout(2600);
  } else if (s.sel) {
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView(), s.sel);
    await page.waitForTimeout(1500);
  }
  if (s.eval) await page.evaluate(s.eval);
  await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: !!s.full });
  await ctx.close();
}
await browser.close();
console.log(logs.length ? logs.join('\n') : 'no console errors/warnings');

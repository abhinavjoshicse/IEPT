// Renders public/fallback-{light,dark}.webp (no-WebGL stills) and public/og-image.jpg
// from the real scene (compressed + sealed state). Needs `npm run build && npm run preview`.
// node scripts/render-fallbacks.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const save = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript((t) => localStorage.setItem('iept-theme', t), theme);
  const page = await ctx.newPage();
  await page.goto(base + '?static=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__iept && window.__iept.stills, null, { timeout: 60000 });
  const webp = await page.evaluate(() => {
    const { tl, scene } = window.__iept;
    tl.progress(0.88);
    return scene.still(1600, 1000, 'image/webp');
  });
  save(`public/fallback-${theme}.webp`, webp);
  if (theme === 'dark') {
    const og = await page.evaluate(async () => {
      const { tl, scene } = window.__iept;
      tl.progress(0.88);
      const png = scene.still(1000, 630, 'image/png');
      const img = new Image();
      img.src = png;
      await img.decode();
      await document.fonts.load('700 72px "Inter Variable"');
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 630;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(760, 380, 0, 760, 380, 760);
      grad.addColorStop(0, '#1C3A25');
      grad.addColorStop(0.4, '#0F1F15');
      grad.addColorStop(0.75, '#0B120E');
      g.fillStyle = grad;
      g.fillRect(0, 0, 1200, 630);
      g.drawImage(img, 330, 20, 1000, 630);
      // wordmark (same geometry as the logo SVG), dark-mode blue
      g.save();
      g.translate(72, 72);
      g.scale(0.09, 0.09);
      g.translate(-111, -481);
      g.fillStyle = '#6BB6E8';
      [[111,481,100,496],[274,481,99,496],[274,481,496,99],[274,680,496,98],[274,879,496,98],[833,481,99,496],[833,481,496,99],[1231,481,98,297],[833,680,496,98],[1392,481,497,99],[1591,481,99,496]].forEach(([x,y,w,h]) => g.fillRect(x,y,w,h));
      g.restore();
      g.fillStyle = '#EEF3EC';
      g.font = '650 72px "Inter Variable", sans-serif';
      if ('letterSpacing' in g) g.letterSpacing = '-2px';
      g.fillText('Built', 72, 300);
      g.fillStyle = '#8FD694';
      g.fillText('layer', 72, 378);
      const w = g.measureText('layer ').width;
      g.fillStyle = '#EEF3EC';
      g.fillText('by layer.', 72 + w, 378);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.fillStyle = '#93A497';
      g.font = '500 20px "Inter Variable", sans-serif';
      g.fillText('IndoCore Engineering & Pavement Technologies', 72, 560);
      return c.toDataURL('image/jpeg', 0.88);
    });
    save('public/og-image.jpg', og);
  }
  await ctx.close();
  console.log('rendered', theme);
}
await browser.close();

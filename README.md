# IEPT — IndoCore Engineering & Pavement Technologies

One-page, scroll-driven website. A real-time Three.js road embankment tells the story: the bare subgrade → four layers paved from the horizon toward you → cut-face callouts for each layer → lane markings paint on → a crack is sealed with glowing sealant → grass grows on the verges. Light (Concrete day) + dark (Asphalt night).

Spec: `../IEPT_MASTER_INSTRUCTIONS.md` · Deviations: `CHANGELOG.md` · Status: `PROGRESS.md`

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/ (static, deploy anywhere)
npm run preview    # serve dist/ on http://localhost:4173
```

Node 18+ (tested on 22). Windows: same commands in PowerShell.

## Edit copy

All text lives in **`src/content.js`**. `scripts/build-content.js` injects it into `index.html` at dev/build time (`{{ path.to.key }}` placeholders), so the page is fully readable without JavaScript. Only `<em>` is allowed inside strings. Don't hard-code copy in HTML/JS.

Placeholders still to replace (spec §17): service names, body texts, product descriptions, stats, eco points, phone/email/address, social links (footer `#`), form endpoint (`src/ui/form.js` → `TODO`), domain (`meta.url` in `content.js`, `public/robots.txt`, `public/sitemap.xml`).

## Structure

```
index.html            template with {{ content }} placeholders
src/content.js        ALL copy
src/main.js           boot: theme → UI → scroll/timeline → lazy 3D
src/state.js          animated state object S (timeline writes, 3D reads)
src/timeline.js       master GSAP timeline (duration 1.0 = story progress)
src/scroll.js         Lenis ↔ ScrollTrigger, anchor navigation
src/theme.js          light/dark state, persistence, `themechange`
src/three/*           renderer, layers, textures (worker), stones, dust, crack, eco, labels, tiers
src/ui/*              nav, toggle, rail, progress, form, stats
src/styles/*          tokens, base, layout, components
scripts/              content injector, QA, screenshots, contrast, fallback renderer
public/               fonts, favicon, fallback stills, OG image, robots, sitemap
```

## QA helpers

Need `npm run build && npm run preview` running. Scripts use Chromium via `playwright-core`; on Windows set `CHROME` to your Chrome path, e.g. `set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe`.

| Command | What |
|---|---|
| `npm run qa` | Acceptance checks: OS theme, persistence, scroll reversal, flick, rail/nav anchors, labels, no horizontal scroll (7 sizes), mobile menu keyboard, form, reduced-motion / no-WebGL / no-JS content |
| `npm run contrast` | WCAG contrast table (below) |
| `npm run render:fallbacks` | Re-renders `public/fallback-{light,dark}.webp` + `public/og-image.jpg` from the live scene |
| `npm run shots -- <url> <dir> '<json>'` | Screenshots at any scroll progress/theme/size |

URL flags for testing: `?tier=high|mid|low` (force quality tier, boots 3D immediately), `?static=1` (reduced-motion layout), `?webgl=0` (no-WebGL fallback).

## Results (2026-09-29)

- Lighthouse mobile: **Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100**.
- JS gzip: app 57 KB + three 123 KB + scene 10 KB + worker 1 KB ≈ **192 KB** (budget 250 KB).
- Draw calls in story ≤ 12 (budget 30). Triangles ≤ 9k per pass (budget 60k). Texture memory ≈ 27 MB high / 7 MB low.
- `npm run qa`: all checks pass.

### Contrast (WCAG AA)

| Mode | Pair | Ratio | Needs |
|---|---|---|---|
| light | --ink on --bg | 14.56:1 ✅ | ≥ 7.0 |
| light | --mute on --bg | 5.69:1 ✅ | ≥ 4.5 |
| light | --mute on gradient edge | 5.07:1 ✅ | ≥ 4.5 |
| light | --acc-ink on --acc (buttons) | 5.32:1 ✅ | ≥ 4.5 |
| light | --acc-text on --bg (eyebrows) | 6.00:1 ✅ | ≥ 4.5 |
| light | --acc-text on eco strip | 5.24:1 ✅ | ≥ 4.5 |
| light | --brand (logo/links) on --bg | 6.80:1 ✅ | ≥ 4.5 |
| light | --seal-text on card (P-0x) | 5.87:1 ✅ | ≥ 4.5 |
| light | error text on card | 5.93:1 ✅ | ≥ 4.5 |
| dark | --ink on --bg | 16.86:1 ✅ | ≥ 7.0 |
| dark | --mute on --bg | 7.22:1 ✅ | ≥ 4.5 |
| dark | --acc-ink on --acc (buttons) | 11.03:1 ✅ | ≥ 4.5 |
| dark | --acc-text on eco strip | 8.75:1 ✅ | ≥ 4.5 |
| dark | --brand (logo) on --bg | 8.56:1 ✅ | ≥ 4.5 |
| dark | --seal-text on card | 9.66:1 ✅ | ≥ 4.5 |
| dark | error text on card | 6.97:1 ✅ | ≥ 4.5 |

## Deploy

`npm run build` → upload `dist/` to Netlify / Vercel / Cloudflare Pages / GitHub Pages (static, no server). Set the real domain in `content.js` → `meta.url`, `public/robots.txt`, `public/sitemap.xml`, then rebuild.

## Not verifiable from the build machine

Real-GPU frame rate (60 fps desktop / ≥ 30 fps mid Android), Safari / iOS / Samsung Internet, and screen-reader passes need a manual check on real devices.

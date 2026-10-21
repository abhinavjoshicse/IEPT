# IEPT Website — Progress Report

Source of truth: `IEPT_MASTER_INSTRUCTIONS.md` (v1.0). Deviations: `CHANGELOG.md`. Screenshots: `docs/progress/`.

| # | Milestone | Status |
|---|---|---|
| M1 | Scaffold, tokens, fonts, theme, nav, toggle, static sections | ✅ Done |
| M2 | Scene boot: renderer, camera, lights, ground, 5 layers, procedural textures | ✅ Done |
| M3 | Stones + dust idle motion | ✅ Done |
| M4 | Lenis + ScrollTrigger + timeline 0–0.58, labels projection | ✅ Done |
| M5 | Compress, crack, sealant shader, products beat | ✅ Done |
| M6 | Eco touch, rail, progress, anchors | ✅ Done |
| M7 | 3D theme tweening | ✅ Done |
| M8 | Responsive camera + mobile layouts | ✅ Done |
| M9 | Reduced motion, no-WebGL, noscript | ✅ Done |
| M10 | Performance, SEO, QA | ✅ Done (deploy = your step, see README) |

## Log

### Update 1 — M1 → M6
- Vite 5 + vanilla ES modules. `three@0.169.0` (tree-shaken), `gsap@^3.12` (+ScrollTrigger), `lenis@^1.1`, self-hosted fonts (Latin woff2, preloaded).
- All copy in `src/content.js`, injected into `index.html` at build time (works without JS).
- Story: 600vh sticky (500vh mobile), one paused GSAP timeline (duration 1.0, scrub 0.6). Scrolling back reverses exactly.
- 3D: 5 layers (atlas textures, seeded speckles, BC lane markings), instanced stones (swirl + absorb waves), GPU dust, crack groove + clipped sealant shader with glowing head, halo, bead, dust puff, green motes, sprout.
- Labels with leader lines (transform-only), rail, progress, scroll hint, anchors (#services → 0.47, #products → 0.80).

### Update 2 — M7 → M10
- **M7** Theme toggle tweens every 3D value (lights, exposure, shadow, dust colour/blending, sealant colour/glow, motes) over 700 ms; blending swaps at midpoint. Page background gradients crossfade. Screens: `m7-*`.
- **M8** Framing tuned and checked at 1920, 1440, 1280, 1180, 1024, 768, 390, 360. Desktop narrow widths use distance scale + screen-space shift; < 1100 px uses the stacked layout (copy top, 3D bottom); tall screens push the slab lower; labels switch to dots + list when there's no room. Screens: `m8-*`.
- **M9** Reduced motion: static story with 4 stills rendered live from the scene (re-rendered on theme change). No WebGL / 3D error: static story with `fallback-{theme}.webp`. No JS: all text readable, fallback images shown. Screens: `m9-*`.
- **M10** Lighthouse mobile 99 / 100 / 100 / 100 (LCP 1.9 s, TBT 0, CLS 0). JS ≈ 192 KB gzip. ≤ 12 draw calls. OG image, favicon, JSON-LD, sitemap, robots. `npm run qa` → all checks pass.

### Update 3 — client feedback round 1
- Fonts: single family (Inter) everywhere.
- Smoothness: pre-compiled shaders/textures, no mid-scroll program switches, no per-frame layout reads, no blur over canvas, adaptive resolution, lighter shadows, softer scroll inertia.
- Slab: bigger on every beat; soft page-coloured ground, contact shadow and fog so it sits in the page.
- Re-checked: `npm run qa` all pass; Lighthouse mobile 100 / 100 / 100 / 100.

### Update 4 — redesign (client feedback round 2)
- New story: road embankment paved layer by layer from the horizon, cut-face callouts, lane markings paint on, crack sealed, verges grow.
- New theme: Concrete day / Asphalt night, lane-yellow accent, bolder type. Side pointers removed.
- Preview videos: `docs/preview/iept-road-preview-{dark,light}.mp4`.
- Re-checked: `npm run qa` all pass; contrast all pass; Lighthouse mobile 100 / 100 / 100 / 100.

## Open items for you
- Replace placeholders (README → "Edit copy").
- Real-device checks: fps on a real GPU / mid Android, Safari + iOS, Samsung Internet, screen reader.
- Deploy `dist/` and set the real domain.

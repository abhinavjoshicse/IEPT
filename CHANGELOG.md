# Changelog

Deviations from `IEPT_MASTER_INSTRUCTIONS.md` v1.0, each with its reason (spec: SHOULD-deviations need a written reason).

## 2.2.0 — 2026-09-29
- **Home headline:** marker stroke under "layer" removed (contact heading keeps its accent).
- **Natural road materials** (`src/three/paintNatural.js`, painted in the Worker): per-layer aggregate that matches the real material — compacted earth (subgrade), coarse gravel in sandy fines (GSB), angular crushed stone (WMM), bitumen-coated aggregate (DBM), fine-aggregate asphalt (BC). Each layer gets an albedo with contact shadows + highlights, gentle large-scale tonal variation, and a **normal map** from a height field, so stones catch the light. Seamless tiles, 768 px (384 px on low tier). Old speckle painter no longer used by the road.

## 2.1.0 — 2026-09-29
- **World around the road** (client: "too much black space"). New `src/three/environment.js`:
  - Lit terrain (procedural mottled ground, receives shadows) fading into haze; replaces the empty void.
  - Low-poly hills on the horizon, softened by fog into silhouettes; road extended 64 → 140 units so it runs out to them.
  - Streetlights on both berms rise and switch on near → far with the lane markings (0.58–0.72). At night: warm lamp glows + light pools on the carriageway (fake lights, no per-pixel cost). In daylight: poles only.
  - Legibility scrim behind the copy column (left on desktop, top on stacked layouts).
  - Dark fog warmed (#1B1913) so the horizon isn't pure black. Light terrain kept pale.

## 2.0.1 — 2026-09-29
- **Hero → services scroll halved** (client request): services now reached after ~123vh of scroll instead of 245vh. Scroll after services is unchanged. Story height 600vh → 478vh (mobile 500vh → 402vh); scroll maps to the timeline piecewise-linearly (`scrollDriver` in `timeline.js`). Nothing else changed.

## 2.0.0 — 2026-09-29 (client feedback round 2: redesign)

Client asked for a different, less boring take on "built layer by layer" and a new theme. Replaces the
floating stacked-slab concept (spec §1.1, §6.4 stacking, §6.7 stones, §7.2 keyframes, §4.2 colours).

- **R1 — New 3D story: "the road being paved".** A real embankment profile (layers widen with depth,
  1 : 1.5 side slopes, grass berm) runs from a cut face at the viewer to the horizon.
  - Hero: the bare subgrade embankment recedes into warm haze.
  - Build (0.10–0.41): GSB → WMM → DBM → BC are each *paved* from the horizon toward the viewer, with a
    glowing amber paver edge (shader clip + moving cap).
  - Services (0.40–0.58): the services list is the label column; leader lines run from each row to its
    layer on the cut face.
  - Markings (0.56–0.69): the camera rises; lane markings paint themselves from the viewer outwards
    (they glow softly at night).
  - Products (0.66–0.88): close-up; crack opens, amber sealant flows (unchanged crack/sealant module).
  - Eco (0.88–1.0): wide shot; grass grows along the verges near → far, green motes, sprout.
  - Aggregate stone swirl removed (the paving now carries the "building" idea).
- **R2 — New theme.** "Concrete day" (light) / "Asphalt night" (dark). Lane-marking yellow #F5B301 is the
  accent (buttons with dark ink, eyebrow markers, highlight stroke under accent words, dashed lane band
  between story and page). Green only for eco. Logo blue unchanged. Squarer buttons (8 px), bolder
  display type (H1 up to 104 px, 720 weight). WCAG AA re-checked (`npm run contrast`).
- **R3 — Side rail (01–05 pointers) removed** (client request). Progress bar kept.
- **R4 — Anchors:** `#services` → 0.49, `#products` → 0.82.

## 1.1.0 — 2026-09-29 (client feedback round 1)

- **F1 — One typeface everywhere (client request).** Instrument Serif and JetBrains Mono removed; Inter (variable) used for headings, body, labels, rail and form. Headings 620–650 weight with tight tracking; H1 68 / H2 44 px desktop. Italic accent word is now colour-only. Two font files fewer to load.
- **F2 — Smoother motion.**
  - Every shader compiled and every texture uploaded at boot (including crack, sealant, motes, sprout that appear later) → no compile stalls mid-scroll.
  - Layer materials no longer switch transparency mid-scroll (was forcing program updates).
  - No layout reads in the frame loop (section offsets cached on refresh); UI writes only when progress changes.
  - No `backdrop-filter` over the live canvas (nav + product cards use a denser tint) — blur was being recomputed every frame.
  - Adaptive resolution: pixel ratio steps down when frames run long, back up when there's headroom.
  - Shadow map 2048 → 1024, no stone shadows.
  - Lenis lerp 0.1 → 0.075 and ScrollTrigger scrub 0.6 → 1 (spec 0.6) for a softer glide.
- **F3 — Slab is bigger and sits in the page.**
  - Hero camera ×0.9, services ×1.08 (was ×1.2), products/eco closer with the slab bleeding off the right edge.
  - New soft ground: page-coloured floor that fades out + contact shadow hugging the slab footprint; page-coloured fog so far edges melt into the background.
  - Light story gradient now ends in the page colour (no seam). Shadow opacity 0.18 → 0.12 (light), 0.5 → 0.38 (dark). Dark rim light 3.2 → 1.8 (tops no longer read green).
  - Stone cloud centre 3.1 → 2.8, radius 2.3 → 2.05. Rail dims to 45 % while the slab reaches the right edge; labels column cap `vw − 280`.

## 1.0.0 — 2026-09-29

### Spec-conflict resolutions
- **C1 — Eco beat does not fade out (7.2).** Spec: in 0.92–0.95, out 0.97–1.00 → only ~2% fully visible, which breaks the MUST "each beat readable ≥ 8%". Beat fades in 0.92–0.94 and stays; it scrolls away with the pin release (≈ one extra viewport of reading time).
- **C2 — Appendix A stones vs 7.2.** Appendix A shows ~40 stones at the services frame; 7.2 absorbs all stones by p = 0.40. Timeline (7.2) followed.
- **C3 — Appendix A camera vs label column.** With the Appendix A camera the layer anchors project to x ≈ 1150–1180 px at 1440 px, right of the 1010 px label column, so leader lines would have zero length and labels would sit on the slab. Services camera pulled back ×1.2 and `slabX` 1.6 → 1.2 (8.4: "adjust camera, not text").
- **C4 — WCAG AA (MUST) vs light tokens.** Spec light values fail AA: white on `--acc` 4.07:1, amber `--seal` as text 2.2:1, error red 4.38:1, green eyebrows on the eco strip ≈ 4.2:1. Changed light `--acc` #2F8F4E → #267A43 and `--mute` #5D6E61 → #55655A; added `--acc-text`, `--seal-text`, `--err`. Dark mode and all 3D colours unchanged. Table in README.

### Deviations (SHOULD) with reasons
- **D1 — Hero camera target y 0.5 → 1.2.** At 0.5 the top of the stone cloud is hidden under the nav on 16:9/16:10 screens.
- **D2 — Products camera** (-1, 8.5, 15.5)→(1.2, 0.4, 0) becomes (-3.46, 11.13, 20.15)→(-0.6, 0.6, 0) (same direction, shifted and pulled back ×1.3); eco nudge applies the same delta. Without it the slab overlaps the three 200 px product cards.
- **D3 — Screen-space shift on narrower desktops.** 1100–1439 px: camera distance × (1440/w)², plus `camera.setViewOffset` shift that grows toward the products framing; 1100–1279 also shifts down at products. Keeps the 3D clear of copy at 1280/1180 px.
- **D4 — Stacked layout starts at < 1100 px (spec: < 900).** At 900–1099 px there is no room for copy + slab + labels + three cards side by side (tested 1024×768). These widths use the tablet layout (beats top, 3D below; rail hidden). Nav still collapses < 900 as specified.
- **D5 — Label column.** `min(vw − 330, 1010)` as specified, pushed right (max `vw − 290`) only when an anchor would sit past it; if there is still no room, labels switch to dots + the numbered list (same as < 768).
- **D6 — Rail names.** Names sit to the left of the numbers without taking layout space; hidden (numbers only) while the 3D labels are on screen so they never collide.
- **D7 — Layers are one draw call each.** One atlas texture per layer (top face in one half, side faces in the other) instead of a 6-material box — keeps the story ≤ 12 draw calls (budget 30). BC uses roughness 0.75 on all faces (spec: top 0.75).
- **D8 — Compress bounce.** `back.out(1.4)` overshoot would make `gap` negative (layers interpenetrate). Gap is clamped at 0; the overshoot becomes a tiny vertical squash of the stack.
- **D9 — Crack branches** get one extra midpoint each for a jagged look; end points as specified.
- **D10 — Worker textures copied to canvas.** Speckles are painted in a Worker (OffscreenCanvas); the bitmaps are drawn into regular canvases before upload, because direct ImageBitmap upload produced missing textures on some GL stacks.
- **D11 — 3D boot trigger.** Scene loads on idle after the first user intent (pointer/touch/wheel/key/scroll) or 6 s after `load`. Hero text is the LCP and is interactive immediately. Lighthouse mobile: 99 / 100 / 100 / 100.
- **D12 — Software GL.** If the renderer is SwiftShader/llvmpipe (no GPU), tier is forced to low and rendering is capped at 20 fps.
- **D13 — Tablet type.** 768–899 px uses H1 56 / H2 40 px (spec only defines desktop, 900–1279 and phone).
- **D14 — Stacked products beat** hides the intro paragraph and card descriptions (< 1100 px, story only) so the beat stays in the top band. Full text remains in the DOM.
- **D15 — Extra strings in `content.js`** (form labels/errors, rail names, footer headings, eco eyebrow "03 — Sustainability") so no copy is hard-coded (non-negotiable 7).

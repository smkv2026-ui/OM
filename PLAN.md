# Om — Build Plan

Spiritual-anatomy PWA: Ida · Pingala · **Sushumna**, the seven chakras, the five pranas,
and a library of the texts that describe them. Built from the "Nadi Harmony" prototype
(`reference/chakra-dharana.html`) and the scanned reference figures.

---

## 1. What the prototype does (read in full)

A single 1,600-line HTML file: a 340 px glass sidebar plus a full-bleed `<canvas>`.

| Area | Behaviour |
|---|---|
| **Sensor sets** | `SENSOR_SETS` for 1 / 3 / 7 sensors (default 3). Each sensor has `name`, `color`, `rgb`, `targetYRatio`. Ideal spot = `(centerX, centerY + ratio × 300)`. The 7-sensor ratios are calibrated to the glyphs of the Dharana PNG (drawn 380 px tall from y = −198). |
| **Placement** | HTML5 drag-and-drop from the palette (mouse); touch uses a fixed-position ghost `div`. Placed sensors are stored in **absolute px** (lost/misplaced on resize). Palette button dims to 0.3. Canvas sensors can be re-dragged (mouse + touch). |
| **Frequency** | One slider per sensor, 10–100 Hz, default 10. Drives pulse speed (`sin(t·0.006·f/15)`), particle speed (`1 + f/30`), nadi phase speed, line width, glow, stream width. Average frequency is used globally. |
| **Alignment** | `< all placed → placed/total × 0.25`, else mean of `max(0, 1 − dist/85)`; smoothed `a += (t − a) × 0.08`. |
| **Status** | `<30 %` Dissipated Mind · `<75 %` Harmonizing Nadis... · `≥75 %` Aligned & Centered / Deep Samadhi (Unified) when avg f > 60. Gradient meter. |
| **Visuals** | 50 sine nadis (hue 350→190, straighten with alignment, glow > 0.7, micro-pulse > 0.8); 160 upward particles (gold → cyan > 0.6) converging on the axis; unified cyan stream with white core (> 0.5); radial aura; CSS ambient glow; 7 small dots that turn cyan > 0.8; sensor dashed target ring + bloom. |
| **Drone** | Sine 108 Hz + triangle 54 Hz → lowpass → gain. Gain `0.05 + a·0.25`, cutoff `150 + a·800 + f·10`, pitch `108 + a·12`. Toggle. |
| **Dharana** | Swap figure to the chakra figure (sensor body drawn *behind* the art, only glow in front at 0.45). Per-sensor audio (file or MediaRecorder) keyed `<count>_<id>`, clear button. "Play with Sound": lowest → highest → lowest × Rounds; plays audio or waits 700 ms; a gold-glow diamond glides (`y += Δ·0.04`) to the active sensor; Stop cancels pending promise/timeout/audio. |
| **Reset** | Clears placements and frequencies (not audio). |

Weak points: absolute-px state, no DPR scaling (blurry on retina), sidebar unusable on phones,
no AudioContext resume on iOS, `alert()` errors, recordings vanish on reload, bitmap figures.

## 2. Keep vs redesign

**Keep exactly**: the three sensor sets (names, ids, ratios, defaults), alignment maths,
smoothing constant, thresholds + status strings, frequency effects, drone graph and formulas,
audio key scheme `<count>_<id>`, sequencer order / 700 ms gap / marker easing / rounds / stop,
reset semantics, ~50 nadis + ~160 particles.

**Redesign**
- Engine → typed, framework-free `NadiEngine` class (`src/engine/`), DPR-scaled, theme-aware.
- Positions stored as **normalized ratios** of a layout unit `U` (U = 300 px on a roomy screen,
  scaled down uniformly on small screens). Ideal Y = `centerY + ratio × U`; the 85 px tolerance
  scales with `U/300`, so the maths is identical at full size and the layout survives resize and
  rotation.
- Drag: Pointer Events (mouse/touch/pen) with a ghost element, plus keyboard (Enter to place,
  arrow keys to move) via an accessible DOM overlay.
- 7-sensor colors replaced by the exact chakra colors (§3.1 of the brief).
- Figures: bitmaps → vector. The front pose is a **trace** of the prototype silhouette, mapped into
  the prototype's own frame (380 tall from y = −198) so every calibrated ratio still lands on its
  chakra. Rendered as SVG in Home/Prana and via `Path2D` in the canvas (one geometry source).
- Dharana figure = same vector body + golden Sushumna + tattva glyphs, drawn in the canvas.
- Add Ida (lunar, cool) and Pingala (solar, warm) braiding around Sushumna, crossing at each chakra
  and meeting at Ajna; tap → info card.
- Recordings persist offline in IndexedDB; AudioContext resumed on first gesture.
- Sidebar → bottom sheet (mobile) / collapsible right panel (desktop).

## 3. Structure

```
src/
  main.tsx, App.tsx              shell, hash router, theme, nav
  index.css                      Tailwind v4 + design tokens (CSS vars, light/dark)
  data/                          chakras.json, pranas.json, nadis.json, granthas.json, types.ts
  lib/                           router, store (zustand), theme, audio store (IndexedDB), a11y hooks
  engine/                        nadiEngine.ts (canvas), sensors.ts, drone.ts, sequencer.ts, pranaFlow.ts
  figures/                       geometry.ts (traced paths + chakra positions), FrontFigure, SideFigure, BackFigure, PranaFigure
  yantras/                       Yantra.tsx (petals/letters), centers per chakra, Sahasrara
  views/                         Home, NadiHarmony, Prana, ThreeD (lazy), Library, ChakraDetail, Settings
  components/                    Sheet, GlassPanel, Toggle, Segmented, TopBar, TabBar, NavRail, OfflinePill …
  assets/                        silhouette-reference.png, dharana-reference.png (extracted, reference only — not imported)
public/icons/                    192 / 512 / maskable PNG + SVG lotus
```

## 4. Tech

Vite + React 19 + TypeScript · Tailwind CSS v4 + CSS variables · Framer Motion · zustand ·
vite-plugin-pwa (Workbox precache of shell, data, fonts) · @fontsource (Cormorant Garamond display,
Inter body, Noto Serif Devanagari) self-hosted for offline · three + @react-three/fiber + drei,
lazy-loaded only on the 3D route · Playwright for viewport/touch testing. Hash routing → works on any
static host (GitHub Pages, Netlify, Vercel, Firebase). No backend.

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Three.js bundle weight vs Lighthouse perf ≥ 90 | Separate lazy chunk; never on first paint; DPR capped at 1.5; instanced particles. |
| Devanagari in canvas/3D before font loads | `document.fonts.load()` before drawing glyph textures; SVG uses webfont directly. |
| iOS autoplay / AudioContext | Create/resume context inside the first user gesture; HTMLAudio for clips. |
| MediaRecorder MIME differs (Safari = mp4) | Use `recorder.mimeType`; fallback message instead of `alert`. |
| Scripture accuracy | Only quote verses I can attribute confidently; everything else is summary + `needsVerification`. Never invent verse numbers. |
| No back view reference | Derive from front contour + side spine levels; flagged in report. |
| True 3D from flat scans impossible | Stylised primitive figure matched to front/side proportions; flagged. |
| Scans are copyrighted | Used only as tracing references; not shipped (kept outside `src`/`public`). |

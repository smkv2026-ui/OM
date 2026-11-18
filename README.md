# Om — Subtle Anatomy PWA

A premium, offline-first Progressive Web App on **Ida, Pingala and Sushumna**, the **seven chakras**, the **five prāṇas** and the **Granthas** (Upaniṣads, Tantras and yoga texts) that describe them. It grew out of the single-file "Nadi Harmony" prototype (`reference/chakra-dharana.html`), whose behaviour is ported exactly (see `PLAN.md`).

| Tab | What it is |
|---|---|
| **Home** | Seated meditation figure with the golden Sushumna and seven tappable, breathing yantra glyphs. Front / Side / Back views (rotating cross-fade), optional Ida–Pingala braid, leader-line labels, and **Matrika** mode (all 50 petal letters with a sequence player). |
| **Nadi Harmony** | The energy-alignment simulator: 1 / 3 / 7 sensors, drag-and-drop (mouse, touch, pen, keyboard), per-sensor frequency, coherence meter, Harmonic Drone, **Dharana** mode with per-sensor sound (upload or record) and "Play with Sound". Ida (lunar) and Pingala (solar) braid around Sushumna, crossing at each chakra; tap a channel for its info card. |
| **Prana** | Fig. 4.3 recreated: the five vāyus animated inside the pose with their own paths and motion, a guided breath cycle (4–8 s), breath orb, line-art / premium figure, nadi and chakra layers. |
| **3D** | Lazy-loaded Three.js scene: stylised seated figure, spine, chakras, braided nadis, Om glyphs, optional prāṇa flows. Front / Back / Side / Full 3D presets, orbit / zoom / pan, reset. |
| **Library** | 18 texts, search, filters (category, chakra, nāḍī, prāṇa), bookmarks, verse cards, cross-links. |
| **Settings** (top-bar ⚙) | Theme, motion, chant voice, saved sounds, bookmarks, install. |

Light (parchment) and dark (cosmic) themes follow the system by default, toggle with the sun/moon button (circular reveal), persist in `localStorage`, and re-theme SVG, canvas and 3D live.

---

## Setup

Requires Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. In development, `#/dev/yantras` shows all seven yantras side by side for visual QA (not included in production builds).

## Build & preview

```bash
npm run build
```

```bash
npm run preview
```

`dist/` is a fully static site (relative `base: './'`, hash routing — no server rewrites needed).

## Deploy (all free, static)

- **Netlify** – drag `dist/` onto app.netlify.com/drop, or connect the repo with build command `npm run build` and publish directory `dist`.
- **Vercel** – import the repo; framework "Vite", output `dist`.
- **GitHub Pages** – build, then publish `dist/` (e.g. with the `actions/deploy-pages` workflow). Works from a sub-path because the base is relative.
- **Firebase Hosting** – `firebase init hosting` (public directory `dist`, single-page app: no), then `firebase deploy`.

The service worker precaches the app shell, all JSON data, fonts and icons (and the 3D chunk), so after the first visit the whole app — including 3D — works offline.

## Tests

Playwright is pre-installed in this environment (otherwise `npm i -D playwright`).

```bash
npm run test:nadi
```

Drags every sensor onto its chakra with **real touch events** on a Pixel 7 emulation and with the mouse on desktop, re-drags one, checks alignment/status, and verifies placements survive a portrait → landscape rotation (needs `npm run dev` running; pass `3` or `7` as a second argument for the sensor set).

```bash
npm run test:offline
```

Checks the manifest and service worker, then reloads every route offline (needs `npm run preview` running on port 4173).

---

## Project structure

```
src/
  data/            chakras.json, pranas.json, nadis.json, granthas.json, index.ts (types + accessors)
  engine/          nadiEngine.ts (canvas simulator), sensors.ts, drone.ts, sequencer.ts,
                   audioStore.ts (IndexedDB), audioContext.ts, pranaFlow.ts
  figures/         traced.ts (auto-traced front silhouette), geometry.ts (all figure paths,
                   chakra positions, Ida/Pingala braid), Body.tsx (SVG figures)
  yantras/         Yantra.tsx — one renderer for all seven yantras, driven by chakras.json
  three/           Scene.tsx — 3D scene (only loaded by the 3D route)
  views/           Home, Matrika, ChakraDetail, DetailSheets, NadiHarmony, Prana, ThreeD, Library, Settings
  components/      Shell (nav, top bar, install), Sheet/Dock, SensorAudio, ui, Icons
  assets/reference silhouette/dharana PNGs extracted from the prototype (reference only, not bundled)
scripts/           make-icons, trace-silhouette.py, overlay-check, test-nadi, test-offline, shot
```

### One coordinate frame for everything

All figures live in the prototype's frame: x = 0 is Sushumna, the body spans y ∈ [−198, 182] (380 units, as the prototype drew its PNG), and `targetYRatio × 300` is a chakra's y. The front silhouette was **traced** from the prototype's own figure into this frame, so the calibrated 7-sensor ratios (−0.570 … 0.495) still land exactly on the chakras. In the simulator the unit scales (U = 300·s) and sensor positions are stored as ratios of U, so they survive resize and rotation.

---

## Editing content

### Chakras — `src/data/chakras.json`

Each entry drives the yantra, Home glyph, 7-sensor colour, nadi crossing glow, side-view Om glyphs and 3D node:

- `petals.letters` (Devanagari + IAST), `petals.start` (angle of the first letter, 0° = up, clockwise) or `petals.angles`.
- `color.primary` (exact chakra colour), `color.secondary`, `color.ink` (stroke used on the light theme — keeps milk-white and silver visible).
- `position.frontY` (front figure), `position.sideX` / `sideY` (spinal position from the side figure; also used by Back and 3D), `position.size` (relative glyph size).
- `targetYRatio` (simulator calibration — change only if you recalibrate), `omSpokes`.

### Prāṇas — `src/data/pranas.json`

Name, colour, zone, direction, function, related chakras, practice note, library links, `needsVerification`. Flow paths are in `src/engine/pranaFlow.ts` (`VAYU_PATHS`), shared by the 2D and 3D views.

### Adding a scripture

Add **one object** to `src/data/granthas.json`:

```json
{
  "id": "my-text",
  "title": "Title (IAST)",
  "deva": "देवनागरी",
  "category": "Upanishad | Tantra | Yoga text | Purana | Other",
  "tradition": "Veda / author · period",
  "summary": "…",
  "keyTeachings": ["…"],
  "relevance": "Relevance to Ida / Pingala / Sushumna",
  "chakras": ["anahata"],
  "pranas": ["udana"],
  "nadis": ["sushumna"],
  "verses": [
    { "sanskrit": "…", "transliteration": "…", "translation": "…", "citation": "Text 1.2.3", "verify": false }
  ],
  "related": ["katha-upanishad"],
  "needsVerification": true
}
```

Rules: never invent a verse or a verse number. If unsure, leave `verses` empty, write a summary, and set `needsVerification: true`; mark individual verses whose numbering differs between editions with `"verify": true`. To link it from a chakra, prāṇa or nāḍī, add its `id` to that item's `scriptures` array. It appears in search and filters automatically and is precached for offline use.

### Body views and reference images

The app ships **no raster figures** — every figure is vector:

- **Front** — traced from the prototype's own silhouette (the frame the 7-sensor calibration was made in).
- **Back** — redrawn from Fig. 4.4 (`reference/body-views/back.png`): back of the head with ears, lotuses on the spine, arms bent with hands in the lap. The scan was de-skewed and mapped with `y = 0.303·px − 232.5`, which puts every lotus within ±7 units of the calibrated heights; positions are `position.backY/backW/backH` in `chakras.json`. The 3D model uses the same heights, so its Front and Back presets line up with both figures.
- **Side** — redrawn from Fig. 5.1 (`position.sideX/sideY`).

To refine a view from a new reference image:

1. Put the image in `reference/body-views/` (e.g. `back.png`). Scans in `reference/` are git-ignored.
2. For a figure on a transparent background, trace it into the shared frame:
   `python3 scripts/trace-silhouette.py reference/body-views/back.png 110 0.5 > back.json` and paste the paths into `src/figures/geometry.ts` (e.g. a new `BACK_OUTLINE`).
3. For line-art scans, draw paths by hand in `geometry.ts` and check them with `node scripts/overlay-check.cjs src/figures/traced.ts details.svg <image.png> out.png`, which renders your paths over the image.
4. If chakra positions change, update `position` in `chakras.json`: `backY` drives the Back view and 3D heights, `sideX/sideY` the Side view and 3D spinal depth.

### Icons

Edit the SVG in `scripts/make-icons.cjs`, then:

```bash
npm run icons
```

---

## Accessibility & performance

- Keyboard: every chakra, petal, zone and sensor is focusable. In Nadi Harmony press Enter on a palette sensor to place it, then use arrow keys (Shift = larger steps). Chakra detail: ← / → for previous/next.
- `prefers-reduced-motion` (or Settings → Motion) stills yantras, slows the simulator and shows static arrows for prāṇa flows.
- Lighthouse (mobile, production preview): Performance 92, Accessibility 100, Best Practices 100. Three.js loads only on the 3D route.

## Credits

Figures are original vector redrawings; the book scans supplied as references (Figs. 4.3, 4.4, 4.10–4.16, 5.1 and "Inner Mātṛkā Meditation") were used only for tracing and layout and are not distributed. Fonts: Cormorant Garamond, Inter, Noto Serif Devanagari (SIL OFL), self-hosted.

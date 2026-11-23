/**
 * Shared figure geometry. Every figure lives in the prototype's coordinate frame:
 *   x = 0 is the Sushumna axis, y = 0 is the canvas centre, 1 "ratio" = 300 units,
 *   the body spans y ∈ [-198, 182].
 * So a chakra's targetYRatio × 300 is its y here, in SVG (Home, Prana) and canvas (Nadi Harmony).
 */
import { CHAKRAS, type Chakra } from '../data';
import { FRONT_ARM_GAPS, FRONT_EARRINGS, FRONT_LINEART, FRONT_OUTLINE } from './traced';

export { FRONT_OUTLINE, FRONT_ARM_GAPS, FRONT_LINEART, FRONT_EARRINGS };

export const FRAME = { top: -198, bottom: 182, height: 380, unit: 300 } as const;

/** Earlier hand-drawn front detail strokes — superseded by the traced FRONT_LINEART, kept for reference. */
export const FRONT_DETAILS = [
  // brows
  'M-25 -154 Q-16.5 -157.5 -8 -155.5',
  'M8 -155.5 Q16.5 -157.5 25 -154',
  // closed eyes
  'M-20 -143 Q-14 -139 -8 -142.2',
  'M8 -142.2 Q14 -139 20 -143',
  // nose, mouth, chin
  'M-3.4 -130 Q0 -126.8 3.4 -130',
  'M-8.5 -119.5 Q0 -115 8.5 -119.5',
  'M-13 -101.5 Q0 -96.5 12.5 -101.5',
  // armpits
  'M-64.6 -32.3 Q-60 -25 -57.5 -16.8',
  'M64.6 -32.3 Q60 -25 57.5 -16.8',
  // crossed legs: soles resting on thighs
  'M-108.6 115.7 C-95 104 -70 92 -58 93.5 C-45 94 -38 104 -33 110 C-26 116 -12 117 0.4 117.4 C12 117 22 113 29.8 95.6 C36 89 55 91 71.7 97.7 C85 102 96 110 100.2 117.4',
  'M-100 124 Q0 108 95 121',
  'M-95 134 Q-40 132 0 147 Q40 132 95 128',
];
/** Small closed shapes (earrings, jñāna-mudrā loops). */
export const FRONT_LOOPS = [
  { cx: -32.3, cy: -125.8, rx: 2, ry: 2 },
  { cx: 32.3, cy: -125.8, rx: 2, ry: 2 },
  { cx: -136, cy: 143, rx: 3.6, ry: 7 },
  { cx: 136, cy: 143, rx: 3.6, ry: 7 },
];

/* ------------------------------------------------------------------ SIDE (profile, facing left) */

/** Seated profile body (head, torso, folded legs), facing left. Spine positions follow Fig. 5.1. */
export const SIDE_OUTLINE =
  'M16 -97 C24 -104 31 -114 32 -132 C33 -160 22 -186 -2 -189 C-22 -191 -33 -178 -36 -163' +
  ' C-37 -155 -36 -150 -38 -146 C-40 -142 -40 -139 -41 -136 C-43 -131 -46 -128 -44 -125.5' +
  ' C-42 -123.5 -39 -124 -38.5 -121 C-38 -118 -40 -116 -38.5 -113.5 C-37 -111 -38.5 -108 -37 -104' +
  ' C-35 -99 -28 -97 -21 -96 C-18 -89 -17 -82 -20 -74 C-30 -66 -40 -48 -42 -24' +
  ' C-44 -2 -40 14 -40 30 C-40 52 -46 72 -48 92 C-62 100 -86 108 -106 120' +
  ' C-121 129 -126 148 -116 162 C-106 176 -80 182 -40 182 L10 182' +
  ' C30 182 42 176 45 160 C47 146 42 132 33 118 C25 104 20 88 21 70' +
  ' C22 50 30 22 32 -4 C33 -30 31 -52 26 -68 C22 -80 17 -88 16 -97 Z';

/** Near arm, drawn over the torso in profile. */
export const SIDE_ARM =
  'M-2 -74 C12 -78 22 -70 22 -54 C22 -30 20 -6 16 18 C14 30 8 38 -2 46' +
  ' C-26 70 -60 100 -86 120 C-94 126 -104 128 -108 124 C-112 120 -108 113 -100 108' +
  ' C-74 90 -42 64 -18 38 C-14 30 -14 18 -14 6 C-14 -16 -16 -40 -16 -56 C-16 -68 -10 -73 -2 -74 Z';

export const SIDE_DETAILS = [
  // closed eye + brow
  'M-33 -144 Q-28 -141 -24 -143.5',
  'M-34 -151 Q-28 -154 -22 -152',
  // ear
  'M6 -142 C14 -144 16 -132 13 -126 C11 -122 7 -122 6 -125',
  // mouth
  'M-37.5 -116.5 L-33 -116',
  // folded leg contour (foot resting on thigh)
  'M-48 118 C-70 112 -96 120 -110 140',
  'M-100 156 C-80 150 -50 156 -20 170',
  // hand / mudra
  'M-104 122 C-110 126 -114 132 -110 136',
];

/** Brain silhouette for the side view. */
export const SIDE_BRAIN =
  'M-26 -150 C-28 -168 -14 -182 4 -181 C20 -180 30 -168 28 -152 C27 -142 22 -136 14 -134' +
  ' C6 -132 -4 -132 -12 -134 C-20 -137 -25 -142 -26 -150 Z';
export const SIDE_CEREBELLUM = 'M6 -134 C12 -137 24 -138 26 -130 C27 -123 18 -119 10 -121 C5 -123 4 -130 6 -134 Z';
export const SIDE_BRAIN_FOLDS = [
  'M-20 -160 C-14 -166 -8 -160 -2 -166 C4 -172 10 -166 16 -170',
  'M-22 -150 C-16 -156 -10 -150 -4 -156 C2 -162 10 -156 18 -160 C22 -162 25 -158 26 -154',
  'M-18 -142 C-12 -147 -6 -141 0 -146 C6 -151 12 -146 20 -145',
  'M-8 -176 C-4 -170 2 -176 8 -172',
  // corpus callosum arc
  'M-14 -148 C-8 -156 8 -156 14 -147',
];

/** Spine centre-line in profile (medulla → Muladhara), through the side-view chakra points. */
export const SIDE_SPINE_POINTS: [number, number][] = [
  [-10, -131],
  [-4, -114],
  [0, -96],
  [1.3, -70],
  [4, -38],
  [6.3, -8],
  [6.3, 10.9],
  [3, 44],
  [-3.8, 75.3],
  [2, 100],
  [12.6, 120.7],
  [19, 138],
  [21.5, 148.5], // Muladhara: the spine and Sushumna start here
];

/* ------------------------------------------------------------------ BACK (Fig. 4.4) */

/**
 * Back view, redrawn from Fig. 4.4 (reference/body-views/back.png — the seated figure seen from
 * behind: back of the head with ears, lotuses on the spine, arms bent with hands in the lap).
 * The scan was de-skewed (its spine drifts ~26 px) and mapped into the shared frame with one
 * linear fit, y = 0.303·px − 232.5, the lotus heights were then set to the
 * anatomical levels (brow, throat, heart, navel, sacrum, perineum) of this head and torso. Left and right halves were averaged for a clean symmetric redraw.
 * Points are the right half (x ≥ 0); the left half is mirrored.
 */
type P2 = [number, number];
const mirrorX = (pts: P2[]): P2[] => pts.map(([x, y]) => [-x, y]);

const BACK_HALF: P2[] = [
  [0, -181.6], [7.1, -180], [18.2, -171.6], [23, -160.1], [24, -146],
  // ear
  [26.5, -138], [28.5, -130], [26, -119], [21, -112],
  // neck → shoulder → arm (outer contour)
  [17.2, -104], [16, -93.7], [17, -84], [19.8, -71], [30.8, -64.1], [45.4, -58], [54.8, -53.5],
  [59.1, -43.9], [61.4, -31.3], [63.8, -12.5], [69.6, 10.3], [74.2, 26.3], [76.7, 39.7], [77.5, 50], [81, 58.5],
  // knee → crossed legs → seat
  [88.9, 63], [99, 74.5], [101.7, 87.8], [100.3, 102.4], [96, 113.5], [81, 129], [67.5, 140.7],
  [52.4, 155.9], [42, 166.5], [30.3, 172.8], [18.7, 174.7], [6, 174], [0, 173.4],
];

/** Closed Catmull-Rom path. */
function closedPath(pts: P2[], t = 1 / 6): string {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export const BACK_OUTLINE = closedPath([...BACK_HALF, ...mirrorX(BACK_HALF.slice(1, -1)).reverse()]);

/** The two arm–torso gaps (diamond shapes in Fig. 4.4) — holes, drawn with evenodd. */
const gap = (s: 1 | -1) =>
  `M${40.3 * s} -1.6C${46 * s} 12 ${53 * s} 30 ${58.1 * s} 45.3L${35 * s} 94C${30 * s} 86 ${29 * s} 72 ${29.9 * s} 63.3` +
  `C${30.5 * s} 50 ${32 * s} 40 ${33.2 * s} 34C${35 * s} 22 ${38 * s} 8 ${40.3 * s} -1.6Z`;
export const BACK_GAPS = [gap(1), gap(-1)];

const backDetailHalf: P2[][] = [
  // forearm resting over the thigh, into the lap
  [[77.5, 50], [72, 62], [63.7, 71.5], [50.9, 82.6], [37, 102]],
  // thigh line, knee → lap
  [[88.9, 63], [37, 102]],
  // hip / torso side continuing below the lap
  [[37, 102], [38.5, 119.4]],
  // ear inner fold
  [[24.5, -133], [26, -126], [23.5, -118]],
];
export const BACK_DETAILS = [...backDetailHalf, ...backDetailHalf.map(mirrorX)].map((pts) => smoothPath(pts));

/* ------------------------------------------------------------------ CHAKRA POSITIONS */

export type FigureView = 'front' | 'side' | 'back';

export function chakraPoint(c: Chakra, view: FigureView): { x: number; y: number } {
  if (view === 'front') return { x: 0, y: c.position.frontY };
  if (view === 'side') return { x: c.position.sideX, y: c.position.sideY };
  return { x: 0, y: c.position.backY };
}

/* ------------------------------------------------------------------ NADI PATHS */

/** Catmull-Rom → cubic Bézier for an open polyline. */
export function smoothPath(pts: [number, number][], tension = 1 / 6): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** The six crossing levels (Muladhara → Ajna) for the front view. */
export const CROSSINGS = CHAKRAS.filter((c) => c.id !== 'sahasrara').map((c) => c.position.frontY);

/**
 * Sample the Ida (side = -1) or Pingala (side = +1) braid: it crosses the axis at every chakra
 * between Muladhara and Ajna, alternating sides on each segment, and meets the others at Ajna.
 * Returns points from bottom to top. `phase` lets the canvas animate a gentle sway.
 */
export function braidPoints(side: -1 | 1, samplesPerSeg = 18, ampScale = 1, phase = 0): [number, number][] {
  const ys = CROSSINGS; // descending y (bottom → top)
  const pts: [number, number][] = [];
  for (let s = 0; s < ys.length - 1; s++) {
    const y0 = ys[s];
    const y1 = ys[s + 1];
    const len = Math.abs(y1 - y0);
    const amp = Math.min(30, 0.42 * len + 6) * ampScale;
    const dir = (s % 2 === 0 ? 1 : -1) * side;
    for (let i = s === 0 ? 0 : 1; i <= samplesPerSeg; i++) {
      const t = i / samplesPerSeg;
      const sway = 1 + 0.06 * Math.sin(phase + s * 1.3);
      pts.push([dir * amp * sway * Math.sin(Math.PI * t), y0 + (y1 - y0) * t]);
    }
  }
  return pts;
}

export const IDA_PATH = smoothPath(braidPoints(-1));
export const PINGALA_PATH = smoothPath(braidPoints(1));
export const SUSHUMNA_FRONT = { x: 0, y1: 145, y2: -190 }; // from Muladhara up to the crown
export const SIDE_SPINE_PATH = smoothPath(SIDE_SPINE_POINTS);

/** Evenly sample a polyline, giving point + unit tangent (for vertebra placement). */
export function samplePolyline(pts: [number, number][], n: number) {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    seg.push(l);
    total += l;
  }
  const out: { x: number; y: number; tx: number; ty: number; t: number }[] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / (n - 1)) * total;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) {
      d -= seg[i];
      i++;
    }
    const f = seg[i] ? d / seg[i] : 0;
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const tl = seg[i] || 1;
    out.push({ x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, tx: (x1 - x0) / tl, ty: (y1 - y0) / tl, t: k / (n - 1) });
  }
  return out;
}

/** 7 cervical, 12 thoracic, 5 lumbar + sacrum/coccyx — vertebra bodies along the side spine. */
export const VERTEBRAE = (() => {
  const pts = samplePolyline(SIDE_SPINE_POINTS.slice(1), 26);
  return pts.map((p, i) => ({
    ...p,
    region: i < 7 ? 'cervical' : i < 19 ? 'thoracic' : i < 24 ? 'lumbar' : 'sacral',
    w: i < 7 ? 6 : i < 19 ? 7.5 : i < 24 ? 9.5 : 8 - (i - 24) * 2,
  }));
})();

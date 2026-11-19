/**
 * Meditation pose geometry (front view) for every asana × mudra.
 * Padmasana with hands on the knees = the traced reference figure, untouched. Every other combination
 * keeps the traced head and torso (clipped by TORSO_MASK) and adds generated legs, arms and hands in
 * the same style. All coordinates are in the shared figure frame (see geometry.ts).
 */
import posesRaw from '../data/poses.json';

export type AsanaId = 'padmasana' | 'ardha-padmasana' | 'siddhasana' | 'vajrasana';
export type MudraId = 'jnana' | 'chin' | 'dhyana' | 'bhairava' | 'yoni' | 'anjali' | 'prana' | 'shambhavi';
export type LegState = 'extended' | 'padma-half' | 'padma' | 'ardha-tuck' | 'ardha' | 'siddha-half' | 'siddha' | 'kneel' | 'vajra';
export type ArmPose = 'knees' | 'lap' | 'chest';
export type HandShape =
  | 'open'
  | 'index-thumb'
  | 'prana'
  | 'lap-open'
  | 'lap-stack'
  | 'dhyana'
  | 'yoni-half'
  | 'yoni'
  | 'chest-open'
  | 'anjali';
export type Eyes = 'closed' | 'open' | 'up';

export interface Asana {
  id: AsanaId;
  name: string;
  deva: string;
  english: string;
  about: string;
  benefits: string[];
  caution: string;
  steps: { legs: LegState; arms: 'knees' | 'mudra'; text: string }[];
}
export interface Mudra {
  id: MudraId;
  name: string;
  deva: string;
  english: string;
  arms: ArmPose;
  hand: HandShape;
  eyes?: Eyes;
  about: string;
  benefits: string[];
  caution?: string;
  steps: { hand?: HandShape; eyes?: Eyes; text: string }[];
}
export const ASANAS = posesRaw.asanas as Asana[];
export const MUDRAS = posesRaw.mudras as Mudra[];
export const asanaById = (id: string) => ASANAS.find((a) => a.id === id) ?? ASANAS[0];
export const mudraById = (id: string) => MUDRAS.find((m) => m.id === id) ?? MUDRAS[0];

type P = [number, number];

/* ------------------------------------------------------------------ helpers */

/** Catmull-Rom resample of a centre line. */
function resample(pts: P[], n = 18): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A tapered limb with round ends along a centre line: widths given at each control point. */
export function limb(pts: P[], widths: number[]): string {
  const c = resample(pts);
  const W = (i: number) => {
    const t = (i / (c.length - 1)) * (widths.length - 1);
    const k = Math.min(widths.length - 2, Math.floor(t));
    return widths[k] + (widths[k + 1] - widths[k]) * (t - k);
  };
  const L: P[] = [], R: P[] = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = W(i) / 2;
    L.push([c[i][0] + nx * w, c[i][1] + ny * w]);
    R.push([c[i][0] - nx * w, c[i][1] - ny * w]);
  }
  const f = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const wEnd = W(c.length - 1) / 2, wStart = W(0) / 2;
  let d = `M${f(L[0])}`;
  for (const p of L.slice(1)) d += `L${f(p)}`;
  d += `A${wEnd.toFixed(1)} ${wEnd.toFixed(1)} 0 0 0 ${f(R[R.length - 1])}`;
  for (const p of R.slice(0, -1).reverse()) d += `L${f(p)}`;
  d += `A${wStart.toFixed(1)} ${wStart.toFixed(1)} 0 0 0 ${f(L[0])}Z`;
  return d;
}

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const pt = (a: number) => [cx + rx * Math.cos(a) * c - ry * Math.sin(a) * s, cy + rx * Math.cos(a) * s + ry * Math.sin(a) * c];
  const [x0, y0] = pt(0), [x1, y1] = pt(Math.PI);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${rx} ${ry} ${rot} 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}A${rx} ${ry} ${rot} 1 1 ${x0.toFixed(1)} ${y0.toFixed(1)}Z`;
};

/* ------------------------------------------------------------------ torso */

/** Keeps the traced head, neck, shoulders and torso; arms and legs are cut away. */
export const TORSO_MASK =
  'M-72 -215L72 -215L72 -66L66 -42L61 -20L56 0L54 20L49 45L54 70L58 92L-58 92L-54 70L-49 45L-54 20L-56 0L-61 -20L-66 -42L-72 -66Z';

/* ------------------------------------------------------------------ legs */

export interface Knees {
  l: P;
  r: P;
}
interface Legs {
  under: string[];
  over: string[];
  knees: Knees;
}

const hips = () => [`M-62 78Q-70 112 -58 132L58 132Q70 112 62 78Q0 70 -62 78Z`];

export function legs(state: LegState): Legs {
  const thigh = (s: 1 | -1, knee: P) => limb([[s * 34, 112], [s * 90, 138], knee], [50, 44, 36]);
  switch (state) {
    case 'extended':
      return {
        under: [],
        over: [...hips(), limb([[-34, 100], [-38, 150], [-42, 176]], [46, 38, 30]), limb([[34, 100], [38, 150], [42, 176]], [46, 38, 30]), ell(-46, 182, 11, 13), ell(46, 182, 11, 13)],
        knees: { l: [-40, 150], r: [40, 150] },
      };
    case 'padma-half': {
      const kr: P = [148, 158];
      return {
        under: [],
        over: [
          ...hips(),
          limb([[-34, 100], [-38, 150], [-42, 176]], [46, 38, 30]),
          ell(-46, 182, 11, 13),
          thigh(1, kr),
          limb([kr, [60, 148], [-20, 122], [-52, 110]], [32, 28, 24, 20]),
          ell(-62, 106, 18, 9, -15),
        ],
        knees: { l: [-40, 150], r: kr },
      };
    }
    case 'padma': {
      const kl: P = [-148, 158], kr: P = [148, 158];
      return {
        under: [],
        over: [
          ...hips(),
          thigh(-1, kl),
          thigh(1, kr),
          limb([kl, [-60, 150], [20, 124], [52, 110]], [32, 28, 24, 20]),
          ell(62, 106, 18, 9, 15),
          limb([kr, [60, 148], [-20, 122], [-52, 110]], [32, 28, 24, 20]),
          ell(-62, 106, 18, 9, -15),
        ],
        knees: { l: kl, r: kr },
      };
    }
    case 'ardha-tuck':
    case 'ardha': {
      const kl: P = [-140, 160], kr: P = [140, 160];
      const top = state === 'ardha';
      return {
        under: [limb([kl, [-60, 172], [40, 172], [88, 168]], [32, 28, 24, 18])],
        over: [
          ...hips(),
          thigh(-1, kl),
          top ? thigh(1, kr) : limb([[34, 100], [38, 150], [42, 176]], [46, 38, 30]),
          ...(top ? [limb([kr, [60, 148], [-20, 122], [-52, 110]], [32, 28, 24, 20]), ell(-62, 106, 18, 9, -15)] : [ell(46, 182, 11, 13)]),
        ],
        knees: { l: kl, r: top ? kr : [40, 150] },
      };
    }
    case 'siddha-half':
    case 'siddha': {
      const kl: P = [-138, 158], kr: P = [138, 158];
      const full = state === 'siddha';
      return {
        under: [],
        over: [
          ...hips(),
          thigh(-1, kl),
          limb([kl, [-70, 168], [-6, 160]], [32, 27, 24]),
          ell(10, 160, 16, 8, 8),
          ...(full ? [thigh(1, kr), limb([kr, [70, 150], [6, 142]], [32, 27, 24]), ell(-10, 144, 16, 8, -8)] : [limb([[34, 100], [38, 150], [42, 176]], [46, 38, 30]), ell(46, 182, 11, 13)]),
        ],
        knees: { l: kl, r: full ? kr : [40, 150] },
      };
    }
    case 'kneel':
    case 'vajra': {
      // kneeling, seen from the front: thighs come toward the viewer, knees together, feet hidden behind
      const ky = state === 'kneel' ? 182 : 170;
      return {
        under: [],
        over: [`M-60 82Q-66 108 -58 124L58 124Q66 108 60 82Q0 74 -60 82Z`, limb([[-30, 98], [-30, ky - 6]], [54, 46]), limb([[30, 98], [30, ky - 6]], [54, 46])],
        knees: { l: [-32, ky - 22], r: [32, ky - 22] },
      };
    }
  }
}

/* ------------------------------------------------------------------ arms + hands */

const SHOULDER: P = [64, -60];

export function arms(pose: ArmPose, knees: Knees, hand: HandShape): { shapes: string[]; marks: { d: string; fill?: string; stroke?: boolean }[] } {
  const shapes: string[] = [];
  const marks: { d: string; fill?: string; stroke?: boolean }[] = [];
  for (const s of [-1, 1] as const) {
    shapes.push(ell(s * SHOULDER[0], SHOULDER[1], 17, 15));
    const knee = s === -1 ? knees.l : knees.r;
    if (pose === 'knees') {
      const hx = knee[0] - s * 4, hy = knee[1] - 18;
      const near = Math.abs(knee[0]) < 80; // vajrasana: hands on the thighs
      const elbow: P = near ? [s * 84, 30] : [s * 110, 22];
      shapes.push(limb([[s * SHOULDER[0], SHOULDER[1]], [s * 90, -20], elbow], [26, 23, 20]));
      shapes.push(limb([elbow, [(elbow[0] + hx) / 2, (elbow[1] + hy) / 2 + 4], [hx, hy - 8]], [20, 17, 14]));
      shapes.push(ell(hx, hy + 2, 10, 13, s * 10));
      if (hand === 'index-thumb' || hand === 'prana') marks.push({ d: ell(hx - s * 2, hy + 4, 3.6, 6.5), stroke: true });
      if (hand === 'prana') marks.push({ d: `M${hx + s * 4} ${hy - 4}L${hx + s * 1} ${hy + 9}`, stroke: true });
    } else if (pose === 'lap') {
      const elbow: P = [s * 88, 38];
      shapes.push(limb([[s * SHOULDER[0], SHOULDER[1]], [s * 84, -16], elbow], [26, 23, 20]));
      shapes.push(limb([elbow, [s * 62, 92], [s * 28, 112]], [20, 17, 14]));
    } else {
      const elbow: P = [s * 82, 6];
      shapes.push(limb([[s * SHOULDER[0], SHOULDER[1]], [s * 84, -30], elbow], [26, 23, 20]));
      shapes.push(limb([elbow, [s * 40, -6], [s * 12, -24]], [20, 17, 14]));
    }
  }
  // hands that meet at the centre
  if (pose === 'lap') {
    if (hand === 'yoni' || hand === 'yoni-half') {
      shapes.push(ell(-14, 114, 13, 11, 20), ell(14, 114, 13, 11, -20));
      marks.push({ d: ell(-14, 114, 13, 11, 20), stroke: true }, { d: ell(14, 114, 13, 11, -20), stroke: true });
      if (hand === 'yoni') marks.push({ d: 'M0 98L10 112L0 128L-10 112Z', stroke: true });
      else marks.push({ d: 'M-12 114L12 114M-12 118L12 118', stroke: true });
    } else {
      shapes.push(ell(0, 122, 30, 10), ell(0, 115, 28, 9));
      marks.push({ d: hand === 'lap-open' ? `${ell(-15, 118, 15, 8)} ${ell(15, 118, 15, 8)}` : `${ell(0, 122, 30, 10)} M-26 113Q0 106 26 113`, stroke: true });
      if (hand === 'dhyana') marks.push({ d: 'M-12 108Q0 98 12 108', stroke: true });
      if (hand === 'lap-open') marks.push({ d: 'M0 108L0 128', stroke: true });
    }
  } else if (pose === 'chest') {
    if (hand === 'anjali') {
      shapes.push(ell(-5, -40, 7, 19), ell(5, -40, 7, 19));
      marks.push({ d: `${ell(-5, -40, 7, 19)} ${ell(5, -40, 7, 19)}`, stroke: true });
      marks.push({ d: 'M0 -58L0 -22', stroke: true });
    } else {
      shapes.push(ell(-14, -34, 9, 15, 15), ell(14, -34, 9, 15, -15));
      marks.push({ d: `${ell(-14, -34, 9, 15, 15)} ${ell(14, -34, 9, 15, -15)}`, stroke: true });
    }
  }
  return { shapes, marks };
}

/* ------------------------------------------------------------------ the composed pose */

export interface PoseFigure {
  /** where the arms rest (for the side view and 3D) */
  armPose: ArmPose;
  legs: LegState;
  /** true → draw the traced reference figure as is (Padmasana, hands on the knees) */
  traced: boolean;
  /** drawn before the clipped torso (parts behind it) */
  under: string[];
  /** drawn after the clipped torso, in order */
  over: string[];
  /** small line/fill details: hand seals */
  marks: { d: string; fill?: string; stroke?: boolean }[];
  eyes: Eyes;
}

export function poseFigure(asanaId: AsanaId, mudraId: MudraId, override?: { legs?: LegState; armsAtKnees?: boolean; hand?: HandShape; eyes?: Eyes }): PoseFigure {
  const asana = asanaById(asanaId);
  const mudra = mudraById(mudraId);
  const finalLegs = asana.steps[asana.steps.length - 1].legs;
  const legState = override?.legs ?? finalLegs;
  const armPose: ArmPose = override?.armsAtKnees ? 'knees' : mudra.arms;
  const hand: HandShape = override?.hand ?? (override?.armsAtKnees ? 'open' : mudra.hand);
  const eyes: Eyes = override?.eyes ?? mudra.eyes ?? 'closed';
  if (legState === 'padma' && armPose === 'knees') return { traced: true, under: [], over: [], marks: [], eyes, armPose, legs: legState };
  const L = legs(legState);
  const A = arms(armPose, L.knees, hand);
  // arms resting in the lap or at the chest pass in front of the legs; arms on the knees too
  return { traced: false, under: L.under, over: [...L.over, ...A.shapes], marks: A.marks, eyes, armPose, legs: legState };
}

/** Patches that hide the traced closed eyes, and the open eyes drawn on top (Shambhavi). */
export const EYE_PATCHES = [ell(-14, -141, 8.5, 4.5), ell(14, -141, 8.5, 4.5)];
export function openEyes(up: boolean) {
  const iy = up ? -143.6 : -141.2;
  return {
    whites: [`M-21 -141Q-14 -146.5 -7 -141Q-14 -137 -21 -141Z`, `M7 -141Q14 -146.5 21 -141Q14 -137 7 -141Z`],
    irises: [ell(-14, iy, 2.4, 2.4), ell(14, iy, 2.4, 2.4)],
  };
}

/** Side-view near arm (the figure faces −x) for each arm placement. */
export function sideArm(pose: ArmPose): string {
  if (pose === 'knees') return '';
  if (pose === 'lap')
    return [limb([[3, -66], [7, -16], [2, 40]], [24, 20, 18]), limb([[2, 40], [-22, 84], [-44, 104]], [18, 15, 13]), ell(-52, 106, 13, 7, 8)].join(' ');
  return [limb([[3, -66], [9, -24], [4, 16]], [24, 20, 18]), limb([[4, 16], [-22, -4], [-42, -26]], [18, 15, 13]), ell(-47, -36, 6, 14, -15)].join(' ');
}

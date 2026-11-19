/**
 * Meditation pose geometry (front view) for every asana × mudra.
 * Padmasana with Jnana / Chin on the knees = the traced reference figure, untouched. Every other
 * combination keeps the traced head and torso (clipped by TORSO_MASK) and adds drawn legs, feet, arms
 * and mudra hands as ordered, outlined parts (back → front), so overlaps read like a line drawing.
 * All coordinates are in the shared figure frame (see geometry.ts).
 */
import posesRaw from '../data/poses.json';
import { blob, ellipsePts, limb, Pen, type P, type Part } from './draw';
import { handParts, SIDE_WRIST, type HandShape } from './hands';

export type AsanaId = 'padmasana' | 'ardha-padmasana' | 'siddhasana' | 'vajrasana';
export type MudraId = 'jnana' | 'chin' | 'dhyana' | 'bhairava' | 'yoni' | 'anjali' | 'prana' | 'vayu' | 'shambhavi';
export type LegState = 'extended' | 'padma-half' | 'padma' | 'ardha-tuck' | 'ardha' | 'siddha-half' | 'siddha' | 'kneel' | 'vajra';
export type ArmPose = 'knees' | 'lap' | 'chest';
export type { HandShape } from './hands';
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

/* ------------------------------------------------------------------ torso */

/** Keeps the traced head, neck, shoulders and torso; arms and legs are cut away. */
export const TORSO_MASK =
  'M-72 -215L72 -215L72 -66L66 -42L61 -20L56 0L54 20L49 45L54 70L58 92L-58 92L-54 70L-49 45L-54 20L-56 0L-61 -20L-66 -42L-72 -66Z';
/** marker part: the traced torso goes here in the drawing order */
export const TORSO = '__torso__';

const fig = new Pen();
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => blob(ellipsePts(cx, cy, rx, ry, rot));

/* ------------------------------------------------------------------ feet */

/** Foot with the sole toward the viewer, lying along +x from the heel (Padmasana / Siddhasana). */
function footSole(pen: Pen): Part {
  return pen.blob(
    [
      [-8, -8],
      [14, -10],
      [36, -11],
      [52, -14],
      [66, -13],
      [76, -7],
      [79, 1],
      [75, 9],
      [62, 13],
      [46, 12],
      [30, 8],
      [12, 9],
      [-6, 9],
      [-12, 1],
    ],
    [
      pen.line([[64, -10], [76, -6]]),
      pen.line([[64, -5], [78, -2]]),
      pen.line([[64, 0], [78, 3]]),
      pen.line([[63, 5], [75, 8]]),
      pen.line([[6, 2], [24, 0], [42, 2]]),
    ],
  );
}

/** Upright foot, toes up, sole toward the viewer (legs stretched toward the viewer). */
function footUp(pen: Pen): Part {
  return pen.blob(
    [
      [-11, 0],
      [-14, -18],
      [-16, -36],
      [-14, -50],
      [-7, -57],
      [4, -58],
      [13, -52],
      [16, -38],
      [14, -18],
      [11, 0],
      [0, 5],
    ],
    [pen.line([[-8, -50], [-6, -40]]), pen.line([[-1, -52], [0, -42]]), pen.line([[6, -51], [6, -41]]), pen.line([[-4, -22], [0, -10], [4, -22]])],
  );
}

/** Pen for a foot: heel at `heel`, toes toward `toe`. */
function footPen(heel: P, toe: P, k = 1, mirror = false) {
  const a = (Math.atan2(toe[1] - heel[1], toe[0] - heel[0]) * 180) / Math.PI;
  return mirror ? new Pen({ at: heel, angle: 180 - a, k, mirror: true }) : new Pen({ at: heel, angle: a, k });
}

/* ------------------------------------------------------------------ legs */

export interface Knees {
  l: P;
  r: P;
}
interface Legs {
  back: Part[];
  front: Part[];
  knees: Knees;
  /** where hands rest on the thighs instead of the knees (Vajrasana) */
  thighs?: boolean;
}

const HIPS: Part = { d: 'M-62 78Q-72 112 -60 136L60 136Q72 112 62 78Q0 70 -62 78Z' };

const thigh = (s: number, knee: P) => fig.limb([[s * 26, 140], [s * 92, 154], knee], [74, 56, 42]);
/** shin of the leg on side s, from its knee to an ankle near the centre */
const shin = (s: number, knee: P, mid: P, ankle: P) => fig.limb([[knee[0] - s * 4, knee[1] + 3], mid, ankle], [40, 34, 26], { creases: [0.12] });
/** a leg stretched toward the viewer */
const stretched = (s: number): Part[] => [fig.limb([[s * 34, 136], [s * 42, 166], [s * 46, 186]], [64, 52, 42]), footUp(new Pen({ at: [s * 48, 196], k: 1 }))];
/** foot lying sole-up from heel toward toe; mirrored when the toes point to −x */
const sole = (heel: P, toe: P) => footSole(footPen(heel, toe, 1, toe[0] < heel[0]));

export function legs(state: LegState): Legs {
  switch (state) {
    case 'extended':
      return { back: [HIPS], front: [...stretched(-1), ...stretched(1)], knees: { l: [-42, 166], r: [42, 166] }, thighs: true };
    case 'padma-half':
    case 'padma': {
      const kl: P = [-152, 166], kr: P = [152, 166];
      // figure's right leg (viewer's left) goes first, the left foot rests on top
      const right = [shin(-1, kl, [-84, 164], [4, 150]), sole([6, 148], [86, 122])];
      const left = [shin(1, kr, [84, 164], [-4, 150]), sole([-6, 148], [-86, 122])];
      if (state === 'padma-half') return { back: [HIPS], front: [thigh(-1, kl), ...stretched(1), ...right], knees: { l: kl, r: [42, 166] } };
      return { back: [HIPS], front: [thigh(-1, kl), thigh(1, kr), ...right, ...left], knees: { l: kl, r: kr } };
    }
    case 'ardha-tuck':
    case 'ardha': {
      const kl: P = [-150, 168], kr: P = [150, 166];
      // left (viewer's left) leg folds under the other thigh
      const under = [shin(-1, kl, [-60, 184], [40, 184]), sole([46, 184], [120, 178])];
      if (state === 'ardha-tuck') return { back: [HIPS], front: [thigh(-1, kl), ...under, ...stretched(1)], knees: { l: kl, r: [42, 166] } };
      return { back: [HIPS], front: [thigh(-1, kl), ...under, thigh(1, kr), shin(1, kr, [84, 164], [-4, 150]), sole([-6, 148], [-86, 122])], knees: { l: kl, r: kr } };
    }
    case 'siddha-half':
    case 'siddha': {
      const kl: P = [-146, 170], kr: P = [146, 168];
      // left heel at the perineum, right heel just above it, toes tucked between calf and thigh
      const first = [shin(-1, kl, [-74, 182], [-4, 180]), sole([0, 180], [74, 172])];
      if (state === 'siddha-half') return { back: [HIPS], front: [thigh(-1, kl), ...first, ...stretched(1)], knees: { l: kl, r: [42, 166] } };
      return { back: [HIPS], front: [thigh(-1, kl), thigh(1, kr), ...first, shin(1, kr, [74, 166], [4, 160]), sole([0, 160], [-76, 150])], knees: { l: kl, r: kr } };
    }
    case 'kneel':
    case 'vajra': {
      // kneeling, seen from the front: thighs come toward the viewer, knees together, feet hidden behind
      const ky = state === 'kneel' ? 200 : 186;
      const t = (s: number) =>
        fig.limb([[s * 30, 104], [s * 32, (104 + ky) / 2], [s * 30, ky]], [66, 62, 54], { extra: [fig.line([[s * 18, ky - 6], [s * 30, ky - 12], [s * 42, ky - 6]])] });
      return { back: [HIPS], front: [t(-1), t(1)], knees: { l: [-32, ky - 40], r: [32, ky - 40] }, thighs: true };
    }
  }
}

/* ------------------------------------------------------------------ arms + hands */

const SH = (s: number): P => [s * 58, -62];
/** a whole arm as one smooth limb: shoulder → upper arm → elbow → forearm → wrist */
const arm = (s: number, a: P, elbow: P, b: P, wrist: P) => fig.limb([SH(s), a, elbow, b, wrist], [34, 29, 24, 21, 18], { creases: [0.5] });

export function arms(pose: ArmPose, L: Legs, hand: HandShape, palmUp: boolean): Part[] {
  const parts: Part[] = [];
  for (const s of [-1, 1]) {
    if (pose === 'knees') {
      const knee = s === -1 ? L.knees.l : L.knees.r;
      if (L.thighs) {
        const elbow: P = [s * 88, 46], wrist: P = [s * Math.max(44, Math.abs(knee[0]) + 8), knee[1] - 30];
        parts.push(arm(s, [s * 84, -14], elbow, [s * 74, 96], wrist));
        parts.push(...handParts(new Pen({ at: wrist, origin: SIDE_WRIST, angle: s === 1 ? 98 : 82, k: 0.22, flip: !palmUp }), hand, false));
      } else {
        const elbow: P = [s * 112, 28], wrist: P = [knee[0] - s * 16, knee[1] - 44];
        parts.push(arm(s, [s * 92, -24], elbow, [s * 126, 76], wrist));
        parts.push(...handParts(new Pen({ at: wrist, origin: SIDE_WRIST, angle: 64, k: 0.24, mirror: s === -1, flip: !palmUp }), hand, false));
      }
    } else if (pose === 'lap') {
      const yoni = hand === 'yoni' || hand === 'yoni-half';
      const elbow: P = [s * 92, 44], wrist: P = yoni ? [s * 36, 98] : [s * 34, 118];
      parts.push(arm(s, [s * 86, -14], elbow, [s * 74, 90], wrist));
    } else {
      const elbow: P = [s * 86, 12], wrist: P = [s * (hand === 'anjali' ? 12 : 22), -16];
      parts.push(arm(s, [s * 88, -28], elbow, [s * 50, 4], wrist));
    }
  }
  if (pose === 'lap') {
    const yoni = hand === 'yoni' || hand === 'yoni-half';
    parts.push(...handParts(new Pen({ at: yoni ? [0, 108] : [0, 114], k: 0.3 }), hand, false));
  } else if (pose === 'chest') parts.push(...handParts(new Pen({ at: [0, -44], k: 0.34 }), hand, false));
  return parts;
}

/* ------------------------------------------------------------------ the composed pose */

export interface PoseFigure {
  /** where the arms rest (for the side view and 3D) */
  armPose: ArmPose;
  legs: LegState;
  hand: HandShape;
  palmUp: boolean;
  /** true → draw the traced reference figure as is (Padmasana, Jnana / Chin on the knees) */
  traced: boolean;
  /** outlined parts back → front; TORSO marks where the traced torso goes */
  parts: Part[];
  eyes: Eyes;
}

export interface PoseOverride {
  legs?: LegState;
  armsAtKnees?: boolean;
  hand?: HandShape;
  eyes?: Eyes;
}

export function poseFigure(asanaId: AsanaId, mudraId: MudraId, override?: PoseOverride): PoseFigure {
  const asana = asanaById(asanaId);
  const mudra = mudraById(mudraId);
  const legState = override?.legs ?? asana.steps[asana.steps.length - 1].legs;
  const armPose: ArmPose = override?.armsAtKnees ? 'knees' : mudra.arms;
  const hand: HandShape = override?.hand ?? (override?.armsAtKnees ? 'open' : mudra.hand);
  const palmUp = override?.armsAtKnees ? false : mudra.id !== 'jnana';
  const eyes: Eyes = override?.eyes ?? mudra.eyes ?? 'closed';
  const base = { eyes, armPose, legs: legState, hand, palmUp };
  if (legState === 'padma' && armPose === 'knees' && hand === 'index-thumb') return { ...base, traced: true, parts: [] };
  const L = legs(legState);
  return { ...base, traced: false, parts: [...L.back, { d: TORSO }, ...L.front, ...arms(armPose, L, hand, palmUp)] };
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

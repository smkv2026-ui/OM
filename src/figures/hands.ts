/**
 * Mudra hand drawings, after reference illustrations and photographs.
 *
 * Every drawing is made in its own local frame and returned as ordered, outlined parts
 * (back to front), so it can be shown large in Settings or small on the figure's knees / lap.
 *
 *  side hand  (Jnana, Chin, Vayu, Prana): seen from the thumb side, palm up, wrist at (-104, 22),
 *             fingers pointing +x. Thumb side is −y.
 *  lap hands  (Dhyana, Bhairava, Yoni):   seen from the front, wrists at (∓112, ~10), centre (0, 0).
 *  prayer     (Anjali):                   seen from the front, wrists at (∓34, 84), fingertips up.
 */
import { Pen, type P, type Part } from './draw';

export type HandShape =
  | 'open'
  | 'index-curl'
  | 'index-thumb'
  | 'vayu-fold'
  | 'vayu'
  | 'prana-curl'
  | 'prana'
  | 'lap-open'
  | 'lap-stack'
  | 'dhyana'
  | 'yoni-half'
  | 'yoni'
  | 'chest-open'
  | 'anjali';

export const SIDE_WRIST: P = [-104, 22];
export type HandKind = 'side' | 'lap' | 'chest';
export const handKind = (h: HandShape): HandKind =>
  h === 'lap-open' || h === 'lap-stack' || h === 'dhyana' || h === 'yoni-half' || h === 'yoni' ? 'lap' : h === 'chest-open' || h === 'anjali' ? 'chest' : 'side';

/* ------------------------------------------------------------------ side hand */

const CR = [0.34, 0.66];

/**
 * Side view of one hand, palm up, seen from the thumb side (after the Gyan / Vayu mudra photographs).
 * Fingers are drawn far → near (little, ring, middle, index) so the nearer ones overlap.
 */
export interface Finger {
  name: 'little' | 'ring' | 'middle' | 'index' | 'thumb';
  pts: P[];
  w: number[];
  /** curled toward the palm (its nail shows in the side view) */
  curled: boolean;
}

/** Centre lines of the five fingers in the side-hand frame (shared by the drawing and the 3D hand). */
export function sideFingers(shape: HandShape): Finger[] {
  const curl = shape === 'prana' || shape === 'prana-curl';
  const touch = shape === 'prana';
  const idx: Record<string, P[]> = {
    open: [[0, 7], [62, 6], [122, 8]],
    'index-curl': [[0, 6], [42, -2], [62, -30], [52, -52]],
    'index-thumb': [[0, 6], [34, -4], [46, -36], [26, -62]],
    'vayu-fold': [[0, 6], [34, -10], [30, -36], [6, -40]],
    vayu: [[0, 6], [26, -18], [4, -36], [-30, -28]],
  };
  const th: Record<string, P[]> = {
    open: [[-66, -12], [-38, -36], [-4, -44], [28, -44]],
    'index-curl': [[-66, -12], [-44, -42], [-16, -60], [12, -66]],
    'index-thumb': [[-66, -12], [-46, -44], [-18, -64], [12, -70]],
    'vayu-fold': [[-66, -12], [-42, -38], [-12, -46], [16, -46]],
    vayu: [[-66, -12], [-46, -44], [-16, -50], [12, -42]],
    'prana-curl': [[-66, -12], [-42, -40], [-12, -50], [16, -50]],
    prana: [[-66, -12], [-44, -40], [-14, -46], [14, -40]],
  };
  const ip = idx[shape] ?? idx.open;
  return [
    curl
      ? { name: 'little', pts: touch ? [[-8, 38], [26, 36], [36, 8], [18, -24]] : [[-8, 38], [34, 38], [52, 14], [48, -8]], w: [18, 17, 15, 14], curled: true }
      : { name: 'little', pts: [[-8, 40], [46, 44], [90, 44]], w: [18, 17, 15], curled: false },
    curl
      ? { name: 'ring', pts: touch ? [[-6, 28], [34, 26], [42, -4], [24, -32]] : [[-6, 28], [44, 28], [60, 2], [56, -18]], w: [20, 19, 17, 15], curled: true }
      : { name: 'ring', pts: [[-6, 30], [54, 33], [108, 33]], w: [20, 19, 16.5], curled: false },
    { name: 'middle', pts: [[-4, 19], [60, 21], [120, 22]], w: [21, 20, 17], curled: false },
    { name: 'index', pts: ip, w: ip.length === 3 ? [21, 20, 17] : [21, 20, 18, 16], curled: ip.length !== 3 },
    { name: 'thumb', pts: th[shape] ?? th.open, w: [34, 28, 23, 20], curled: true },
  ];
}

/** Palm outline in the side-hand frame. */
export const SIDE_PALM: P[] = [
  [-108, -6],
  [-82, -22],
  [-52, -26],
  [-24, -16],
  [0, -2],
  [10, 14],
  [8, 34],
  [-6, 48],
  [-40, 52],
  [-78, 50],
  [-108, 44],
];

/**
 * Side view of one hand, palm up, seen from the thumb side (after the Gyan / Vayu mudra photographs).
 * Fingers are drawn far → near (little, ring, middle, index) so the nearer ones overlap.
 */
export function sideHand(pen: Pen, shape: HandShape, opts: { forearm?: boolean } = {}): Part[] {
  const parts: Part[] = [];
  if (opts.forearm !== false) parts.push(pen.limb([[-190, 30], [-150, 26], [-104, 22]], [58, 58, 56], { tag: 'forearm' }));
  const F = sideFingers(shape);
  const finger = (f: Finger) => pen.limb(f.pts, f.w, f.name === 'thumb' ? { creases: [0.62], nail: -1 } : { creases: CR, nail: f.curled ? -1 : undefined });
  F.slice(0, 3).forEach((f) => parts.push(finger(f)));
  // palm: heel of the hand, thumb mound and knuckles, covering the finger roots
  parts.push(pen.blob(SIDE_PALM, [pen.line([[-74, 30], [-46, 24], [-20, 30]]), pen.line([[-80, 12], [-54, 4], [-30, 8]])]));
  parts.push(finger(F[3]), finger(F[4]));
  return parts;
}

/* ------------------------------------------------------------------ hands in the lap */

/**
 * One hand in the lap, palm up, seen from the front: palm and fingers as one mitten with the
 * finger divisions drawn in (after the Dhyana mudra illustration). dir = +1: hand comes from the left.
 */
function lapHand(pen: Pen, dir: 1 | -1, dy: number, thumb: 'relaxed' | 'touch' | 'out', forearm = true): Part[] {
  const X = (x: number) => x * dir;
  const Q = (pts: P[]) => pts.map(([x, y]) => [X(x), y + dy] as P);
  const parts: Part[] = [];
  if (forearm) parts.push(pen.limb(Q([[-200, 4], [-160, 6], [-112, 10]]), [52, 52, 50], { tag: 'forearm' }));
  parts.push(
    pen.blob(
      Q([
        [-116, -18],
        [-84, -26],
        [-44, -22],
        [4, -18],
        [46, -12],
        [72, 2],
        [74, 24],
        [50, 42],
        [0, 50],
        [-56, 50],
        [-116, 42],
      ]),
      [
        pen.line(Q([[6, -6], [40, -2], [68, 6]])),
        pen.line(Q([[4, 8], [40, 12], [70, 18]])),
        pen.line(Q([[2, 22], [36, 28], [62, 32]])),
        pen.line(Q([[-84, 20], [-60, 12], [-36, 16]])),
      ],
    ),
  );
  const tp: P[] =
    thumb === 'touch'
      ? [[-80, -16], [-58, -40], [-30, -52], [-4, -54]]
      : thumb === 'out'
        ? [[-80, -10], [-70, -36], [-58, -56]]
        : [[-80, -16], [-56, -30], [-30, -34], [-10, -32]];
  parts.push(pen.limb(Q(tp), tp.length === 3 ? [28, 24, 20] : [28, 24, 21, 19], { creases: [0.6], nail: dir === 1 ? -1 : 1 }));
  return parts;
}

export function lapHands(pen: Pen, shape: HandShape, forearm = true): Part[] {
  if (shape === 'yoni' || shape === 'yoni-half') return yoniHands(pen, shape === 'yoni', forearm);
  if (shape === 'lap-open') return [...lapHand(pen.offset([-74, 0]), 1, 0, 'out', forearm), ...lapHand(pen.offset([74, 0]), -1, 0, 'out', forearm)];
  const thumb = shape === 'dhyana' ? 'touch' : 'relaxed';
  // left hand underneath, right hand resting in it
  const parts = [...lapHand(pen, 1, 22, thumb, forearm), ...lapHand(pen, -1, 0, thumb, forearm)];
  if (shape === 'dhyana') parts.push({ d: '', lines: [pen.line([[-50, -12], [-26, 0], [0, 4], [26, 0], [50, -14]])] });
  return parts;
}

/* ------------------------------------------------------------------ Yoni */

/** After the Yoni mudra illustration: thumbs arch up and touch, index fingers point down and touch. */
function yoniHands(pen: Pen, full: boolean, forearm: boolean): Part[] {
  const parts: Part[] = [];
  for (const s of [-1, 1] as const) {
    const Q = (pts: P[]) => pts.map(([x, y]) => [x * s, y] as P);
    if (forearm) parts.push(pen.limb(Q([[200, -44], [160, -40], [120, -34]]), [52, 52, 50], { tag: 'forearm' }));
    parts.push(
      pen.blob(
        Q([
          [126, -54],
          [96, -58],
          [62, -50],
          [36, -30],
          [20, -2],
          [16, 26],
          [36, 30],
          [66, 18],
          [100, 0],
          [126, -10],
        ]),
        [pen.line(Q([[96, -20], [72, -12], [52, 0]]))],
      ),
    );
  }
  // middle and ring fingers interlaced: their backs show down the centre
  for (const s of [-1, 1] as const) parts.push(pen.limb([[s * 22, -40], [s * 18, -8], [s * 12, 22]], [22, 21, 19], { creases: [0.45], nail: s === 1 ? -1 : 1 }));
  for (const s of [-1, 1] as const) {
    parts.push(
      pen.limb(full ? [[s * 74, 6], [s * 40, 48], [s * 4, 90]] : [[s * 74, 6], [s * 50, 50], [s * 30, 84]], [26, 23, 20], { creases: CR, nail: s === 1 ? 1 : -1 }),
    );
    parts.push(pen.limb(full ? [[s * 84, -44], [s * 48, -72], [s * 6, -76]] : [[s * 84, -44], [s * 58, -76], [s * 30, -86]], [34, 28, 22], { creases: [0.6], nail: s === 1 ? -1 : 1 }));
  }
  return parts;
}

/* ------------------------------------------------------------------ Anjali */

export function prayerHands(pen: Pen, joined: boolean, forearm = true): Part[] {
  const parts: Part[] = [];
  const gap = joined ? 0 : 30;
  for (const s of [-1, 1] as const) {
    const Q = (pts: P[]) => pts.map(([x, y]) => [s * (x + gap), y] as P);
    if (forearm) parts.push(pen.limb(Q([[124, 170], [80, 124], [34, 84]]), [50, 50, 48], { tag: 'forearm' }));
    parts.push(
      pen.blob(
        Q([
          [1, -96],
          [12, -92],
          [20, -56],
          [26, -10],
          [34, 40],
          [38, 84],
          [1, 90],
        ]),
        [pen.line(Q([[5, -86], [14, -48], [18, -20]])), pen.line(Q([[10, -80], [20, -40], [24, -16]])), pen.line(Q([[18, -6], [26, 4]]))],
      ),
    );
    parts.push(pen.limb(Q([[32, 60], [22, 28], [12, 4]]), [20, 17, 15], { creases: [0.55], nail: s === 1 ? -1 : 1 }));
  }
  if (joined) parts.push({ d: '', lines: [pen.line([[0, -94], [0, 88]])] });
  return parts;
}

/** All hands for a seal, in a pen's frame. */
export function handParts(pen: Pen, shape: HandShape, forearm = true): Part[] {
  const k = handKind(shape);
  if (k === 'lap') return lapHands(pen, shape, forearm);
  if (k === 'chest') return prayerHands(pen, shape === 'anjali', forearm);
  return sideHand(pen, shape, { forearm });
}

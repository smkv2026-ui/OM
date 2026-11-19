/**
 * Small vector-drawing kit for the pose figures and mudra close-ups.
 * Everything is built from point lists so a whole drawing can be moved, rotated, scaled or mirrored
 * with one point transform (a close-up hand is reused, small, at the figure's knee or lap).
 */
export type P = [number, number];

/** One outlined shape. `lines` are inner details (creases, nails, toes) drawn with its outline. */
export interface Part {
  d: string;
  lines?: string[];
  /** parts of a close-up that the full figure draws itself (forearms) */
  tag?: 'forearm';
}

const f = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Catmull-Rom resample of an open centre line. */
export function resample(pts: P[], n = 14): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const g = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([g(p0[0], p1[0], p2[0], p3[0]), g(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function strip(pts: P[], widths: number[]) {
  const c = resample(pts);
  const W = (i: number) => {
    const t = (i / (c.length - 1)) * (widths.length - 1);
    const k = Math.min(widths.length - 2, Math.floor(t));
    return widths[k] + (widths[k + 1] - widths[k]) * (t - k);
  };
  const N = (i: number): P => {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len];
  };
  return { c, W, N };
}

/** A tapered limb with round ends along a centre line; widths are given at each control point. */
export function limb(pts: P[], widths: number[]): string {
  const { c, W, N } = strip(pts, widths);
  const L: P[] = [], R: P[] = [];
  c.forEach((p, i) => {
    const n = N(i), w = W(i) / 2;
    L.push([p[0] + n[0] * w, p[1] + n[1] * w]);
    R.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  });
  const e = W(c.length - 1) / 2, s = W(0) / 2;
  let d = `M${f(L[0])}`;
  for (const p of L.slice(1)) d += `L${f(p)}`;
  d += `A${e.toFixed(1)} ${e.toFixed(1)} 0 0 0 ${f(R[R.length - 1])}`;
  for (const p of R.slice(0, -1).reverse()) d += `L${f(p)}`;
  d += `A${s.toFixed(1)} ${s.toFixed(1)} 0 0 0 ${f(L[0])}Z`;
  return d;
}

/** Closed smooth shape through the points. */
export function blob(pts: P[]): string {
  const n = pts.length;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d + 'Z';
}

/** Open smooth curve through the points. */
export function curve(pts: P[]): string {
  const c = resample(pts, 8);
  return `M${f(c[0])}` + c.slice(1).map((p) => `L${f(p)}`).join('');
}

export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 14): P[] {
  const r = (rot * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a);
    return [cx + x * co - y * si, cy + x * si + y * co] as P;
  });
}

/** Similarity transform: translate·rotate·scale, with optional mirroring (x) and flipping (y). */
export interface Frame {
  at: P;
  angle?: number;
  k?: number;
  /** point of the drawing that lands on `at` */
  origin?: P;
  mirror?: boolean;
  flip?: boolean;
}

/**
 * A pen draws in its own local coordinates; every point goes through its frame.
 * `limb()` / `blob()` / `line()` return parts or detail strings in the target (figure) space.
 */
export class Pen {
  readonly k: number;
  private T: (p: P) => P;
  constructor(fr: Frame = { at: [0, 0] }, raw?: { T: (p: P) => P; k: number }) {
    if (raw) {
      this.T = raw.T;
      this.k = raw.k;
      return;
    }
    const k = fr.k ?? 1, a = ((fr.angle ?? 0) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
    const o = fr.origin ?? [0, 0];
    this.k = k;
    this.T = ([x, y]) => {
      const u = (x - o[0]) * k;
      let v = (y - o[1]) * k;
      if (fr.flip) v = -v;
      let X = u * co - v * si;
      const Y = u * si + v * co;
      if (fr.mirror) X = -X;
      return [fr.at[0] + X, fr.at[1] + Y];
    };
  }
  /** the same pen, drawing with its local origin moved by d */
  offset(d: P) {
    return new Pen(undefined, { T: ([x, y]) => this.T([x + d[0], y + d[1]]), k: this.k });
  }
  pt(p: P) {
    return this.T(p);
  }
  pts(p: P[]) {
    return p.map(this.T);
  }
  /** A finger / limb: creases at fractions along it, an optional nail near the tip. */
  limb(pts: P[], widths: number[], o: { creases?: number[]; nail?: 1 | -1; tag?: 'forearm'; extra?: string[] } = {}): Part {
    const tp = this.pts(pts), tw = widths.map((w) => w * this.k);
    const lines: string[] = [];
    if (o.creases || o.nail) {
      const { c, W, N } = strip(tp, tw);
      const at = (t: number) => Math.round(t * (c.length - 1));
      for (const t of o.creases ?? []) {
        const i = at(t), n = N(i), w = W(i) * 0.3;
        const tg: P = [-n[1], n[0]];
        lines.push(`M${f([c[i][0] + n[0] * w, c[i][1] + n[1] * w])}Q${f([c[i][0] + tg[0] * w * 0.5, c[i][1] + tg[1] * w * 0.5])} ${f([c[i][0] - n[0] * w, c[i][1] - n[1] * w])}`);
      }
      if (o.nail) {
        // nail on one side (+1 = left of travel) near the tip
        const i = at(0.86), j = c.length - 1, n = N(i), w = W(i) * 0.5 * o.nail;
        const a: P = [c[i][0] + n[0] * w * 0.15, c[i][1] + n[1] * w * 0.15];
        const b: P = [c[j][0] + n[0] * w * 0.35, c[j][1] + n[1] * w * 0.35];
        const m: P = [(a[0] + b[0]) / 2 + n[0] * w * 0.75, (a[1] + b[1]) / 2 + n[1] * w * 0.75];
        lines.push(`M${f(a)}Q${f(m)} ${f(b)}`);
      }
    }
    if (o.extra) lines.push(...o.extra.map((d) => d));
    return { d: limb(tp, tw), lines: lines.length ? lines : undefined, tag: o.tag };
  }
  blob(pts: P[], lines: string[] = [], tag?: 'forearm'): Part {
    return { d: blob(this.pts(pts)), lines: lines.length ? lines : undefined, tag };
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, lines: string[] = []): Part {
    return this.blob(ellipsePts(cx, cy, rx, ry, rot), lines);
  }
  /** an open detail line through local points */
  line(pts: P[]) {
    return curve(this.pts(pts));
  }
}

/**
 * Five-prana flows (Fig. 4.3, Praśna Upaniṣad) in the shared figure frame.
 * Each vāyu has its own path(s) and motion character; a breath cycle modulates intensity.
 */
import { PRANAS, type PranaId } from '../data';

export type Pt = [number, number];

/** Dotted zones of Fig. 4.3, redrawn in the figure frame. */
export const ZONES = {
  head: { cx: 0, cy: -148, r: 52, label: ['Prāṇa', 'Udāna'] },
  chest: { cx: 0, cy: -36, r: 42, label: ['Prāṇa', 'Samāna'] },
  navel: { cx: 0, cy: 40, r: 33, label: ['Samāna'] },
  lower: { cx: 0, cy: 106, r: 33, label: ['Apāna'] },
  body: { cx: 0, cy: -6, rx: 206, ry: 230 },
} as const;
export const PRANA_VIEWBOX = { x: -232, y: -246, w: 464, h: 486 };

export type Phase = 'inhale' | 'hold' | 'exhale' | 'rest';
const SPLIT: [Phase, number][] = [
  ['inhale', 0.36],
  ['hold', 0.14],
  ['exhale', 0.36],
  ['rest', 0.14],
];

/** Phase and progress within it, for time t (s) and cycle length T (s). */
export function breathPhase(t: number, T: number): { phase: Phase; p: number; cyc: number } {
  let u = (t / T) % 1;
  const cyc = u;
  for (const [ph, len] of SPLIT) {
    if (u < len) return { phase: ph, p: u / len, cyc };
    u -= len;
  }
  return { phase: 'rest', p: 1, cyc };
}

/** Breath orb radius factor 0..1. */
export function orbSize(phase: Phase, p: number) {
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  if (phase === 'inhale') return ease(p);
  if (phase === 'hold') return 1;
  if (phase === 'exhale') return 1 - ease(p);
  return 0;
}

/**
 * How strongly each vāyu leads in each phase: Prāṇa leads the inhale, Samāna balances at the turn,
 * Apāna leads the exhale, Udāna rises on the exhale into the pause, Vyāna spreads through the pauses.
 */
export function intensity(id: PranaId, phase: Phase, p: number): number {
  switch (id) {
    case 'prana':
      return phase === 'inhale' ? 1 : phase === 'hold' ? 0.45 : 0.12;
    case 'samana':
      return phase === 'hold' ? 1 : phase === 'rest' ? 0.55 : 0.35;
    case 'apana':
      return phase === 'exhale' ? 1 : phase === 'rest' ? 0.3 : 0.12;
    case 'udana':
      return phase === 'exhale' ? 0.25 + 0.75 * p : phase === 'rest' ? 1 : 0.1;
    case 'vyana':
      return phase === 'hold' || phase === 'rest' ? 1 : 0.3;
  }
}

/* ------------------------------------------------------------------ paths (also used for static arrows) */

const lerpPath = (pts: Pt[], t: number): Pt => {
  const n = pts.length - 1;
  const f = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(f);
  const k = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
};

/** Representative paths per vāyu (for arrows / 3D). */
export const VAYU_PATHS: Record<PranaId, Pt[][]> = {
  prana: [
    [
      [-16, -138],
      [-3, -129],
      [0, -110],
      [0, -80],
      [0, -50],
      [0, -36],
    ],
    [
      [16, -138],
      [3, -129],
      [0, -110],
    ],
  ],
  samana: [
    [
      [-62, 52],
      [-40, 22],
      [-10, 20],
      [0, 40],
    ],
    [
      [62, 28],
      [40, 58],
      [10, 60],
      [0, 40],
    ],
    [
      [0, -10],
      [-14, 18],
      [0, 40],
    ],
  ],
  apana: [
    [
      [0, 50],
      [0, 100],
      [0, 140],
      [-30, 165],
      [-52, 182],
    ],
    [
      [0, 140],
      [30, 165],
      [52, 182],
    ],
  ],
  udana: [
    [
      [0, -30],
      [0, -70],
      [0, -100],
      [0, -140],
      [0, -176],
    ],
  ],
  vyana: [
    [
      [-12, -36],
      [-60, -60],
      [-100, 0],
      [-128, 90],
      [-150, 150],
    ],
    [
      [12, -36],
      [60, -60],
      [100, 0],
      [128, 90],
      [150, 150],
    ],
    [
      [-8, -20],
      [-40, 60],
      [-90, 120],
      [-170, 168],
    ],
    [
      [8, -20],
      [40, 60],
      [90, 120],
      [170, 168],
    ],
    [
      [0, -50],
      [0, -150],
      [0, -230],
    ],
  ],
};

interface P {
  t: number;
  speed: number;
  lane: number;
  jitter: number;
  life: number;
  ang: number;
  size: number;
}

const COUNTS: Record<PranaId, number> = { prana: 46, samana: 54, apana: 50, udana: 34, vyana: 70 };

export class PranaFlow {
  private ctx: CanvasRenderingContext2D;
  private parts: Record<PranaId, P[]>;
  enabled: Record<PranaId, boolean> = { prana: true, samana: true, apana: true, udana: true, vyana: true };
  /** Live per-vāyu intensity (set from the breath cycle or 1 for "show all"). */
  level: Record<PranaId, number> = { prana: 1, samana: 1, apana: 1, udana: 1, vyana: 1 };
  dark = true;
  colors: Record<PranaId, string>;
  private time = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.colors = Object.fromEntries(PRANAS.map((p) => [p.id, p.glow ?? p.color])) as Record<PranaId, string>;
    this.parts = Object.fromEntries(
      PRANAS.map((p) => [
        p.id,
        Array.from({ length: COUNTS[p.id] }, () => ({
          t: Math.random(),
          speed: 0.6 + Math.random() * 0.8,
          lane: Math.floor(Math.random() * 16),
          jitter: Math.random() * 2 - 1,
          life: Math.random(),
          ang: Math.random() * Math.PI * 2,
          size: 0.8 + Math.random() * 1.6,
        })),
      ]),
    ) as Record<PranaId, P[]>;
  }

  /** Render one frame. `scale` = CSS px per figure unit, `dpr` = device pixel ratio. */
  frame(dt: number, scale: number, dpr: number) {
    const { ctx, canvas } = this;
    this.time += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, -PRANA_VIEWBOX.x * scale * dpr, -PRANA_VIEWBOX.y * scale * dpr);
    ctx.globalCompositeOperation = this.dark ? 'lighter' : 'source-over';
    this.colors.udana = this.dark ? '#ffffff' : '#3d86b8';
    for (const p of PRANAS) {
      if (!this.enabled[p.id]) continue;
      const lv = this.level[p.id];
      if (lv < 0.02) continue;
      this.draw(p.id, lv, dt);
    }
  }

  private dot(x: number, y: number, r: number, col: string, a: number) {
    const { ctx } = this;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, Math.min(1, a * 0.25));
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private draw(id: PranaId, lv: number, dt: number) {
    const col = this.colors[id];
    const ps = this.parts[id];
    const T = this.time;
    switch (id) {
      case 'prana': {
        // inward at the nostrils, down the throat, settling and pulsing in the chest
        for (const q of ps) {
          q.t += dt * 0.32 * q.speed * (0.4 + lv);
          if (q.t > 1.6) q.t = 0;
          if (q.t <= 1) {
            const mirror = q.lane % 2 ? -1 : 1; // both nostrils
            const [x, y] = lerpPath(VAYU_PATHS.prana[0], q.t);
            const xx = x * mirror;
            this.dot(xx + q.jitter * 2 * (1 - q.t), y, q.size, col, lv * (0.4 + 0.6 * q.t));
          } else {
            const k = q.t - 1;
            const pulse = 1 + 0.15 * Math.sin(T * 3);
            const r = 22 * pulse * (0.4 + k);
            this.dot(Math.cos(q.ang + T * 0.6) * r, -36 + Math.sin(q.ang + T * 0.6) * r * 0.8, q.size, col, lv * (1 - k / 0.6));
          }
        }
        break;
      }
      case 'samana': {
        // spiral in from the sides and chest to the navel, then radiate evenly
        for (const q of ps) {
          q.t += dt * 0.22 * q.speed * (0.5 + lv * 0.7);
          if (q.t > 1.4) {
            q.t = 0;
            q.ang = Math.random() * Math.PI * 2;
          }
          if (q.t <= 1) {
            const R = 64 * (1 - q.t);
            const a = q.ang + q.t * 4.2 + T * 0.25;
            this.dot(Math.cos(a) * R, 40 + Math.sin(a) * R * 0.85, q.size, col, lv * (0.25 + 0.75 * q.t));
          } else {
            const k = (q.t - 1) / 0.4;
            const R = 30 * k;
            this.dot(Math.cos(q.ang) * R, 40 + Math.sin(q.ang) * R, q.size * 0.9, col, lv * (1 - k));
          }
        }
        // bright centre
        this.dot(0, 40, 4 + 1.5 * Math.sin(T * 2), col, 0.5 * lv + 0.3);
        break;
      }
      case 'apana': {
        // downward wave from the navel through the perineum, out through the base of the seat
        for (const q of ps) {
          q.t += dt * 0.28 * q.speed * (0.4 + lv);
          if (q.t > 1) {
            q.t = 0;
            q.jitter = Math.random() * 2 - 1;
          }
          const t = q.t;
          let x: number;
          let y: number;
          if (t < 0.6) {
            const k = t / 0.6;
            x = q.jitter * 16 * (1 - k) + Math.sin(k * 6 + T * 2) * 3 * (1 - k);
            y = 48 + k * 92;
          } else {
            const k = (t - 0.6) / 0.4;
            x = q.jitter * 70 * k;
            y = 140 + k * 44;
          }
          this.dot(x, y, q.size, col, lv * (t < 0.85 ? 1 : (1 - t) / 0.15));
        }
        break;
      }
      case 'udana': {
        // brief, sharp upward pulses along the central channel, ending in a glow at the crown
        const burst = (T * 0.9) % 1;
        for (const q of ps) {
          q.t += dt * 0.9 * q.speed * (0.3 + lv * 1.2);
          if (q.t > 1) q.t = Math.random() * 0.08;
          const [x, y] = lerpPath(VAYU_PATHS.udana[0], q.t);
          const gate = 0.35 + 0.65 * Math.max(0, Math.sin((q.t - burst) * Math.PI * 2));
          this.dot(x + q.jitter * 2.2, y, q.size, col, lv * gate);
        }
        this.dot(0, -176, 7 + 2 * Math.sin(T * 4), col, 0.35 + 0.5 * lv);
        break;
      }
      case 'vyana': {
        // from the heart outward through limbs and skin to the outer oval, then back in
        const out = 0.5 + 0.5 * Math.sin(T * 0.9);
        for (const q of ps) {
          q.t += dt * 0.18 * q.speed;
          if (q.t > 1) q.t -= 1;
          const ping = q.t < 0.5 ? q.t * 2 : 2 - q.t * 2;
          const reach = 0.45 + 0.55 * Math.max(out, lv * 0.8);
          const a = (q.lane / 16) * Math.PI * 2 + q.jitter * 0.12;
          const ex = Math.cos(a) * ZONES.body.rx * 0.96;
          const ey = ZONES.body.cy + Math.sin(a) * ZONES.body.ry * 0.96;
          const k = ping * reach;
          this.dot(ex * k, -30 + (ey + 30) * k, q.size * 0.9, col, lv * (0.25 + 0.6 * (1 - Math.abs(ping - 0.6))));
        }
        break;
      }
    }
    this.ctx.globalAlpha = 1;
  }
}

/**
 * Kumbhaka (breath-retention) simulator: phase timing, which bandhas engage when, the prāṇa
 * particles' paths through the front figure, and a small "system" model of how the locks act.
 *
 * Model (a teaching visual, not physiology):
 *  - inhale:   prāṇa enters at the nose and fills the chest and abdomen.
 *  - hold-in:  Jālandhara seals the throat (nothing rises out), Mūla seals the pelvic floor (apāna
 *              does not sink out). Sealed, prāṇa and apāna are pressed together at the navel and
 *              enter Suṣumṇā. Without a lock, part of the prāṇa leaks out at that end.
 *  - exhale:   the breath leaves through the nose.
 *  - hold-out: with Mūla + Uḍḍīyāna + Jālandhara (Mahā Bandha) the abdomen lifts and draws the
 *              energy up Suṣumṇā.
 */
import data from '../data/pranayama.json';

export type BandhaId = 'mula' | 'uddiyana' | 'jalandhara';
export type PhaseKind = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
export interface Bandha {
  id: BandhaId;
  name: string;
  deva: string;
  english: string;
  color: string;
  region: string;
  action: string;
  locks: string;
  phases: string;
  benefits: string[];
  caution: string;
}
export interface Pranayama {
  id: string;
  name: string;
  deva: string;
  english: string;
  about: string;
  benefits: string[];
  caution: string;
  unit: number;
  phases: { kind: PhaseKind; units: number; bandhas: BandhaId[] }[];
}
export const BANDHAS = data.bandhas as Bandha[];
export const PRANAYAMAS = data.pranayamas as Pranayama[];
export const bandhaById = (id: BandhaId) => BANDHAS.find((b) => b.id === id)!;

export const PHASE_NAME: Record<PhaseKind, { name: string; sa: string }> = {
  inhale: { name: 'Inhale', sa: 'Pūraka' },
  'hold-in': { name: 'Hold in', sa: 'Antara kumbhaka' },
  exhale: { name: 'Exhale', sa: 'Recaka' },
  'hold-out': { name: 'Hold out', sa: 'Bāhya kumbhaka' },
};

export interface PhaseState {
  index: number;
  kind: PhaseKind;
  /** 0..1 through the phase */
  p: number;
  /** seconds left in the phase */
  left: number;
  /** completed sets */
  sets: number;
  setLength: number;
  /** which count of the phase is running (1-based, in ratio units) */
  count: number;
}

export function phaseAt(pr: Pranayama, unit: number, t: number): PhaseState {
  const lens = pr.phases.map((ph) => ph.units * unit);
  const setLength = Math.max(0.001, lens.reduce((a, b) => a + b, 0));
  const sets = Math.floor(t / setLength);
  let r = t - sets * setLength;
  // phases of zero length (a hold switched off) are skipped
  const last = lens.reduce((k, l, i) => (l > 0 ? i : k), 0);
  for (let i = 0; i < lens.length; i++) {
    if (lens[i] > 0 && (r < lens[i] || i === last))
      return { index: i, kind: pr.phases[i].kind, p: Math.min(1, r / lens[i]), left: Math.max(0, lens[i] - r), sets, setLength, count: Math.min(pr.phases[i].units, Math.floor(r / unit) + 1) };
    r -= lens[i];
  }
  return { index: last, kind: pr.phases[last].kind, p: 1, left: 0, sets, setLength, count: pr.phases[last].units };
}

/** Bandhas applied right now: the ones the phase calls for, among those switched on. */
export function engagedNow(pr: Pranayama, ph: PhaseState | null, on: Record<BandhaId, boolean>): Set<BandhaId> {
  if (!ph) return new Set((Object.keys(on) as BandhaId[]).filter((k) => on[k]));
  return new Set(pr.phases[ph.index].bandhas.filter((b) => on[b]));
}

/* ------------------------------------------------------------------ particles */

export const NOSE: [number, number] = [0, -127];
const THROAT: [number, number] = [0, -92];
const NAVEL: [number, number] = [0, 48];
export const LOCK_Y: Record<BandhaId, number> = { jalandhara: -90, uddiyana: 30, mula: 172 };

const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const clamp = (x: number) => Math.max(0, Math.min(1, x));

export interface Seed {
  a: number;
  b: number;
  c: number;
}
export function makeSeeds(n: number): Seed[] {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ a: r(), b: r(), c: r() }));
}

/** where a particle settles in the torso after inhaling */
const home = (q: Seed): [number, number] => [(q.a - 0.5) * 76, -66 + q.b * 128];

/** Particle i's position and opacity. `locks` are the bandhas engaged during the internal hold. */
export function particle(q: Seed, kind: PhaseKind, p: number, time: number, holdLocks: Set<BandhaId>): { x: number; y: number; o: number; leak?: 'up' | 'down' } | null {
  const leakUp = !holdLocks.has('jalandhara') && q.c < 0.3;
  const leakDown = !holdLocks.has('mula') && q.c > 0.72;
  const sealed = holdLocks.has('jalandhara') && holdLocks.has('mula');
  const jitter = (amp: number): [number, number] => [Math.cos(time * 1.7 + q.a * 9) * amp, Math.sin(time * 1.3 + q.b * 9) * amp];
  const H = home(q);
  // where it is at the end of the internal hold
  const held = (pp: number): [number, number] => (sealed ? lerp(H, [NAVEL[0] + (q.a - 0.5) * 30, NAVEL[1] + (q.b - 0.5) * 22], ease(pp)) : H);
  if (kind === 'inhale') {
    const d = q.a * 0.45, k = clamp((p - d) / 0.55);
    if (k <= 0) return null;
    const pos = k < 0.3 ? lerp(NOSE, THROAT, k / 0.3) : lerp(THROAT, H, ease((k - 0.3) / 0.7));
    return { x: pos[0], y: pos[1], o: Math.min(1, k * 4) };
  }
  if (kind === 'hold-in') {
    if (leakUp || leakDown) {
      const k = clamp((p - q.b * 0.5) / 0.5);
      const out: [number, number] = leakUp ? [H[0] * 0.3, -205] : [H[0] * 0.6, 205];
      const pos = lerp(H, out, ease(k));
      return { x: pos[0], y: pos[1], o: 1 - k * 0.9, leak: leakUp ? 'up' : 'down' };
    }
    const pos = held(p), j = jitter(sealed ? 3 : 6);
    return { x: pos[0] + j[0], y: pos[1] + j[1], o: 1 };
  }
  if (kind === 'exhale') {
    if (leakUp || leakDown) return null; // already lost
    const d = (1 - q.a) * 0.45, k = clamp((p - d) / 0.55);
    const start = held(1);
    const pos = k < 0.7 ? lerp(start, THROAT, ease(k / 0.7)) : lerp(THROAT, [NOSE[0], NOSE[1] - 26], (k - 0.7) / 0.3);
    return { x: pos[0], y: pos[1], o: 1 - Math.max(0, k - 0.75) * 4 };
  }
  return null;
}

/* ------------------------------------------------------------------ system model */

export interface SystemState {
  /** air in the lungs 0..1 */
  volume: number;
  /** share of the inhaled prāṇa still held 0..1 */
  retained: number;
  /** Suṣumṇā activation 0..1 (builds over sets with the right locks) */
  sushumna: number;
  /** prāṇa–apāna union at the navel 0..1 */
  navel: number;
}

export const initialSystem = (): SystemState => ({ volume: 0, retained: 1, sushumna: 0, navel: 0 });

export function stepSystem(s: SystemState, kind: PhaseKind, p: number, dt: number, eng: Set<BandhaId>, holdLocks: Set<BandhaId>): SystemState {
  const n = { ...s };
  n.volume = kind === 'inhale' ? p : kind === 'hold-in' ? 1 : kind === 'exhale' ? 1 - p : 0;
  if (kind === 'inhale') n.retained = 1;
  if (kind === 'hold-in') {
    const leak = (holdLocks.has('jalandhara') ? 0 : 0.3) + (holdLocks.has('mula') ? 0 : 0.28);
    n.retained = 1 - leak * ease(p);
  }
  const sealed = eng.has('mula') && eng.has('jalandhara');
  const target = kind === 'hold-in' && sealed ? Math.min(1, p * 1.4) : kind === 'hold-out' && eng.has('uddiyana') ? 0.6 : 0;
  n.navel += (target - n.navel) * Math.min(1, dt * 2);
  let gain = 0;
  if (kind === 'hold-in') gain = sealed ? 0.022 : eng.has('mula') || eng.has('jalandhara') ? 0.008 : 0.002;
  if (kind === 'hold-out') gain = eng.has('uddiyana') && eng.has('mula') ? 0.035 : eng.has('uddiyana') || eng.has('mula') ? 0.01 : 0.001;
  n.sushumna = Math.max(0, Math.min(1, n.sushumna + gain * dt - (kind === 'inhale' || kind === 'exhale' ? 0.004 * dt : 0)));
  return n;
}

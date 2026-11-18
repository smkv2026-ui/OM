import { CHAKRAS, hexToRgb } from '../data';

export type SensorCount = 1 | 3 | 7;

export interface SensorConf {
  id: string;
  name: string;
  short: string;
  color: string;
  /** stroke colour for light backgrounds */
  ink: string;
  rgb: [number, number, number];
  targetYRatio: number;
  chakraId?: string;
}

const mk = (id: string, name: string, color: string, targetYRatio: number, short = name, ink = color, chakraId?: string): SensorConf => ({
  id,
  name,
  short,
  color,
  ink,
  rgb: hexToRgb(color),
  targetYRatio,
  chakraId,
});

/**
 * Ported from the prototype's SENSOR_SETS. Ids, names and targetYRatio values are unchanged.
 * 7-sensor colours now come from chakras.json (the exact chakra colours).
 */
export const SENSOR_SETS: Record<SensorCount, SensorConf[]> = {
  1: [mk('sensor-1', 'Sensor', '#ffb703', 0.0, 'Sensor', '#b07d1e')],
  3: [
    mk('sensor-1', 'Sensor 1', '#ff2a6d', 0.35, 'S-1', '#c2185b'),
    mk('sensor-2', 'Sensor 2', '#05dda1', 0.0, 'S-2', '#0f8f6c'),
    mk('sensor-3', 'Sensor 3', '#00f3ff', -0.35, 'S-3', '#0b7f93'),
  ],
  7: (() => {
    const shorts: Record<string, string> = {
      'sensor-1': 'Crown',
      'sensor-2': '3rd Eye',
      'sensor-3': 'Throat',
      'sensor-4': 'Heart',
      'sensor-5': 'Solar',
      'sensor-6': 'Sacral',
      'sensor-7': 'Root',
    };
    return [...CHAKRAS]
      .sort((a, b) => a.sensorId.localeCompare(b.sensorId))
      .map((c) =>
        mk(c.sensorId, c.sensorName, c.color.rainbow ? '#c9a7ff' : c.color.primary, c.targetYRatio, shorts[c.sensorId], c.color.ink, c.id),
      );
  })(),
};

/** Lowest (most positive ratio, e.g. Root) first — the prototype's getSortedSensorIds(). */
export const sortedBottomToTop = (set: SensorConf[]) => [...set].sort((a, b) => b.targetYRatio - a.targetYRatio);

/** Prototype status thresholds. */
export function statusFor(alignment: number, avgFreq: number): { text: string; tone: 'low' | 'mid' | 'high' } {
  const perc = Math.round(alignment * 100);
  if (perc < 30) return { text: 'Dissipated Mind', tone: 'low' };
  if (perc < 75) return { text: 'Harmonizing Nadis...', tone: 'mid' };
  return { text: avgFreq > 60 ? 'Deep Samadhi (Unified)' : 'Aligned & Centered', tone: 'high' };
}

/** Prototype alignment: (placed/total)·0.25 until all placed, then mean max(0, 1 − dist/85). */
export function targetAlignment(
  set: SensorConf[],
  placed: Map<string, { x: number; y: number }>,
  ideal: (c: SensorConf) => { x: number; y: number },
  tolerance = 85,
): number {
  const total = set.length;
  if (placed.size < total) return (placed.size / total) * 0.25;
  let acc = 0;
  for (const c of set) {
    const p = placed.get(c.id);
    if (!p) continue;
    const i = ideal(c);
    acc += Math.max(0, 1 - Math.hypot(p.x - i.x, p.y - i.y) / tolerance);
  }
  return acc / total;
}

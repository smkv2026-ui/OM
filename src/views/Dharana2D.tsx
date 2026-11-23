/**
 * Chakra Dhāraṇā in the 3D view's 2D mode: the same sequence as the 3D diamond (dharanaFrame) on the
 * front figure. Chakras stay dim until switched on, then turn clockwise (ascent) or anticlockwise
 * (descent); the one being chanted pulses; the diamond glides along Suṣumṇā.
 */
import { useEffect, useRef, useState } from 'react';
import { CHAKRAS, type ChakraId } from '../data';
import { ChakraGlyphs } from '../figures/Body';
import { dharanaFrame } from '../three/dharana3d';

const STILL_SIMPLE: ChakraId[] = ['muladhara', 'svadhisthana', 'manipura', 'ajna', 'sahasrara'];
const STILL_FLAT: ChakraId[] = ['ajna'];

export function Dharana2D({ simple, onSelect }: { simple: boolean; onSelect: (id: ChakraId) => void }) {
  const [, tick] = useState(0);
  const angle = useRef(new Map<ChakraId, number>());
  const level = useRef(new Map<ChakraId, number>());
  const time = useRef(0);
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      time.current += dt;
      const D = dharanaFrame;
      // same glide as the 3D diamond (it also tells the sequence when the diamond has arrived)
      const d = D.target - D.t;
      D.t += Math.sign(d) * Math.min(Math.abs(d), dt * (0.35 + Math.min(1, Math.abs(d)) * 0.6));
      for (const c of CHAKRAS) {
        const dir = D.lit.get(c.id);
        if (dir) angle.current.set(c.id, (angle.current.get(c.id) ?? 0) + dir * dt * 80);
        const want = !D.enabled || dir ? 1 : 0.15;
        const L = level.current.get(c.id) ?? 1;
        level.current.set(c.id, L + (want - L) * Math.min(1, dt * 3));
      }
      tick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const D = dharanaFrame;
  const still = simple ? STILL_SIMPLE : STILL_FLAT;
  const i = Math.max(0, Math.min(CHAKRAS.length - 2, Math.floor(D.t)));
  const f = Math.max(0, Math.min(1, D.t - i));
  const dy = CHAKRAS[i].position.frontY + (CHAKRAS[i + 1].position.frontY - CHAKRAS[i].position.frontY) * f;
  const t = time.current;
  return (
    <g>
      {CHAKRAS.map((c) => {
        const y = c.position.frontY;
        const L = level.current.get(c.id) ?? 1;
        const a = still.includes(c.id) ? 0 : (angle.current.get(c.id) ?? 0);
        const pulse = D.sounding === c.id ? 1.18 + 0.06 * Math.sin(t * 8) : 1;
        return (
          <g key={c.id} opacity={0.25 + 0.75 * Math.min(1, L)} transform={`translate(0 ${y}) rotate(${a}) scale(${pulse * (0.8 + 0.2 * Math.min(1, L))}) translate(0 ${-y})`}>
            <ChakraGlyphs view="front" only={[c.id]} simple={simple} onSelect={onSelect} breathing={false} />
          </g>
        );
      })}
      {D.enabled && (
        <g transform={`translate(0 ${dy})`} style={{ pointerEvents: 'none' }}>
          <circle r={15} fill="#dff4ff" opacity={0.28} />
          <circle r={8} fill="#ffffff" opacity={0.35} />
          <g transform={`scale(${0.9 + 0.04 * Math.sin(t * 3)})`}>
            <path d="M-10 -3L-5.5 -8.5L5.5 -8.5L10 -3L0 11Z" fill="#f4f8ff" stroke="#8fb3d1" strokeWidth={0.7} strokeLinejoin="round" />
            <path d="M-10 -3L10 -3M-5.5 -8.5L-3 -3L0 -8.5L3 -3L5.5 -8.5M-3 -3L0 11L3 -3" fill="none" stroke="#8fb3d1" strokeWidth={0.5} />
          </g>
          <circle cx={4} cy={-5} r={1 + 1.2 * Math.max(0, Math.sin(t * 5))} fill="#ffffff" />
        </g>
      )}
    </g>
  );
}

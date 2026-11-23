/**
 * KP in 2D: the front figure (chosen asana and mudra) with the same breath sequence as the 3D view —
 * Suṣumṇā as a lotus stem, Mūlādhāra lying flat (triangle tip toward the viewer), the diamond rising
 * and descending, the thousand-petal lotus blooming over the crown and golden nectar flowing.
 */
import { CHAKRAS, type ChakraId } from '../data';
import { Body, ChakraGlyphs, IdaPingala } from '../figures/Body';
import type { Layers, LotusStyle } from '../three/Scene';
import { kpFrame, look } from '../three/KPScene';

const Y_M = 145; // Mūlādhāra (figure units)
const Y_T = -190; // Sahasrāra, the crown
const span = Y_M - Y_T;
const MIDDLE = CHAKRAS.filter((c) => c.id !== 'muladhara' && c.id !== 'sahasrara').map((c) => c.id) as ChakraId[];

const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const petal = (len: number, w: number) => `M0 0C${w * 0.62} ${-len * 0.28} ${w * 0.5} ${-len * 0.82} 0 ${-len}C${-w * 0.5} ${-len * 0.82} ${-w * 0.62} ${-len * 0.28} 0 0Z`;

export function KP2D({ time, layers, style, color, onSelect }: { time: number; layers: Layers; style: LotusStyle; color: string; onSelect: (id: ChakraId) => void }) {
  const L = look(kpFrame.kind, kpFrame.p);
  const dy = Y_M - L.d * span; // diamond height
  const yAt = (f: number) => Y_M - f * span;
  // layered lotus: outer rings first
  const RINGS = [
    { n: 25, len: 46, w: 11 },
    { n: 21, len: 40, w: 11 },
    { n: 17, len: 33, w: 10 },
    { n: 13, len: 26, w: 9 },
    { n: 9, len: 19, w: 8 },
  ];
  return (
    <svg viewBox="-215 -250 430 445" className="h-full w-full" role="img" aria-label="KP in 2D: the seated figure with the diamond, the lotus stem and the thousand-petal lotus">
      <defs>
        <radialGradient id="kp2-halo">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffc94a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kp2-pool">
          <stop offset="0" stopColor="#ffd36a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kp2-gem">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.5" stopColor="#dff4ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#bfe8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kp2-petal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <filter id="kp2-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {layers.body && <Body view="front" spine={layers.spine} />}
      {!layers.body && layers.spine && <Body view="front" spine look="line" />}
      {(layers.ida || layers.pingala) && <IdaPingala ida={layers.ida} pingala={layers.pingala} />}

      {/* Suṣumṇā as the lotus stem */}
      {layers.sushumna && (
        <g strokeLinecap="round">
          <line x1={0} y1={Y_M} x2={0} y2={Y_T} stroke="#6fc27a" strokeOpacity={0.45} strokeWidth={6} />
          <line x1={0} y1={Y_M} x2={0} y2={Y_T} stroke="#fff2c8" strokeOpacity={0.85} strokeWidth={1.6} />
          {L.light > 0.01 && <line x1={0} y1={Y_M} x2={0} y2={yAt(L.light * L.d)} stroke="#fffbe8" strokeWidth={4} opacity={0.75} filter="url(#kp2-blur)" />}
          {L.nectarTop > 0.01 && (
            <>
              <line x1={0} y1={yAt(L.nectarBottom)} x2={0} y2={yAt(L.nectarTop)} stroke="#ffb02a" strokeWidth={8} opacity={0.6} filter="url(#kp2-blur)" />
              <line x1={0} y1={yAt(L.nectarBottom)} x2={0} y2={yAt(L.nectarTop)} stroke="#ffd36a" strokeWidth={3} strokeDasharray="6 5" strokeDashoffset={-time * 30} />
            </>
          )}
        </g>
      )}

      {layers.chakras && <ChakraGlyphs view="front" onSelect={onSelect} only={MIDDLE} simple={style === 'simple'} />}

      {/* Mūlādhāra lying flat, seen a little from above: triangle tip toward the viewer */}
      <g transform={`translate(0 ${Y_M})`}>
        <ellipse cx={0} cy={0} rx={40 + 20 * L.pool} ry={14 + 8 * L.pool} fill="url(#kp2-pool)" opacity={0.35 + 0.65 * L.pool} />
        <g transform="scale(1 0.42)">
          <rect x={-20} y={-20} width={40} height={40} fill="#e1a95f" stroke="#ffd77a" strokeWidth={1.4} />
          <path d="M-15 -9L15 -9L0 18Z" fill="#d7263d" />
        </g>
      </g>

      {/* the thousand-petal lotus over the crown */}
      <g transform={`translate(0 ${Y_T})`}>
        <circle r={30 + 50 * L.glow} fill="url(#kp2-halo)" opacity={0.15 + 0.85 * L.glow} />
        {RINGS.map((r, ri) => {
          const f = 1 - ri / (RINGS.length - 1); // 1 = outer
          const open = Math.max(0, Math.min(1, L.bloom * 1.35 - (1 - f) * 0.35));
          const spread = (0.12 + 0.2 * f) * (1 - open) + (0.35 + 1.25 * f) * open;
          const gold = L.glow * (0.65 - 0.4 * f);
          return (
            <g key={ri}>
              {Array.from({ length: r.n }, (_, j) => {
                const a = -spread + (2 * spread * j) / (r.n - 1);
                return (
                  <path
                    key={j}
                    d={petal(r.len * (0.85 + 0.15 * open), r.w)}
                    transform={`rotate(${(a * 180) / Math.PI})`}
                    fill="url(#kp2-petal)"
                    stroke="#b08a4a"
                    strokeOpacity={0.45}
                    strokeWidth={0.5}
                  />
                );
              })}
              {gold > 0.01 && (
                <g opacity={gold}>
                  {Array.from({ length: r.n }, (_, j) => {
                    const a = -spread + (2 * spread * j) / (r.n - 1);
                    return <path key={j} d={petal(r.len * (0.85 + 0.15 * open), r.w)} transform={`rotate(${(a * 180) / Math.PI})`} fill="#ffc94a" />;
                  })}
                </g>
              )}
            </g>
          );
        })}
        <ellipse cx={0} cy={-2} rx={7} ry={3.5} fill="#f5d27a" />
      </g>

      {/* nectar: oozing from the lotus, and flowing down with the diamond */}
      <g>
        {L.ooze > 0.01 &&
          Array.from({ length: 70 }, (_, i) => {
            const f = (time * 0.45 + i / 70) % 1;
            const a = hash(i, 1) * Math.PI;
            const sp = 40 + hash(i, 2) * 70;
            const x = -Math.cos(a) * sp * f * 1.6;
            const y = Y_T - 6 - Math.sin(a) * 30 * f + 260 * f * f;
            return <circle key={i} cx={x} cy={y} r={1.4 + 1.6 * hash(i, 3)} fill="#ffc94a" opacity={L.ooze * (1 - f) * 0.9} />;
          })}
        {kpFrame.kind === 'exhale' &&
          Array.from({ length: 24 }, (_, i) => {
            const f = (time * 0.9 + i / 24) % 1;
            return <circle key={i} cx={(hash(i, 4) - 0.5) * 8} cy={dy - 6 + f * 40} r={1.5} fill="#ffd36a" opacity={(1 - f) * 0.9} />;
          })}
      </g>

      {/* the diamond */}
      {/* bottom tip (at +11) touches the stem point: at rest, the middle of Mūlādhāra's triangle */}
      <g transform={`translate(0 ${dy - 11 - (L.d > 0.98 ? 6 : 0)})`}>
        <circle r={16 + 6 * Math.max(L.light, L.glow)} fill="url(#kp2-gem)" opacity={0.8} />
        <g transform={`scale(${1 + 0.04 * Math.sin(time * 3)})`}>
          <path d="M-10 -3L-5.5 -8.5L5.5 -8.5L10 -3L0 11Z" fill="#f4f8ff" stroke="#8fb3d1" strokeWidth={0.7} strokeLinejoin="round" />
          <path d="M-10 -3L10 -3M-5.5 -8.5L-3 -3L0 -8.5L3 -3L5.5 -8.5M-3 -3L0 11L3 -3" fill="none" stroke="#8fb3d1" strokeWidth={0.5} />
        </g>
        <circle cx={4} cy={-5} r={1.2 + 1.2 * Math.max(0, Math.sin(time * 5))} fill="#ffffff" />
      </g>
    </svg>
  );
}

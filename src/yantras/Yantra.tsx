import { memo, useId, useMemo, type CSSProperties, type KeyboardEvent } from 'react';
import type { Chakra } from '../data';

/**
 * Vector redraw of each chakra yantra (from the reference figures 4.10–4.16 and Fig. 10).
 * viewBox is always -100..100. Colours come from chakras.json; light/dark via CSS vars.
 */

const rad = (d: number) => (d * Math.PI) / 180;
/** Polar with 0° = up, clockwise. */
const P = (r: number, deg: number) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))] as const;
const pt = (r: number, deg: number) => {
  const [x, y] = P(r, deg);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};

type Shape = 'broad' | 'almond' | 'leaf' | 'round';

function petalPath(a: number, r0: number, r1: number, h: number, shape: Shape): string {
  switch (shape) {
    case 'broad': // Muladhara: broad lobes with a flame-like curled tip
      return (
        `M${pt(r0 * 0.9, a - h * 0.86)}C${pt(r1 * 0.82, a - h * 1.08)} ${pt(r1 * 1.0, a - h * 0.62)} ${pt(r1 * 0.9, a - 7)}` +
        `C${pt(r1 * 0.94, a - 3)} ${pt(r1 * 1.02, a - 2)} ${pt(r1 * 1.06, a)}` +
        `C${pt(r1 * 1.02, a + 2)} ${pt(r1 * 0.94, a + 3)} ${pt(r1 * 0.9, a + 7)}` +
        `C${pt(r1 * 1.0, a + h * 0.62)} ${pt(r1 * 0.82, a + h * 1.08)} ${pt(r0 * 0.9, a + h * 0.86)}Z`
      );
    case 'almond': // Svadhisthana: long pointed almond petals
      return (
        `M${pt(r0 * 0.9, a - h * 0.92)}C${pt(r1 * 0.66, a - h * 1.12)} ${pt(r1 * 0.94, a - h * 0.52)} ${pt(r1, a)}` +
        `C${pt(r1 * 0.94, a + h * 0.52)} ${pt(r1 * 0.66, a + h * 1.12)} ${pt(r0 * 0.9, a + h * 0.92)}Z`
      );
    case 'leaf': // Manipura: leaf / flame-shaped
      return (
        `M${pt(r0 * 0.94, a - h)}C${pt(r1 * 0.84, a - h * 1.28)} ${pt(r1 * 1.0, a - h * 0.6)} ${pt(r1 * 1.02, a)}` +
        `C${pt(r1 * 1.0, a + h * 0.6)} ${pt(r1 * 0.84, a + h * 1.28)} ${pt(r0 * 0.94, a + h)}Z`
      );
    case 'round': // Anahata / Vishuddha: rounded petals with a gentle point
      return (
        `M${pt(r0 * 0.95, a - h)}C${pt(r1 * 0.94, a - h * 1.4)} ${pt(r1 * 1.05, a - h * 0.42)} ${pt(r1 * 1.03, a)}` +
        `C${pt(r1 * 1.05, a + h * 0.42)} ${pt(r1 * 0.94, a + h * 1.4)} ${pt(r0 * 0.95, a + h)}Z`
      );
  }
}

interface Cfg {
  r0: number;
  r1: number;
  shape: Shape;
  letterR: number;
  letterSize: number;
  bijaSize: number;
}
const CFG: Record<string, Cfg> = {
  muladhara: { r0: 52, r1: 92, shape: 'broad', letterR: 74, letterSize: 21, bijaSize: 19 },
  svadhisthana: { r0: 50, r1: 97, shape: 'almond', letterR: 76, letterSize: 17, bijaSize: 16 },
  manipura: { r0: 55, r1: 95, shape: 'leaf', letterR: 76, letterSize: 13.5, bijaSize: 22 },
  anahata: { r0: 58, r1: 95, shape: 'round', letterR: 78, letterSize: 12, bijaSize: 22 },
  vishuddha: { r0: 46, r1: 96, shape: 'round', letterR: 80, letterSize: 9.5, bijaSize: 22 },
  ajna: { r0: 26, r1: 97, shape: 'round', letterR: 58, letterSize: 24, bijaSize: 26 },
  sahasrara: { r0: 12, r1: 96, shape: 'almond', letterR: 0, letterSize: 0, bijaSize: 0 },
};

export type YantraVariant = 'detail' | 'mini' | 'matrika';

export interface YantraProps {
  chakra: Chakra;
  variant?: YantraVariant;
  /** Selected petal (detail view). */
  activePetal?: number | null;
  /** Petal currently sounding in a sequence. */
  litPetal?: number | null;
  onPetal?: (i: number) => void;
  x?: number;
  y?: number;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  label?: string;
  /** Overall energy 0..1 (Nadi Harmony crossing glow etc). */
  intensity?: number;
}

/** Deterministic PRNG for stipple. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function inTri(px: number, py: number, t: (readonly [number, number])[]) {
  const [a, b, c] = t;
  const s = (p: readonly [number, number], q: readonly [number, number]) => (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]);
  const d1 = s(a, b);
  const d2 = s(b, c);
  const d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

export const Yantra = memo(function Yantra({
  chakra,
  variant = 'detail',
  activePetal = null,
  litPetal = null,
  onPetal,
  x,
  y,
  size = '100%',
  className,
  style,
  label,
  intensity = 1,
}: YantraProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${uid}-${s}`;
  const cfg = CFG[chakra.id];
  const mini = variant === 'mini';
  const showLetters = !mini;
  const interactive = !!onPetal && !mini;
  const c = chakra.color;
  const letters = chakra.petals.letters;

  const vars = {
    '--c': c.primary,
    '--c-ink': c.ink,
    '--c2': c.secondary ?? c.primary,
    ...style,
  } as CSSProperties;

  const petals = useMemo(() => {
    if (chakra.id === 'sahasrara' || chakra.id === 'ajna') return [];
    const n = chakra.petals.count;
    const step = 360 / n;
    const start = chakra.petals.start ?? 0;
    const h = step / 2;
    return Array.from({ length: n }, (_, i) => {
      const a = start + i * step;
      if (chakra.id === 'vishuddha') {
        const front = i % 2 === 1;
        return { i, a, d: petalPath(a, cfg.r0, front ? cfg.r1 * 0.9 : cfg.r1, h * (front ? 1.25 : 1.45), 'round'), layer: front ? 1 : 0 };
      }
      return { i, a, d: petalPath(a, cfg.r0, cfg.r1, h, cfg.shape), layer: 0 };
    }).sort((p, q) => p.layer - q.layer);
  }, [chakra, cfg]);

  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPetal?.(i);
    }
  };

  const petalProps = (i: number) =>
    interactive
      ? {
          className: 'petal',
          role: 'button',
          tabIndex: 0,
          'aria-label': `Petal ${i + 1}: ${letters[i]?.iast ?? ''}`,
          'aria-pressed': activePetal === i,
          onClick: () => onPetal?.(i),
          onKeyDown: onKey(i),
        }
      : {};

  const isOn = (i: number) => activePetal === i || litPetal === i;
  const glowOpacity = 0.35 + 0.45 * intensity;

  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={chakra.id === 'ajna' && !mini ? '-100 -52 200 104' : '-100 -100 200 200'}
      className={`yantra ${className ?? ''}`}
      style={vars}
      role={interactive ? 'group' : 'img'}
      aria-label={label ?? `${chakra.name} yantra`}
      overflow="visible"
    >
      <defs>
        <radialGradient id={id('glow')}>
          {c.rainbow ? (
            <>
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="0.25" stopColor="#ffd36e" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#ff6fb5" stopOpacity="0.35" />
              <stop offset="0.65" stopColor="#7c7bff" stopOpacity="0.25" />
              <stop offset="1" stopColor="#4fe3ff" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor={c.primary} stopOpacity="0.75" />
              <stop offset="0.55" stopColor={c.primary} stopOpacity="0.22" />
              <stop offset="1" stopColor={c.primary} stopOpacity="0" />
            </>
          )}
        </radialGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={mini ? 1.5 : 2.2} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* living glow */}
      <g opacity={glowOpacity}>
        <circle r={mini ? 118 : 104} fill={`url(#${id('glow')})`} className="anim-glow" />
      </g>

      {chakra.id === 'sahasrara' ? (
        <Sahasrara mini={mini} id={id} />
      ) : chakra.id === 'ajna' ? (
        <Ajna mini={mini} showLetters={showLetters} isOn={isOn} petalProps={petalProps} letters={letters} cfg={cfg} id={id} />
      ) : (
        <>
          <g className={mini ? '' : 'anim-breathe'} style={{ animationDuration: '7s' }}>
            {petals.map((p) => (
              <g key={p.i} {...petalProps(p.i)}>
                <path
                  className="petal-shape"
                  d={p.d}
                  fill={isOn(p.i) ? 'color-mix(in oklab, var(--c) 55%, var(--yantra-paper))' : 'var(--petal-fill)'}
                  stroke="var(--stroke)"
                  strokeWidth={mini ? 3.2 : 1.5}
                  strokeLinejoin="round"
                  filter={isOn(p.i) ? `url(#${id('soft')})` : undefined}
                  style={{ transition: 'fill .3s' }}
                />
                {showLetters && letters[p.i] && (
                  <text
                    {...letterPos(p.a, cfg.letterR * (chakra.id === 'vishuddha' && p.layer === 1 ? 0.95 : 1))}
                    fontSize={cfg.letterSize * (isOn(p.i) ? 1.18 : 1)}
                    className="font-deva"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isOn(p.i) ? 'var(--text)' : 'var(--letter)'}
                    fontWeight={600}
                    style={{ transition: 'font-size .25s', pointerEvents: 'none' }}
                  >
                    {letters[p.i].deva}
                  </text>
                )}
              </g>
            ))}
          </g>
          <Center chakra={chakra} cfg={cfg} mini={mini} id={id} />
        </>
      )}
    </svg>
  );
});

function letterPos(a: number, r: number) {
  const [x, y] = P(r, a);
  return { x, y };
}

/* ------------------------------------------------------------------ centres */

function Center({ chakra, cfg, mini, id }: { chakra: Chakra; cfg: Cfg; mini: boolean; id: (s: string) => string }) {
  const r0 = cfg.r0;
  const sw = mini ? 3 : 1.6;
  const bija = (y: number, fill: string, size = cfg.bijaSize) =>
    !mini && (
      <text x={0} y={y} fontSize={size} className="font-deva" textAnchor="middle" dominantBaseline="central" fill={fill} fontWeight={700}>
        {chakra.bija.deva}
      </text>
    );

  switch (chakra.id) {
    case 'muladhara': {
      const s = r0 * 0.7;
      return (
        <g>
          <clipPath id={id('globe')}>
            <circle r={r0} />
          </clipPath>
          <circle r={r0} fill="var(--disc)" stroke="var(--stroke)" strokeWidth={sw} />
          {!mini && (
            <g clipPath={`url(#${id('globe')})`} stroke="var(--stroke)" strokeWidth={0.6} fill="none" opacity={0.28}>
              {[0.28, 0.62, 0.9].map((k) => (
                <ellipse key={k} rx={r0 * k} ry={r0} strokeDasharray="1.5 2.5" />
              ))}
              {[-0.66, -0.33, 0, 0.33, 0.66].map((k) => (
                <path key={k} d={`M${-r0} ${r0 * k} Q0 ${r0 * k + 6} ${r0} ${r0 * k}`} strokeDasharray="1.5 2.5" />
              ))}
              {/* abstract land masses — a faint earth texture, not a map */}
              <path
                d="M-30 -22c6-6 16-4 18 2s-4 8-2 14-8 10-14 6-10-16-2-22zM6 -30c8-2 18 2 20 10s-4 10 2 16-2 14-10 12-6-10-10-14-10-20-2-24zM-8 10c6-2 12 4 10 12s-8 12-12 6-4-16 2-18z"
                fill="var(--stroke)"
                stroke="none"
                opacity={0.55}
              />
            </g>
          )}
          {/* OUTER SQUARE — red */}
          <rect x={-s} y={-s} width={s * 2} height={s * 2} fill="color-mix(in oklab, #d7263d 12%, transparent)" stroke="#d7263d" strokeWidth={mini ? 3.4 : 2.2} />
          {/* INNER TRIANGLE — earth yellow */}
          <path d={`M${-s * 0.72} ${-s * 0.5} L${s * 0.72} ${-s * 0.5} L0 ${s * 0.78}Z`} fill="#f2c230" fillOpacity={0.92} stroke="#c9971a" strokeWidth={mini ? 2.4 : 1.4} strokeLinejoin="round" />
          {bija(-s * 0.08, '#7a1020')}
        </g>
      );
    }
    case 'svadhisthana': {
      const waves = Array.from({ length: 11 }, (_, i) => -44 + i * 8.8);
      return (
        <g>
          <clipPath id={id('water')}>
            <circle r={r0 - 6} />
          </clipPath>
          <mask id={id('moon')}>
            <circle cx={0} cy={4} r={r0 * 0.8} fill="#fff" />
            <circle cx={0} cy={-9} r={r0 * 0.7} fill="#000" />
          </mask>
          <circle r={r0} fill="var(--disc)" stroke="var(--stroke)" strokeWidth={sw} />
          <circle r={r0 - 6} fill="none" stroke="var(--stroke)" strokeWidth={sw * 0.8} />
          {!mini && (
            <g clipPath={`url(#${id('water')})`}>
              <g className="anim-ripple">
                {waves.map((wy, i) => (
                  <path
                    key={wy}
                    d={`M-62 ${wy} q8 ${i % 2 ? 5 : -5} 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0`}
                    fill="none"
                    stroke="var(--stroke)"
                    strokeWidth={0.9}
                    strokeDasharray="4 3"
                    className="anim-dash"
                    style={{ animationDuration: `${5 + (i % 3)}s` }}
                    opacity={0.75}
                  />
                ))}
              </g>
            </g>
          )}
          {/* crescent moon, horns up */}
          <rect x={-r0} y={-r0} width={r0 * 2} height={r0 * 2} mask={`url(#${id('moon')})`} fill="color-mix(in oklab, #b9c2cf 55%, var(--moon-disc))" />
          <circle cx={0} cy={4} r={r0 * 0.8} fill="none" stroke="var(--stroke)" strokeWidth={sw * 0.8} mask={`url(#${id('moon')})`} />
          {bija(r0 * 0.6, '#2b3340', cfg.bijaSize)}
        </g>
      );
    }
    case 'manipura': {
      const tri = `M${pt(r0, 300)}L${pt(r0, 60)}L${pt(r0, 180)}Z`;
      const flames = [
        [-34, 40, 30, 7],
        [-22, 46, 44, 8],
        [-10, 50, 54, 8],
        [2, 52, 60, 9],
        [14, 50, 50, 8],
        [26, 46, 40, 8],
        [36, 40, 28, 6],
        [-4, 50, 38, 6],
        [20, 48, 30, 6],
      ];
      return (
        <g>
          <clipPath id={id('fire')}>
            <circle r={r0 - 1} />
          </clipPath>
          <linearGradient id={id('flame')} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff4a1c" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#ff8a2a" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffd36e" stopOpacity="0.05" />
          </linearGradient>
          <circle r={r0} fill="var(--disc)" stroke="var(--stroke)" strokeWidth={sw} />
          <g clipPath={`url(#${id('fire')})`}>
            <ellipse cx={0} cy={44} rx={44} ry={14} fill="#ff4a1c" opacity={0.28} />
            {(mini ? flames.slice(0, 5) : flames).map(([fx, fy, fh, fw], i) => (
              <path
                key={i}
                d={`M${fx - fw} ${fy}C${fx - fw} ${fy - fh * 0.45} ${fx - fw * 0.1} ${fy - fh * 0.62} ${fx + fw * 0.15} ${fy - fh}C${fx + fw * 0.35} ${fy - fh * 0.6} ${fx + fw} ${fy - fh * 0.45} ${fx + fw} ${fy}Z`}
                fill={`url(#${id('flame')})`}
                className="anim-flicker"
                style={{ animationDelay: `${-i * 0.37}s`, animationDuration: `${1.1 + (i % 4) * 0.23}s` }}
              />
            ))}
          </g>
          <path d={tri} fill="none" stroke="var(--stroke)" strokeWidth={mini ? 3.2 : 1.8} strokeLinejoin="round" />
          {bija(-6, 'var(--stroke)')}
        </g>
      );
    }
    case 'anahata': {
      const up = [P(r0, 0), P(r0, 120), P(r0, 240)];
      const dn = [P(r0, 60), P(r0, 180), P(r0, 300)];
      return (
        <g>
          <circle r={r0} fill="var(--disc)" stroke="var(--stroke)" strokeWidth={sw} />
          {!mini && <Stipple r0={r0} up={up} dn={dn} />}
          <path d={`M${up.map((p) => p.join(' ')).join('L')}Z`} fill="none" stroke="var(--stroke)" strokeWidth={mini ? 3 : 1.6} strokeLinejoin="round" />
          <path d={`M${dn.map((p) => p.join(' ')).join('L')}Z`} fill="none" stroke="var(--stroke)" strokeWidth={mini ? 3 : 1.6} strokeLinejoin="round" />
          {bija(0, 'var(--stroke)')}
        </g>
      );
    }
    case 'vishuddha':
      return (
        <g>
          <circle r={r0 - 1} fill="var(--disc)" />
          {/* thick ether ring */}
          <circle r={r0 - 9} fill="none" stroke="#8b5cf6" strokeWidth={14} />
          <circle r={r0 - 9} fill="none" stroke="#c4a8ff" strokeWidth={1} opacity={0.6} className="anim-glow" />
          {/* full-moon disc */}
          <circle r={r0 - 16.5} fill="var(--moon-disc)" />
          {bija(0, '#6236c9')}
        </g>
      );
  }
  return null;
}

function Stipple({ r0, up, dn }: { r0: number; up: (readonly [number, number])[]; dn: (readonly [number, number])[] }) {
  const groups = useMemo(() => {
    const rand = rng(7);
    const out: [number, number][][] = [[], [], []];
    let k = 0;
    while (k < 900 && out.flat().length < 240) {
      k++;
      const x = (rand() * 2 - 1) * r0;
      const y = (rand() * 2 - 1) * r0;
      if (Math.hypot(x, y) > r0 - 2.5) continue;
      if (inTri(x, y, up) || inTri(x, y, dn)) continue;
      out[k % 3].push([x, y]);
    }
    return out;
  }, [r0, up, dn]);
  return (
    <g fill="var(--stroke)">
      {groups.map((g, gi) => (
        <g key={gi} className="anim-drift" style={{ animationDelay: `${-gi * 2}s`, animationDuration: `${5 + gi}s` }}>
          {g.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.75 + ((i * 7) % 3) * 0.25} opacity={0.55} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Ajna({
  mini,
  showLetters,
  isOn,
  petalProps,
  letters,
  cfg,
  id,
}: {
  mini: boolean;
  showLetters: boolean;
  isOn: (i: number) => boolean;
  petalProps: (i: number) => object;
  letters: Chakra['petals']['letters'];
  cfg: Cfg;
  id: (s: string) => string;
}) {
  const left = 'M-23 -13 C-40 -46 -82 -36 -98 0 C-82 36 -40 46 -23 13Z';
  const right = 'M23 -13 C40 -46 82 -36 98 0 C82 36 40 46 23 13Z';
  const sw = mini ? 3.4 : 1.6;
  return (
    <g>
      <filter id={id('ajna-sh')} x="-30%" y="-60%" width="160%" height="220%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" floodColor="#6b5a3a" floodOpacity="0.35" />
      </filter>
      <g className={mini ? '' : 'anim-breathe'} style={{ animationDuration: '8s' }}>
        {[left, right].map((d, i) => (
          <g key={i} {...petalProps(i)}>
            <path
              className="petal-shape"
              d={d}
              fill={isOn(i) ? 'color-mix(in oklab, #f7f3e8 70%, var(--gold))' : '#f7f3e8'}
              fillOpacity={0.96}
              stroke="var(--stroke)"
              strokeWidth={sw}
              filter={`url(#${id('ajna-sh')})`}
            />
            {showLetters && (
              <text
                x={i === 0 ? -cfg.letterR : cfg.letterR}
                y={0}
                fontSize={cfg.letterSize * (isOn(i) ? 1.15 : 1)}
                className="font-deva"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#3a3226"
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {letters[i].deva}
              </text>
            )}
          </g>
        ))}
      </g>
      {/* stacked disc (the reference draws a thick coin) */}
      <circle cx={0} cy={5} r={cfg.r0} fill="color-mix(in oklab, #f7f3e8 80%, #a8997a)" stroke="var(--stroke)" strokeWidth={sw} />
      <circle cx={0} cy={0} r={cfg.r0} fill="#fbf8ef" stroke="var(--stroke)" strokeWidth={sw} filter={`url(#${id('ajna-sh')})`} />
      {!mini && (
        <text x={0} y={1} fontSize={cfg.bijaSize} className="font-deva" textAnchor="middle" dominantBaseline="central" fill="#3a3226" fontWeight={700}>
          ॐ
        </text>
      )}
    </g>
  );
}

/** "1000 petals": ~20 overlapping rings of petals, rainbow hues, counter-rotating for a moiré. */
function Sahasrara({ mini, id }: { mini: boolean; id: (s: string) => string }) {
  const rings = useMemo(() => {
    const R = mini ? 6 : 20;
    const n = mini ? 16 : 25;
    return Array.from({ length: R }, (_, ri) => {
      const r0 = 12 + ri * 1.1;
      const r1 = 62 + ri * 1.75;
      const off = (ri * (360 / n)) / R;
      return Array.from({ length: n }, (_, i) => {
        const a = off + (i * 360) / n;
        const hue = (a + ri * 9) % 360;
        return { d: petalPath(a, r0, r1, (360 / n) * 0.95, 'almond'), hue };
      });
    });
  }, [mini]);
  return (
    <g>
      <radialGradient id={id('bindu')}>
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.45" stopColor="#fff6d6" />
        <stop offset="1" stopColor="#ffd36e" stopOpacity="0" />
      </radialGradient>
      {rings.map((ring, ri) => (
        <g
          key={ri}
          className={mini ? '' : ri % 2 ? 'anim-spin-rev' : 'anim-spin'}
          style={{ animationDuration: `${120 + ri * 9}s` }}
        >
          {ring.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={`hsl(${p.hue} 90% var(--rainbow-l, 62%))`}
              strokeWidth={mini ? 1.6 : 0.55}
              opacity={mini ? 0.9 : 0.85}
            />
          ))}
        </g>
      ))}
      <circle r={mini ? 22 : 18} fill={`url(#${id('bindu')})`} className="anim-glow" />
      <circle r={mini ? 8 : 6} fill="#fff" stroke="#ffd36e" strokeWidth={1.2} />
    </g>
  );
}

import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { CHAKRAS, type Chakra, type ChakraId } from '../data';
import { Yantra } from '../yantras/Yantra';
import {
  BACK_DETAILS,
  BACK_GAPS,
  BACK_OUTLINE,
  chakraPoint,
  FRONT_ARM_GAPS,
  FRONT_EARRINGS,
  FRONT_LINEART,
  FRONT_OUTLINE,
  IDA_PATH,
  PINGALA_PATH,
  SIDE_ARM,
  SIDE_BRAIN,
  SIDE_BRAIN_FOLDS,
  SIDE_CEREBELLUM,
  SIDE_DETAILS,
  SIDE_OUTLINE,
  SIDE_SPINE_PATH,
  SUSHUMNA_FRONT,
  VERTEBRAE,
  type FigureView,
} from './geometry';

export type BodyStyle = 'premium' | 'line';

const useIds = () => {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (s: string) => `${u}-${s}`;
};

/** The seated body for a given view. Draw inside an <svg> using the shared frame. */
export function Body({ view, look = 'premium' }: { view: FigureView; look?: BodyStyle }) {
  const id = useIds();
  const premium = look === 'premium';
  const fill = premium ? `url(#${id('skin')})` : 'none';
  const rim = premium ? 'var(--body-rim)' : 'var(--text)';
  const rimW = premium ? 0.9 : 1.5;
  const detail = premium ? 'var(--body-detail)' : 'var(--text)';
  const outline = view === 'back' ? BACK_OUTLINE : FRONT_OUTLINE;
  const holes = view === 'back' ? BACK_GAPS : FRONT_ARM_GAPS;
  return (
    <g>
      <defs>
        <linearGradient id={id('skin')} x1="0" y1="-200" x2="0" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--body-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--body-bottom)' }} />
        </linearGradient>
        <radialGradient id={id('shade')} cx="0" cy="-20" r="170" gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" style={{ stopColor: 'var(--body-shade)' }} />
        </radialGradient>
        <filter id={id('rim')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {view === 'side' ? (
        <>
          <path d={SIDE_OUTLINE} fill={fill} stroke={rim} strokeWidth={rimW} strokeLinejoin="round" />
          {premium && <path d={SIDE_OUTLINE} fill={`url(#${id('shade')})`} />}
        </>
      ) : (
        <>
          <path d={`${outline} ${holes.join(' ')}`} fillRule="evenodd" fill={fill} stroke={rim} strokeWidth={rimW} strokeLinejoin="round" />
          {premium && <path d={`${outline} ${holes.join(' ')}`} fillRule="evenodd" fill={`url(#${id('shade')})`} />}
        </>
      )}

      <g fill="none" stroke={detail} strokeWidth={premium ? 0.9 : 1.1} strokeLinecap="round" strokeLinejoin="round">
        {view !== 'front' && (view === 'back' ? BACK_DETAILS : SIDE_DETAILS).map((d) => <path key={d} d={d} />)}
      </g>
      {view === 'front' && (
        <g>
          {/* traced line art: face, armpits, crossed legs, hands — exactly as in the reference figure */}
          <path d={FRONT_LINEART} fill={premium ? 'var(--body-line)' : 'var(--text)'} fillRule="evenodd" />
          <path d={FRONT_EARRINGS} fill="#d9a48c" fillRule="evenodd" />
        </g>
      )}

      {view === 'side' && <SideInterior premium={premium} />}
      {view === 'back' && <BackSpine />}
    </g>
  );
}

function SideInterior({ premium }: { premium: boolean }) {
  return (
    <g>
      {/* brain */}
      <path d={SIDE_BRAIN} fill="color-mix(in oklab, var(--body-detail) 30%, transparent)" stroke="var(--body-detail)" strokeWidth={0.9} />
      <path d={SIDE_CEREBELLUM} fill="color-mix(in oklab, var(--body-detail) 40%, transparent)" stroke="var(--body-detail)" strokeWidth={0.8} />
      <g fill="none" stroke="var(--body-detail)" strokeWidth={0.7} strokeLinecap="round">
        {SIDE_BRAIN_FOLDS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* spinal column */}
      <Vertebrae />
      {/* near arm, translucent so the spine stays visible */}
      <path
        d={SIDE_ARM}
        fill={premium ? 'color-mix(in oklab, var(--body-top) 55%, transparent)' : 'none'}
        stroke={premium ? 'var(--body-rim)' : 'var(--text)'}
        strokeWidth={premium ? 0.9 : 1.2}
        strokeDasharray={premium ? undefined : '3 3'}
        opacity={0.75}
      />
    </g>
  );
}

function Vertebrae() {
  return (
    <g>
      <path d={SIDE_SPINE_PATH} fill="none" stroke="var(--body-detail)" strokeWidth={9} strokeLinecap="round" opacity={0.25} />
      {VERTEBRAE.map((v, i) => {
        const ang = (Math.atan2(v.ty, v.tx) * 180) / Math.PI - 90;
        return (
          <g key={i} transform={`translate(${v.x} ${v.y}) rotate(${ang})`}>
            <rect x={-v.w / 2} y={-2.1} width={v.w} height={4.2} rx={1.8} fill="color-mix(in oklab, var(--body-detail) 55%, transparent)" />
            {v.region !== 'sacral' && <rect x={v.w / 2 - 0.5} y={-1} width={v.w * 0.55} height={2} rx={1} fill="var(--body-detail)" opacity={0.6} />}
          </g>
        );
      })}
    </g>
  );
}

/** Back-view spinal column (Fig. 4.4): neck base to coccyx on x = 0, 26 vertebral bodies. */
const BACK_SPINE = { top: -86, bottom: 152 };
function BackSpine() {
  return (
    <g>
      <line x1={0} y1={BACK_SPINE.top} x2={0} y2={BACK_SPINE.bottom + 6} stroke="var(--body-detail)" strokeWidth={8} strokeLinecap="round" opacity={0.18} />
      {VERTEBRAE.map((v, i) => (
        <g key={i} transform={`translate(0 ${BACK_SPINE.top + ((BACK_SPINE.bottom - BACK_SPINE.top) * i) / (VERTEBRAE.length - 1)})`}>
          <rect x={-v.w / 2} y={-2} width={v.w} height={4} rx={1.8} fill="color-mix(in oklab, var(--body-detail) 50%, transparent)" />
          {v.region !== 'sacral' && <circle r={1.2} fill="var(--body-detail)" />}
        </g>
      ))}
    </g>
  );
}

/** Golden central channel. */
export function Sushumna({ view, opacity = 1, width = 2.2 }: { view: FigureView; opacity?: number; width?: number }) {
  const id = useIds();
  const d =
    view === 'side'
      ? `${SIDE_SPINE_PATH} M-10 -131 L-8 -150 L-12 -184`
      : `M0 ${SUSHUMNA_FRONT.y1} L0 ${SUSHUMNA_FRONT.y2}`;
  return (
    <g opacity={opacity}>
      <defs>
        <filter id={id('g')} x="-50%" y="-5%" width="200%" height="110%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="var(--sushumna)" strokeWidth={width * 3.2} opacity={0.45} filter={`url(#${id('g')})`} strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--sushumna)" strokeWidth={width} strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--sushumna-core)" strokeWidth={width * 0.35} strokeLinecap="round" strokeDasharray="10 14" className="anim-flow" style={{ animationDirection: 'reverse' }} />
    </g>
  );
}

export function IdaPingala({ opacity = 0.9, width = 1.4, onPick }: { opacity?: number; width?: number; onPick?: (id: 'ida' | 'pingala') => void }) {
  const hit = (k: 'ida' | 'pingala') =>
    onPick
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-label': k === 'ida' ? 'Ida — lunar channel' : 'Pingala — solar channel',
          style: { cursor: 'pointer' },
          onClick: () => onPick(k),
          onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onPick(k),
        }
      : {};
  return (
    <g opacity={opacity} fill="none" strokeLinecap="round">
      <g {...hit('ida')}>
        <path d={IDA_PATH} stroke="transparent" strokeWidth={10} />
        <path d={IDA_PATH} stroke="var(--ida, #7fb8ff)" strokeWidth={width} />
      </g>
      <g {...hit('pingala')}>
        <path d={PINGALA_PATH} stroke="transparent" strokeWidth={10} />
        <path d={PINGALA_PATH} stroke="var(--pingala, #ff9a4a)" strokeWidth={width} />
      </g>
    </g>
  );
}

/** Tappable chakra glyphs placed on the figure for the given view. */
export function ChakraGlyphs({
  view,
  onSelect,
  selected,
  breathing = true,
  scale = 1,
  only,
}: {
  view: FigureView;
  onSelect?: (id: ChakraId) => void;
  selected?: ChakraId | null;
  breathing?: boolean;
  scale?: number;
  only?: ChakraId[];
}) {
  const list = only ? CHAKRAS.filter((c) => only.includes(c.id)) : CHAKRAS;
  return (
    <g>
      {list.map((c, i) => {
        const p = chakraPoint(c, view);
        const s = c.position.size * scale;
        return (
          <ChakraHit key={c.id} chakra={c} x={p.x} y={p.y} r={Math.max(s / 2, 21)} onSelect={onSelect} selected={selected === c.id}>
            <g className={breathing ? 'anim-breathe' : ''} style={{ animationDelay: `${-i * 0.7}s` }}>
              {view === 'side' ? (
                <SideNode chakra={c} x={p.x} y={p.y} />
              ) : view === 'back' ? (
                <BackLotus chakra={c} x={p.x} y={p.y} />
              ) : (
                <Yantra chakra={c} variant="mini" x={p.x - s / 2} y={p.y - s / 2} size={s} />
              )}
            </g>
          </ChakraHit>
        );
      })}
    </g>
  );
}

export function ChakraHit({
  chakra,
  x,
  y,
  r,
  onSelect,
  selected,
  children,
}: {
  chakra: Chakra;
  x: number;
  y: number;
  r: number;
  onSelect?: (id: ChakraId) => void;
  selected?: boolean;
  children: ReactNode;
}) {
  const interactive = !!onSelect;
  return (
    <g
      className={interactive ? 'chakra-hit' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${chakra.name} — ${chakra.english}. Open details` : undefined}
      onClick={interactive ? () => onSelect(chakra.id) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(chakra.id);
              }
            }
          : undefined
      }
    >
      <circle cx={x} cy={y} r={r} fill="transparent" />
      {children}
      <circle
        className="chakra-ring"
        cx={x}
        cy={y}
        r={r + 2}
        fill="none"
        stroke={chakra.color.rainbow ? '#c9a7ff' : chakra.color.primary}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={selected ? 0.9 : 0}
      />
    </g>
  );
}

/** Side-view chakra: glowing disc with ॐ and radiating Om spokes (Fig. 5.1). */
export function SideNode({ chakra, x, y, spokeScale = 1 }: { chakra: Chakra; x: number; y: number; spokeScale?: number }) {
  const id = useIds();
  const small = chakra.order <= 2;
  const R = small ? 6.2 : 7.6;
  const L = (chakra.id === 'ajna' ? 22 : small ? 17 : 26) * spokeScale;
  const col = chakra.color.rainbow ? '#c9a7ff' : chakra.color.primary;
  const ink = chakra.color.rainbow ? '#7d4fd6' : chakra.color.ink;
  if (chakra.id === 'sahasrara') {
    return (
      <g>
        <defs>
          <radialGradient id={id('crown')}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.5" stopColor="#ffd36e" stopOpacity="0.6" />
            <stop offset="1" stopColor="#c9a7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={x} cy={y} r={22} fill={`url(#${id('crown')})`} className="anim-glow" />
        <Yantra chakra={chakra} variant="mini" x={x - 15} y={y - 15} size={30} />
      </g>
    );
  }
  return (
    <g className="yantra" style={{ ['--c' as string]: col, ['--c-ink' as string]: ink }}>
      <circle cx={x} cy={y} r={R * 2.6} fill={col} fillOpacity={0.22} className="anim-glow" />
      {Array.from({ length: chakra.omSpokes }, (_, k) => {
        const a = (k * 2 * Math.PI) / chakra.omSpokes;
        const ex = x + Math.cos(a) * L;
        const ey = y + Math.sin(a) * L;
        return (
          <g key={k}>
            <line x1={x + Math.cos(a) * R} y1={y + Math.sin(a) * R} x2={x + Math.cos(a) * (L - 4)} y2={y + Math.sin(a) * (L - 4)} stroke="var(--stroke)" strokeWidth={0.9} opacity={0.85} />
            <text x={ex} y={ey} fontSize={small ? 5.4 : 6.4} textAnchor="middle" dominantBaseline="central" className="font-deva" fill="var(--stroke)">
              ॐ
            </text>
          </g>
        );
      })}
      <circle cx={x} cy={y} r={R} fill="var(--moon-disc)" stroke="var(--stroke)" strokeWidth={1.6} />
      <text x={x} y={y + 0.4} fontSize={R * 1.25} textAnchor="middle" dominantBaseline="central" className="font-deva" fill={ink} fontWeight={700}>
        ॐ
      </text>
    </g>
  );
}

/**
 * Back-view lotus (Fig. 4.4): a lotus bud seen in profile on the spine — a crown of pointed back
 * petals, nested front petals and a central petal. Sahasrara is the drooping thousand-petal canopy,
 * Ajna the two horizontal petals, Muladhara carries the downward arrow.
 */
export function BackLotus({ chakra: c, x, y }: { chakra: Chakra; x: number; y: number }) {
  const w = c.position.backW;
  const h = c.position.backH;
  const col = c.color.rainbow ? '#c9a7ff' : c.color.primary;
  const vars = { ['--c' as string]: col, ['--c-ink' as string]: c.color.rainbow ? '#7d4fd6' : c.color.ink };
  const id = useIds();
  const glow = (
    <g>
      <defs>
        <radialGradient id={id('g')}>
          <stop offset="0" stopColor={col} stopOpacity="0.45" />
          <stop offset="1" stopColor={col} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={Math.max(w, h) * 0.8} fill={`url(#${id('g')})`} className="anim-glow" />
    </g>
  );
  if (c.id === 'ajna') {
    return (
      <g>
        {glow}
        <Yantra chakra={c} variant="mini" x={x - w / 2} y={y - w / 2} size={w} />
      </g>
    );
  }
  if (c.id === 'sahasrara') {
    // petals hanging from a small crown disc, rainbow
    const n = 23;
    return (
      <g className="yantra" style={vars}>
        {glow}
        {Array.from({ length: n }, (_, i) => {
          const t = i / (n - 1);
          const a = (-80 + t * 160) * (Math.PI / 180);
          const len = h * (0.75 + 0.25 * Math.cos(a));
          const bx = x + Math.sin(a) * 4;
          const by = y - h / 2 + 3;
          const tx = bx + Math.sin(a) * w * 0.55;
          const ty = by + Math.cos(a) * len;
          const nx = Math.cos(a) * 1.6;
          const ny = -Math.sin(a) * 1.6;
          return (
            <path
              key={i}
              d={`M${bx} ${by}Q${(bx + tx) / 2 + nx * 2} ${(by + ty) / 2 + ny * 2} ${tx} ${ty}Q${(bx + tx) / 2 - nx * 2} ${(by + ty) / 2 - ny * 2} ${bx} ${by}Z`}
              fill={`hsl(${t * 320} 90% var(--rainbow-l, 62%) / .55)`}
              stroke={`hsl(${t * 320} 90% var(--rainbow-l, 62%))`}
              strokeWidth={0.6}
            />
          );
        })}
        <path d={`M${x - 7} ${y - h / 2 + 3}A7 7 0 0 1 ${x + 7} ${y - h / 2 + 3}Z`} fill="#fff6d6" stroke="#ffd36e" strokeWidth={0.8} />
      </g>
    );
  }
  const base = y + h / 2;
  const top = y - h / 2;
  const tips = c.order <= 2 ? 3 : 7;
  const zig = Array.from({ length: tips * 2 + 1 }, (_, i) => {
    const px = x - w / 2 + (w * i) / (tips * 2);
    return `${px.toFixed(2)} ${(i % 2 ? top : top + h * 0.28).toFixed(2)}`;
  }).join('L');
  const petal = (cx: number, pw: number, ph: number) =>
    `M${x + cx * 0.25} ${base}C${x + cx - pw} ${base - ph * 0.35} ${x + cx - pw * 0.6} ${base - ph * 0.8} ${x + cx} ${base - ph}` +
    `C${x + cx + pw * 0.6} ${base - ph * 0.8} ${x + cx + pw} ${base - ph * 0.35} ${x + cx * 0.25} ${base}Z`;
  const side = c.order <= 2 ? [w * 0.3] : [w * 0.36, w * 0.18];
  return (
    <g className="yantra" style={vars} strokeLinejoin="round">
      {glow}
      {c.order > 2 && <path d={`M${x - w / 2} ${top + h * 0.28}L${zig}L${x + w / 2} ${top + h * 0.28}L${x + w * 0.42} ${base - h * 0.3}L${x - w * 0.42} ${base - h * 0.3}Z`} fill="var(--petal-fill)" stroke="var(--stroke)" strokeWidth={0.9} />}
      {side.map((dx, i) => (
        <g key={i}>
          <path d={petal(-dx, w * 0.2, h * (0.82 - i * 0.08))} fill="var(--petal-fill)" stroke="var(--stroke)" strokeWidth={1} />
          <path d={petal(dx, w * 0.2, h * (0.82 - i * 0.08))} fill="var(--petal-fill)" stroke="var(--stroke)" strokeWidth={1} />
        </g>
      ))}
      <path d={petal(0, w * 0.2, h * 0.92)} fill={c.id === 'muladhara' ? '#f2c230' : 'color-mix(in oklab, var(--c) 35%, var(--moon-disc))'} stroke={c.id === 'muladhara' ? '#d7263d' : 'var(--stroke)'} strokeWidth={1.1} />
      {c.id === 'muladhara' && (
        <g stroke="#d7263d" strokeWidth={1.4} fill="#d7263d" strokeLinecap="round">
          <line x1={x} y1={base} x2={x} y2={base + 8} />
          <path d={`M${x - 3.2} ${base + 6}L${x} ${base + 11}L${x + 3.2} ${base + 6}Z`} />
        </g>
      )}
    </g>
  );
}

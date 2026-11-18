import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import { Segmented } from '../components/ui';
import { LayerMenu, type AnatomyLayers } from '../components/LayerMenu';
import { TopBar } from '../components/Shell';
import { ChevronRight, WavesIcon } from '../components/Icons';
import { CHAKRAS, type ChakraId } from '../data';
import { Body, ChakraGlyphs, IdaPingala, Sushumna } from '../figures/Body';
import { chakraPoint, type FigureView } from '../figures/geometry';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { openChakra, openNadi, useSettings, useUi } from '../lib/store';

const Matrika = lazy(() => import('./Matrika'));

const VIEWS: { value: FigureView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];

export default function Home() {
  const view = useSettings((s) => s.homeView);
  const setView = useSettings((s) => s.setHomeView);
  const matrika = useSettings((s) => s.matrika);
  const setMatrika = useSettings((s) => s.setMatrika);
  const desktop = useIsDesktop();
  const [simple, setSimpleState] = useState(() => {
    try {
      return localStorage.getItem('om-home-simple') === '1';
    } catch {
      return false;
    }
  });
  const setSimple = (v: boolean) => {
    setSimpleState(v);
    try {
      localStorage.setItem('om-home-simple', v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };
  const [labels, setLabels] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const [layers, setLayers] = useState<AnatomyLayers>({ chakras: true, sushumna: true, ida: false, pingala: false, spine: true });
  const sheet = useUi((s) => s.sheet);
  const selected = sheet?.type === 'chakra' ? sheet.id : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title={<span className="title-gradient">Om</span>}
        subtitle="Sushumna and the seven lotuses — tap any chakra"
      />
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-1 lg:px-6">
        <div className="w-full max-w-[300px]">
          <Segmented label="Figure view" value={view} options={VIEWS} onChange={setView} size="sm" />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn !min-h-9 text-xs" aria-pressed={matrika} onClick={() => setMatrika(!matrika)}>
            Matrika
          </button>
          {!matrika && (
            <>

              <button className="btn !min-h-9 text-xs" aria-pressed={labels} onClick={() => setLabels(!labels)}>
                Labels
              </button>
              <button className="btn !min-h-9 text-xs" aria-pressed={simple} onClick={() => setSimple(!simple)} title="Simple view: plain chakra symbols">
                Simple
              </button>
              <LayerMenu value={layers} onChange={setLayers} />
            </>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {matrika ? (
          <Suspense fallback={null}>
            <Matrika />
          </Suspense>
        ) : (
          <FigureStage view={view} labels={labels} layers={layers} selected={selected} wide={desktop} simple={simple} />
        )}
      </div>

      {!matrika && (
        <div className="flex shrink-0 justify-center px-4 pt-1 pb-3">
          <button
            className="btn btn-gold hairline-glow !min-h-12 !rounded-full !px-6 text-sm font-semibold"
            onClick={() => navigate('/nadi')}
          >
            <WavesIcon size={20} /> Enter Nadi Harmony <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function FigureStage({
  view,
  labels,
  layers,
  simple,
  selected,
  wide,
}: {
  view: FigureView;
  labels: boolean;
  layers: AnatomyLayers;
  simple: boolean;
  selected: ChakraId | null;
  wide: boolean;
}) {
  const reduce = useReducedMotion();
  const showLabels = labels;
  // Wider viewBox when labels sit to the right of the figure.
  const vb = showLabels ? (wide ? '-260 -212 560 404' : '-200 -212 420 404') : '-212 -212 424 404';
  const order = { front: 0, side: 1, back: 2 } as const;
  return (
    <div className="absolute inset-0 [perspective:1400px]">
      <AnimatePresence initial={false} custom={order[view]}>
        <motion.div
          key={view}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -70, scale: 0.96 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 70, scale: 0.96 }}
          transition={{ duration: reduce ? 0.15 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <svg viewBox={vb} className="h-full w-full" role="group" aria-label={`Meditation figure, ${view} view, with seven chakras`}>
            <Aura />
            <Body view={view} spine={layers.spine} />
            {view !== 'side' && (layers.ida || layers.pingala) && <IdaPingala onPick={openNadi} ida={layers.ida} pingala={layers.pingala} />}
            {layers.sushumna && (
              <g role="button" tabIndex={-1} onClick={() => openNadi('sushumna')} style={{ cursor: 'pointer' }} aria-label="Sushumna">
                <Sushumna view={view} />
              </g>
            )}
            {layers.chakras && <ChakraGlyphs view={view} onSelect={openChakra} selected={selected} simple={simple} />}
            {showLabels && layers.chakras && <Labels view={view} wide={wide} />}
          </svg>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Aura() {
  return (
    <g aria-hidden>
      <defs>
        <radialGradient id="home-aura" cx="0" cy="-20" r="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--aura-a)' }} />
          <stop offset="0.6" style={{ stopColor: 'var(--aura-b)' }} />
          <stop offset="1" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={-10} rx={230} ry={215} fill="url(#home-aura)" className="anim-glow" style={{ animationDuration: '9s' }} />
    </g>
  );
}

/** Leader lines and names, in the manner of Fig. 4.4. */
function Labels({ view, wide }: { view: FigureView; wide: boolean }) {
  const x2 = wide ? 168 : 128;
  return (
    <g aria-hidden className="pointer-events-none">
      {CHAKRAS.map((c) => {
        const p = chakraPoint(c, view);
        const ly = p.y;
        const startX = p.x + (view === 'side' ? 30 : c.position.size / 2 + 4);
        return (
          <g key={c.id}>
            <line x1={startX} y1={ly} x2={x2 - 4} y2={ly} stroke="var(--border-hi)" strokeWidth={0.6} />
            <circle cx={x2 - 4} cy={ly} r={1.4} fill={c.color.rainbow ? '#c9a7ff' : c.color.primary} />
            <text x={x2} y={ly - 2} fontSize={wide ? 10.5 : 9} fill="var(--text)" fontFamily="var(--font-display)" fontWeight={600}>
              {c.name}
            </text>
            <text x={x2} y={ly + 8} fontSize={wide ? 7 : 6.2} fill="var(--muted)">
              {wide ? c.english.split('·')[1]?.trim() : c.element.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

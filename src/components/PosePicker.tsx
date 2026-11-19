import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Body } from '../figures/Body';
import { ASANAS, limb, MUDRAS, poseFigure, type Asana, type AsanaId, type HandShape, type Mudra, type MudraId } from '../figures/pose';
import { useReducedMotion } from '../lib/hooks';
import { useSettings } from '../lib/store';
import { PlayIcon, StopIcon } from './Icons';
import { Segmented } from './ui';

type Tab = 'asana' | 'mudra';

/** Settings → Meditation pose: pick an asana and a mudra; every figure in the app follows the choice. */
export function PosePicker() {
  const asana = useSettings((s) => s.asana);
  const mudra = useSettings((s) => s.mudra);
  const setAsana = useSettings((s) => s.setAsana);
  const setMudra = useSettings((s) => s.setMudra);
  const [tab, setTab] = useState<Tab>('asana');
  const a = ASANAS.find((x) => x.id === asana) ?? ASANAS[0];
  const m = MUDRAS.find((x) => x.id === mudra) ?? MUDRAS[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex items-center gap-3 rounded-2xl p-2 pr-3">
        <Figure asana={asana} mudra={mudra} vb="-200 -210 400 400" className="h-20 w-20 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text">
            {a.name} · {m.name}
          </p>
          <p className="text-xs text-muted">Shown on every figure: Home (front &amp; side), Nadi Harmony, Prāṇa and 3D.</p>
        </div>
      </div>
      <Segmented<Tab>
        label="Pose part"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'asana', label: 'Āsana (seat)' },
          { value: 'mudra', label: 'Mudrā (hands / gaze)' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={tab === 'asana' ? 'Asana' : 'Mudra'}>
        {(tab === 'asana' ? ASANAS : MUDRAS).map((it) => {
          const on = tab === 'asana' ? it.id === asana : it.id === mudra;
          return (
            <button
              key={it.id}
              role="radio"
              aria-checked={on}
              onClick={() => (tab === 'asana' ? setAsana(it.id as AsanaId) : setMudra(it.id as MudraId))}
              className="glass flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-colors"
              style={on ? { borderColor: 'var(--gold)', boxShadow: '0 0 0 1px var(--gold) inset' } : undefined}
            >
              {tab === 'asana' ? (
                <Figure asana={it.id as AsanaId} mudra={mudra} vb="-200 -40 400 240" className="h-16 w-full" />
              ) : (
                <MudraThumb mudra={it as Mudra} asana={asana} />
              )}
              <span className="text-sm leading-tight text-text">{it.name}</span>
              <span className="font-deva text-xs text-muted">{it.deva}</span>
              <span className="text-[0.68rem] text-faint">{it.english}</span>
            </button>
          );
        })}
      </div>
      {tab === 'asana' ? <AsanaDetail a={a} mudra={mudra} /> : <MudraDetail m={m} asana={asana} />}
    </div>
  );
}

/* ------------------------------------------------------------------ figures */

function Figure({
  asana,
  mudra,
  vb,
  className,
  over,
}: {
  asana: AsanaId;
  mudra: MudraId;
  vb: string;
  className?: string;
  over?: Parameters<typeof poseFigure>[2];
}) {
  const fp = useMemo(() => poseFigure(asana, mudra, over), [asana, mudra, over]);
  return (
    <svg viewBox={vb} className={className} aria-hidden="true">
      <Body view="front" spine={false} pose={fp} />
    </svg>
  );
}

/** Where to zoom for each kind of mudra. */
const CROP = { lap: '-110 30 220 140', chest: '-110 -110 220 150', eyes: '-36 -162 72 44' };

function MudraThumb({ mudra, asana }: { mudra: Mudra; asana: AsanaId }) {
  if (mudra.eyes) return <Figure asana={asana} mudra={mudra.id} vb={CROP.eyes} className="h-16 w-full" />;
  if (mudra.arms === 'knees') return <Hand shape={mudra.hand} className="h-16 w-full" />;
  return <Figure asana={asana} mudra={mudra.id} vb={CROP[mudra.arms]} className="h-16 w-full" />;
}

/* ------------------------------------------------------------------ step player */

function useStepper(count: number, key: string) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  useEffect(() => {
    setI(0);
    setPlaying(!reduce);
  }, [key, reduce]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((n) => (n + 1) % count), 2600);
    return () => clearInterval(t);
  }, [playing, count]);
  return { i, setI, playing, setPlaying, reduce };
}

function Player({ frames, steps, k, morph }: { frames: React.ReactNode[]; steps: string[]; k: string; morph?: boolean }) {
  const { i, setI, playing, setPlaying, reduce } = useStepper(frames.length, k);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
        {morph ? (
          <div className="absolute inset-0 flex items-center justify-center p-2">{frames[i]}</div>
        ) : (
        <AnimatePresence initial={false}>
          <motion.div
            key={i}
            className="absolute inset-0 flex items-center justify-center p-2"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.7 }}
          >
            {frames[i]}
          </motion.div>
        </AnimatePresence>
        )}
        <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs text-muted glass">
          Step {i + 1} / {frames.length}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-icon !min-h-9 !min-w-9 !rounded-full" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause steps' : 'Play steps'}>
          {playing ? <StopIcon size={14} /> : <PlayIcon size={14} />}
        </button>
        <div className="flex gap-1.5" role="tablist" aria-label="Steps">
          {frames.map((_, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === i}
              aria-label={`Step ${n + 1}`}
              onClick={() => {
                setPlaying(false);
                setI(n);
              }}
              className="h-2.5 rounded-full transition-all"
              style={{ width: n === i ? 22 : 10, background: n === i ? 'var(--gold)' : 'var(--border-hi)' }}
            />
          ))}
        </div>
      </div>
      <ol className="flex flex-col gap-1.5 text-sm">
        {steps.map((t, n) => (
          <li
            key={n}
            className="flex gap-2 rounded-lg px-2 py-1 transition-colors"
            style={n === i ? { background: 'color-mix(in oklab, var(--gold) 14%, transparent)', color: 'var(--text)' } : { color: 'var(--muted)' }}
          >
            <span className="tabular-nums text-faint">{n + 1}.</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function About({ it }: { it: Asana | Mudra }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <h4 className="font-display text-lg text-text">
          {it.name} <span className="font-deva text-base text-muted">{it.deva}</span>
        </h4>
        <p className="text-xs text-faint">{it.english}</p>
      </div>
      <p className="text-muted">{it.about}</p>
      <div>
        <p className="eyebrow mb-1">Benefits</p>
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-muted">
          {it.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
      {it.caution && (
        <p className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'color-mix(in oklab, var(--magenta) 10%, transparent)', color: 'var(--muted)' }}>
          <strong className="text-text">Caution · </strong>
          {it.caution}
        </p>
      )}
    </div>
  );
}

function AsanaDetail({ a, mudra }: { a: Asana; mudra: MudraId }) {
  const frames = a.steps.map((st, n) => (
    <Figure key={n} asana={a.id} mudra={mudra} vb="-215 -212 430 418" className="h-full w-full" over={{ legs: st.legs, armsAtKnees: st.arms === 'knees' }} />
  ));
  return (
    <div className="glass grid gap-4 rounded-2xl p-3 md:grid-cols-2">
      <Player frames={frames} steps={a.steps.map((s) => s.text)} k={a.id} />
      <About it={a} />
    </div>
  );
}

function MudraDetail({ m, asana }: { m: Mudra; asana: AsanaId }) {
  const frames = m.steps.map((st, n) => {
    if (m.eyes) return <Figure key={n} asana={asana} mudra={m.id} vb={CROP.eyes} className="h-full w-full" over={{ eyes: st.eyes }} />;
    if (m.arms === 'knees') return <Hand key="hand" shape={st.hand ?? m.hand} palmUp={m.id !== 'jnana'} className="h-full w-full" />;
    return <Figure key={n} asana={asana} mudra={m.id} vb={CROP[m.arms]} className="h-full w-full" over={{ hand: st.hand }} />;
  });
  return (
    <div className="glass grid gap-4 rounded-2xl p-3 md:grid-cols-2">
      <Player frames={frames} steps={m.steps.map((s) => s.text)} k={m.id} morph={m.arms === 'knees' && !m.eyes} />
      <About it={m} />
    </div>
  );
}

/* ------------------------------------------------------------------ hand close-up */

/**
 * A stylised right hand, fingers up, for the seals made on the knees. Each finger turns about its
 * base and shortens as it curls; the transitions animate between steps.
 */
function Hand({ shape, palmUp = false, className }: { shape: HandShape; palmUp?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  type Pt = [number, number];
  const idx: Pt[] = shape === 'index-thumb' ? [[-15, -8], [-25, -24], [-30, -14]] : [[-15, -8], [-16, -30], [-17, -50]];
  const mid: Pt[] = [[-4, -8], [-4, -32], [-4, -54]];
  const ring: Pt[] = shape === 'prana' ? [[7, -8], [10, -2], [3, 8]] : [[7, -8], [8, -30], [9, -50]];
  const little: Pt[] = shape === 'prana' ? [[17, -8], [17, 2], [9, 10]] : [[17, -8], [19, -26], [21, -40]];
  const thumb: Pt[] =
    shape === 'index-thumb' ? [[-20, 18], [-31, 2], [-31, -12]] : shape === 'prana' ? [[-20, 18], [-8, 16], [1, 10]] : [[-20, 18], [-34, 8], [-44, -4]];
  const t = { duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] as const };
  const skin = { fill: 'color-mix(in oklab, var(--pose-skin-top) 45%, var(--bg))', stroke: 'var(--body-line)', strokeWidth: 1.4 };
  const part = (pts: Pt[], w: number[], key: string) => {
    const d = limb(pts, w);
    return <motion.path key={key} {...skin} initial={false} animate={{ d }} transition={t} />;
  };
  return (
    <svg viewBox="-60 -66 120 120" className={className} aria-hidden="true">
      <path d="M-22 -12 Q-24 26 -6 38 L14 38 Q26 26 23 -12 Q0 -16 -22 -12 Z" {...skin} />
      {palmUp && <path d="M-10 14 Q2 22 14 12 M-8 26 Q4 30 12 24" fill="none" stroke="var(--body-line)" strokeWidth={0.9} opacity={0.6} />}
      {part(mid, [10, 9.5, 8.5], 'm')}
      {part(idx, [10, 9.5, 8.5], 'i')}
      {part(ring, [10, 9.5, 8.5], 'r')}
      {part(little, [9, 8.5, 7.5], 'l')}
      {part(thumb, [13, 11.5, 10], 't')}
      <text x={0} y={52} textAnchor="middle" fontSize={7} fill="var(--faint)">
        {palmUp ? 'palm up' : 'palm down'}
      </text>
    </svg>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayIcon, ResetIcon, StopIcon } from '../components/Icons';
import { TopBar } from '../components/Shell';
import { Section, Segmented, Slider, Toggle } from '../components/ui';
import { playTone } from '../engine/audioContext';
import {
  BANDHAS,
  bandhaById,
  engagedNow,
  initialSystem,
  LOCK_Y,
  makeSeeds,
  particle,
  PHASE_NAME,
  phaseAt,
  PRANAYAMAS,
  stepSystem,
  type BandhaId,
  type PhaseKind,
  type PhaseState,
  type Pranayama as Pr,
  type SystemState,
} from '../engine/kumbhaka';
import { Body, Sushumna } from '../figures/Body';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { useSettings } from '../lib/store';

const SEEDS = makeSeeds(64);
const TONE: Record<PhaseKind, number> = { inhale: 528, 'hold-in': 396, exhale: 432, 'hold-out': 352 };
const PHASE_COLOR: Record<PhaseKind, string> = { inhale: '#4fe3ff', 'hold-in': '#f3c35b', exhale: '#c9a7ff', 'hold-out': '#ff8a5c' };

export default function Pranayama() {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const on = useSettings((s) => s.bandhas);
  const setBandha = useSettings((s) => s.setBandha);
  const [prId, setPrId] = useState(PRANAYAMAS[0].id);
  const base = PRANAYAMAS.find((p) => p.id === prId)!;
  // your own ratio and seconds per count, saved per prāṇāyāma
  const pref = useSettings((s) => s.pranayamaPrefs[prId]);
  const setPref = useSettings((s) => s.setPranayamaPref);
  const logPractice = useSettings((s) => s.logPractice);
  const ratio = pref?.ratio ?? base.phases.map((p) => p.units);
  const unit = pref?.unit ?? base.unit;
  const ratioKey = ratio.join(':');
  const pr = useMemo<Pr>(() => ({ ...base, phases: base.phases.map((p, i) => ({ ...p, units: ratio[i] ?? p.units })) }), [base, ratioKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const setRatio = (i: number, v: number) => setPref(prId, { ratio: ratio.map((r, j) => (j === i ? v : r)), unit });
  const setUnit = (u: number) => setPref(prId, { ratio, unit: u });
  const isDefault = !pref;
  const [target, setTarget] = useState(0);
  const [sound, setSound] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [sys, setSys] = useState<SystemState>(initialSystem);
  const ph: PhaseState | null = playing || t > 0 ? phaseAt(pr, unit, t) : null;

  // locks of the internal hold decide which prāṇa leaks (and stays lost through the exhale)
  const holdIdx = pr.phases.findIndex((p) => p.kind === 'hold-in');
  const holdLocks = useMemo(() => new Set(pr.phases[holdIdx].bandhas.filter((b) => on[b])), [pr, holdIdx, on]);
  const eng = engagedNow(pr, ph && playing ? ph : null, on);

  // animation loop
  const live = useRef({ pr, unit, on, sound, holdLocks, sys, t: 0, last: -1, sets: 0, target, log: logPractice });
  live.current = { ...live.current, pr, unit, on, sound, holdLocks, target, log: logPractice };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const L = live.current;
      const dt = Math.min(0.5, (now - prev) / 1000); // keeps real time through slow frames; a hidden tab pauses rAF
      prev = now;
      L.t += dt;
      const P = phaseAt(L.pr, L.unit, L.t);
      const key = P.sets * 10 + P.index;
      if (key !== L.last) {
        if (L.sound) playTone(TONE[P.kind], 0.5, 0.09);
        L.last = key;
      }
      L.sys = stepSystem(L.sys, P.kind, P.p, dt, engagedNow(L.pr, P, L.on), L.holdLocks);
      if (P.sets > L.sets) {
        // a set finished: log it, and stop at the target
        const n = P.sets - L.sets;
        L.log(n, n * L.pr.phases.reduce((a, ph) => a + ph.units, 0), n * P.setLength);
        L.sets = P.sets;
        if (L.target > 0 && P.sets >= L.target) {
          if (L.sound) playTone(660, 1.2, 0.1);
          L.t = P.sets * P.setLength;
          setT(L.t);
          setSys(L.sys);
          setPlaying(false);
          return;
        }
      }
      setT(L.t);
      setSys(L.sys);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const reset = () => {
    setPlaying(false);
    live.current.t = 0;
    live.current.last = -1;
    live.current.sys = initialSystem();
    live.current.sets = 0;
    setT(0);
    setSys(initialSystem());
  };
  useEffect(reset, [prId, unit, ratioKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const reachedTarget = target > 0 && (ph?.sets ?? 0) >= target && !playing;
  const countsPerSet = pr.phases.reduce((a, p) => a + p.units, 0);

  const anyOn = on.mula || on.uddiyana || on.jalandhara;
  const allOn = on.mula && on.uddiyana && on.jalandhara;

  const stage = (
    <div className={`relative mx-auto aspect-[430/404] ${desktop ? 'w-full max-w-[640px]' : 'h-full max-w-full'}`}>
      <svg viewBox="-215 -212 430 404" className="h-full w-full" role="img" aria-label={`Seated figure: ${ph ? PHASE_NAME[ph.kind].name : 'ready'}; bandhas ${[...eng].map((b) => bandhaById(b).name).join(', ') || 'off'}`}>
        <Body view="front" spine={false} />
        <Sushumna view="front" />
        <Front ph={ph} sys={sys} eng={eng} holdLocks={holdLocks} time={t} reduce={reduce} playing={playing} />
      </svg>
      <div className="glass absolute top-1 left-1 w-[27%] rounded-xl p-1" aria-hidden="true">
        <svg viewBox="-150 -212 300 404" className="w-full">
          <Body view="side" spine={false} />
          <SideLocks eng={eng} />
        </svg>
        <p className="text-center text-[0.6rem] text-faint">side · how each lock acts</p>
      </div>
    </div>
  );

  const controls = (
    <div className="flex flex-col gap-5">
      {PRANAYAMAS.length > 1 && (
        <Segmented<string> label="Prāṇāyāma" value={prId} onChange={setPrId} options={PRANAYAMAS.map((p) => ({ value: p.id, label: p.name }))} />
      )}
      <PhaseDial pr={pr} unit={unit} ph={ph} />
      <p className="min-h-[3.2em] text-sm text-muted" aria-live="polite">
        {guidance(ph, pr, on, eng)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn btn-gold !rounded-full"
          onClick={() => {
            if (reachedTarget) reset();
            setPlaying(!playing);
          }}
          aria-pressed={playing}
        >
          {playing ? <StopIcon size={14} /> : <PlayIcon size={14} />} {playing ? 'Pause' : reachedTarget ? 'Again' : t > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="btn !rounded-full" onClick={reset} disabled={t === 0}>
          <ResetIcon size={14} /> Reset
        </button>
        <span className="glass ml-auto flex gap-3 rounded-full px-3 py-1.5 text-sm" aria-live="polite">
          <span>
            Sets <strong className="tabular-nums text-gold">{ph?.sets ?? 0}</strong>
            {target > 0 && <span className="text-faint">/{target}</span>}
          </span>
          <span>
            Counts <strong className="tabular-nums text-gold">{Math.floor(t / unit)}</strong>
          </span>
        </span>
      </div>

      <Section title="Bandhas" aside={<span className="text-xs text-faint">{anyOn ? 'applied in the holds' : 'off'}</span>}>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Bandhas">
          {BANDHAS.map((b) => (
            <button
              key={b.id}
              aria-pressed={on[b.id]}
              onClick={() => setBandha(b.id, !on[b.id])}
              className="glass flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center"
              style={on[b.id] ? { borderColor: b.color, boxShadow: `0 0 0 1px ${b.color} inset, 0 0 18px -6px ${b.color}` } : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color, opacity: on[b.id] ? 1 : 0.35 }} />
              <span className="text-sm leading-tight">{b.name}</span>
              <span className="text-[0.66rem] text-faint">{on[b.id] ? 'on' : 'off'}</span>
            </button>
          ))}
        </div>
        <button className="btn !min-h-9 self-start !rounded-full text-xs" onClick={() => BANDHAS.forEach((b) => setBandha(b.id, !allOn))}>
          {allOn ? 'Switch all off' : 'All three · Mahā Bandha'}
        </button>
        <p className="text-xs text-faint">
          Mūla and Jālandhara hold in both retentions; Uḍḍīyāna only with the breath held out. Switch a bandha on to see where it locks; start the breath to see how it changes the flow.
        </p>
      </Section>

      <Section title="System">
        <Meter label="Breath in the lungs" v={sys.volume} color="#4fe3ff" />
        <Meter label="Prāṇa held (not leaking)" v={sys.retained} color="#05dda1" />
        <Meter label="Prāṇa–apāna union at the navel" v={sys.navel} color="#ffb020" />
        <Meter label="Suṣumṇā activation (builds over sets)" v={sys.sushumna} color="#f3c35b" />
      </Section>

      <Section
        title="Ratio & timing"
        aside={
          !isDefault && (
            <button className="text-xs text-accent-ink underline" onClick={() => setPref(prId, null)}>
              Reset to {base.phases.map((p) => p.units).join(' : ')}
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ratio in counts">
          {pr.phases.map((p, i) => (
            <Stepper
              key={i}
              label={PHASE_NAME[p.kind].name}
              color={PHASE_COLOR[p.kind]}
              value={p.units}
              min={p.kind === 'inhale' || p.kind === 'exhale' ? 1 : 0}
              max={32}
              onChange={(v) => setRatio(i, v)}
              sub={`${fmt(p.units * unit)}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Stepper label="Seconds per count" value={unit} min={1} max={30} onChange={setUnit} sub="1 count" wide />
          <div className="min-w-0 flex-1">
            <Slider label="Seconds per count" min={1} max={15} value={Math.min(15, unit)} onChange={setUnit} valueText={`${unit} seconds per count`} />
          </div>
        </div>
        <p className="text-sm text-muted">
          {pr.phases.map((p) => p.units).join(' : ')} × {unit}s ={' '}
          <span className="text-text">{pr.phases.map((p) => `${fmt(p.units * unit)} ${PHASE_NAME[p.kind].name.toLowerCase()}`).join(' · ')}</span> · one set {fmt(countsPerSet * unit)} ({countsPerSet} counts)
        </p>
        <div className="flex items-center gap-3">
          <Stepper label="Target sets" value={target} min={0} max={200} onChange={setTarget} sub={target ? `≈ ${fmt(target * countsPerSet * unit)}` : 'no limit'} wide />
          <p className="text-xs text-faint">Stops with a chime after this many sets (0 = keep going).</p>
        </div>
        <div className="glass rounded-xl px-3">
          <Toggle id="pr-sound" label="Soft tone at each phase change" checked={sound} onChange={setSound} />
        </div>
      </Section>

      <Practice session={{ sets: ph?.sets ?? 0, counts: Math.floor(t / unit), seconds: t }} />

      <Section title={pr.name}>
        <p className="text-xs text-faint">
          <span className="font-deva">{pr.deva}</span> · {pr.english}
        </p>
        <p className="text-sm text-muted">{pr.about}</p>
        <ul className="list-disc pl-5 text-sm text-muted">
          {pr.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <Caution text={pr.caution} />
      </Section>

      <Section title="The three locks">
        {BANDHAS.map((b) => (
          <details key={b.id} className="glass rounded-xl px-3 py-2" open={on[b.id]}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              {b.name} <span className="font-deva text-muted">{b.deva}</span> <span className="text-xs text-faint">· {b.english}</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
              <p>
                <strong className="text-text">Where · </strong>
                {b.region}
              </p>
              <p>
                <strong className="text-text">How · </strong>
                {b.action}
              </p>
              <p>
                <strong className="text-text">What it locks · </strong>
                {b.locks}
              </p>
              <p>
                <strong className="text-text">When · </strong>
                {b.phases}
              </p>
              <ul className="list-disc pl-5">
                {b.benefits.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <Caution text={b.caution} />
            </div>
          </details>
        ))}
      </Section>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Prāṇāyāma"
        subtitle="Breath retention with the bandhas"
        actions={
          <button className="btn !min-h-10 !rounded-full text-xs" onClick={() => navigate('/prana')}>
            Prāṇa vāyus
          </button>
        }
      />
      {desktop ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-6 px-6 pb-6">
          <div className="flex min-h-0 items-center justify-center">{stage}</div>
          <div className="scroll-y min-h-0 pr-1">{controls}</div>
        </div>
      ) : (
        <>
          <div className="h-[42vh] shrink-0 px-2">{stage}</div>
          <div className="scroll-y min-h-0 flex-1 px-4 pt-2 pb-28">{controls}</div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ guidance */

function guidance(ph: PhaseState | null, pr: Pr, on: Record<BandhaId, boolean>, eng: Set<BandhaId>): string {
  const names = (ids: BandhaId[]) => ids.map((b) => bandhaById(b).name).join(' and ');
  if (!ph) {
    const ids = (Object.keys(on) as BandhaId[]).filter((b) => on[b]);
    return ids.length
      ? `${names(ids)} switched on — the glowing area shows where each one locks. Press Start to breathe ${pr.phases.map((p) => p.units).join(' : ')}.`
      : `Press Start to breathe ${pr.phases.map((p) => p.units).join(' : ')} (inhale : hold in : exhale : hold out). Switch bandhas on to seal the prāṇa during the holds.`;
  }
  const e = [...eng];
  switch (ph.kind) {
    case 'inhale':
      return 'Inhale slowly and fully through the nose — prāṇa fills the chest and abdomen. (Release any lock and lift the head first.)';
    case 'hold-in':
      return e.length
        ? `Hold the breath in. ${names(e)} ${e.length > 1 ? 'seal' : 'seals'} the prāṇa: ${eng.has('jalandhara') ? 'nothing rises out through the throat' : 'the throat is open, so some prāṇa rises and escapes'}; ${eng.has('mula') ? 'apāna is turned up from the pelvic floor' : 'without Mūla some apāna sinks away'}.${on.uddiyana ? ' Uḍḍīyāna waits for the external hold.' : ''}`
        : 'Hold the breath in, without locks — watch some of the prāṇa leak away up through the throat and down through the pelvic floor.';
    case 'exhale':
      return 'Release the locks, raise the head, and exhale slowly and completely through the nose.';
    case 'hold-out':
      return e.length
        ? `Hold the breath out. ${names(e)}${eng.has('uddiyana') ? ' — the abdomen is drawn in and up, lifting the energy from the navel along Suṣumṇā' : ''}.`
        : 'Hold the breath out, relaxed. (With Uḍḍīyāna and Mūla on, the energy would be drawn up Suṣumṇā here.)';
  }
}

/* ------------------------------------------------------------------ figure overlays */

function Front({ ph, sys, eng, holdLocks, time, reduce, playing }: { ph: PhaseState | null; sys: SystemState; eng: Set<BandhaId>; holdLocks: Set<BandhaId>; time: number; reduce: boolean; playing: boolean }) {
  const v = ph ? sys.volume : 0.5;
  const lung = 0.55 + 0.45 * v;
  const sparks = ph && playing && !reduce && (ph.kind === 'hold-in' || ph.kind === 'hold-out') && sys.sushumna > 0.02 && (eng.has('mula') || eng.has('uddiyana'));
  const from = ph?.kind === 'hold-out' ? 172 : 48;
  return (
    <g>
      <defs>
        {BANDHAS.map((b) => (
          <radialGradient key={b.id} id={`bg-${b.id}`}>
            <stop offset="0" stopColor={b.color} stopOpacity="0.85" />
            <stop offset="0.55" stopColor={b.color} stopOpacity="0.35" />
            <stop offset="1" stopColor={b.color} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="bg-navel">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="1" />
          <stop offset="0.4" stopColor="#ffb020" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
        <filter id="sush-glow" x="-200%" y="-10%" width="500%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* lungs */}
      {[-1, 1].map((s) => (
        <ellipse key={s} cx={s * 27} cy={-36} rx={22 * lung} ry={36 * lung} fill="#4fe3ff" fillOpacity={0.05 + 0.1 * v} stroke="#4fe3ff" strokeOpacity={0.25} strokeWidth={0.8} />
      ))}
      {/* Suṣumṇā activation */}
      {sys.sushumna > 0.01 && (
        <g opacity={0.25 + 0.75 * sys.sushumna}>
          <line x1={0} y1={176} x2={0} y2={176 - 366 * Math.min(1, 0.15 + sys.sushumna)} stroke="#ffd36a" strokeWidth={7} filter="url(#sush-glow)" />
          <line x1={0} y1={176} x2={0} y2={176 - 366 * Math.min(1, 0.15 + sys.sushumna)} stroke="#fff6dc" strokeWidth={1.6} />
        </g>
      )}
      {/* prāṇa–apāna union at the navel */}
      {sys.navel > 0.02 && <circle cx={0} cy={48} r={10 + 26 * sys.navel} fill="url(#bg-navel)" opacity={sys.navel} />}
      {/* bandha glows and locks */}
      {BANDHAS.map((b) => (eng.has(b.id) ? <FrontLock key={b.id} id={b.id} pulse={reduce ? 1 : 0.8 + 0.2 * Math.sin(time * 4)} /> : null))}
      {/* sparks rising in Suṣumṇā */}
      {sparks &&
        Array.from({ length: 7 }, (_, k) => {
          const f = (time * (0.25 + sys.sushumna * 0.5) + k / 7) % 1;
          const y = from - f * (from + 190);
          return <circle key={k} cx={0} cy={y} r={2.6} fill="#fff3c4" opacity={(1 - f) * (0.4 + sys.sushumna)} />;
        })}
      {/* prāṇa particles */}
      {ph && !reduce &&
        SEEDS.map((q, i) => {
          const P = particle(q, ph.kind, ph.p, time, holdLocks);
          if (!P) return null;
          return <circle key={i} cx={P.x} cy={P.y} r={2.3} fill={P.leak ? '#ff2a6d' : '#7fe6ff'} opacity={P.o * 0.9} />;
        })}
      {ph && reduce && (ph.kind === 'hold-in' || ph.kind === 'inhale') && <circle cx={0} cy={-10} r={40 * v} fill="#7fe6ff" opacity={0.12} />}
    </g>
  );
}

function FrontLock({ id, pulse }: { id: BandhaId; pulse: number }) {
  const b = bandhaById(id);
  const y = LOCK_Y[id];
  const label = (x: number, yy: number) => (
    <text x={x} y={yy} fontSize={11} fill={b.color} fontWeight={600}>
      {b.name}
    </text>
  );
  if (id === 'mula')
    return (
      <g opacity={pulse}>
        <ellipse cx={0} cy={y + 2} rx={40} ry={14} fill={`url(#bg-${id})`} />
        <line x1={-26} x2={26} y1={y} y2={y} stroke={b.color} strokeWidth={3} strokeLinecap="round" />
        <path d={`M0 ${y + 12}L0 ${y - 4}M-5 ${y + 1}L0 ${y - 5}L5 ${y + 1}`} stroke={b.color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        {label(30, y + 18)}
      </g>
    );
  if (id === 'uddiyana')
    return (
      <g opacity={pulse}>
        <ellipse cx={0} cy={y + 8} rx={50} ry={40} fill={`url(#bg-${id})`} />
        {[-1, 1].map((s) => (
          <path key={s} d={`M${s * 60} ${y + 14}L${s * 40} ${y + 8}M${s * 46} ${y + 2}L${s * 40} ${y + 8}L${s * 47} ${y + 13}`} stroke={b.color} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
        <path d={`M0 ${y + 34}L0 ${y - 12}M-5 ${y - 5}L0 ${y - 12}L5 ${y - 5}`} stroke={b.color} strokeWidth={2} fill="none" strokeLinecap="round" />
        {label(56, y + 34)}
      </g>
    );
  return (
    <g opacity={pulse}>
      <ellipse cx={0} cy={y} rx={26} ry={13} fill={`url(#bg-${id})`} />
      <line x1={-16} x2={16} y1={y} y2={y} stroke={b.color} strokeWidth={3} strokeLinecap="round" />
      {label(28, y - 6)}
    </g>
  );
}

/** Side view: where each lock acts, with arrows for the movement. */
function SideLocks({ eng }: { eng: Set<BandhaId> }) {
  const arrow = (d: string, c: string) => <path d={d} stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g>
      <defs>
        {BANDHAS.map((b) => (
          <radialGradient key={b.id} id={`sg-${b.id}`}>
            <stop offset="0" stopColor={b.color} stopOpacity="0.9" />
            <stop offset="1" stopColor={b.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {eng.has('mula') && (
        <g>
          <ellipse cx={12} cy={172} rx={24} ry={11} fill="url(#sg-mula)" />
          {arrow('M12 196L12 170M5 178L12 170L19 178', bandhaById('mula').color)}
        </g>
      )}
      {eng.has('uddiyana') && (
        <g>
          <ellipse cx={-26} cy={46} rx={26} ry={34} fill="url(#sg-uddiyana)" />
          {arrow('M-70 52L-38 50M-46 43L-38 50L-46 57', bandhaById('uddiyana').color)}
          {arrow('M-24 74L-24 22M-31 30L-24 22L-17 30', bandhaById('uddiyana').color)}
        </g>
      )}
      {eng.has('jalandhara') && (
        <g>
          <ellipse cx={-12} cy={-92} rx={20} ry={12} fill="url(#sg-jalandhara)" />
          {arrow('M-52 -124L-40 -104M-49 -108L-40 -104L-39 -114', bandhaById('jalandhara').color)}
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ dial + meters */

function PhaseDial({ pr, unit, ph }: { pr: Pr; unit: number; ph: PhaseState | null }) {
  const total = pr.phases.reduce((a, p) => a + p.units, 0);
  const R = 46, C = 2 * Math.PI * R;
  let acc = 0;
  const done = ph ? (pr.phases.slice(0, ph.index).reduce((a, p) => a + p.units, 0) + ph.p * pr.phases[ph.index].units) / total : 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="-60 -60 120 120" className="h-32 w-32 shrink-0" role="img" aria-label={ph ? `${PHASE_NAME[ph.kind].name}, ${Math.ceil(ph.left)} seconds left` : 'Ready'}>
        <g transform="rotate(-90)">
          {pr.phases.map((p, i) => {
            const len = (p.units / total) * C;
            const el = (
              <circle
                key={i}
                r={R}
                fill="none"
                stroke={PHASE_COLOR[p.kind]}
                strokeOpacity={ph?.index === i ? 1 : 0.35}
                strokeWidth={ph?.index === i ? 9 : 6}
                strokeDasharray={`${Math.max(0, len - 2.5)} ${C}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
          {ph && <circle r={R} cx={0} cy={0} fill="none" stroke="var(--text)" strokeWidth={1.2} strokeDasharray={`${done * C} ${C}`} opacity={0.6} />}
        </g>
        {ph && <circle cx={Math.cos(done * 2 * Math.PI - Math.PI / 2) * R} cy={Math.sin(done * 2 * Math.PI - Math.PI / 2) * R} r={4.5} fill="var(--text)" />}
        <text y={-6} textAnchor="middle" fontSize={12} fill={ph ? PHASE_COLOR[ph.kind] : 'var(--muted)'} fontWeight={600}>
          {ph ? PHASE_NAME[ph.kind].name : 'Ready'}
        </text>
        <text y={14} textAnchor="middle" fontSize={ph ? 18 : 14} fill="var(--text)" className="tabular-nums">
          {ph ? Math.ceil(ph.left) : pr.phases.map((p) => p.units).join(':')}
        </text>
        {ph && (
          <text y={26} textAnchor="middle" fontSize={8} fill="var(--muted)" className="tabular-nums">
            count {ph.count} of {pr.phases[ph.index].units}
          </text>
        )}
        {ph && (
          <text y={36} textAnchor="middle" fontSize={6.5} fill="var(--faint)">
            {PHASE_NAME[ph.kind].sa}
          </text>
        )}
      </svg>
      <ol className="flex flex-col gap-1 text-sm">
        {pr.phases.map((p, i) => (
          <li key={i} className="flex items-center gap-2" style={{ color: ph?.index === i ? 'var(--text)' : 'var(--muted)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: PHASE_COLOR[p.kind] }} />
            <span className="w-24">{PHASE_NAME[p.kind].name}</span>
            <span className="tabular-nums text-faint">
              {p.units} · {fmt(p.units * unit)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const fmt = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m${sec % 60 ? ` ${Math.round(sec % 60)}s` : ''}` : `${Math.round(sec)}s`);

function Stepper({ label, value, min, max, onChange, sub, color, wide }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; sub?: string; color?: string; wide?: boolean }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v) || 0)));
  return (
    <div className={`glass flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 ${wide ? 'w-[132px] shrink-0' : ''}`}>
      <span className="flex items-center gap-1 text-[0.7rem] text-muted">
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn btn-icon !h-8 !min-h-8 !w-8 !min-w-8 !rounded-full !p-0" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`${label}: less`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={label}
          className="h-8 w-10 rounded-lg border border-line bg-transparent text-center text-base text-text tabular-nums"
        />
        <button className="btn btn-icon !h-8 !min-h-8 !w-8 !min-w-8 !rounded-full !p-0" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`${label}: more`}>
          +
        </button>
      </div>
      {sub && <span className="text-[0.66rem] text-faint tabular-nums">{sub}</span>}
    </div>
  );
}

/** Sets and counts done: this session, today and all time, with the last seven days. */
function Practice({ session }: { session: { sets: number; counts: number; seconds: number } }) {
  const log = useSettings((s) => s.practiceLog);
  const clear = useSettings((s) => s.clearPracticeLog);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = log[key(new Date())] ?? { sets: 0, counts: 0, seconds: 0 };
  const all = Object.values(log).reduce((a, d) => ({ sets: a.sets + d.sets, counts: a.counts + d.counts, seconds: a.seconds + d.seconds }), { sets: 0, counts: 0, seconds: 0 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), sets: log[key(d)]?.sets ?? 0 };
  });
  const peak = Math.max(1, ...days.map((d) => d.sets));
  const cell = (title: string, v: { sets: number; counts: number; seconds: number }, extra?: string) => (
    <div className="glass rounded-xl px-2.5 py-2">
      <p className="text-[0.68rem] text-faint">{title}</p>
      <p className="text-lg leading-tight tabular-nums text-text">
        {v.sets} <span className="text-xs text-muted">sets</span>
      </p>
      <p className="text-xs tabular-nums text-muted">
        {v.counts} counts · {fmt(Math.round(v.seconds))}
      </p>
      {extra && <p className="text-[0.66rem] text-faint">{extra}</p>}
    </div>
  );
  return (
    <Section
      title="Practice"
      aside={
        all.sets > 0 && (
          <button className="text-xs text-faint underline" onClick={() => confirm('Clear your practice history on this device?') && clear()}>
            Clear history
          </button>
        )
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {cell('This session', session)}
        {cell('Today', today)}
        {cell('All time', all, `${Object.keys(log).length} day${Object.keys(log).length === 1 ? '' : 's'}`)}
      </div>
      <div className="flex items-end gap-1.5" role="img" aria-label={`Sets in the last seven days: ${days.map((d) => d.sets).join(', ')}`}>
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[0.62rem] tabular-nums text-faint">{d.sets || ''}</span>
            <div className="w-full rounded-t" style={{ height: 4 + (d.sets / peak) * 36, background: i === 6 ? 'var(--gold)' : 'color-mix(in oklab, var(--gold) 45%, transparent)' }} />
            <span className="text-[0.62rem] text-faint">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-faint">A set is logged each time a full round finishes; counts are the beats of the ratio (one count = your seconds per count). Kept only on this device.</p>
    </Section>
  );
}

function Meter({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(v * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }} role="meter" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function Caution({ text }: { text: string }) {
  return (
    <p className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'color-mix(in oklab, var(--magenta) 10%, transparent)', color: 'var(--muted)' }}>
      <strong className="text-text">Caution · </strong>
      {text}
    </p>
  );
}

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { LayersIcon, PlayIcon, ResetIcon, StopIcon } from '../components/Icons';
import { TopBar } from '../components/Shell';
import { fmt, Stepper } from '../components/Stepper';
import { Segmented, Toggle } from '../components/ui';
import { playTone } from '../engine/audioContext';
import { PHASE_NAME, phaseAt, type PhaseKind, type Pranayama } from '../engine/kumbhaka';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { KPScene, kpFrame } from '../three/KPScene';
import { KP2D } from './KP2D';
import { CameraRig, Scene, type Layers, type LotusStyle, type Preset } from '../three/Scene';
import { LayerChips } from '../components/LayerMenu';
import { openChakra } from '../lib/store';

/* ------------------------------------------------------------------ lock */

// SHA-256 of the password; the password itself is not stored in the app
const KEY_HASH = '250c2d532783a40deccd5179bf110c049c627f6e71538874be8c82d3bf6b057d';
const UNLOCK = 'om-kp-unlocked';
async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

export default function KP() {
  const [open, setOpen] = useState(() => read<string>(UNLOCK, '') === KEY_HASH);
  return open ? <KPView onLock={() => (write(UNLOCK, ''), setOpen(false))} /> : <Gate onOpen={() => setOpen(true)} />;
}

function Gate({ onOpen }: { onOpen: () => void }) {
  const [pw, setPw] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = (await sha256(pw)) === KEY_HASH;
    setBusy(false);
    if (ok) {
      write(UNLOCK, KEY_HASH);
      onOpen();
    } else {
      setBad(true);
      setPw('');
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="KP" subtitle="Protected view" />
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <form onSubmit={submit} className="glass-strong flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5">
          <span className="font-deva text-center text-4xl text-gold" aria-hidden>
            ॐ
          </span>
          <label htmlFor="kp-pw" className="text-center text-sm text-muted">
            Enter the password to open KP
          </label>
          <input
            id="kp-pw"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setBad(false);
            }}
            className="h-11 rounded-xl border border-line bg-transparent px-3 text-text"
            aria-invalid={bad}
            aria-describedby={bad ? 'kp-err' : undefined}
          />
          {bad && (
            <p id="kp-err" role="alert" className="text-center text-xs" style={{ color: 'var(--magenta)' }}>
              That password is not right.
            </p>
          )}
          <button className="btn btn-gold" disabled={!pw || busy}>
            Open
          </button>
          <button type="button" className="btn !min-h-9 text-xs" onClick={() => navigate('/3d')}>
            Back to 3D
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the view */

const PREFS = 'om-kp-prefs';
const TOTAL = 'om-kp-rounds';
const KINDS: PhaseKind[] = ['inhale', 'hold-in', 'exhale', 'hold-out'];
const WHAT: Record<PhaseKind, string> = {
  inhale: 'Breathe in — the diamond rises through Suṣumṇā to Sahasrāra',
  'hold-in': 'Hold in — the thousand-petal lotus blooms and pours golden nectar',
  exhale: 'Breathe out — the diamond descends, nectar flowing down with it',
  'hold-out': 'Hold out — the diamond rests at Mūlādhāra',
};
const PHASE_COLOR: Record<PhaseKind, string> = { inhale: '#4fe3ff', 'hold-in': '#f3c35b', exhale: '#c9a7ff', 'hold-out': '#ff8a5c' };
const TONE: Record<PhaseKind, number> = { inhale: 528, 'hold-in': 396, exhale: 432, 'hold-out': 352 };
const SWATCHES = ['#ffffff', '#ffe9b0', '#ffc4d6', '#d9c7ff', '#bfe8ff'];

function KPView({ onLock }: { onLock: () => void }) {
  const desktop = useIsDesktop();
  const init = read(PREFS, { ratio: [1, 4, 2, 2], unit: 4, color: '#ffffff', rotate: false, sound: true });
  const [ratio, setRatio] = useState<number[]>(init.ratio);
  const [unit, setUnit] = useState<number>(init.unit);
  const [color, setColor] = useState<string>(init.color);
  const [rotate, setRotate] = useState<boolean>(init.rotate);
  const [sound, setSound] = useState<boolean>(init.sound);
  const [total, setTotal] = useState<number>(() => read(TOTAL, 0));
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [done, setDone] = useState<number | null>(null);
  const [panel, setPanel] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const reduce = useReducedMotion();
  const [preset, setPreset] = useState<Preset>('full');
  const [flat, setFlat] = useState<boolean>(() => read('om-kp-2d', false));
  useEffect(() => write('om-kp-2d', flat), [flat]);
  const [nonce, setNonce] = useState(0);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState<Layers>(() => read('om-kp-layers', { body: true, chakras: true, sushumna: true, ida: true, pingala: true, spine: true, om: false, prana: false }));
  const [style, setStyle] = useState<LotusStyle>(() => read<LotusStyle>('om-kp-style', 'flat'));
  useEffect(() => write('om-kp-layers', layers), [layers]);
  useEffect(() => write('om-kp-style', style), [style]);
  useEffect(() => write(PREFS, { ratio, unit, color, rotate, sound }), [ratio, unit, color, rotate, sound]);

  const pr: Pranayama = { id: 'kp', name: 'KP', deva: '', english: '', about: '', benefits: [], caution: '', unit, phases: KINDS.map((kind, i) => ({ kind, units: ratio[i], bandhas: [] })) };
  const active = running || t > 0;
  const ph = active ? phaseAt(pr, unit, t) : null;

  const live = useRef({ pr, unit, sound, t: 0, last: -1, rounds: 0 });
  live.current = { ...live.current, pr, unit, sound };
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const L = live.current;
      L.t += Math.min(0.5, (now - prev) / 1000);
      prev = now;
      const P = phaseAt(L.pr, L.unit, L.t);
      kpFrame.kind = P.kind;
      kpFrame.p = P.p;
      const key = P.sets * 10 + P.index;
      if (key !== L.last) {
        if (L.sound) playTone(TONE[P.kind], 0.6, 0.08);
        L.last = key;
      }
      if (P.sets > L.rounds) {
        const n = P.sets - L.rounds;
        L.rounds = P.sets;
        setTotal((x) => {
          write(TOTAL, x + n);
          return x + n;
        });
      }
      setT(L.t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const restart = () => {
    live.current.t = 0;
    live.current.last = -1;
    live.current.rounds = 0;
    kpFrame.kind = 'idle';
    kpFrame.p = 0;
    setT(0);
  };
  // changing the ratio or the count restarts the timeline
  useEffect(() => {
    setRunning(false);
    restart();
  }, [ratio.join(':'), unit]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      kpFrame.kind = 'idle';
      kpFrame.p = 0;
    },
    [],
  );

  const finish = () => {
    setDone(ph?.sets ?? 0);
    setRunning(false);
    restart();
  };
  const countsPerRound = ratio.reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="KP"
        subtitle="Suṣumṇā · the diamond and the thousand-petal lotus"
        actions={
          <>
            <button className="btn !min-h-10 !rounded-full text-xs" onClick={() => navigate('/3d')}>
              3D
            </button>
            <button className="btn !min-h-10 !rounded-full text-xs" onClick={onLock} title="Lock KP on this device">
              Lock
            </button>
          </>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0" role="img" aria-label="Suṣumṇā as a lotus stem from Mūlādhāra to the thousand-petal lotus at Sahasrāra, with a diamond moving with the breath.">
          {flat ? (
            <div className={`flex h-full w-full items-center justify-center ${desktop ? 'pt-2 pr-[380px] pb-16 pl-[250px]' : 'px-2 pt-10 pb-[150px]'}`}>
              <KP2D time={t} layers={layers} style={style} color={color} onSelect={openChakra} />
            </div>
          ) : (
            <Canvas dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ fov: 38, near: 0.05, far: 200, position: [4, 2, 5] }} style={{ touchAction: 'none' }}>
              <Suspense fallback={null}>
                <Scene layers={layers} dark onSelect={openChakra} lotus={style} kp />
                <KPScene lotusColor={color} stem={layers.sushumna} />
                <CameraRig preset={preset} nonce={nonce} reduce={reduce} autoRotate={rotate} />
              </Suspense>
            </Canvas>
          )}
        </div>

        {/* phase readout over the scene */}
        {desktop ? (
          <div className="pointer-events-none absolute top-3 left-4 flex flex-col items-start gap-1">
            <div className="glass rounded-full px-4 py-1.5 text-sm" aria-live="polite">
              Round <strong className="text-gold tabular-nums">{(ph?.sets ?? 0) + (active ? 1 : 0)}</strong>
              <span className="text-faint"> · completed {ph?.sets ?? 0}</span>
            </div>
            {ph && (
              <div className="glass rounded-2xl px-4 py-2">
                <p className="text-sm font-semibold" style={{ color: PHASE_COLOR[ph.kind] }}>
                  {PHASE_NAME[ph.kind].name} <span className="text-faint font-normal">· {PHASE_NAME[ph.kind].sa}</span>
                </p>
                <p className="text-2xl tabular-nums text-text">{Math.ceil(ph.left)}</p>
                <p className="text-xs text-muted tabular-nums">
                  count {ph.count} of {ratio[ph.index]}
                </p>
              </div>
            )}
            {ph && <p className="glass max-w-md rounded-xl px-3 py-1 text-xs text-muted">{WHAT[ph.kind]}</p>}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
            <div className="glass flex items-center gap-2 rounded-full px-3 py-1 text-xs tabular-nums" aria-live="polite">
              <span>
                Round <strong className="text-gold">{(ph?.sets ?? 0) + (active ? 1 : 0)}</strong>
              </span>
              {ph && (
                <>
                  <span className="text-faint">·</span>
                  <span className="font-semibold" style={{ color: PHASE_COLOR[ph.kind] }}>
                    {PHASE_NAME[ph.kind].name}
                  </span>
                  <span className="text-base text-text">{Math.ceil(ph.left)}</span>
                  <span className="text-faint">
                    {ph.count}/{ratio[ph.index]}
                  </span>
                </>
              )}
              <span className="text-faint">· done {ph?.sets ?? 0}</span>
            </div>
          </div>
        )}

        {done !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-label="Session complete">
            <div className="glass-strong flex max-w-xs flex-col items-center gap-2 rounded-2xl p-5 text-center">
              <span className="font-deva text-4xl text-gold">ॐ</span>
              <p className="text-lg text-text">
                {done} round{done === 1 ? '' : 's'} completed
              </p>
              <p className="text-xs text-muted">All rounds on this device: {total}</p>
              <button className="btn btn-gold mt-1" onClick={() => setDone(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* camera + layers */}
        <div className={`pointer-events-none absolute z-20 flex flex-col items-center gap-2 ${desktop ? 'inset-x-0 bottom-3 px-3' : 'inset-x-2 bottom-[136px]'}`}>
          {showLayers && (
            <div className="glass pointer-events-auto flex max-w-[560px] flex-col gap-2 rounded-2xl p-2" role="group" aria-label="Layers">
              <LayerChips value={layers} onChange={setLayers} extra={[{ key: 'body', label: 'Body' }, { key: 'om', label: 'Om glyphs' }, { key: 'prana', label: 'Prāṇa flows' }]} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Chakra style</span>
                <div className="flex-1">
                  <Segmented<LotusStyle> label="Chakra style" size="sm" value={style} onChange={setStyle} options={[{ value: 'flat', label: 'Flat' }, { value: 'bloom', label: 'Bloom' }, { value: 'simple', label: 'Simple' }]} />
                </div>
              </div>
            </div>
          )}
          <div className="pointer-events-auto flex w-full max-w-[560px] items-center gap-2">
            <div className="min-w-0 flex-1">
              <Segmented<Preset | '2d'>
                label="Camera view"
                value={flat ? '2d' : preset}
                onChange={(v) => {
                  if (v === '2d') return setFlat(true);
                  setFlat(false);
                  setPreset(v);
                  setNonce((n) => n + 1);
                }}
                options={[
                  { value: 'front', label: 'Front' },
                  { value: '2d', label: <span title="Front view as the 2D figure">2D</span> },
                  { value: 'back', label: 'Back' },
                  { value: 'side', label: 'Side' },
                  { value: 'full', label: <span className="whitespace-nowrap">Full 3D</span> },
                ]}
              />
            </div>
            <button className="btn btn-icon glass !rounded-2xl" onClick={() => setNonce((n) => n + 1)} disabled={flat} aria-label="Reset camera" title="Reset camera">
              <ResetIcon size={18} />
            </button>
            <button className="btn btn-icon glass !rounded-2xl" aria-pressed={showLayers} onClick={() => setShowLayers(!showLayers)} aria-label="Layers" title="Layers and chakra style">
              <LayersIcon size={18} />
            </button>
          </div>
        </div>

        {/* controls */}
        <div className={`absolute z-20 ${desktop ? 'top-3 right-3 w-[360px]' : 'inset-x-2 bottom-[74px]'}`}>
          <div className="glass-strong flex flex-col gap-3 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <button className="btn btn-gold !rounded-full" onClick={() => setRunning(!running)} aria-pressed={running}>
                {running ? <StopIcon size={14} /> : <PlayIcon size={14} />} {running ? 'Pause' : t > 0 ? 'Resume' : 'Start'}
              </button>
              <button className="btn !rounded-full" onClick={finish} disabled={!active}>
                Done
              </button>
              <span className="ml-auto text-xs text-faint tabular-nums">total {total}</span>
              <button className="btn btn-icon !h-9 !min-h-9 !w-9 !min-w-9 !rounded-full !p-0 text-xs" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-label="Settings">
                {panel ? '▾' : '▴'}
              </button>
            </div>
            {panel && (
              <>
                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Ratio">
                  {KINDS.map((k, i) => (
                    <MiniStep key={k} label={PHASE_NAME[k].name} color={PHASE_COLOR[k]} value={ratio[i]} min={k === 'inhale' || k === 'exhale' ? 1 : 0} onChange={(v) => setRatio(ratio.map((r, j) => (j === i ? v : r)))} sub={fmt(ratio[i] * unit)} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Stepper label="Seconds per count" value={unit} min={1} max={30} onChange={setUnit} sub={`round ${fmt(countsPerRound * unit)}`} wide />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[0.7rem] text-muted">Lotus colour</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SWATCHES.map((c) => (
                        <button key={c} onClick={() => setColor(c)} aria-label={`Lotus colour ${c}`} aria-pressed={color === c} className="h-7 w-7 rounded-full border" style={{ background: c, borderColor: color === c ? 'var(--gold)' : 'var(--border)', boxShadow: color === c ? '0 0 0 2px var(--gold)' : undefined }} />
                      ))}
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Pick any lotus colour" className="h-7 w-9 cursor-pointer rounded-md border border-line bg-transparent" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4">
                  <Toggle id="kp-sound" label="Tone at each phase" checked={sound} onChange={setSound} />
                  <Toggle id="kp-rotate" label="Slowly turn" checked={rotate} onChange={setRotate} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStep({ label, color, value, min, onChange, sub }: { label: string; color: string; value: number; min: number; onChange: (v: number) => void; sub: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(32, v)));
  return (
    <div className="glass flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5">
      <span className="flex items-center gap-1 text-[0.64rem] text-muted">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <button className="h-7 w-6 rounded-md text-muted" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`${label}: less`}>
          −
        </button>
        <span className="w-6 text-center text-base tabular-nums text-text" aria-label={`${label} ${value} counts`}>
          {value}
        </span>
        <button className="h-7 w-6 rounded-md text-muted" onClick={() => set(value + 1)} disabled={value >= 32} aria-label={`${label}: more`}>
          +
        </button>
      </div>
      <span className="text-[0.62rem] text-faint tabular-nums">{sub}</span>
    </div>
  );
}

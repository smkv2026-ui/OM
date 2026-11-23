import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LayersIcon, ResetIcon } from '../components/Icons';
import { TopBar } from '../components/Shell';
import { Chip, Segmented } from '../components/ui';
import guruData from '../data/guru.json';
import type { ChakraId } from '../data';
import { LotusPadukas, LOTUS_ASPECT } from '../guru/art';
import { GuruArt3D } from '../guru/Scene3D';
import { Scene2D, STAGE, type GuruLayers } from '../guru/Scene2D';
import { useZoom } from '../guru/zoom';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { openChakra, useSettings } from '../lib/store';
import { CameraRig, Scene, type Preset } from '../three/Scene';

interface Sub {
  id: string;
  name: string;
  title: string;
  caption: string;
  center: ChakraId;
  art: { lotus: string; padukas: string };
}
interface Tab {
  id: string;
  name: string;
  about: string;
  subtabs: Sub[];
}
const TABS = guruData.tabs as Tab[];

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? { ...d, ...JSON.parse(v) } : d;
  } catch {
    return d;
  }
};
const LAYER_LABELS: { key: keyof GuruLayers; label: string }[] = [
  { key: 'body', label: 'Body' },
  { key: 'sushumna', label: 'Sushumna' },
  { key: 'lotus', label: 'Lotus' },
  { key: 'padukas', label: 'Padukas' },
  { key: 'nectar', label: 'Golden nectar' },
  { key: 'chakras', label: 'Chakras' },
  { key: 'nadis', label: 'Ida & Pingala' },
];

export default function Guru({ route }: { route: string }) {
  const [, , tabId, subId] = route.split('/');
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  const sub = tab.subtabs.find((s) => s.id === subId) ?? tab.subtabs[0];
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const dark = useSettings((s) => s.theme) === 'dark';
  const [layers, setLayers] = useState<GuruLayers>(() => read('om-guru-layers', { body: true, sushumna: true, lotus: true, padukas: true, nectar: true, chakras: false, nadis: false }));
  const [mode, setMode] = useState<'2d' | '3d'>(() => (read('om-guru-mode', { m: '2d' }).m === '3d' ? '3d' : '2d'));
  const [preset, setPreset] = useState<Preset>('front');
  const [nonce, setNonce] = useState(0);
  const [showLayers, setShowLayers] = useState(false);
  const [viewer, setViewer] = useState(false);
  useEffect(() => localStorage.setItem('om-guru-layers', JSON.stringify(layers)), [layers]);
  useEffect(() => localStorage.setItem('om-guru-mode', JSON.stringify({ m: mode })), [mode]);

  // animation clock for the 2D nectar
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (mode !== '2d' || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      setTime((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, reduce]);

  const zoom = useZoom(STAGE);
  const toggle = (k: keyof GuruLayers) => {
    const next = { ...layers, [k]: !layers[k] };
    // keep at least one of the lotus / Padukas visible
    if (!next.lotus && !next.padukas) next[k === 'lotus' ? 'padukas' : 'lotus'] = true;
    setLayers(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Guru" subtitle={tab.name} />
      {/* tabs and sub-tabs */}
      <div className="flex shrink-0 flex-col gap-2 px-4 pb-2 lg:px-6">
        {TABS.length > 1 && (
          <Segmented<string> label="Section" value={tab.id} onChange={(id) => navigate(`/guru/${id}`)} options={TABS.map((t) => ({ value: t.id, label: t.name }))} />
        )}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={tab.name}>
          {TABS.length === 1 && <span className="eyebrow mr-1">{tab.name}</span>}
          {tab.subtabs.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === sub.id}
              onClick={() => navigate(`/guru/${tab.id}/${s.id}`)}
              className="btn !min-h-9 !rounded-full text-sm"
              style={s.id === sub.id ? { borderColor: 'var(--gold)', color: 'var(--gold-ink)', boxShadow: '0 0 0 1px var(--gold) inset' } : undefined}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0" role="img" aria-label={`${sub.title}: ${sub.caption}`}>
          {mode === '2d' ? (
            <svg viewBox={zoom.viewBox} className="h-full w-full select-none" {...zoom.bind}>
              <Scene2D layers={layers} center={sub.center} art={sub.art} time={time} onSelect={openChakra} />
            </svg>
          ) : (
            <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ fov: 38, near: 0.05, far: 200, position: [0, 0, 8] }} style={{ touchAction: 'none' }}>
              <Suspense fallback={null}>
                <Scene
                  layers={{ body: layers.body, chakras: layers.chakras, sushumna: layers.sushumna, ida: layers.nadis, pingala: layers.nadis, spine: false, om: false, prana: false }}
                  dark={dark}
                  onSelect={openChakra}
                  hide={layers.lotus || layers.padukas ? [sub.center] : []}
                />
                <GuruArt3D center={sub.center} art={sub.art} lotus={layers.lotus} padukas={layers.padukas} nectar={layers.nectar} dark={dark} />
                <CameraRig preset={preset} nonce={nonce} reduce={reduce} />
              </Suspense>
            </Canvas>
          )}
        </div>

        <p className="glass pointer-events-none absolute top-2 left-1/2 max-w-[92%] -translate-x-1/2 rounded-xl px-3 py-1.5 text-center text-xs text-muted">
          <span className="font-display text-sm text-text">{sub.title}</span>
          <span className="hidden sm:inline"> · {sub.caption}</span>
        </p>

        {/* controls */}
        <div className={`pointer-events-none absolute z-20 flex flex-col items-center gap-2 ${desktop ? 'inset-x-0 bottom-3 px-3' : 'inset-x-2 bottom-[70px]'}`}>
          {showLayers && (
            <div className="glass pointer-events-auto flex max-w-[560px] flex-wrap justify-center gap-1.5 rounded-2xl p-2" role="group" aria-label="Layers">
              {LAYER_LABELS.map(({ key, label }) => (
                <Chip key={key} active={layers[key]} onClick={() => toggle(key)} color={key === 'nectar' || key === 'lotus' || key === 'padukas' ? '#e0a526' : undefined}>
                  {label}
                </Chip>
              ))}
            </div>
          )}
          <div className="pointer-events-auto flex w-full max-w-[600px] flex-wrap items-center justify-center gap-2">
            <div className="w-[110px]">
              <Segmented<'2d' | '3d'> label="2D or 3D" value={mode} onChange={setMode} options={[{ value: '2d', label: '2D' }, { value: '3d', label: '3D' }]} />
            </div>
            {mode === '3d' ? (
              <div className="min-w-[230px] flex-1">
                <Segmented<Preset>
                  label="Camera view"
                  value={preset}
                  onChange={(p) => {
                    setPreset(p);
                    setNonce((n) => n + 1);
                  }}
                  options={[
                    { value: 'front', label: 'Front' },
                    { value: 'side', label: 'Side' },
                    { value: 'back', label: 'Back' },
                    { value: 'full', label: <span className="whitespace-nowrap">Full 3D</span> },
                  ]}
                />
              </div>
            ) : (
              <div className="glass flex items-center gap-1 rounded-2xl p-1">
                <button className="btn btn-icon !h-9 !min-h-9 !w-9 !min-w-9 !rounded-xl !p-0" onClick={zoom.zoomOut} disabled={zoom.k <= 1} aria-label="Zoom out">
                  −
                </button>
                <span className="w-11 text-center text-xs tabular-nums text-muted">{Math.round(zoom.k * 100)}%</span>
                <button className="btn btn-icon !h-9 !min-h-9 !w-9 !min-w-9 !rounded-xl !p-0" onClick={zoom.zoomIn} disabled={zoom.k >= 8} aria-label="Zoom in">
                  +
                </button>
              </div>
            )}
            <button className="btn btn-icon glass !rounded-2xl" onClick={() => (mode === '3d' ? setNonce((n) => n + 1) : zoom.reset())} aria-label="Reset view" title="Reset view">
              <ResetIcon size={18} />
            </button>
            <button className="btn glass !min-h-11 !rounded-2xl !px-3 text-xs" onClick={() => setViewer(true)} title="See the lotus and Padukas up close">
              🔍 <span>Zoom &amp; see</span>
            </button>
            <button className="btn btn-icon glass !rounded-2xl" aria-pressed={showLayers} onClick={() => setShowLayers(!showLayers)} aria-label="Layers" title="Layers">
              <LayersIcon size={18} />
            </button>
          </div>
        </div>
      </div>
      {viewer && createPortal(<Viewer sub={sub} lotus={layers.lotus} padukas={layers.padukas} onClose={() => setViewer(false)} onToggle={toggle} />, document.body)}
    </div>
  );
}

/** Full-screen view of the lotus with the Padukas: wheel / pinch to zoom, drag to pan. */
function Viewer({ sub, lotus, padukas, onClose, onToggle }: { sub: Sub; lotus: boolean; padukas: boolean; onClose: () => void; onToggle: (k: 'lotus' | 'padukas') => void }) {
  const W = 1000;
  const H = W * LOTUS_ASPECT;
  const zoom = useZoom({ x: -W * 0.55, y: -H * 0.55, w: W * 1.1, h: H * 1.1 }, 10);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'color-mix(in oklab, var(--bg) 92%, black)' }} role="dialog" aria-modal="true" aria-label={sub.title}>
      <div className="pt-safe flex shrink-0 items-center gap-2 px-4 py-2">
        <p className="font-display min-w-0 flex-1 truncate text-lg">{sub.title}</p>
        <button ref={closeRef} className="btn btn-icon !rounded-full" onClick={onClose} aria-label="Close">
          <CloseIcon size={18} />
        </button>
      </div>
      <svg viewBox={zoom.viewBox} className="min-h-0 w-full flex-1 select-none" {...zoom.bind}>
        <LotusPadukas w={W} lotus={lotus} padukas={padukas} art={sub.art} />
      </svg>
      <div className="pb-safe flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 py-3">
        <Chip active={lotus} onClick={() => onToggle('lotus')} color="#e0a526">
          Lotus
        </Chip>
        <Chip active={padukas} onClick={() => onToggle('padukas')} color="#e0a526">
          Padukas
        </Chip>
        <div className="glass flex items-center gap-1 rounded-2xl p-1">
          <button className="btn btn-icon !h-9 !min-h-9 !w-9 !min-w-9 !rounded-xl !p-0" onClick={zoom.zoomOut} disabled={zoom.k <= 1} aria-label="Zoom out">
            −
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-muted">{Math.round(zoom.k * 100)}%</span>
          <button className="btn btn-icon !h-9 !min-h-9 !w-9 !min-w-9 !rounded-xl !p-0" onClick={zoom.zoomIn} disabled={zoom.k >= 10} aria-label="Zoom in">
            +
          </button>
        </div>
        <button className="btn btn-icon glass !rounded-2xl" onClick={zoom.reset} aria-label="Fit" title="Fit">
          <ResetIcon size={18} />
        </button>
        <p className="w-full text-center text-[0.7rem] text-faint">Pinch or scroll to zoom · drag to move · double-tap to zoom in</p>
      </div>
    </div>
  );
}

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { LayersIcon, MicIcon, PlayIcon, ResetIcon, StopIcon } from '../components/Icons';
import { CHANT, playDharana, startListening, stopDharana, stopListening, useDharana3D, voiceSupported, type DharanaMode } from '../three/dharana3d';
import { CHAKRAS } from '../data';
import { TopBar } from '../components/Shell';
import { Segmented, Toggle } from '../components/ui';
import { LayerChips } from '../components/LayerMenu';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { openChakra, useSettings } from '../lib/store';
import { navigate } from '../lib/router';
import { CameraRig, Scene, type Layers, type LotusStyle, type Preset } from '../three/Scene';

const EXTRA_LAYERS: { key: keyof Layers; label: string }[] = [
  { key: 'body', label: 'Body' },
  { key: 'om', label: 'Om glyphs' },
  { key: 'prana', label: 'Prāṇa flows' },
];

export default function ThreeD() {
  const theme = useSettings((s) => s.theme);
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const [preset, setPreset] = useState<Preset>('full');
  const [nonce, setNonce] = useState(0);
  const [layers, setLayers] = useState<Layers>({ body: true, chakras: true, sushumna: true, ida: true, pingala: true, spine: true, om: false, prana: false });
  const [fontsReady, setFontsReady] = useState(false);
  const [showLayers, setShowLayers] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const [showDharana, setShowDharana] = useState(false);
  const [lotus, setLotusState] = useState<LotusStyle>(() => {
    try {
      const v = localStorage.getItem('om-lotus');
      return v === 'bloom' || v === 'simple' ? v : 'flat';
    } catch {
      return 'flat';
    }
  });
  const setLotus = (v: LotusStyle) => {
    setLotusState(v);
    try {
      localStorage.setItem('om-lotus', v);
    } catch {
      /* storage unavailable */
    }
  };
  const dh = useDharana3D();
  useEffect(
    () => () => {
      stopDharana();
      stopListening();
    },
    [],
  );

  useEffect(() => {
    // Om sprites are drawn to canvas textures — make sure the Devanagari font is ready first.
    document.fonts
      .load('600 72px "Noto Serif Devanagari"', 'ॐ')
      .catch(() => null)
      .finally(() => setFontsReady(true));
  }, []);

  const dark = theme === 'dark';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="3D Subtle Body" subtitle="Drag to orbit · pinch or scroll to zoom · two fingers / right-drag to pan" />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0" role="img" aria-label="Interactive 3D model of the seated figure with spine, Sushumna, Ida, Pingala and the seven chakras. Tap a chakra for details.">
          {fontsReady && (
            <Canvas
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
              camera={{ fov: 38, near: 0.05, far: 200, position: [4, 2, 5] }}
              frameloop={reduce && !dh.active ? 'demand' : 'always'}
              style={{ touchAction: 'none' }}
            >
              <Suspense fallback={null}>
                <Scene layers={layers} dark={dark} onSelect={openChakra} lotus={lotus} />
                <CameraRig preset={preset} nonce={nonce} reduce={reduce} />
              </Suspense>
            </Canvas>
          )}
        </div>

          {showDharana && (
            <div
              className={`glass-strong absolute z-20 flex flex-col gap-3 rounded-2xl p-3 ${desktop ? 'top-8 right-4 w-[400px]' : 'inset-x-3 bottom-[76px]'}`}
              role="group"
              aria-label="Chakra Dharana"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-gold !min-h-10 !rounded-full text-sm" aria-pressed={dh.playing} onClick={() => (dh.playing ? stopDharana(false) : void playDharana())}>
                  {dh.playing ? <StopIcon size={14} /> : <PlayIcon size={14} />} {dh.playing ? 'Stop' : 'Play Chakra Dharana'}
                </button>
                <div className="min-w-[220px] flex-1">
                  <Segmented<DharanaMode>
                    label="Direction"
                    size="sm"
                    value={dh.mode}
                    onChange={(mode) => dh.set({ mode })}
                    options={[
                      { value: 'up', label: 'Up', title: 'Muladhara → Sahasrara' },
                      { value: 'updown', label: 'Up–down', title: 'Up (clockwise), then down (anticlockwise)' },
                      { value: 'downup', label: 'Down–up', title: 'Down (anticlockwise), then up (clockwise)' },
                    ]}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Lotus</span>
                <div className="flex-1">
                  <Segmented<LotusStyle>
                    label="Lotus style"
                    size="sm"
                    value={lotus}
                    onChange={setLotus}
                    options={[
                      { value: 'flat', label: 'Flat (rotating ring)', title: 'Petal ring facing you; turns clockwise up, anticlockwise down' },
                      { value: 'bloom', label: 'Bloom (opens upward)', title: 'Closed bud that opens upward into a lotus cup when switched on' },
                      { value: 'simple', label: 'Simple', title: 'Plain chakra symbols (Chakra Dharana figure)' },
                    ]}
                  />
                </div>
              </div>
              {(desktop || !dh.playing) && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  Rounds
                  <input type="number" min={1} value={dh.rounds} onChange={(e) => dh.set({ rounds: Math.max(1, parseInt(e.target.value) || 1) })} className="h-9 w-14 rounded-lg border border-line bg-transparent px-2 text-center text-sm text-text" />
                </label>
                <div className="min-w-[150px] flex-1 rounded-xl px-2">
                  <Toggle id="dh-sound" label="Chant bija" checked={dh.sound} onChange={(sound) => dh.set({ sound })} />
                </div>
                <button
                  className="btn !min-h-10 !rounded-full text-xs"
                  aria-pressed={dh.listening}
                  disabled={!voiceSupported()}
                  onClick={() => (dh.listening ? stopListening() : startListening())}
                  title="Say Lam, Vam, Ram, Yam, Ham, Om or Hreem to switch that chakra on"
                  style={dh.listening ? { borderColor: 'var(--magenta)', color: 'var(--magenta)' } : undefined}
                >
                  <MicIcon size={16} /> {dh.listening ? 'Listening' : 'Voice'}
                </button>
                <button className="btn !min-h-10 !rounded-full text-xs" onClick={() => stopDharana()} disabled={!dh.active}>
                  <ResetIcon size={14} /> Reset
                </button>
              </div>
              )}
              <p className="text-xs text-muted" aria-live="polite">
                {dh.status || (dh.mode === 'downup' ? 'All chakras start off. The diamond descends from Sahasrara (anticlockwise), then rises (clockwise).' : 'All chakras start off. The diamond rises from Muladhara: each chakra switches on and turns clockwise going up, anticlockwise coming down.')}
              </p>
              {(dh.listening || dh.heard) && <p className="text-xs text-faint">{dh.heard}</p>}
              {(desktop || !dh.playing) && <p className="text-[0.68rem] text-faint">
                {CHAKRAS.map((c) => `${CHANT[c.id].iast}${CHANT[c.id].times > 1 ? ` ×${CHANT[c.id].times}` : ''}`).join(' · ')}
              </p>}
            </div>
          )}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-3">
          {showLayers && (desktop || !showDharana) && (
            <div className="glass pointer-events-auto flex max-w-full flex-wrap justify-center gap-1.5 rounded-2xl p-2" role="group" aria-label="Layers">
              <LayerChips value={layers} onChange={setLayers} extra={EXTRA_LAYERS} />
              <div className="mt-2 flex w-full items-center gap-2">
                <span className="text-xs text-muted">Chakra style</span>
                <div className="flex-1">
                  <Segmented<LotusStyle>
                    label="Chakra style"
                    size="sm"
                    value={lotus}
                    onChange={setLotus}
                    options={[
                      { value: 'flat', label: 'Flat' },
                      { value: 'bloom', label: 'Bloom' },
                      { value: 'simple', label: 'Simple' },
                    ]}
                  />
                </div>
                <button className="btn !min-h-9 !rounded-full !px-3 text-xs" onClick={() => navigate('/kp')} title="KP (password protected)">
                  KP 🔒
                </button>
              </div>
            </div>
          )}
          <div className="pointer-events-auto flex w-full max-w-[560px] items-center gap-2">
            <div className="min-w-0 flex-1">
              <Segmented<Preset>
                label="Camera view"
                value={preset}
                onChange={(p) => {
                  setPreset(p);
                  setNonce((n) => n + 1);
                }}
                options={[
                  { value: 'front', label: 'Front' },
                  { value: 'back', label: 'Back' },
                  { value: 'side', label: 'Side' },
                  { value: 'full', label: <span className="whitespace-nowrap">Full 3D</span> },
                ]}
              />
            </div>
            <button className="btn btn-icon glass !rounded-2xl" onClick={() => setNonce((n) => n + 1)} aria-label="Reset camera" title="Reset camera">
              <ResetIcon size={18} />
            </button>
            <button className="btn glass !min-h-11 !rounded-2xl !px-3 text-xs" aria-pressed={showDharana} onClick={() => setShowDharana(!showDharana)} title="Chakra Dharana">
              ◆ <span className="hidden sm:inline">Dharana</span>
            </button>
            <button className="btn btn-icon glass !rounded-2xl" aria-pressed={showLayers} onClick={() => setShowLayers(!showLayers)} aria-label="Layers" title="Layers">
              <LayersIcon size={18} />
            </button>
          </div>
        </div>
        <p className="pointer-events-none absolute top-1 left-1/2 w-max max-w-[92%] -translate-x-1/2 text-center text-[0.7rem] text-faint">
          Stylised model built from primitives to match the reference proportions · tap a chakra
        </p>
      </div>
    </div>
  );
}

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { LayersIcon, ResetIcon } from '../components/Icons';
import { TopBar } from '../components/Shell';
import { Chip, Segmented } from '../components/ui';
import { useReducedMotion } from '../lib/hooks';
import { openChakra, useSettings } from '../lib/store';
import { CameraRig, Scene, type Layers, type Preset } from '../three/Scene';

const LAYER_LABEL: Record<keyof Layers, string> = {
  body: 'Body',
  chakras: 'Chakras',
  nadis: 'Nadis',
  spine: 'Spine',
  om: 'Om glyphs',
  prana: 'Prāṇa flows',
};

export default function ThreeD() {
  const theme = useSettings((s) => s.theme);
  const reduce = useReducedMotion();
  const [preset, setPreset] = useState<Preset>('full');
  const [nonce, setNonce] = useState(0);
  const [layers, setLayers] = useState<Layers>({ body: true, chakras: true, nadis: true, spine: true, om: false, prana: false });
  const [fontsReady, setFontsReady] = useState(false);
  const [showLayers, setShowLayers] = useState(() => matchMedia('(min-width: 1024px)').matches);

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
              frameloop={reduce ? 'demand' : 'always'}
              style={{ touchAction: 'none' }}
            >
              <Suspense fallback={null}>
                <Scene layers={layers} dark={dark} onSelect={openChakra} />
                <CameraRig preset={preset} nonce={nonce} reduce={reduce} />
              </Suspense>
            </Canvas>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-3">
          {showLayers && (
            <div className="glass pointer-events-auto flex max-w-full flex-wrap justify-center gap-1.5 rounded-2xl p-2" role="group" aria-label="Layers">
              {(Object.keys(LAYER_LABEL) as (keyof Layers)[]).map((k) => (
                <Chip key={k} active={layers[k]} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>
                  {LAYER_LABEL[k]}
                </Chip>
              ))}
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

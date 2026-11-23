/**
 * Guru view in 2D: the front figure (chosen pose) with Suṣumṇā, and the lotus with the Padukas at
 * the heart centre, golden nectar oozing out from behind it.
 */
import { CHAKRAS, type ChakraId } from '../data';
import { Body, ChakraGlyphs, IdaPingala, Sushumna } from '../figures/Body';
import { LotusPadukas, LOTUS_ASPECT } from './art';

export interface GuruLayers {
  body: boolean;
  sushumna: boolean;
  lotus: boolean;
  padukas: boolean;
  nectar: boolean;
  chakras: boolean;
  nadis: boolean;
}
export const ART_W = 118; // figure units (the shoulders span about 128)

const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Scene2D({ layers, center, art, time, onSelect }: { layers: GuruLayers; center: ChakraId; art: { lotus: string; padukas: string }; time: number; onSelect: (id: ChakraId) => void }) {
  const cy = CHAKRAS.find((c) => c.id === center)!.position.frontY;
  const others = CHAKRAS.filter((c) => c.id !== center).map((c) => c.id);
  const pulse = 0.85 + 0.15 * Math.sin(time * 1.6);
  const showArt = layers.lotus || layers.padukas;
  return (
    <g>
      <defs>
        <radialGradient id="guru-halo">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffc94a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {layers.body && <Body view="front" spine={false} />}
      {layers.nadis && <IdaPingala />}
      {layers.sushumna && <Sushumna view="front" />}
      {layers.chakras && <ChakraGlyphs view="front" only={showArt ? others : undefined} onSelect={onSelect} />}
      {layers.nectar && (
        <g>
          {/* golden glow behind the lotus */}
          <circle cx={0} cy={cy} r={ART_W * 0.62} fill="url(#guru-halo)" opacity={0.55 * pulse} />
          {/* nectar oozing out from behind, spreading and falling */}
          {Array.from({ length: 140 }, (_, i) => {
            const f = (time * 0.22 + i / 140) % 1;
            const a = hash(i, 1) * Math.PI * 2;
            const r = ART_W * (0.22 + 0.75 * f) * (0.75 + 0.35 * hash(i, 2));
            const x = Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * 0.8 + 70 * f * f;
            return <circle key={i} cx={x} cy={y} r={1.2 + 1.8 * hash(i, 3)} fill="#ffc94a" opacity={(1 - f) * (0.55 + 0.4 * hash(i, 4))} />;
          })}
        </g>
      )}
      {showArt && (
        <g transform={`translate(0 ${cy})`} style={{ filter: layers.nectar ? 'drop-shadow(0 0 6px rgba(255, 196, 80, 0.55))' : undefined }}>
          <LotusPadukas w={ART_W} lotus={layers.lotus} padukas={layers.padukas} art={art} />
        </g>
      )}
    </g>
  );
}

export const STAGE = { x: -215, y: -212, w: 430, h: 404 };
export const ART_BOX = (cy: number) => ({ x: -ART_W * 0.75, y: cy - ART_W * LOTUS_ASPECT * 0.75, w: ART_W * 1.5, h: ART_W * LOTUS_ASPECT * 1.5 });

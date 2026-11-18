import { useEffect, useRef, useState } from 'react';
import { PlayIcon, StopIcon } from '../components/Icons';
import { SensorAudioList } from '../components/SensorAudio';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/ui';
import { CHAKRAS, MATRIKA_TOTAL, type ChakraId } from '../data';
import { playTone } from '../engine/audioContext';
import { audioKey, useAudioClips } from '../engine/audioStore';
import { devanagariVoice, Sequencer } from '../engine/sequencer';
import { useIsDesktop } from '../lib/hooks';
import { openChakra } from '../lib/store';
import { Yantra } from '../yantras/Yantra';
import { CHAKRA_TONE } from './ChakraDetail';

/** The 50 Mātṛkā letters on the petals, Muladhara → Ajna (Fig. 10, "Inner Mātṛkā Meditation"). */
const ASCENT = CHAKRAS.filter((c) => c.petals.letters.length > 0);

export default function Matrika() {
  const desktop = useIsDesktop();
  const [lit, setLit] = useState<{ id: ChakraId; i: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [sound, setSound] = useState<'voice' | 'tone'>('tone');
  const [audioOpen, setAudioOpen] = useState(false);
  const seq = useRef(new Sequencer());
  const clips = useAudioClips((s) => s.clips);
  const rows = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => () => seq.current.stop(), []);

  const play = async () => {
    const s = seq.current;
    if (playing) {
      s.stop();
      setPlaying(false);
      setLit(null);
      return;
    }
    const voice = sound === 'voice' ? devanagariVoice() : null;
    s.active = true;
    setPlaying(true);
    const visit = async (id: ChakraId, idxs: number[]) => {
      const c = CHAKRAS.find((k) => k.id === id)!;
      rows.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      for (const i of idxs) {
        if (!s.active) return;
        setLit({ id, i });
        if (voice) await s.speak(c.petals.letters[i].deva, voice);
        else {
          playTone(CHAKRA_TONE[id] * (1 + (i % 5) * 0.125), 0.4);
          await s.wait(380);
        }
      }
      // The Dharana-style per-sensor clip (7-sensor assignment) plays on arrival at each centre.
      const clip = clips[audioKey(7, c.sensorId)];
      if (s.active && clip) await s.playAudio(clip.url);
    };
    for (let r = 0; r < Math.max(1, rounds) && s.active; r++) {
      for (const c of ASCENT) await visit(c.id, c.petals.letters.map((_, i) => i));
      for (const c of [...ASCENT].reverse()) await visit(c.id, c.petals.letters.map((_, i) => i).reverse());
    }
    s.active = false;
    setPlaying(false);
    setLit(null);
  };

  const litLetter = lit ? CHAKRAS.find((c) => c.id === lit.id)!.petals.letters[lit.i] : null;
  const order = [...CHAKRAS].reverse(); // crown at top

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="scroll-y relative min-h-0 flex-1 px-4">
        <div className="relative mx-auto flex max-w-3xl flex-col items-center pt-2 pb-40">
          <div aria-hidden className="absolute top-10 bottom-40 left-1/2 w-[3px] -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(var(--sushumna), color-mix(in oklab, var(--sushumna) 40%, transparent))', boxShadow: '0 0 16px var(--sushumna)' }} />
          <p className="glass relative z-10 mb-4 rounded-full px-4 py-1.5 text-center text-xs text-muted">
            {MATRIKA_TOTAL} letters on {ASCENT.length} lotuses — 4 + 6 + 10 + 12 + 16 + 2
          </p>
          {order.map((c) => {
            const sz = c.id === 'sahasrara' ? 'min(52vw, 190px)' : c.id === 'ajna' ? 'min(78vw, 300px)' : 'min(78vw, 300px)';
            return (
              <div key={c.id} ref={(el) => void (rows.current[c.id] = el)} className="relative z-10 grid w-full grid-cols-1 items-center gap-2 py-1 md:grid-cols-[1fr_auto_1fr]">
                {desktop && <LetterList chakra={c.id} side="left" lit={lit} />}
                <div className="mx-auto" style={{ width: sz, height: c.id === 'ajna' ? `calc(${sz} * 0.5)` : sz }}>
                  <Yantra
                    chakra={c}
                    variant="matrika"
                    litPetal={lit?.id === c.id ? lit.i : null}
                    onPetal={() => openChakra(c.id)}
                    label={`${c.name}: ${c.petals.letters.map((l) => l.iast).join(', ') || 'bindu'}`}
                  />
                </div>
                {desktop && <LetterList chakra={c.id} side="right" lit={lit} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-strong absolute inset-x-2 bottom-2 z-20 flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3 lg:inset-x-auto lg:left-1/2 lg:w-[640px] lg:-translate-x-1/2">
        <button className="btn btn-gold !rounded-full" onClick={play} aria-pressed={playing}>
          {playing ? <StopIcon size={16} /> : <PlayIcon size={16} />}
          {playing ? 'Stop' : 'Play sequence'}
        </button>
        <div className="flex min-w-[64px] items-center gap-3" aria-live="polite">
          {litLetter ? (
            <>
              <span className="font-deva text-3xl leading-none">{litLetter.deva}</span>
              <span className="text-sm text-muted">{litLetter.iast}</span>
            </>
          ) : (
            <span className="text-xs text-muted">Muladhara → Ajna → back</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Rounds
            <input
              type="number"
              min={1}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
              className="glass h-10 w-14 rounded-lg px-2 text-center text-sm text-text"
            />
          </label>
          <div className="w-[140px]">
            <Segmented
              label="Sound"
              size="sm"
              value={sound}
              onChange={setSound}
              options={[
                { value: 'tone', label: 'Tone' },
                { value: 'voice', label: 'Voice', title: 'Uses a Hindi/Sanskrit system voice if available' },
              ]}
            />
          </div>
          <button className="btn !min-h-10 text-xs" onClick={() => setAudioOpen(true)}>
            Sounds…
          </button>
        </div>
      </div>

      <Sheet open={audioOpen} onClose={() => setAudioOpen(false)} label="Assign sounds to centres">
        <h2 className="font-display mb-1 text-2xl font-semibold">Sounds per centre</h2>
        <p className="mb-4 text-sm text-muted">
          Shared with the 7-sensor Dharana assignment in Nadi Harmony. A clip plays when the sequence reaches that centre.
        </p>
        <SensorAudioList count={7} sensors={[...CHAKRAS].reverse().map((c) => ({ id: c.sensorId, name: `${c.sensorName} · ${c.name}`, color: c.color.rainbow ? '#c9a7ff' : c.color.primary }))} />
      </Sheet>
    </div>
  );
}

function LetterList({ chakra, side, lit }: { chakra: ChakraId; side: 'left' | 'right'; lit: { id: ChakraId; i: number } | null }) {
  const c = CHAKRAS.find((k) => k.id === chakra)!;
  const L = c.petals.letters;
  const half = Math.ceil(L.length / 2);
  const part = side === 'left' ? L.slice(0, half).map((l, i) => ({ l, i })) : L.slice(half).map((l, i) => ({ l, i: i + half }));
  return (
    <ul className={`flex flex-col gap-0.5 text-sm ${side === 'left' ? 'items-end text-right' : 'items-start'}`} aria-hidden>
      {part.map(({ l, i }) => {
        const on = lit?.id === chakra && lit.i === i;
        return (
          <li key={i} className="flex items-baseline gap-2 transition-colors" style={{ color: on ? 'var(--text)' : 'var(--muted)' }}>
            <span className="font-deva" style={{ textShadow: on ? `0 0 10px ${c.color.primary}` : undefined }}>
              {l.deva}
            </span>
            <span className="text-xs">{l.iast}</span>
          </li>
        );
      })}
    </ul>
  );
}

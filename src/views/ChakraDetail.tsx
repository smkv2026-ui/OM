import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, PlayIcon, StopIcon } from '../components/Icons';
import { Badge } from '../components/ui';
import { CHAKRAS, granthaById, nadiById, pranaById, type Chakra } from '../data';
import { playTone } from '../engine/audioContext';
import { devanagariVoice, Sequencer } from '../engine/sequencer';
import { useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { openChakra, openNadi, openPrana, useSettings, useUi } from '../lib/store';
import { Yantra } from '../yantras/Yantra';

/** Base pitch per centre for the tone fallback (a gentle ascending pentatonic). */
export const CHAKRA_TONE: Record<string, number> = {
  muladhara: 196,
  svadhisthana: 220,
  manipura: 247,
  anahata: 294,
  vishuddha: 330,
  ajna: 392,
  sahasrara: 440,
};

export function ChakraDetail({ chakra }: { chakra: Chakra }) {
  const [petal, setPetal] = useState<number | null>(null);
  const [lit, setLit] = useState<number | null>(null);
  const [chanting, setChanting] = useState(false);
  const seq = useRef(new Sequencer());
  const voicePref = useSettings((s) => s.chantVoice);
  const reduce = useReducedMotion();
  const idx = CHAKRAS.findIndex((c) => c.id === chakra.id);
  const [dir, setDir] = useState(0);

  const go = (d: number) => {
    const next = CHAKRAS[(idx + d + CHAKRAS.length) % CHAKRAS.length];
    setDir(d);
    openChakra(next.id);
  };

  useEffect(() => {
    setPetal(null);
    setLit(null);
    const s = seq.current;
    return () => {
      s.stop();
      setChanting(false);
    };
  }, [chakra.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // swipe
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: PointerEvent) => (start.current = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };

  const chant = async () => {
    const s = seq.current;
    if (chanting) {
      s.stop();
      setChanting(false);
      setLit(null);
      return;
    }
    const letters = chakra.petals.letters.length ? chakra.petals.letters : [chakra.bija];
    const voice = voicePref ? devanagariVoice() : null;
    s.active = true;
    setChanting(true);
    for (let i = 0; i < letters.length && s.active; i++) {
      setLit(i);
      if (voice) await s.speak(letters[i].deva, voice);
      else {
        playTone(CHAKRA_TONE[chakra.id] * (1 + (i % 5) * 0.125));
        await s.wait(520);
      }
      if (s.active) await s.wait(120);
    }
    if (s.active) {
      setLit(null);
      if (voice) await s.speak(chakra.bija.deva, voice);
      else {
        playTone(CHAKRA_TONE[chakra.id] / 2, 1.2, 0.16);
        await s.wait(900);
      }
    }
    s.active = false;
    setChanting(false);
    setLit(null);
  };

  const sel = petal != null ? chakra.petals.letters[petal] : null;
  const c = chakra;

  return (
    <article aria-labelledby={`h-${c.id}`} className="flex flex-col gap-5">
      {/* spine indicator */}
      <nav className="flex items-center justify-between gap-2" aria-label="Chakras">
        <button className="btn btn-icon !rounded-full" onClick={() => go(-1)} aria-label="Previous chakra">
          <ChevronLeft size={18} />
        </button>
        <ol className="flex items-center gap-2">
          {CHAKRAS.map((k, i) => (
            <li key={k.id}>
              <button
                onClick={() => openChakra(k.id)}
                aria-label={k.name}
                aria-current={i === idx ? 'true' : undefined}
                className="flex h-7 w-7 items-center justify-center"
              >
                <span
                  className="block rounded-full transition-all"
                  style={{
                    width: i === idx ? 14 : 8,
                    height: i === idx ? 14 : 8,
                    background: k.color.rainbow ? 'conic-gradient(red, orange, yellow, lime, cyan, blue, violet, red)' : k.color.primary,
                    boxShadow: i === idx ? `0 0 12px ${k.color.primary}` : `inset 0 0 0 1px ${k.color.ink}`,
                  }}
                />
              </button>
            </li>
          ))}
        </ol>
        <button className="btn btn-icon !rounded-full" onClick={() => go(1)} aria-label="Next chakra">
          <ChevronRight size={18} />
        </button>
      </nav>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={c.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-5"
        >
          <header className="text-center">
            <p className="eyebrow">Chakra {c.order} of 7</p>
            <h2 id={`h-${c.id}`} className="font-display text-4xl leading-tight font-semibold">
              {c.name} <span className="font-deva text-2xl font-normal text-muted">{c.deva}</span>
            </h2>
            <p className="text-sm text-muted">
              {c.iast} · {c.english}
            </p>
          </header>

          <div
            className="relative mx-auto aspect-square w-full max-w-[380px] touch-pan-y select-none"
            onPointerDown={onDown}
            onPointerUp={onUp}
          >
            <Yantra chakra={c} variant="detail" activePetal={petal} litPetal={lit} onPetal={(i) => setPetal(i === petal ? null : i)} />
          </div>

          <div className="glass flex min-h-[84px] items-center justify-between gap-3 rounded-2xl px-4 py-3" aria-live="polite">
            {sel ? (
              <div className="flex items-center gap-4">
                <span className="font-deva text-5xl leading-none" style={{ color: 'var(--text)', textShadow: `0 0 18px ${c.color.primary}` }}>
                  {sel.deva}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{sel.iast}</span>
                  <span className="text-xs text-muted">
                    Petal {petal! + 1} of {c.petals.letters.length}
                  </span>
                </span>
              </div>
            ) : (
              <div>
                <span className="font-deva mr-3 text-4xl" style={{ textShadow: `0 0 18px ${c.color.primary}` }}>
                  {c.bija.deva}
                </span>
                <span className="text-sm text-muted">
                  {c.petals.letters.length ? 'Tap a petal to see its letter' : 'Bindu — the point beyond letters'}
                </span>
              </div>
            )}
            {c.petals.letters.length > 0 && (
              <button className="btn shrink-0 !rounded-full" onClick={chant} aria-pressed={chanting}>
                {chanting ? <StopIcon size={16} /> : <PlayIcon size={16} />} {chanting ? 'Stop' : 'Chant'}
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Fact k="Location" v={c.location} wide />
            <Fact k="Spinal level" v={c.spinal} />
            <Fact k="Element (tattva)" v={`${c.element.name} · ${c.element.iast}`} deva={c.element.deva} />
            <Fact k="Bīja mantra" v={c.bija.iast} deva={c.bija.deva} />
            <Fact k="Petals" v={c.petals.count === 1000 ? '“1000” (countless)' : String(c.petals.count)} />
            <Fact k="Deity · Śakti" v={`${c.deity} · ${c.shakti}`} />
            <Fact k="Colour" v={c.color.label} />
            <Fact k="Yantra" v={c.geometry} wide />
          </dl>

          <section className="glass rounded-2xl p-4">
            <h3 className="eyebrow mb-2">Meditation</h3>
            <p className="leading-relaxed">{c.meditation}</p>
          </section>

          <section className="glass rounded-2xl p-4">
            <h3 className="eyebrow mb-2">Ida · Pingala · Sushumna</h3>
            <p className="mb-3 text-sm leading-relaxed text-muted">{c.nadis}</p>
            <div className="flex flex-wrap gap-2">
              {(['sushumna', 'ida', 'pingala'] as const).map((n) => {
                const nd = nadiById(n)!;
                return (
                  <button key={n} className="btn !min-h-9 text-xs" onClick={() => openNadi(n)}>
                    <span className="h-2 w-2 rounded-full" style={{ background: nd.color }} /> {nd.name}
                  </button>
                );
              })}
            </div>
          </section>

          {c.pranas.length > 0 && (
            <section>
              <h3 className="eyebrow mb-2">Related prāṇa</h3>
              <div className="flex flex-wrap gap-2">
                {c.pranas.map((p) => {
                  const pr = pranaById(p)!;
                  return (
                    <button key={p} className="btn !min-h-9 text-xs" onClick={() => openPrana(p)}>
                      <span className="h-2 w-2 rounded-full" style={{ background: pr.color }} /> {pr.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <ScriptureLinks ids={c.scriptures} />
          {c.omSpokesNote && <p className="text-xs text-faint">Side-view note: {c.omSpokesNote}</p>}
        </motion.div>
      </AnimatePresence>
    </article>
  );
}

function Fact({ k, v, deva, wide }: { k: string; v: string; deva?: string; wide?: boolean }) {
  return (
    <div className={`glass rounded-xl px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-[0.68rem] tracking-wide text-faint uppercase">{k}</dt>
      <dd className="mt-0.5">
        {deva && <span className="font-deva mr-1.5">{deva}</span>}
        {v}
      </dd>
    </div>
  );
}

export function ScriptureLinks({ ids }: { ids: string[] }) {
  const close = useUi((s) => s.closeSheet);
  return (
    <section>
      <h3 className="eyebrow mb-2">In the Granthas</h3>
      <ul className="flex flex-col gap-2">
        {ids.map((id) => {
          const g = granthaById(id);
          if (!g) return null;
          return (
            <li key={id}>
              <a
                href={`#/library/${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  close();
                  navigate(`/library/${id}`);
                }}
                className="glass flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:border-[var(--border-hi)]"
              >
                <span>
                  <span className="block font-medium">{g.title}</span>
                  <span className="text-xs text-muted">{g.category}</span>
                </span>
                <span className="flex items-center gap-2">
                  {g.needsVerification && <Badge tone="warn">needs verification</Badge>}
                  <ChevronRight size={16} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

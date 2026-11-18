import { useEffect } from 'react';
import { Sheet } from '../components/Sheet';
import { Badge } from '../components/ui';
import { chakraById, nadiById, pranaById, type Nadi, type Prana } from '../data';
import { openChakra, useUi } from '../lib/store';
import { useAudioClips } from '../engine/audioStore';
import { ChakraDetail, ScriptureLinks } from './ChakraDetail';

export function DetailSheets() {
  const sheet = useUi((s) => s.sheet);
  const close = useUi((s) => s.closeSheet);
  const load = useAudioClips((s) => s.load);
  useEffect(() => void load(), [load]);

  let label = '';
  let accent: string | undefined;
  let body = null;
  if (sheet?.type === 'chakra') {
    const c = chakraById(sheet.id)!;
    label = `${c.name} chakra details`;
    accent = c.color.rainbow ? '#c9a7ff' : c.color.primary;
    body = <ChakraDetail chakra={c} />;
  } else if (sheet?.type === 'prana') {
    const p = pranaById(sheet.id)!;
    label = `${p.name} details`;
    accent = p.color;
    body = <PranaDetail prana={p} />;
  } else if (sheet?.type === 'nadi') {
    const n = nadiById(sheet.id)!;
    label = `${n.name} details`;
    accent = n.color;
    body = <NadiDetail nadi={n} />;
  }
  return (
    <Sheet open={!!sheet} onClose={close} label={label} accent={accent}>
      {body}
    </Sheet>
  );
}

function ChakraChips({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const c = chakraById(id)!;
        return (
          <button key={id} className="btn !min-h-9 text-xs" onClick={() => openChakra(c.id)}>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: c.color.rainbow ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : c.color.primary, boxShadow: `inset 0 0 0 1px ${c.color.ink}` }}
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="eyebrow mb-1.5">{k}</h3>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function PranaDetail({ prana: p }: { prana: Prana }) {
  return (
    <article className="flex flex-col gap-4 pt-2">
      <header>
        <p className="eyebrow">Vāyu · vital breath</p>
        <h2 className="font-display text-4xl font-semibold">
          {p.name} <span className="font-deva text-2xl font-normal text-muted">{p.deva}</span>
        </h2>
        <p className="text-sm text-muted">{p.iast}</p>
        {p.needsVerification && (
          <div className="mt-2">
            <Badge tone="warn">needs verification</Badge>
          </div>
        )}
      </header>
      <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }} />
      <Row k="Location">{p.zone}</Row>
      <Row k="Direction of flow">{p.direction}</Row>
      <Row k="Function">{p.function}</Row>
      <Row k="Practice note">{p.practice}</Row>
      <section>
        <h3 className="eyebrow mb-2">Relevant chakra(s)</h3>
        {p.chakras.length ? <ChakraChips ids={p.chakras} /> : <p className="text-sm text-muted">Pervades the whole body — all centres.</p>}
      </section>
      <ScriptureLinks ids={p.scriptures} />
      <p className="text-xs text-faint">Primary source: Praśna Upaniṣad, Third Question (3.1–3.12). Flow animations are an interpretive visualisation.</p>
    </article>
  );
}

export function NadiDetail({ nadi: n }: { nadi: Nadi }) {
  return (
    <article className="flex flex-col gap-4 pt-2">
      <header>
        <p className="eyebrow">Nāḍī · channel</p>
        <h2 className="font-display text-4xl font-semibold">
          {n.name} <span className="font-deva text-2xl font-normal text-muted">{n.deva}</span>
        </h2>
        <p className="text-sm text-muted">
          {n.iast} · {n.aka}
        </p>
      </header>
      <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${n.color}, transparent)` }} />
      <Row k="Quality">{n.quality}</Row>
      <Row k="Side">{n.side}</Row>
      <Row k="Course">{n.course}</Row>
      <Row k="About">{n.description}</Row>
      <Row k="Practice">{n.practice}</Row>
      <section>
        <h3 className="eyebrow mb-2">Crosses / passes through</h3>
        <ChakraChips ids={n.id === 'sushumna' ? ['muladhara', 'svadhisthana', 'manipura', 'anahata', 'vishuddha', 'ajna', 'sahasrara'] : ['muladhara', 'svadhisthana', 'manipura', 'anahata', 'vishuddha', 'ajna']} />
      </section>
      <ScriptureLinks ids={n.scriptures} />
    </article>
  );
}

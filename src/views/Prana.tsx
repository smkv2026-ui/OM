import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PlayIcon, StopIcon } from '../components/Icons';
import { Dock } from '../components/Sheet';
import { TopBar } from '../components/Shell';
import { Chip, Section, Segmented, Slider, Toggle } from '../components/ui';
import { PRANAS, type PranaId } from '../data';
import { breathPhase, intensity, orbSize, PRANA_VIEWBOX, PranaFlow, VAYU_PATHS, ZONES, type Phase } from '../engine/pranaFlow';
import { Body, ChakraGlyphs, IdaPingala, Sushumna, type BodyStyle } from '../figures/Body';
import { smoothPath } from '../figures/geometry';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { openNadi, openPrana, useSettings } from '../lib/store';

const VB = PRANA_VIEWBOX;
const PHASE_LABEL: Record<Phase, string> = { inhale: 'Inhale', hold: 'Pause', exhale: 'Exhale', rest: 'Pause' };

export default function Prana() {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const theme = useSettings((s) => s.theme);
  const [enabled, setEnabled] = useState<Record<PranaId, boolean>>({ prana: true, samana: true, apana: true, udana: true, vyana: true });
  const [cycle, setCycle] = useState(false);
  const [tempo, setTempo] = useState(6);
  const [orb, setOrb] = useState(true);
  const [look, setLook] = useState<BodyStyle>('premium');
  const [nadis, setNadis] = useState(false);
  const [chakras, setChakras] = useState(false);
  const [dockOpen, setDockOpen] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const [phase, setPhase] = useState<Phase | null>(null);

  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<SVGCircleElement>(null);
  const flow = useRef<PranaFlow | null>(null);
  const size = useRef({ w: 0, scale: 1, dpr: 1 });
  const state = useRef({ enabled, cycle, tempo });
  state.current = { enabled, cycle, tempo };

  // fit the figure box (aspect VB.w:VB.h) inside the stage
  useEffect(() => {
    const st = stage.current!;
    const fit = () => {
      const W = st.clientWidth;
      const H = st.clientHeight;
      const w = Math.min(W, (H * VB.w) / VB.h);
      const h = (w * VB.h) / VB.w;
      const b = box.current!;
      b.style.width = `${w}px`;
      b.style.height = `${h}px`;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const c = canvas.current;
      if (c) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      size.current = { w, scale: w / VB.w, dpr };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(st);
    return () => ro.disconnect();
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const f = new PranaFlow(canvas.current!);
    flow.current = f;
    let raf = 0;
    let last = performance.now();
    let t0 = performance.now();
    let lastPhase: Phase | null = null;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { enabled: en, cycle: cyc, tempo: T } = state.current;
      f.enabled = en;
      f.dark = document.documentElement.dataset.theme !== 'light';
      if (cyc) {
        const { phase: ph, p } = breathPhase((now - t0) / 1000, T);
        PRANAS.forEach((pr) => (f.level[pr.id] = intensity(pr.id, ph, p)));
        if (orbRef.current) orbRef.current.setAttribute('r', String(12 + 22 * orbSize(ph, p)));
        if (ph !== lastPhase) {
          lastPhase = ph;
          setPhase(ph);
        }
      } else {
        PRANAS.forEach((pr) => (f.level[pr.id] = 1));
        t0 = now;
        if (lastPhase) {
          lastPhase = null;
          setPhase(null);
        }
      }
      f.frame(dt, size.current.scale, size.current.dpr);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const toggle = (id: PranaId) => setEnabled((e) => ({ ...e, [id]: !e[id] }));
  const showAll = () => {
    setEnabled({ prana: true, samana: true, apana: true, udana: true, vyana: true });
    setCycle(false);
  };
  const zoneKey = (id: PranaId) => (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && openPrana(id);
  const zoneProps = (id: PranaId, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `${label} — open details`,
    onClick: () => openPrana(id),
    onKeyDown: zoneKey(id),
    style: { cursor: 'pointer' },
  });
  const ink = (id: PranaId) => {
    const p = PRANAS.find((x) => x.id === id)!;
    return theme === 'dark' ? p.glow ?? p.color : p.color === '#bfe6ff' ? '#3d86b8' : p.color;
  };
  const dash = { strokeDasharray: '1.5 5', strokeLinecap: 'round' as const };
  const labelStyle = { fontSize: 11.5, fontFamily: 'var(--font-sans)', fontWeight: 500 };

  const controls = (
    <div className="flex flex-col gap-6 pt-1">
      <p className="text-sm leading-relaxed text-muted">
        The five vital breaths of the Praśna Upaniṣad (Fig. 4.3), each with its own direction of movement inside the seated body. Tap a zone or a name for details.
      </p>
      <Section title="Vāyus">
        <div className="flex flex-wrap gap-2">
          {PRANAS.map((p) => (
            <Chip key={p.id} active={enabled[p.id]} onClick={() => toggle(p.id)} color={ink(p.id)}>
              {p.name}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn flex-1 !min-h-10 text-xs" onClick={showAll}>
            Show all
          </button>
          <button className="btn btn-gold flex-1 !min-h-10 text-xs" aria-pressed={cycle} onClick={() => setCycle(!cycle)}>
            {cycle ? <StopIcon size={14} /> : <PlayIcon size={14} />} {cycle ? 'Stop cycle' : 'Play cycle'}
          </button>
        </div>
      </Section>
      <Section title="Breath cycle" aside={<span className="text-xs text-muted tabular-nums">{tempo.toFixed(1)} s / cycle</span>}>
        <Slider label="Seconds per breath cycle" min={4} max={8} step={0.5} value={tempo} onChange={setTempo} color="var(--gold)" valueText={`${tempo} seconds`} />
        <div className="glass rounded-xl px-3">
          <Toggle id="orb" label="Breath orb" checked={orb} onChange={setOrb} />
        </div>
        <p className="text-xs text-faint">Inhale → pause → exhale → pause. Prāṇa leads the inhale, Samāna balances, Apāna leads the exhale, Udāna rises into the pause, Vyāna spreads through the pauses.</p>
      </Section>
      <Section title="Figure">
        <Segmented<BodyStyle>
          label="Figure style"
          size="sm"
          value={look}
          onChange={setLook}
          options={[
            { value: 'premium', label: 'Premium pose' },
            { value: 'line', label: 'Line art' },
          ]}
        />
      </Section>
      <Section title="Layers">
        <div className="glass rounded-xl px-3">
          <Toggle id="l-nadis" label="Ida · Pingala · Sushumna" checked={nadis} onChange={setNadis} />
          <Toggle id="l-chakras" label="Seven chakra glows" checked={chakras} onChange={setChakras} />
        </div>
        <p className="text-xs text-faint">Udāna rises through Sushumna; Vyāna spreads through the nāḍīs from the heart. Apāna ↔ Mūlādhāra/Svādhiṣṭhāna · Samāna ↔ Maṇipūra · Prāṇa ↔ Anāhata · Udāna ↔ Viśuddha/Ājñā.</p>
      </Section>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Prāṇa Vāyus" subtitle="The five vital breaths — Praśna Upaniṣad, Third Question" />
      <div className="relative flex min-h-0 flex-1">
        <div ref={stage} className={`relative flex min-h-0 min-w-0 flex-1 items-center justify-center ${desktop ? '' : 'pb-[76px]'}`}>
          <div ref={box} className="relative">
            <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Seated figure with the five prāṇa zones">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
                </marker>
              </defs>
              {/* Vyana — entire body */}
              <g {...zoneProps('vyana', 'Vyāna, entire body')}>
                <ellipse cx={ZONES.body.cx} cy={ZONES.body.cy} rx={ZONES.body.rx} ry={ZONES.body.ry} fill="transparent" stroke={ink('vyana')} strokeWidth={1.6} {...dash} opacity={enabled.vyana ? 0.9 : 0.35} pointerEvents="stroke" />
              </g>
              <text x={-196} y={-52} fill={ink('vyana')} {...labelStyle} {...zoneProps('vyana', 'Vyāna')}>
                Vyāna
                <tspan x={-196} dy={14} fill="var(--muted)" fontSize={10}>
                  Entire body
                </tspan>
              </text>

              <Body view="front" look={look} />
              {nadis && (
                <>
                  <IdaPingala onPick={openNadi} opacity={0.75} />
                  <g onClick={() => openNadi('sushumna')} style={{ cursor: 'pointer' }}>
                    <Sushumna view="front" width={1.8} opacity={0.85} />
                  </g>
                </>
              )}
              {chakras && <ChakraGlyphs view="front" scale={0.7} breathing={!reduce} />}

              {/* dotted zones */}
              {(
                [
                  ['head', 'udana', 'Prāṇa and Udāna zone'],
                  ['chest', 'prana', 'Prāṇa and Samāna zone'],
                  ['navel', 'samana', 'Samāna zone'],
                  ['lower', 'apana', 'Apāna zone'],
                ] as const
              ).map(([z, id, label]) => {
                const Z = ZONES[z];
                return (
                  <g key={z} {...zoneProps(id, label)}>
                    <circle cx={Z.cx} cy={Z.cy} r={Z.r} fill="transparent" stroke="var(--text)" strokeWidth={1.1} {...dash} opacity={0.55} />
                  </g>
                );
              })}
              <g {...labelStyle}>
                <text x={58} y={-182} fill="var(--text)">
                  <tspan fill={ink('prana')} {...zoneProps('prana', 'Prāṇa')}>Prāṇa</tspan> and{' '}
                  <tspan fill={ink('udana')} {...zoneProps('udana', 'Udāna')}>Udāna</tspan>
                </text>
                <text x={0} y={-44} textAnchor="middle" fill="var(--text)">
                  <tspan fill={ink('prana')} {...zoneProps('prana', 'Prāṇa')}>Prāṇa</tspan> and
                </text>
                <text x={0} y={-30} textAnchor="middle" fill={ink('samana')} {...zoneProps('samana', 'Samāna')}>
                  Samāna
                </text>
                <text x={0} y={30} textAnchor="middle" fill={ink('samana')} {...zoneProps('samana', 'Samāna')}>
                  Samāna
                </text>
                <text x={0} y={96} textAnchor="middle" fill={ink('apana')} {...zoneProps('apana', 'Apāna')}>
                  Apāna
                </text>
              </g>

              {/* reduced motion: static arrows instead of particles */}
              {reduce && (
                <g fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {PRANAS.filter((p) => enabled[p.id]).map((p) =>
                    VAYU_PATHS[p.id].map((path, i) => (
                      <path key={p.id + i} d={smoothPath(path)} stroke={ink(p.id)} markerEnd="url(#arrow)" opacity={0.9} />
                    )),
                  )}
                </g>
              )}

              {cycle && orb && (
                <g aria-hidden>
                  <circle ref={orbRef} cx={-178} cy={-200} r={20} fill="color-mix(in oklab, var(--gold) 22%, transparent)" stroke="var(--gold)" strokeWidth={1.2} style={{ transition: 'r .1s linear' }} />
                  <text x={-178} y={-200} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize={10} fontWeight={600}>
                    {phase ? PHASE_LABEL[phase] : ''}
                  </text>
                </g>
              )}
            </svg>
            {!reduce && <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />}
          </div>
          <span className="sr-only" aria-live="polite">
            {cycle && phase ? PHASE_LABEL[phase] : ''}
          </span>
        </div>
        {!desktop && (
          <div className="absolute right-3 bottom-[76px] z-10">
            <button className="btn btn-gold !rounded-full" aria-pressed={cycle} onClick={() => setCycle(!cycle)}>
              {cycle ? <StopIcon size={14} /> : <PlayIcon size={14} />} {cycle ? 'Stop' : 'Play cycle'}
            </button>
          </div>
        )}
        <Dock open={dockOpen} onToggle={() => setDockOpen(!dockOpen)} title={desktop ? 'Prāṇa controls' : 'Controls'} summary={cycle ? `Breath cycle · ${tempo}s` : 'All vāyus flowing'}>
          {controls}
        </Dock>
      </div>
    </div>
  );
}

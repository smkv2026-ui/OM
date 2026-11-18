import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, PlayIcon, ResetIcon, StopIcon } from '../components/Icons';
import { SensorAudioList } from '../components/SensorAudio';
import { DevicePanel } from '../components/DevicePanel';
import { LayerChips, type AnatomyLayers } from '../components/LayerMenu';
import { deviceHooks, emergencyStop, retune, useDevice, useDeviceSettings } from '../engine/device';
import { Dock } from '../components/Sheet';
import { TopBar } from '../components/Shell';
import { Button, Section, Segmented, Slider, Toggle } from '../components/ui';
import { CHAKRAS, NADIS, type ChakraId } from '../data';
import { audioKey, useAudioClips } from '../engine/audioStore';
import { NadiEngine, type Silhouette } from '../engine/nadiEngine';
import { Sequencer } from '../engine/sequencer';
import { SENSOR_SETS, sortedBottomToTop, statusFor, type SensorConf, type SensorCount } from '../engine/sensors';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { navigate } from '../lib/router';
import { openNadi, useSettings } from '../lib/store';

type Pos = Record<string, { x: number; y: number }>;

export default function NadiHarmony() {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const theme = useSettings((s) => s.theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engine = useRef<NadiEngine | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const percRef = useRef<HTMLSpanElement>(null);
  const lastStatus = useRef('');

  const [count, setCount] = useState<SensorCount>(3);
  const [freqs, setFreqs] = useState<Record<string, number>>({});
  const [pos, setPos] = useState<Pos>({});
  const [silhouette, setSilhouette] = useState<Silhouette>('default');
  const [drone, setDrone] = useState(false);
  const [sensorSound, setSensorSound] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [dockOpen, setDockOpen] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const [chakraStyle, setChakraStyleState] = useState<'dots' | 'ring'>(() => {
    try {
      return localStorage.getItem('om-nadi-chakra-style') === 'ring' ? 'ring' : 'dots';
    } catch {
      return 'dots';
    }
  });
  const setChakraStyle = (v: 'dots' | 'ring') => {
    setChakraStyleState(v);
    try {
      localStorage.setItem('om-nadi-chakra-style', v);
    } catch {
      /* storage unavailable */
    }
  };
  const [layers, setLayers] = useState<AnatomyLayers>({ chakras: true, sushumna: true, ida: true, pingala: true, spine: false });
  const [ghost, setGhost] = useState<{ conf: SensorConf; x: number; y: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const seq = useRef(new Sequencer());
  const clips = useAudioClips((s) => s.clips);
  const set = SENSOR_SETS[count];

  /* ---------------------------------------------------------------- engine lifecycle */
  useEffect(() => {
    const e = new NadiEngine(canvasRef.current!);
    engine.current = e;
    if (import.meta.env.DEV) (window as unknown as { __nadi: NadiEngine }).__nadi = e;
    e.onLayout = () => {
      const p: Pos = {};
      e.placed.forEach((_, id) => (p[id] = e.sensorPos(id)!));
      setPos(p);
    };
    e.onFrame = (a, f) => {
      const perc = Math.round(a * 100);
      if (meterRef.current) meterRef.current.style.width = `${perc}%`;
      if (percRef.current) percRef.current.textContent = `${perc}%`;
      const st = statusFor(a, f);
      if (st.text !== lastStatus.current && statusRef.current) {
        lastStatus.current = st.text;
        statusRef.current.textContent = st.text;
        statusRef.current.style.color = st.tone === 'low' ? 'var(--magenta)' : st.tone === 'mid' ? 'var(--gold-ink)' : 'var(--accent-ink)';
      }
    };
    setFreqs({ ...e.freqs });
    e.start();
    const s = seq.current;
    return () => {
      s.stop();
      e.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.readTheme();
  }, [theme]);
  useEffect(() => {
    if (engine.current) engine.current.reduce = reduce;
  }, [reduce]);
  useEffect(() => {
    if (engine.current) engine.current.layers = { ...layers };
  }, [layers]);
  useEffect(() => {
    if (engine.current) engine.current.chakraStyle = chakraStyle;
  }, [chakraStyle]);
  useEffect(() => {
    engine.current?.setInsets(desktop ? { bottom: 0 } : { bottom: 136, top: 4 });
  }, [desktop]);

  /* ---------------------------------------------------------------- playback (Dharana) */
  const stopPlayback = useCallback(() => {
    seq.current.stop();
    if (engine.current) engine.current.marker.active = false;
    setPlaying(false);
  }, []);

  const startPlayback = async () => {
    const e = engine.current!;
    const s = seq.current;
    const bottomToTop = sortedBottomToTop(e.set);
    if (!bottomToTop.length) return;
    const n = Math.max(1, rounds);
    s.active = true;
    setPlaying(true);
    e.marker.active = true;
    // Start just below the lowest sensor so the first move is visible (+60 px at s = 1).
    e.marker.y = bottomToTop[0].targetYRatio + 60 / 300;
    const topToBottom = [...bottomToTop].reverse();
    const playSeq = async (ids: SensorConf[]) => {
      for (const c of ids) {
        if (!s.active) return;
        e.marker.target = c.targetYRatio;
        const clip = useAudioClips.getState().clips[audioKey(e.sensorCount, c.id)];
        if (clip) await s.playAudio(clip.url);
        else await s.wait(700);
      }
    };
    for (let r = 0; r < n && s.active; r++) {
      await playSeq(bottomToTop);
      if (!s.active) break;
      await playSeq(topToBottom);
    }
    s.active = false;
    e.marker.active = false;
    setPlaying(false);
  };

  /* ---------------------------------------------------------------- controls */
  const switchCount = (n: SensorCount) => {
    if (n === count) return;
    stopPlayback();
    engine.current!.setCount(n);
    if (n === 7) {
      // the 7-sensor frequencies are the device's per-chakra frequencies
      const v = useDeviceSettings.getState().vib;
      CHAKRAS.forEach((c) => (engine.current!.freqs[c.sensorId] = v[c.id].freq));
    }
    setFreqs({ ...engine.current!.freqs });
    setCount(n);
  };
  const reset = () => {
    engine.current!.resetEnergy();
    if (count === 7) CHAKRAS.forEach((c) => useDeviceSettings.getState().setVib(c.id, { freq: 10 }));
    setFreqs({ ...engine.current!.freqs });
  };
  const setFreq = (id: string, v: number) => {
    engine.current!.freqs[id] = v;
    setFreqs((f) => ({ ...f, [id]: v }));
    // 7-sensor sliders and the device's per-chakra frequency are the same setting
    const ck = count === 7 ? CHAKRAS.find((c) => c.sensorId === id) : undefined;
    if (ck) {
      useDeviceSettings.getState().setVib(ck.id, { freq: v });
      retune(ck.id);
    }
  };
  const onDeviceFreq = (id: ChakraId, f: number) => {
    if (count !== 7 || !engine.current) return;
    const sid = CHAKRAS.find((c) => c.id === id)!.sensorId;
    engine.current.freqs[sid] = f;
    setFreqs((fs) => ({ ...fs, [sid]: f }));
  };

  /* ---------------------------------------------------------------- sensor device ↔ visualisation */
  const devActive = useDevice((s) => s.active);
  const devPlaying = useDevice((s) => s.playing);
  const vib = useDeviceSettings((s) => s.vib);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.devicePulses = devActive.map((id) => {
      const c = CHAKRAS.find((k) => k.id === id)!;
      return { ratio: c.targetYRatio, color: c.color.rainbow ? '#c9a7ff' : c.color.primary, freq: vib[id].freq, intensity: vib[id].intensity / 100 };
    });
  }, [devActive, vib]);
  useEffect(() => {
    deviceHooks.onStep = (ids) => {
      const e = engine.current;
      if (!e || seq.current.active) return;
      if (ids.length === 1) {
        const c = CHAKRAS.find((k) => k.id === ids[0])!;
        if (!e.marker.active) e.marker.y = c.targetYRatio + 60 / 300;
        e.marker.active = true;
        e.marker.target = c.targetYRatio;
      } else e.marker.active = false;
    };
    deviceHooks.onEnd = () => {
      if (engine.current && !seq.current.active) engine.current.marker.active = false;
    };
    return () => {
      deviceHooks.onStep = undefined;
      deviceHooks.onEnd = undefined;
    };
  }, []);
  const toggleDrone = (on: boolean) => {
    engine.current!.drone.setEnabled(on);
    setDrone(on);
  };
  const toggleSilhouette = () => {
    const next = silhouette === 'default' ? 'dharana' : 'default';
    engine.current!.silhouette = next;
    setSilhouette(next);
  };

  /* ---------------------------------------------------------------- drag from palette (pointer events + ghost) */
  const dragState = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);
  const onPaletteDown = (e: RPointerEvent<HTMLButtonElement>, conf: SensorConf) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { id: conf.id, sx: e.clientX, sy: e.clientY, moved: false };
    setGhost({ conf, x: e.clientX, y: e.clientY });
  };
  const onPaletteMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = dragState.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
  };
  const onPaletteUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = dragState.current;
    dragState.current = null;
    setGhost(null);
    if (!d) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (d.moved && inside) {
      engine.current!.placeSensor(d.id, e.clientX - r.left, e.clientY - r.top);
      setHint(null);
    } else if (!d.moved) {
      setHint('Drag the sensor onto the figure — or press Enter to place it, then use arrow keys.');
    }
  };
  const onPaletteKey = (e: KeyboardEvent<HTMLButtonElement>, conf: SensorConf, i: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const en = engine.current!;
    const side = i % 2 ? 1 : -1;
    const ideal = en.ideal(conf);
    en.placeSensor(conf.id, ideal.x + side * 120 * en.s, ideal.y + 30 * en.s);
    requestAnimationFrame(() => document.getElementById(`handle-${conf.id}`)?.focus());
  };

  /* ---------------------------------------------------------------- placed-sensor handles */
  const handleDrag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const onHandleDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos[id];
    const r = canvasRef.current!.getBoundingClientRect();
    handleDrag.current = { id, dx: e.clientX - r.left - p.x, dy: e.clientY - r.top - p.y };
  };
  const onHandleMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const h = handleDrag.current;
    if (!h) return;
    const r = canvasRef.current!.getBoundingClientRect();
    engine.current!.placeSensor(h.id, e.clientX - r.left - h.dx, e.clientY - r.top - h.dy);
  };
  const onHandleUp = () => (handleDrag.current = null);
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const step = e.shiftKey ? 16 : 4;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    const p = pos[id];
    engine.current!.placeSensor(id, p.x + m[0], p.y + m[1]);
  };

  /* ---------------------------------------------------------------- tap on channels */
  const tap = useRef<{ x: number; y: number } | null>(null);
  const onStageDown = (e: RPointerEvent) => (tap.current = { x: e.clientX, y: e.clientY });
  const onStageUp = (e: RPointerEvent) => {
    const t = tap.current;
    tap.current = null;
    if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const ch = engine.current!.channelAt(e.clientX - r.left, e.clientY - r.top);
    if (ch) openNadi(ch);
  };

  const n = count;
  const desc = `Position the ${n} energy sensor${n > 1 ? 's' : ''} along the subtle spinal axis to pull chaotic mental nadis into unified resonance (Sushumna). Each sensor has its own resonance frequency.`;

  const palette = (compact: boolean) => (
    <div className={compact ? 'flex justify-center gap-1.5' : `grid gap-2 ${count === 7 ? 'grid-cols-4' : count === 3 ? 'grid-cols-3' : 'grid-cols-1'}`} role="list" aria-label="Energy sensors">
      {set.map((c, i) => {
        const placed = !!pos[c.id];
        return (
          <button
            key={c.id}
            role="listitem"
            aria-label={`${c.name} sensor${placed ? ' (placed)' : ''}. Drag onto the figure, or press Enter to place.`}
            className={`flex touch-none flex-col items-center justify-center rounded-2xl border font-semibold transition-all select-none ${
              compact ? 'h-[52px] w-[48px] text-[0.62rem]' : 'h-[64px] text-xs hover:-translate-y-0.5'
            }`}
            style={{
              borderColor: `rgba(${c.rgb.join(',')}, 0.55)`,
              color: theme === 'dark' ? c.color : c.ink,
              background: `rgba(${c.rgb.join(',')}, 0.1)`,
              opacity: placed ? 0.3 : 1,
              cursor: 'grab',
            }}
            onPointerDown={(e) => onPaletteDown(e, c)}
            onPointerMove={onPaletteMove}
            onPointerUp={onPaletteUp}
            onPointerCancel={() => {
              dragState.current = null;
              setGhost(null);
            }}
            onKeyDown={(e) => onPaletteKey(e, c, i)}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
            <span className="mt-1">{compact ? (count === 7 ? c.short : `S-${i + 1}`) : `S-${i + 1}`}</span>
            {!compact && <span className="text-[0.62rem] font-normal opacity-75">{c.name}</span>}
          </button>
        );
      })}
    </div>
  );

  const controls = (
    <div className="flex flex-col gap-6 pt-1">
      <p className="text-sm leading-relaxed text-muted">{desc}</p>
      <Section title="1. Choose sensor count">
        <Segmented<SensorCount>
          label="Sensor count"
          value={count}
          onChange={switchCount}
          options={[
            { value: 1, label: '1 Sensor' },
            { value: 3, label: '3 Sensors' },
            { value: 7, label: '7 Sensors' },
          ]}
        />
      </Section>
      {desktop && <Section title="2. Drag energy sensors">{palette(false)}</Section>}
      <Section title={desktop ? '3. Tune frequency (per sensor)' : '2. Tune frequency (per sensor)'}>
        <div className="flex flex-col gap-2">
          {set.map((c) => (
            <div key={c.id} className="glass rounded-xl px-3 pt-2 pb-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{c.name}</span>
                <span className="font-semibold" style={{ color: theme === 'dark' ? c.color : c.ink }}>
                  {freqs[c.id] ?? 10} Hz
                </span>
              </div>
              <Slider label={`${c.name} frequency`} min={10} max={100} value={freqs[c.id] ?? 10} onChange={(v) => setFreq(c.id, v)} color={c.color} valueText={`${freqs[c.id] ?? 10} hertz`} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Audio feedback">
        <div className="glass rounded-xl px-3">
          <Toggle id="drone" label="Harmonic Drone" checked={drone} onChange={toggleDrone} />
        </div>
      </Section>
      <Section title="Dharana">
        <Button className={`w-full ${silhouette === 'dharana' ? 'btn-gold' : ''}`} aria-pressed={silhouette === 'dharana'} onClick={toggleSilhouette}>
          {silhouette === 'dharana' ? 'Return to Default Form' : 'Dharana'}
        </Button>
        <div className="glass rounded-xl px-3">
          <Toggle id="sensor-sound" label="Apply Sound to Sensor" checked={sensorSound} onChange={setSensorSound} />
        </div>
        {sensorSound && <SensorAudioList count={count} sensors={set.map((c) => ({ id: c.id, name: c.name, color: c.color }))} />}
        <label className="glass flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm">
          <span className="text-muted">Rounds</span>
          <input
            type="number"
            min={1}
            step={1}
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-10 w-20 rounded-lg border border-line bg-transparent px-2 text-center text-text"
          />
        </label>
        <Button className="w-full btn-gold" onClick={playing ? stopPlayback : startPlayback} aria-pressed={playing}>
          {playing ? <StopIcon size={16} /> : <PlayIcon size={16} />}
          {playing ? 'Stop Playback' : 'Play with Sound'}
        </Button>
        <p className="text-xs text-faint">
          Lowest sensor → highest → back down, per round. Sensors without a sound pause for 700 ms.
          {Object.keys(clips).filter((k) => k.startsWith(`${count}_`)).length > 0 && ' Assigned sounds are saved on this device.'}
        </p>
      </Section>
      <Section title="Sensor device">
        <DevicePanel onFreq={onDeviceFreq} />
      </Section>
      <Section title="Layers">
        <LayerChips value={layers} onChange={setLayers} />
        <Segmented<'dots' | 'ring'>
          label="Chakra style"
          size="sm"
          value={chakraStyle}
          onChange={setChakraStyle}
          options={[
            { value: 'dots', label: 'Dots', title: 'The original chakra points' },
            { value: 'ring', label: 'Flat (rotating ring)', title: 'Petal rings; during playback they switch on and turn clockwise up, anticlockwise down' },
          ]}
        />
      </Section>
      <Button className="w-full" onClick={reset}>
        <ResetIcon size={16} /> Reset Energy State
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Nadi Harmony"
        subtitle="Energy-alignment simulator · drag sensors onto the spine"
        actions={
          <button className="btn !min-h-11 !rounded-full text-xs" onClick={() => navigate('/')} aria-label="Back to Home">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Home</span>
          </button>
        }
      />
      <div className="relative flex min-h-0 flex-1">
        <div ref={stageRef} className="relative min-h-0 min-w-0 flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 touch-none" onPointerDown={onStageDown} onPointerUp={onStageUp} role="img" aria-label="Nadi Harmony visualisation: sensors, nadis and the central Sushumna channel" />

          {/* accessible, draggable handles over placed sensors */}
          {set.map((c) =>
            pos[c.id] ? (
              <button
                key={c.id}
                id={`handle-${c.id}`}
                className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full"
                style={{ left: pos[c.id].x, top: pos[c.id].y, cursor: 'grab' }}
                aria-label={`${c.name} sensor. Drag or use arrow keys to move.`}
                onPointerDown={(e) => onHandleDown(e, c.id)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onKeyDown={(e) => onHandleKey(e, c.id)}
              />
            ) : null,
          )}

          <div className="pointer-events-none absolute top-2 left-3 flex flex-col gap-1.5 lg:left-4">
            {NADIS.filter((nd) => layers[nd.id]).map((nd) => (
              <button
                key={nd.id}
                className="glass pointer-events-auto flex min-h-9 items-center gap-2 rounded-full px-3 text-xs"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => openNadi(nd.id)}
                aria-label={`${nd.name} — ${nd.aka}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: nd.color, boxShadow: `0 0 8px ${nd.color}` }} />
                {nd.name}
              </button>
            ))}
          </div>

          <div className="glass absolute top-2 right-3 w-[150px] rounded-2xl p-3 lg:right-4 lg:w-[220px] lg:p-4" role="status" aria-live="off">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow !text-[0.6rem]">System coherence</span>
              <span ref={percRef} className="text-[0.7rem] text-muted tabular-nums">
                0%
              </span>
            </div>
            <div ref={statusRef} className="mt-1 text-sm font-semibold transition-colors lg:text-base" style={{ color: 'var(--magenta)' }}>
              Dissipated Mind
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                ref={meterRef}
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: '0%', background: 'linear-gradient(90deg, #ff2a6d, #05dda1, #00f3ff)', boxShadow: '0 0 10px rgba(0,243,255,.5)' }}
              />
            </div>
          </div>

          {(devPlaying || devActive.length > 0) && (
            <div className="absolute left-3 z-10 lg:left-4" style={{ bottom: desktop ? 16 : 140 }}>
              <button
                className="btn !rounded-full font-semibold"
                style={{ background: 'color-mix(in oklab, var(--magenta) 30%, var(--surface-strong))', borderColor: 'var(--magenta)' }}
                onClick={emergencyStop}
                aria-label="Stop all vibration"
              >
                <StopIcon size={14} /> STOP
              </button>
            </div>
          )}

          {hint && (
            <div role="status" className="glass absolute top-1/2 left-1/2 w-[min(90%,320px)] -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm" onClick={() => setHint(null)}>
              {hint}
            </div>
          )}

        </div>
        {!desktop && <div className="absolute inset-x-0 bottom-[72px] z-10 px-2">{palette(true)}</div>}
        {!desktop && (
          <Dock open={dockOpen} onToggle={() => setDockOpen(!dockOpen)} title="Controls" summary={`${count} sensor${count > 1 ? 's' : ''} · ${silhouette === 'dharana' ? 'Dharana' : 'Default form'}${drone ? ' · Drone on' : ''}`}>
            {controls}
          </Dock>
        )}
        {desktop && (
          <Dock open={dockOpen} onToggle={() => setDockOpen(!dockOpen)} title="Nadi Harmony controls">
            {controls}
          </Dock>
        )}
      </div>

      {ghost &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[9999] flex h-[52px] w-[52px] items-center justify-center rounded-full text-center text-[10px] font-semibold"
            style={{
              left: ghost.x - 26,
              top: ghost.y - 26,
              border: `2px solid ${ghost.conf.color}`,
              background: theme === 'dark' ? 'rgba(10,10,25,.75)' : 'rgba(255,252,245,.9)',
              color: theme === 'dark' ? '#fff' : '#251e33',
              boxShadow: `0 0 16px rgba(${ghost.conf.rgb.join(',')}, .6)`,
            }}
          >
            {count === 7 ? ghost.conf.short : ghost.conf.name}
          </div>,
          document.body,
        )}
    </div>
  );
}

import { CHAKRAS, type ChakraId } from '../data';
import {
  bluetoothSupported,
  buildSequence,
  connectBluetooth,
  disconnect,
  emergencyStop,
  playSequence,
  retune,
  setHold,
  startSimulator,
  stopSequence,
  testPulse,
  useDevice,
  useDeviceSettings,
  type OrderMode,
} from '../engine/device';
import { useSettings } from '../lib/store';
import { ChevronLeft, ChevronRight, PlayIcon, StopIcon } from './Icons';
import { Segmented, Slider, Toggle } from './ui';

const ORDER: { value: OrderMode; label: string; title: string }[] = [
  { value: 'ascending', label: 'Up', title: 'Muladhara → Sahasrara' },
  { value: 'descending', label: 'Down', title: 'Sahasrara → Muladhara' },
  { value: 'updown', label: 'Up & down', title: 'Up, then back down (like Dharana)' },
  { value: 'together', label: 'Together', title: 'All selected at once' },
  { value: 'custom', label: 'Custom', title: 'Your own order' },
];

const chakraColor = (id: ChakraId) => {
  const c = CHAKRAS.find((k) => k.id === id)!;
  return c.color.rainbow ? '#c9a7ff' : c.color.primary;
};

/**
 * Sensor device: connect (Bluetooth or simulator), per-chakra vibration (frequency + intensity),
 * test / live hold, play mode (selection, order, timing, rounds, sound sync) and emergency stop.
 * `onFreq` keeps the 7-sensor frequency sliders in step with the device frequencies.
 */
export function DevicePanel({ onFreq }: { onFreq?: (id: ChakraId, freq: number) => void }) {
  const dev = useDevice();
  const st = useDeviceSettings();
  const theme = useSettings((s) => s.theme);
  const connected = dev.status === 'connected';
  const ble = bluetoothSupported();
  const steps = buildSequence();

  const toggleSel = (id: ChakraId) =>
    st.set({ selected: st.selected.includes(id) ? st.selected.filter((x) => x !== id) : [...st.selected, id] });
  const move = (id: ChakraId, d: -1 | 1) => {
    const a = [...st.custom];
    const i = a.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    st.set({ custom: a });
  };
  const ink = (id: ChakraId) => {
    const c = CHAKRAS.find((k) => k.id === id)!;
    return theme === 'dark' ? chakraColor(id) : c.color.ink;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* connection */}
      <div className="glass flex flex-col gap-3 rounded-xl p-3" aria-live="polite">
        <div className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: connected ? 'var(--emerald)' : dev.status === 'connecting' ? 'var(--gold)' : dev.status === 'error' ? 'var(--magenta)' : 'var(--faint)',
              boxShadow: connected ? '0 0 8px var(--emerald)' : undefined,
            }}
          />
          <span className="flex-1 truncate">
            {connected ? dev.name : dev.status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
          {dev.battery != null && <span className="text-xs text-muted">🔋 {dev.battery}%</span>}
        </div>
        {dev.error && (
          <p role="alert" className="text-xs" style={{ color: 'var(--magenta)' }}>
            {dev.error}
          </p>
        )}
        {!connected ? (
          <div className="flex gap-2">
            <button className="btn btn-gold flex-1 !min-h-10 text-xs" onClick={connectBluetooth} disabled={!ble || dev.status === 'connecting'}>
              Connect Bluetooth
            </button>
            <button className="btn flex-1 !min-h-10 text-xs" onClick={startSimulator}>
              Use simulator
            </button>
          </div>
        ) : (
          <button className="btn !min-h-10 text-xs" onClick={disconnect}>
            Disconnect
          </button>
        )}
        {!ble && !connected && (
          <p className="text-xs text-faint">Bluetooth needs Chrome or Edge (Android, Windows, macOS, Linux). On iPhone/iPad use the Bluefy browser. The simulator works everywhere.</p>
        )}
      </div>

      {connected && (
        <button className="btn !min-h-12 w-full font-semibold" onClick={emergencyStop} style={{ background: 'color-mix(in oklab, var(--magenta) 22%, transparent)', borderColor: 'var(--magenta)' }}>
          <StopIcon size={16} /> STOP ALL VIBRATION
        </button>
      )}

      {/* per-chakra vibration */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Chakras · frequency · intensity</span>
        {[...CHAKRAS].reverse().map((c) => {
          const v = st.vib[c.id];
          const sel = st.selected.includes(c.id);
          const active = dev.active.includes(c.id);
          const held = dev.held.includes(c.id);
          return (
            <div
              key={c.id}
              className="glass rounded-xl px-3 py-2 transition-shadow"
              style={active ? { boxShadow: `0 0 0 1px ${chakraColor(c.id)}, 0 0 18px -4px ${chakraColor(c.id)}` } : undefined}
            >
              <div className="flex items-center gap-2">
                <label className="flex min-h-9 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={sel} onChange={() => toggleSel(c.id)} className="h-4 w-4 accent-[var(--accent)]" aria-label={`Include ${c.name} in play mode`} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: chakraColor(c.id), boxShadow: `inset 0 0 0 1px ${c.color.ink}` }} />
                  <span className="truncate">{c.name}</span>
                  <span className="text-[0.65rem] text-faint">ch {c.order}</span>
                </label>
                <button className="btn !min-h-8 !px-2 text-[0.7rem]" disabled={!connected} onClick={() => testPulse(c.id)} title="1-second test pulse">
                  Test
                </button>
                <button className="btn !min-h-8 !px-2 text-[0.7rem]" disabled={!connected} aria-pressed={held} onClick={() => setHold(c.id, !held)} title="Vibrate continuously for live tuning">
                  {held ? 'Release' : 'Hold'}
                </button>
              </div>
              <div className="grid grid-cols-[3.2rem_1fr] items-center gap-x-2 text-[0.7rem] text-muted">
                <span className="tabular-nums" style={{ color: ink(c.id) }}>
                  {v.freq} Hz
                </span>
                <Slider
                  label={`${c.name} vibration frequency`}
                  min={10}
                  max={100}
                  value={v.freq}
                  color={chakraColor(c.id)}
                  valueText={`${v.freq} hertz`}
                  onChange={(f) => {
                    st.setVib(c.id, { freq: f });
                    onFreq?.(c.id, f);
                    retune(c.id);
                  }}
                />
                <span className="tabular-nums">{v.intensity}%</span>
                <Slider
                  label={`${c.name} vibration intensity`}
                  min={0}
                  max={100}
                  step={5}
                  value={v.intensity}
                  color={chakraColor(c.id)}
                  valueText={`${v.intensity} percent`}
                  onChange={(i) => {
                    st.setVib(c.id, { intensity: i });
                    retune(c.id);
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
          <button className="btn flex-1 !min-h-9 text-xs" onClick={() => st.set({ selected: CHAKRAS.map((c) => c.id) })}>
            Select all
          </button>
          <button className="btn flex-1 !min-h-9 text-xs" onClick={() => st.set({ selected: [] })}>
            Clear
          </button>
        </div>
      </div>

      {/* play mode */}
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Play mode</span>
        <Segmented<OrderMode> label="Sequence order" size="sm" value={st.order} onChange={(order) => st.set({ order })} options={ORDER} />
        {st.order === 'custom' && (
          <ol className="flex flex-col gap-1" aria-label="Custom order">
            {st.custom.map((id, i) => {
              const c = CHAKRAS.find((k) => k.id === id)!;
              const on = st.selected.includes(id);
              return (
                <li key={id} className="glass flex items-center gap-2 rounded-lg px-2 py-1 text-sm" style={{ opacity: on ? 1 : 0.45 }}>
                  <span className="w-5 text-xs text-faint tabular-nums">{i + 1}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: chakraColor(id) }} />
                  <span className="flex-1">{c.name}</span>
                  <button className="btn btn-icon !min-h-8 !w-8 rotate-90" disabled={i === 0} onClick={() => move(id, -1)} aria-label={`Move ${c.name} earlier`}>
                    <ChevronLeft size={14} />
                  </button>
                  <button className="btn btn-icon !min-h-8 !w-8 rotate-90" disabled={i === st.custom.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${c.name} later`}>
                    <ChevronRight size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="glass grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-sm">
          <span className="text-muted">Time per chakra</span>
          <span className="tabular-nums">{st.durationS}s</span>
          <div className="col-span-2">
            <Slider label="Seconds per chakra" min={1} max={30} value={st.durationS} onChange={(durationS) => st.set({ durationS })} valueText={`${st.durationS} seconds`} />
          </div>
          <span className="text-muted">Pause between</span>
          <span className="tabular-nums">{st.gapS}s</span>
          <div className="col-span-2">
            <Slider label="Pause between chakras" min={0} max={5} step={0.5} value={st.gapS} onChange={(gapS) => st.set({ gapS })} valueText={`${st.gapS} seconds`} />
          </div>
          <label className="col-span-2 flex items-center justify-between gap-3 py-1">
            <span className="text-muted">Rounds</span>
            <input
              type="number"
              min={1}
              step={1}
              value={st.rounds}
              onChange={(e) => st.set({ rounds: Math.max(1, parseInt(e.target.value) || 1) })}
              className="h-9 w-20 rounded-lg border border-line bg-transparent px-2 text-center text-text"
            />
          </label>
        </div>
        <div className="glass rounded-xl px-3">
          <Toggle id="dev-sync" label="Play each chakra's Dharana sound (7-sensor) with it" checked={st.syncSound} onChange={(syncSound) => st.set({ syncSound })} />
        </div>
        <p className="text-xs text-faint">
          {steps.length
            ? `${steps.length} step${steps.length > 1 ? 's' : ''} × ${st.rounds} round${st.rounds > 1 ? 's' : ''}: ${steps.map((s) => s.map((id) => CHAKRAS.find((c) => c.id === id)!.name).join(' + ')).join(' → ')}`
            : 'Select at least one chakra.'}
        </p>
        <button
          className="btn btn-gold w-full"
          disabled={!connected || !steps.length}
          aria-pressed={dev.playing}
          onClick={() => (dev.playing ? stopSequence() : void playSequence())}
        >
          {dev.playing ? <StopIcon size={16} /> : <PlayIcon size={16} />}
          {dev.playing ? 'Stop sequence' : 'Play on device'}
        </button>
        {dev.playing && <p className="text-center text-xs text-muted">{dev.step}</p>}
        {!connected && <p className="text-xs text-faint">Connect a device or start the simulator to play.</p>}
      </div>
    </div>
  );
}

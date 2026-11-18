/**
 * Om Chakra Device link — Web Bluetooth implementation of docs/DEVICE_PROTOCOL.md, plus a
 * simulator (phone vibration + on-screen pulses) so play modes can be used without hardware.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHAKRAS, type ChakraId } from '../data';
import { audioKey, useAudioClips } from './audioStore';
import { Sequencer } from './sequencer';

export const OM_SERVICE = '6f6d0001-6368-616b-7261-2d6f6d646576';
export const OM_CONTROL = '6f6d0002-6368-616b-7261-2d6f6d646576';
export const OM_STATUS = '6f6d0003-6368-616b-7261-2d6f6d646576';

/** Channel 1 = Muladhara … 7 = Sahasrara (chakra.order). */
export const channelOf = (id: ChakraId) => CHAKRAS.find((c) => c.id === id)!.order;

const clampFreq = (f: number) => Math.max(10, Math.min(100, Math.round(f)));
const clampInt = (i: number) => Math.max(0, Math.min(255, Math.round(i)));

export const cmd = {
  play: (ch: number, freq: number, intensity: number, ms: number) => {
    const f = clampFreq(freq);
    const d = Math.max(0, Math.min(65535, Math.round(ms)));
    return new Uint8Array([0x01, ch, f & 255, f >> 8, clampInt(intensity), d & 255, d >> 8]);
  },
  stop: (ch: number | 'all') => new Uint8Array([0x02, ch === 'all' ? 0xff : ch]),
  hold: (ch: number, freq: number, intensity: number) => {
    const f = clampFreq(freq);
    return new Uint8Array([0x03, ch, f & 255, f >> 8, clampInt(intensity)]);
  },
  ping: () => new Uint8Array([0x04]),
};

/* ------------------------------------------------------------------ minimal Web Bluetooth types */
interface BtChar extends EventTarget {
  value?: DataView;
  writeValueWithoutResponse?: (v: BufferSource) => Promise<void>;
  writeValue: (v: BufferSource) => Promise<void>;
  startNotifications: () => Promise<BtChar>;
  readValue: () => Promise<DataView>;
}
interface BtService {
  getCharacteristic: (uuid: string | number) => Promise<BtChar>;
}
interface BtServer {
  connected: boolean;
  connect: () => Promise<BtServer>;
  disconnect: () => void;
  getPrimaryService: (uuid: string | number) => Promise<BtService>;
}
interface BtDevice extends EventTarget {
  name?: string;
  gatt?: BtServer;
}
interface Bt {
  requestDevice: (o: unknown) => Promise<BtDevice>;
}
const bluetooth = (): Bt | undefined => (navigator as unknown as { bluetooth?: Bt }).bluetooth;
export const bluetoothSupported = () => !!bluetooth();

/* ------------------------------------------------------------------ settings (persisted) */

export type OrderMode = 'ascending' | 'descending' | 'updown' | 'together' | 'custom';
export interface ChakraVib {
  freq: number;
  intensity: number; // 0–100 %
}

interface DeviceSettings {
  selected: ChakraId[];
  order: OrderMode;
  custom: ChakraId[];
  durationS: number;
  gapS: number;
  rounds: number;
  syncSound: boolean;
  vib: Record<ChakraId, ChakraVib>;
  set: (p: Partial<Omit<DeviceSettings, 'set' | 'setVib'>>) => void;
  setVib: (id: ChakraId, p: Partial<ChakraVib>) => void;
}

const ALL = CHAKRAS.map((c) => c.id);
export const useDeviceSettings = create<DeviceSettings>()(
  persist(
    (set) => ({
      selected: ALL,
      order: 'updown',
      custom: ALL,
      durationS: 3,
      gapS: 0.5,
      rounds: 1,
      syncSound: true,
      vib: Object.fromEntries(ALL.map((id) => [id, { freq: 10, intensity: 60 }])) as Record<ChakraId, ChakraVib>,
      set: (p) => set(p),
      setVib: (id, p) => set((s) => ({ vib: { ...s.vib, [id]: { ...s.vib[id], ...p } } })),
    }),
    { name: 'om-device', version: 1 },
  ),
);

/* ------------------------------------------------------------------ live state */

export type LinkKind = 'none' | 'ble' | 'sim';
interface DeviceState {
  kind: LinkKind;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  name: string;
  battery: number | null;
  error: string | null;
  /** chakras currently vibrating (from the app's own commands and/or device status) */
  active: ChakraId[];
  held: ChakraId[];
  playing: boolean;
  step: string;
}
export const useDevice = create<DeviceState>()(() => ({
  kind: 'none',
  status: 'idle',
  name: '',
  battery: null,
  error: null,
  active: [],
  held: [],
  playing: false,
  step: '',
}));
const setState = useDevice.setState;

/* ------------------------------------------------------------------ link */

interface Link {
  send(bytes: Uint8Array): Promise<void>;
  close(): void;
}

class BleLink implements Link {
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private device: BtDevice,
    private control: BtChar,
  ) {}
  send(bytes: Uint8Array) {
    // GATT allows one operation at a time — serialise writes.
    this.queue = this.queue
      .then(() => (this.control.writeValueWithoutResponse ? this.control.writeValueWithoutResponse(bytes) : this.control.writeValue(bytes)))
      .catch((e) => setState({ error: `Write failed: ${(e as Error).message}` }));
    return this.queue;
  }
  close() {
    try {
      this.device.gatt?.disconnect();
    } catch {
      /* already closed */
    }
  }
}

/** Simulator: phone vibration (Android) approximating the frequency as an on/off pattern. */
class SimLink implements Link {
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  async send(b: Uint8Array) {
    const op = b[0];
    const ch = b[1];
    if (op === 0x02) {
      if (ch === 0xff) this.timers.forEach((t) => clearTimeout(t)), this.timers.clear();
      else clearTimeout(this.timers.get(ch)), this.timers.delete(ch);
      if (this.timers.size === 0) navigator.vibrate?.(0);
      return;
    }
    if (op === 0x01 || op === 0x03) {
      const freq = b[2] | (b[3] << 8);
      const intensity = b[4] / 255;
      const ms = op === 0x01 ? b[5] | (b[6] << 8) : 60_000;
      const period = 1000 / freq;
      const on = Math.max(4, Math.round(period * (0.25 + 0.6 * intensity)));
      const off = Math.max(4, Math.round(period - on));
      const pattern: number[] = [];
      for (let t = 0; t < ms && pattern.length < 400; t += on + off) pattern.push(on, off);
      navigator.vibrate?.(pattern);
      if (op === 0x01) {
        clearTimeout(this.timers.get(ch));
        this.timers.set(
          ch,
          setTimeout(() => {
            this.timers.delete(ch);
            const id = CHAKRAS.find((c) => c.order === ch)?.id;
            if (id) markActive(id, false);
          }, ms),
        );
      }
    }
  }
  close() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    navigator.vibrate?.(0);
  }
}

let link: Link | null = null;

function markActive(id: ChakraId, on: boolean) {
  const a = new Set(useDevice.getState().active);
  if (on) a.add(id);
  else a.delete(id);
  setState({ active: [...a] });
}

export async function connectBluetooth() {
  const bt = bluetooth();
  if (!bt) {
    setState({ status: 'error', error: 'This browser has no Web Bluetooth. Use Chrome or Edge on Android, Windows, macOS or Linux (on iPhone/iPad: the Bluefy browser).' });
    return;
  }
  disconnect();
  setState({ status: 'connecting', error: null });
  try {
    const device = await bt.requestDevice({
      filters: [{ services: [OM_SERVICE] }, { namePrefix: 'Om' }],
      optionalServices: [OM_SERVICE, 'battery_service'],
    });
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(OM_SERVICE);
    const control = await service.getCharacteristic(OM_CONTROL);
    try {
      const status = await service.getCharacteristic(OM_STATUS);
      status.addEventListener('characteristicvaluechanged', (e) => {
        const v = (e.target as BtChar).value;
        if (!v || v.byteLength < 3) return;
        const mask = v.getUint8(1);
        const bat = v.getUint8(2);
        setState({
          active: CHAKRAS.filter((c) => mask & (1 << (c.order - 1))).map((c) => c.id),
          battery: bat === 0xff ? null : bat,
        });
      });
      await status.startNotifications();
    } catch {
      /* status is optional */
    }
    try {
      const bs = await server.getPrimaryService('battery_service');
      const lvl = await bs.getCharacteristic('battery_level');
      setState({ battery: (await lvl.readValue()).getUint8(0) });
    } catch {
      /* battery is optional */
    }
    device.addEventListener('gattserverdisconnected', () => {
      if (link instanceof BleLink) {
        link = null;
        stopSequence();
        setState({ kind: 'none', status: 'error', error: 'Device disconnected.', active: [], held: [] });
      }
    });
    link = new BleLink(device, control);
    setState({ kind: 'ble', status: 'connected', name: device.name || 'Om device' });
    await link.send(cmd.ping());
  } catch (e) {
    const msg = (e as Error).message || String(e);
    setState({
      status: /cancel/i.test(msg) ? 'idle' : 'error',
      error: /cancel/i.test(msg) ? null : `Could not connect: ${msg}`,
    });
  }
}

export function startSimulator() {
  disconnect();
  link = new SimLink();
  setState({
    kind: 'sim',
    status: 'connected',
    name: 'vibrate' in navigator ? 'Simulator (phone vibration)' : 'Simulator (on-screen only)',
    battery: null,
    error: null,
  });
}

export function disconnect() {
  stopSequence();
  if (link) {
    void link.send(cmd.stop('all'));
    link.close();
  }
  link = null;
  setState({ kind: 'none', status: 'idle', name: '', battery: null, active: [], held: [] });
}

const vibOf = (id: ChakraId) => useDeviceSettings.getState().vib[id];
const i255 = (pct: number) => (pct / 100) * 255;

/** 1-second test pulse on one chakra. */
export function testPulse(id: ChakraId) {
  if (!link) return;
  const v = vibOf(id);
  markActive(id, true);
  void link.send(cmd.play(channelOf(id), v.freq, i255(v.intensity), 1000));
  if (link instanceof BleLink) setTimeout(() => markActive(id, false), 1000);
}

/** Continuous vibration for live tuning. */
export function setHold(id: ChakraId, on: boolean) {
  if (!link) return;
  const held = new Set(useDevice.getState().held);
  const v = vibOf(id);
  if (on) {
    held.add(id);
    void link.send(cmd.hold(channelOf(id), v.freq, i255(v.intensity)));
  } else {
    held.delete(id);
    void link.send(cmd.stop(channelOf(id)));
  }
  markActive(id, on);
  setState({ held: [...held] });
}

/** Re-send HOLD when a held chakra's frequency/intensity changes (live tuning). */
export function retune(id: ChakraId) {
  if (!link || !useDevice.getState().held.includes(id)) return;
  const v = vibOf(id);
  void link.send(cmd.hold(channelOf(id), v.freq, i255(v.intensity)));
}

export function emergencyStop() {
  stopSequence();
  void link?.send(cmd.stop('all'));
  navigator.vibrate?.(0);
  setState({ active: [], held: [], playing: false, step: '' });
}

/* ------------------------------------------------------------------ play mode */

const seq = new Sequencer();
/** Hook for the visualisation (Nadi Harmony marker). */
export const deviceHooks: { onStep?: (ids: ChakraId[]) => void; onEnd?: () => void } = {};

export function buildSequence(): ChakraId[][] {
  const s = useDeviceSettings.getState();
  const sel = new Set(s.selected);
  const asc = CHAKRAS.filter((c) => sel.has(c.id)).map((c) => c.id);
  switch (s.order) {
    case 'ascending':
      return asc.map((id) => [id]);
    case 'descending':
      return [...asc].reverse().map((id) => [id]);
    case 'updown':
      return [...asc, ...[...asc].reverse()].map((id) => [id]);
    case 'together':
      return asc.length ? [asc] : [];
    case 'custom':
      return s.custom.filter((id) => sel.has(id)).map((id) => [id]);
  }
}

export function stopSequence() {
  if (!seq.active && !useDevice.getState().playing) return;
  seq.stop();
  void link?.send(cmd.stop('all'));
  setState({ playing: false, step: '', active: [] });
  deviceHooks.onEnd?.();
}

export async function playSequence() {
  if (!link) return;
  const s = useDeviceSettings.getState();
  const steps = buildSequence();
  if (!steps.length) return;
  seq.active = true;
  setState({ playing: true });
  for (let r = 0; r < Math.max(1, s.rounds) && seq.active; r++) {
    for (const [k, ids] of steps.entries()) {
      if (!seq.active || !link) break;
      setState({ step: `Round ${r + 1}/${s.rounds} · step ${k + 1}/${steps.length}`, active: ids });
      deviceHooks.onStep?.(ids);
      for (const id of ids) {
        const v = vibOf(id);
        void link.send(cmd.hold(channelOf(id), v.freq, i255(v.intensity)));
      }
      // Sync with the Dharana sound assigned to this chakra (7-sensor assignment), if any.
      const clip =
        s.syncSound && ids.length === 1
          ? useAudioClips.getState().clips[audioKey(7, CHAKRAS.find((c) => c.id === ids[0])!.sensorId)]
          : undefined;
      if (clip) await Promise.all([seq.playAudio(clip.url), new Promise((r) => setTimeout(r, s.durationS * 1000))]);
      else await seq.wait(s.durationS * 1000);
      for (const id of ids) void link?.send(cmd.stop(channelOf(id)));
      setState({ active: [] });
      if (seq.active && s.gapS > 0) await seq.wait(s.gapS * 1000);
    }
  }
  seq.active = false;
  setState({ playing: false, step: '', active: [] });
  deviceHooks.onEnd?.();
}

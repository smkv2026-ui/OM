import { create } from 'zustand';

/**
 * Per-sensor audio for Dharana / Matrika, keyed exactly like the prototype: `<sensorCount>_<sensorId>`.
 * Clips persist in IndexedDB so they survive reloads and work offline.
 */
export interface Clip {
  url: string;
  name: string;
}

const DB = 'om-audio';
const STORE = 'clips';

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

interface AudioClips {
  clips: Record<string, Clip>;
  loaded: boolean;
  setClip: (key: string, blob: Blob, name: string) => Promise<void>;
  clearClip: (key: string) => Promise<void>;
  load: () => Promise<void>;
}

export const audioKey = (count: number | string, sensorId: string) => `${count}_${sensorId}`;

export const useAudioClips = create<AudioClips>()((set, get) => ({
  clips: {},
  loaded: false,
  async setClip(key, blob, name) {
    const prev = get().clips[key];
    if (prev) URL.revokeObjectURL(prev.url);
    const url = URL.createObjectURL(blob);
    set((s) => ({ clips: { ...s.clips, [key]: { url, name } } }));
    try {
      await tx('readwrite', (s) => s.put({ blob, name }, key));
    } catch {
      /* private mode: keep in memory only */
    }
  },
  async clearClip(key) {
    const prev = get().clips[key];
    if (prev) URL.revokeObjectURL(prev.url);
    set((s) => {
      const next = { ...s.clips };
      delete next[key];
      return { clips: next };
    });
    try {
      await tx('readwrite', (s) => s.delete(key));
    } catch {
      /* ignore */
    }
  },
  async load() {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const keys = (await tx('readonly', (s) => s.getAllKeys())) as string[];
      const vals = (await tx('readonly', (s) => s.getAll())) as { blob: Blob; name: string }[];
      const clips: Record<string, Clip> = {};
      keys.forEach((k, i) => (clips[k] = { url: URL.createObjectURL(vals[i].blob), name: vals[i].name }));
      set((s) => ({ clips: { ...clips, ...s.clips } }));
    } catch {
      /* IndexedDB unavailable */
    }
  },
}));

/** Pick a MediaRecorder MIME type the browser supports (Safari records audio/mp4). */
export function recorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

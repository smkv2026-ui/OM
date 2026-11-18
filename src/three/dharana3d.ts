/**
 * 3D Chakra Dharana: a diamond travels the Sushumna; chakras start switched off and switch on as it
 * reaches them — rotating clockwise on the ascent, anticlockwise on the descent — while the bija is
 * chanted once per petal (Sahasrara: "Om Hreem Shreem Gurubhyo Namah" once). Voice can switch a
 * chakra on by speaking its bija.
 */
import { create } from 'zustand';
import { CHAKRAS, type ChakraId } from '../data';
import { playTone } from '../engine/audioContext';
import { devanagariVoice, Sequencer } from '../engine/sequencer';

export type DharanaMode = 'up' | 'updown' | 'downup';

/** What is chanted at each chakra, and how many times (= petal count). */
export const CHANT: Record<ChakraId, { deva: string; iast: string; times: number }> = {
  muladhara: { deva: 'लं', iast: 'Lam', times: 4 },
  svadhisthana: { deva: 'वं', iast: 'Vam', times: 6 },
  manipura: { deva: 'रं', iast: 'Ram', times: 10 },
  anahata: { deva: 'यं', iast: 'Yam', times: 12 },
  vishuddha: { deva: 'हं', iast: 'Ham', times: 16 },
  ajna: { deva: 'ॐ', iast: 'Om', times: 2 },
  sahasrara: { deva: 'ॐ ह्रीं श्रीं गुरुभ्यो नमः', iast: 'Om Hreem Shreem Gurubhyo Namah', times: 1 },
};
const TONE: Record<ChakraId, number> = {
  muladhara: 196,
  svadhisthana: 220,
  manipura: 247,
  anahata: 294,
  vishuddha: 330,
  ajna: 392,
  sahasrara: 440,
};

/** Mutable frame state read by the 3D scene every frame (no React re-render per frame). */
export const dharanaFrame = {
  enabled: false,
  /** diamond position as a continuous index along CHAKRAS (0 = Muladhara … 6 = Sahasrara) */
  t: 0,
  target: 0,
  /** +1 clockwise (ascent), −1 anticlockwise (descent); absent = off */
  lit: new Map<ChakraId, 1 | -1>(),
  /** chakra being chanted right now (pulses brighter) */
  sounding: null as ChakraId | null,
};

interface DharanaUi {
  active: boolean;
  playing: boolean;
  mode: DharanaMode;
  rounds: number;
  sound: boolean;
  status: string;
  current: ChakraId | null;
  listening: boolean;
  heard: string;
  set: (p: Partial<Omit<DharanaUi, 'set'>>) => void;
}
export const useDharana3D = create<DharanaUi>()((set) => ({
  active: false,
  playing: false,
  mode: 'updown',
  rounds: 1,
  sound: true,
  status: '',
  current: null,
  listening: false,
  heard: '',
  set: (p) => set(p),
}));
const ui = () => useDharana3D.getState();

const seq = new Sequencer();
const idx = (id: ChakraId) => CHAKRAS.findIndex((c) => c.id === id);

function waitArrive(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if (!seq.active || Math.abs(dharanaFrame.t - dharanaFrame.target) < 0.02) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

async function chant(id: ChakraId) {
  const c = CHANT[id];
  const voice = devanagariVoice();
  dharanaFrame.sounding = id;
  for (let k = 0; k < c.times && seq.active; k++) {
    ui().set({ status: `${CHAKRAS[idx(id)].name} · ${c.iast}${c.times > 1 ? ` ${k + 1}/${c.times}` : ''}` });
    if (voice) await seq.speak(c.deva, voice, id === 'sahasrara' ? 0.75 : 0.85);
    else {
      playTone(TONE[id], id === 'sahasrara' ? 1.6 : 0.45, 0.13);
      await seq.wait(id === 'sahasrara' ? 1700 : 520);
    }
    if (seq.active) await seq.wait(90);
  }
  dharanaFrame.sounding = null;
}

async function visit(i: number, dir: 1 | -1) {
  if (!seq.active) return;
  const id = CHAKRAS[i].id;
  dharanaFrame.target = i;
  ui().set({ current: id, status: `${dir === 1 ? 'Rising' : 'Descending'} to ${CHAKRAS[i].name}` });
  await waitArrive();
  if (!seq.active) return;
  dharanaFrame.lit.set(id, dir); // switch on / reverse rotation
  if (ui().sound) await chant(id);
  else await seq.wait(900);
}

export async function playDharana() {
  stopDharana(false);
  const { mode, rounds } = ui();
  const n = CHAKRAS.length;
  dharanaFrame.enabled = true;
  dharanaFrame.lit.clear();
  dharanaFrame.t = dharanaFrame.target = mode === 'downup' ? n - 1 : 0;
  seq.active = true;
  ui().set({ active: true, playing: true });
  const up = async () => {
    for (let i = 0; i < n && seq.active; i++) await visit(i, 1);
  };
  const down = async () => {
    for (let i = n - 1; i >= 0 && seq.active; i--) await visit(i, -1);
  };
  for (let r = 0; r < Math.max(1, rounds) && seq.active; r++) {
    if (mode === 'up') await up();
    else if (mode === 'updown') {
      await up();
      await down();
    } else {
      await down();
      await up();
    }
  }
  const done = seq.active;
  seq.active = false;
  dharanaFrame.sounding = null;
  ui().set({ playing: false, status: done ? 'Complete' : '' });
}

/** Stop playback; `reset` also switches all chakras off and leaves Dharana mode. */
export function stopDharana(reset = true) {
  seq.stop();
  dharanaFrame.sounding = null;
  ui().set({ playing: false });
  if (reset) {
    dharanaFrame.enabled = false;
    dharanaFrame.lit.clear();
    dharanaFrame.t = dharanaFrame.target = 0;
    ui().set({ active: false, status: '', current: null });
  }
}

/** Switch one chakra on (voice or tap) and move the diamond there. */
export function activateChakra(id: ChakraId) {
  if (!dharanaFrame.enabled) {
    dharanaFrame.enabled = true;
    dharanaFrame.lit.clear();
  }
  const i = idx(id);
  const dir: 1 | -1 = i >= dharanaFrame.t ? 1 : -1;
  dharanaFrame.target = i;
  dharanaFrame.lit.set(id, dir);
  ui().set({ active: true, current: id, status: `${CHAKRAS[i].name} on (${CHANT[id].iast})` });
}

/* ------------------------------------------------------------------ voice */

/** Map a heard word to a chakra by its bija (Latin or Devanagari), or by the chakra's name. */
export function matchBija(raw: string): ChakraId | null {
  const s = raw
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\s]/gu, ' ');
  const words = s.split(/\s+/).filter(Boolean);
  for (const c of CHAKRAS) if (words.some((w) => w.startsWith(c.id.slice(0, 5)))) return c.id;
  if (/(hreem|hrim|hreen|shreem|shrim|guru|ह्रीं|ह्री|श्रीं|गुरु)/.test(s)) return 'sahasrara';
  for (const w of words) {
    if (w.length > 6) continue;
    if (/^(ॐ|ओम|ओं|om|aum|ohm|ome|home)$/.test(w)) return 'ajna';
    if (/^(ल|lam|lum|lom|lamb|lahm)/.test(w)) return 'muladhara';
    if (/^(व|वं|vam|vum|wam|wum|vom|bam|bum)/.test(w)) return 'svadhisthana';
    if (/^(र|ram|rum|rom|rahm)/.test(w)) return 'manipura';
    if (/^(य|yam|yum|yom|yahm|jam)/.test(w)) return 'anahata';
    if (/^(ह|ham|hum|hom|hahm)/.test(w)) return 'vishuddha';
  }
  return null;
}

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const Recognition = () =>
  (window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
export const voiceSupported = () => !!Recognition();

let rec: Rec | null = null;
let wantListening = false;

export function startListening() {
  const R = Recognition();
  if (!R) {
    ui().set({ heard: 'Speech recognition is not available in this browser (use Chrome, Edge or Safari).' });
    return;
  }
  wantListening = true;
  const r = new R();
  r.lang = 'hi-IN'; // reads "लं / वं / ॐ" best; Latin "lam, vam…" also matched
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 4;
  let lastHit = '';
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      for (let a = 0; a < res.length; a++) {
        const text = res[a].transcript.trim();
        const id = matchBija(text);
        if (id) {
          const key = `${i}:${id}`;
          if (key !== lastHit) {
            lastHit = key;
            activateChakra(id);
          }
          ui().set({ heard: `“${text}” → ${CHAKRAS[idx(id)].name}` });
          break;
        }
        if (a === 0) ui().set({ heard: `“${text}”` });
      }
    }
  };
  r.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wantListening = false;
      ui().set({ listening: false, heard: 'Microphone permission was denied.' });
    } else if (e.error === 'network') {
      ui().set({ heard: 'Voice recognition needs an internet connection in this browser.' });
    }
  };
  r.onend = () => {
    // browsers end sessions after silence — keep listening until the user turns it off
    if (wantListening) {
      try {
        r.start();
      } catch {
        /* already restarting */
      }
    } else ui().set({ listening: false });
  };
  rec = r;
  try {
    r.start();
    ui().set({ listening: true, heard: 'Listening… say Lam, Vam, Ram, Yam, Ham, Om or Hreem' });
  } catch {
    ui().set({ heard: 'Could not start the microphone.' });
  }
}

export function stopListening() {
  wantListening = false;
  rec?.stop();
  rec = null;
  ui().set({ listening: false });
}
if (import.meta.env?.DEV) (window as unknown as { __dharana: typeof dharanaFrame }).__dharana = dharanaFrame;
if (import.meta.env?.DEV) (window as unknown as { __dharanaApi: object }).__dharanaApi = { activateChakra };

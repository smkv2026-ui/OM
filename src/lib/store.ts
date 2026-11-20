import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChakraId, NadiId, PranaId } from '../data';
import type { FigureView } from '../figures/geometry';
import type { AsanaId, MudraId } from '../figures/pose';

export type Theme = 'light' | 'dark';
export type MotionPref = 'system' | 'reduce' | 'full';
export type SheetState =
  | { type: 'chakra'; id: ChakraId }
  | { type: 'prana'; id: PranaId }
  | { type: 'nadi'; id: NadiId }
  | null;

interface Settings {
  theme: Theme;
  motion: MotionPref;
  bookmarks: string[];
  homeView: FigureView;
  matrika: boolean;
  chantVoice: boolean;
  asana: AsanaId;
  mudra: MudraId;
  /** bandhas switched on (Prāṇāyāma) */
  bandhas: Record<'mula' | 'uddiyana' | 'jalandhara', boolean>;
  setBandha: (id: 'mula' | 'uddiyana' | 'jalandhara', on: boolean) => void;
  /** per-prāṇāyāma ratio and seconds per count */
  pranayamaPrefs: Record<string, { ratio: number[]; unit: number }>;
  setPranayamaPref: (id: string, pref: { ratio: number[]; unit: number } | null) => void;
  /** practice log by local date (YYYY-MM-DD) */
  practiceLog: Record<string, { sets: number; counts: number; seconds: number }>;
  logPractice: (sets: number, counts: number, seconds: number) => void;
  clearPracticeLog: () => void;
  setAsana: (a: AsanaId) => void;
  setMudra: (m: MudraId) => void;
  setTheme: (t: Theme) => void;
  setMotion: (m: MotionPref) => void;
  toggleBookmark: (id: string) => void;
  clearBookmarks: () => void;
  setHomeView: (v: FigureView) => void;
  setMatrika: (on: boolean) => void;
  setChantVoice: (on: boolean) => void;
}

const initialTheme = (): Theme =>
  (document.documentElement.dataset.theme as Theme) ||
  (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      theme: initialTheme(),
      motion: 'system',
      bookmarks: [],
      homeView: 'front',
      matrika: false,
      chantVoice: true,
      asana: 'padmasana',
      mudra: 'jnana',
      bandhas: { mula: false, uddiyana: false, jalandhara: false },
      setBandha: (id, on) => set((st) => ({ bandhas: { ...st.bandhas, [id]: on } })),
      pranayamaPrefs: {},
      setPranayamaPref: (id, pref) =>
        set((st) => {
          const next = { ...st.pranayamaPrefs };
          if (pref) next[id] = pref;
          else delete next[id];
          return { pranayamaPrefs: next };
        }),
      practiceLog: {},
      logPractice: (sets, counts, seconds) =>
        set((st) => {
          const d = new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const cur = st.practiceLog[key] ?? { sets: 0, counts: 0, seconds: 0 };
          return { practiceLog: { ...st.practiceLog, [key]: { sets: cur.sets + sets, counts: cur.counts + counts, seconds: cur.seconds + seconds } } };
        }),
      clearPracticeLog: () => set({ practiceLog: {} }),
      setAsana: (asana) => set({ asana }),
      setMudra: (mudra) => set({ mudra }),
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id],
        })),
      clearBookmarks: () => set({ bookmarks: [] }),
      setHomeView: (homeView) => set({ homeView }),
      setMatrika: (matrika) => set({ matrika }),
      setChantVoice: (chantVoice) => set({ chantVoice }),
    }),
    { name: 'om-settings', version: 1 },
  ),
);

interface UiState {
  sheet: SheetState;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
}

export const useUi = create<UiState>()((set) => ({
  sheet: null,
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
}));

export const openChakra = (id: ChakraId) => useUi.getState().openSheet({ type: 'chakra', id });
export const openPrana = (id: PranaId) => useUi.getState().openSheet({ type: 'prana', id });
export const openNadi = (id: NadiId) => useUi.getState().openSheet({ type: 'nadi', id });

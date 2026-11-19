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

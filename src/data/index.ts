import chakrasRaw from './chakras.json';
import pranasRaw from './pranas.json';
import nadisRaw from './nadis.json';
import granthasRaw from './granthas.json';

export type ChakraId =
  | 'muladhara'
  | 'svadhisthana'
  | 'manipura'
  | 'anahata'
  | 'vishuddha'
  | 'ajna'
  | 'sahasrara';
export type PranaId = 'prana' | 'samana' | 'apana' | 'udana' | 'vyana';
export type NadiId = 'sushumna' | 'ida' | 'pingala';

export interface Letter {
  deva: string;
  iast: string;
}

export interface Chakra {
  id: ChakraId;
  order: number;
  sensorId: string;
  sensorName: string;
  name: string;
  deva: string;
  iast: string;
  english: string;
  location: string;
  spinal: string;
  element: { name: string; deva: string; iast: string };
  bija: Letter;
  petals: {
    count: number;
    start?: number;
    angles?: number[];
    shape: 'broad' | 'almond' | 'layered' | 'wide' | 'sahasra';
    letters: Letter[];
  };
  geometry: string;
  color: { primary: string; secondary?: string; ink: string; rainbow?: boolean; label: string };
  deity: string;
  shakti: string;
  meditation: string;
  nadis: string;
  pranas: PranaId[];
  scriptures: string[];
  position: { frontY: number; sideX: number; sideY: number; size: number };
  targetYRatio: number;
  omSpokes: number;
  omSpokesNote?: string;
}

export interface Prana {
  id: PranaId;
  name: string;
  deva: string;
  iast: string;
  color: string;
  glow?: string;
  zone: string;
  direction: string;
  function: string;
  breath: string;
  chakras: ChakraId[];
  practice: string;
  scriptures: string[];
  needsVerification: boolean;
}

export interface Nadi {
  id: NadiId;
  name: string;
  deva: string;
  iast: string;
  aka: string;
  quality: string;
  color: string;
  colorLight: string;
  side: string;
  course: string;
  description: string;
  practice: string;
  scriptures: string[];
}

export interface Verse {
  sanskrit?: string;
  transliteration?: string;
  translation: string;
  citation: string;
  verify?: boolean;
}

export type GranthaCategory = 'Upanishad' | 'Tantra' | 'Yoga text' | 'Purana' | 'Other';

export interface Grantha {
  id: string;
  title: string;
  deva?: string;
  category: GranthaCategory;
  tradition: string;
  summary: string;
  keyTeachings: string[];
  relevance: string;
  chakras: ChakraId[];
  pranas: PranaId[];
  nadis: NadiId[];
  verses: Verse[];
  related: string[];
  needsVerification: boolean;
}

/** Ordered root → crown. */
export const CHAKRAS = (chakrasRaw as Chakra[]).slice().sort((a, b) => a.order - b.order);
export const PRANAS = pranasRaw as Prana[];
export const NADIS = nadisRaw as Nadi[];
export const GRANTHAS = granthasRaw as Grantha[];

export const chakraById = (id: string) => CHAKRAS.find((c) => c.id === id);
export const pranaById = (id: string) => PRANAS.find((p) => p.id === id);
export const nadiById = (id: string) => NADIS.find((n) => n.id === id);
export const granthaById = (id: string) => GRANTHAS.find((g) => g.id === id);

/** Light-theme-safe stroke colour for a chakra (milk-white / silver need an ink outline). */
export const chakraInk = (c: Chakra, theme: 'light' | 'dark') =>
  theme === 'light' ? c.color.ink : c.color.primary;

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const MATRIKA_TOTAL = CHAKRAS.reduce((n, c) => n + c.petals.letters.length, 0);

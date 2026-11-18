import { useEffect, useState } from 'react';
import { useSettings } from './store';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** System prefers-reduced-motion, overridable in Settings. */
export function useReducedMotion() {
  const sys = useMedia('(prefers-reduced-motion: reduce)');
  const pref = useSettings((s) => s.motion);
  return pref === 'system' ? sys : pref === 'reduce';
}

export const useIsDesktop = () => useMedia('(min-width: 1024px)');

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    addEventListener('online', up);
    addEventListener('offline', down);
    return () => {
      removeEventListener('online', up);
      removeEventListener('offline', down);
    };
  }, []);
  return on;
}

/** Read a CSS custom property from :root (for canvas/3D re-theming). */
export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

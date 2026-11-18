import { flushSync } from 'react-dom';
import { useSettings, type Theme } from './store';

const META = { dark: '#07061a', light: '#f6efe1' } as const;

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', META[t]));
  window.dispatchEvent(new CustomEvent('om-theme', { detail: t }));
}

/**
 * Sun/moon toggle with a circular reveal from the button (View Transitions API),
 * falling back to a soft colour cross-fade.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const { theme, setTheme } = useSettings.getState();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

  if (!doc.startViewTransition || reduce) {
    document.documentElement.classList.add('theme-fade');
    flushSync(() => setTheme(next));
    applyTheme(next);
    setTimeout(() => document.documentElement.classList.remove('theme-fade'), 700);
    return;
  }
  const x = origin?.x ?? innerWidth - 40;
  const y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = doc.startViewTransition(() => {
    flushSync(() => setTheme(next));
    applyTheme(next);
  });
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
}

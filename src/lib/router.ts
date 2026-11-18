import { useSyncExternalStore } from 'react';

/** Minimal hash router — works on every static host with zero server config. */
const read = () => {
  const h = window.location.hash.replace(/^#\/?/, '');
  return '/' + h.split('?')[0].replace(/\/$/, '');
};

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): string {
  return useSyncExternalStore(subscribe, read, () => '/');
}

export function navigate(path: string) {
  const next = '#' + (path.startsWith('/') ? path : '/' + path);
  if (window.location.hash !== next) window.location.hash = next;
}

export type TabId = 'home' | 'nadi' | 'prana' | '3d' | 'library';

export function tabFor(route: string): TabId | 'settings' {
  if (route.startsWith('/nadi')) return 'nadi';
  if (route.startsWith('/prana')) return 'prana';
  if (route.startsWith('/3d')) return '3d';
  if (route.startsWith('/library')) return 'library';
  if (route.startsWith('/settings')) return 'settings';
  return 'home';
}

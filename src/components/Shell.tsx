import { useEffect, useState, type ReactNode } from 'react';
import { navigate, tabFor, useRoute, type TabId } from '../lib/router';
import { useOnline } from '../lib/hooks';
import { useSettings } from '../lib/store';
import { toggleTheme } from '../lib/theme';
import { BookIcon, CubeIcon, DownloadIcon, GearIcon, LotusIcon, MoonIcon, SunIcon, WavesIcon, WindIcon } from './Icons';

export const TABS: { id: TabId; label: string; path: string; Icon: (p: { size?: number }) => ReactNode }[] = [
  { id: 'home', label: 'Home', path: '/', Icon: LotusIcon },
  { id: 'nadi', label: 'Nadi Harmony', path: '/nadi', Icon: WavesIcon },
  { id: 'prana', label: 'Prana', path: '/prana', Icon: WindIcon },
  { id: '3d', label: '3D', path: '/3d', Icon: CubeIcon },
  { id: 'library', label: 'Library', path: '/library', Icon: BookIcon },
];

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="stars" />
      <div className="stars s2" />
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />
    </div>
  );
}

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme);
  const dark = theme === 'dark';
  return (
    <button
      className="btn btn-icon !rounded-full"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
    >
      <span className="relative block h-[22px] w-[22px]">
        <span
          className="absolute inset-0 transition-all duration-500"
          style={{ opacity: dark ? 1 : 0, transform: dark ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(.4)' }}
        >
          <MoonIcon />
        </span>
        <span
          className="absolute inset-0 text-gold transition-all duration-500"
          style={{ opacity: dark ? 0 : 1, transform: dark ? 'rotate(90deg) scale(.4)' : 'rotate(0) scale(1)' }}
        >
          <SunIcon />
        </span>
      </span>
    </button>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BIPEvent;
  listeners.forEach((l) => l());
});
addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((l) => l());
});

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    canInstall: !!deferred,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      listeners.forEach((l) => l());
    },
  };
}

export function TopBar({ title, subtitle, actions }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  const route = useRoute();
  const online = useOnline();
  const { canInstall, install } = useInstall();
  return (
    <header className="pt-safe relative z-30 flex shrink-0 items-center gap-3 px-4 pt-2 pb-2 lg:px-6 lg:pt-4">
      <a
        href="#/"
        className="flex min-h-11 items-center gap-2 lg:hidden"
        aria-label="Om — Home"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        <span className="font-deva text-2xl leading-none text-gold" aria-hidden>
          ॐ
        </span>
      </a>
      <div className="min-w-0 flex-1">
        {title && <h1 className="font-display truncate text-[1.45rem] leading-tight font-semibold lg:text-[1.9rem]">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-muted lg:text-sm">{subtitle}</p>}
      </div>
      {!online && (
        <span role="status" className="glass rounded-full px-3 py-1 text-xs text-muted" title="You are offline — everything still works">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[var(--gold)]" />
          Offline
        </span>
      )}
      {actions}
      {canInstall && (
        <button className="btn btn-icon !rounded-full" onClick={install} aria-label="Install app" title="Install app">
          <DownloadIcon size={20} />
        </button>
      )}
      <ThemeToggle />
      <button
        className={`btn btn-icon !rounded-full ${route.startsWith('/settings') ? 'is-active' : ''}`}
        aria-label="Settings"
        title="Settings"
        onClick={() => navigate('/settings')}
      >
        <GearIcon size={20} />
      </button>
    </header>
  );
}

export function TabBar() {
  const route = useRoute();
  const active = tabFor(route);
  return (
    <nav className="glass-strong pb-safe relative z-30 shrink-0 border-x-0 border-b-0 lg:hidden" aria-label="Main">
      <ul className="flex">
        {TABS.map(({ id, label, path, Icon }) => {
          const on = active === id;
          return (
            <li key={id} className="flex-1">
              <a
                href={`#${path}`}
                aria-current={on ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(path);
                }}
                className="relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[0.66rem] font-medium"
                style={{ color: on ? 'var(--text)' : 'var(--muted)' }}
              >
                {on && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-[2px] w-8 rounded-full"
                    style={{ background: 'var(--gold)', boxShadow: '0 0 12px var(--gold)' }}
                  />
                )}
                <span style={{ color: on ? (id === 'nadi' ? 'var(--accent)' : 'var(--gold)') : undefined }}>
                  <Icon size={id === 'nadi' ? 24 : 22} />
                </span>
                <span className="max-w-full truncate">{id === 'nadi' ? 'Nadi' : label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function NavRail() {
  const route = useRoute();
  const active = tabFor(route);
  return (
    <nav className="glass pl-safe relative z-30 m-3 hidden w-[92px] shrink-0 flex-col items-center gap-1 rounded-3xl py-4 lg:flex" aria-label="Main">
      <a
        href="#/"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        aria-label="Om — Home"
      >
        <span className="font-deva text-[2rem] leading-none text-gold" style={{ textShadow: '0 0 18px var(--gold)' }} aria-hidden>
          ॐ
        </span>
      </a>
      {TABS.map(({ id, label, path, Icon }) => {
        const on = active === id;
        return (
          <a
            key={id}
            href={`#${path}`}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(path);
            }}
            className="group relative flex w-[76px] flex-col items-center gap-1 rounded-2xl py-2.5 text-center text-[0.68rem] leading-tight font-medium transition-colors"
            style={{
              color: on ? 'var(--text)' : 'var(--muted)',
              background: on ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : undefined,
            }}
          >
            <span
              className="transition-transform group-hover:scale-110"
              style={{ color: on ? (id === 'nadi' ? 'var(--accent)' : 'var(--gold)') : undefined }}
            >
              <Icon size={24} />
            </span>
            {label}
          </a>
        );
      })}
    </nav>
  );
}

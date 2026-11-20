import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Backdrop, NavRail, TabBar } from './components/Shell';
import { DetailSheets } from './views/DetailSheets';
import Home from './views/Home';
import { useReducedMotion } from './lib/hooks';
import { useRoute } from './lib/router';
import { useSettings } from './lib/store';
import { applyTheme } from './lib/theme';
import { unlockAudio } from './engine/audioContext';

const NadiHarmony = lazy(() => import('./views/NadiHarmony'));
const Prana = lazy(() => import('./views/Prana'));
const Pranayama = lazy(() => import('./views/Pranayama'));
const ThreeD = lazy(() => import('./views/ThreeD'));
const Library = lazy(() => import('./views/Library'));
const Settings = lazy(() => import('./views/Settings'));
const DevGallery = import.meta.env.DEV ? lazy(() => import('./views/DevGallery')) : null;

function View({ route }: { route: string }) {
  if (route.startsWith('/nadi')) return <NadiHarmony />;
  if (route.startsWith('/pranayama')) return <Pranayama />;
  if (route.startsWith('/prana')) return <Prana />;
  if (route.startsWith('/3d')) return <ThreeD />;
  if (route.startsWith('/library')) return <Library route={route} />;
  if (route.startsWith('/settings')) return <Settings />;
  if (DevGallery && route.startsWith('/dev/yantras')) return <DevGallery />;
  return <Home />;
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <span className="font-deva anim-glow text-5xl text-gold" aria-hidden>
        ॐ
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (offlineReady) {
      const t = setTimeout(() => setOfflineReady(false), 4000);
      return () => clearTimeout(t);
    }
  }, [offlineReady, setOfflineReady]);
  if (!needRefresh && !offlineReady) return null;
  return (
    <div role="status" className="glass fixed top-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-2 text-sm">
      {needRefresh ? (
        <>
          <span>A new version is ready.</span>
          <button className="btn !min-h-9" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
          <button className="btn !min-h-9" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </>
      ) : (
        <span>Ready to work offline.</span>
      )}
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const theme = useSettings((s) => s.theme);
  const motionPref = useSettings((s) => s.motion);
  const reduce = useReducedMotion();

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', motionPref === 'reduce');
    root.classList.toggle('force-motion', motionPref === 'full');
  }, [motionPref]);
  // iOS / autoplay: resume the shared AudioContext inside the first user gesture.
  useEffect(() => {
    const once = () => unlockAudio();
    addEventListener('pointerdown', once, { once: true, capture: true });
    addEventListener('keydown', once, { once: true, capture: true });
    return () => {
      removeEventListener('pointerdown', once, { capture: true });
      removeEventListener('keydown', once, { capture: true });
    };
  }, []);

  const key = route.split('/')[1] || 'home';
  return (
    <div className="relative flex h-full flex-col lg:flex-row">
      <Backdrop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-[var(--surface-strong)] focus:p-2">
        Skip to content
      </a>
      <NavRail />
      <main id="main" className="pl-safe pr-safe relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            className="flex min-h-0 flex-1 flex-col"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<Loading />}>
              <View route={route} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
      <DetailSheets />
      <UpdatePrompt />
    </div>
  );
}

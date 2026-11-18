import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';
import { CloseIcon } from './Icons';

/**
 * Modal detail surface: bottom sheet on phones (drag down to dismiss), right side panel on desktop.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  accent?: string;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => panel.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const dur = reduce ? 0 : 0.42;
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-black/30 lg:bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur * 0.6 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="panel"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={
              desktop
                ? 'glass-strong fixed top-3 right-3 bottom-3 z-50 flex w-[440px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl outline-none'
                : 'glass-strong pb-safe fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[28px] outline-none'
            }
            style={{ borderTop: accent ? `1px solid color-mix(in oklab, ${accent} 50%, transparent)` : undefined }}
            initial={desktop ? { x: 480, opacity: 0.6 } : { y: '100%' }}
            animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={desktop ? { x: 480, opacity: 0 } : { y: '100%' }}
            transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: dur }}
            drag={desktop ? false : 'y'}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            {accent && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
                style={{ background: `radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, ${accent} 35%, transparent), transparent 70%)` }}
              />
            )}
            <div
              className="relative flex shrink-0 items-center justify-between px-4 pt-2 pb-1"
              onPointerDown={(e) => !desktop && drag.start(e)}
              style={{ touchAction: 'none' }}
            >
              {!desktop ? <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-hi)]" aria-hidden /> : <span />}
              <button className="btn btn-icon absolute top-2 right-3 !min-h-10 !w-10 !rounded-full" onClick={onClose} aria-label="Close">
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="scroll-y relative min-h-0 flex-1 px-5 pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Non-modal control dock: collapsible bottom sheet on phones (sits above the tab bar),
 * collapsible right-hand panel on desktop.
 */
export function Dock({
  open,
  onToggle,
  title,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  if (desktop) {
    return (
      <aside
        className={`glass relative z-20 m-3 ml-0 flex shrink-0 flex-col overflow-hidden rounded-3xl transition-[width] duration-300 ${
          open ? 'w-[360px]' : 'w-14'
        }`}
        aria-label="Controls"
      >
        <button
          className="flex min-h-14 items-center gap-3 px-4 text-left"
          onClick={onToggle}
          aria-expanded={open}
          title={open ? 'Collapse panel' : 'Expand panel'}
        >
          <span className={`text-lg transition-transform ${open ? '' : 'rotate-180'}`} aria-hidden>
            ›
          </span>
          {open && <span className="eyebrow !text-[0.72rem]">{title}</span>}
        </button>
        {open && <div className="scroll-y min-h-0 flex-1 px-5 pb-6">{children}</div>}
      </aside>
    );
  }
  return (
    <motion.div
      className="glass-strong absolute inset-x-2 bottom-2 z-20 flex flex-col overflow-hidden rounded-3xl"
      animate={{ height: open ? 'min(64dvh, 560px)' : 60 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="flex min-h-[60px] shrink-0 items-center gap-3 px-4 text-left" onClick={onToggle} aria-expanded={open}>
        <span className="h-1.5 w-8 rounded-full bg-[var(--border-hi)]" aria-hidden />
        <span className="flex-1">
          <span className="eyebrow block">{title}</span>
          {summary && <span className="block truncate text-xs text-muted">{summary}</span>}
        </span>
        <span className={`text-muted transition-transform ${open ? 'rotate-90' : '-rotate-90'}`} aria-hidden>
          ›
        </span>
      </button>
      <div className={`scroll-y min-h-0 flex-1 px-4 pb-5 ${open ? '' : 'invisible'}`}>{children}</div>
    </motion.div>
  );
}

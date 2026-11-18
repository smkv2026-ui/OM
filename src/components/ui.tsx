import { useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode, type PointerEvent } from 'react';

/** Button with a soft ripple on press. */
export function Button({
  className = '',
  children,
  onPointerDown,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = el.getBoundingClientRect();
      const s = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      el.appendChild(span);
      setTimeout(() => span.remove(), 650);
    }
    onPointerDown?.(e);
  };
  return (
    <button ref={ref} type="button" className={`btn ${className}`} onPointerDown={down} {...rest}>
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  color,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  color?: string;
  id?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm" htmlFor={id}>
      <span className="text-muted">{label}</span>
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className="h-6 w-11 rounded-full border border-line bg-[var(--surface-hover)] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)]"
          style={checked ? { background: color ?? 'var(--accent)', borderColor: 'transparent' } : undefined}
        />
        <span
          className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : undefined }}
        />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="glass relative flex rounded-2xl p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-xl px-3 font-medium transition-colors ${
              size === 'sm' ? 'min-h-9 text-xs' : 'min-h-11 text-sm'
            } ${active ? 'text-text' : 'text-muted hover:text-text'}`}
            style={
              active
                ? {
                    background: 'color-mix(in oklab, var(--accent) 18%, transparent)',
                    boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--accent) 55%, transparent)',
                  }
                : undefined
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  color,
  valueText,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  color?: string;
  valueText?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      aria-valuetext={valueText}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--fill': `${fill}%`, '--track-color': color } as CSSProperties}
    />
  );
}

export function Section({ title, children, aside }: { title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-line pb-1.5">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Chip({
  active,
  children,
  onClick,
  color,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color ?? 'var(--accent)' : 'var(--border)',
        background: active ? `color-mix(in oklab, ${color ?? 'var(--accent)'} 18%, transparent)` : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
      }}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'warn' | 'muted' }) {
  const c = tone === 'warn' ? 'var(--magenta)' : tone === 'muted' ? 'var(--faint)' : 'var(--gold)';
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold tracking-wide"
      style={{ borderColor: `color-mix(in oklab, ${c} 50%, transparent)`, color: tone === 'gold' ? 'var(--gold-ink)' : c }}
    >
      {children}
    </span>
  );
}

/** Number box with − / + buttons, and a seconds formatter (used by Prāṇāyāma and KP). */
export const fmt = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m${sec % 60 ? ` ${Math.round(sec % 60)}s` : ''}` : `${Math.round(sec)}s`);

export function Stepper({ label, value, min, max, onChange, sub, color, wide }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; sub?: string; color?: string; wide?: boolean }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v) || 0)));
  return (
    <div className={`glass flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 ${wide ? 'w-[132px] shrink-0' : ''}`}>
      <span className="flex items-center gap-1 text-[0.7rem] text-muted">
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn btn-icon !h-8 !min-h-8 !w-8 !min-w-8 !rounded-full !p-0" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`${label}: less`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={label}
          className="h-8 w-10 rounded-lg border border-line bg-transparent text-center text-base text-text tabular-nums"
        />
        <button className="btn btn-icon !h-8 !min-h-8 !w-8 !min-w-8 !rounded-full !p-0" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`${label}: more`}>
          +
        </button>
      </div>
      {sub && <span className="text-[0.66rem] text-faint tabular-nums">{sub}</span>}
    </div>
  );
}


import { useState } from 'react';
import { NADIS } from '../data';
import { LayersIcon } from './Icons';
import { Chip } from './ui';

/** The subtle-anatomy layers every view can show or hide. */
export interface AnatomyLayers {
  chakras: boolean;
  sushumna: boolean;
  ida: boolean;
  pingala: boolean;
  spine: boolean;
}

const nadiColor = (id: string) => NADIS.find((n) => n.id === id)!.color;

export const LAYER_ITEMS: { key: keyof AnatomyLayers; label: string; color?: string }[] = [
  { key: 'chakras', label: 'Chakras', color: '#c9a7ff' },
  { key: 'sushumna', label: 'Sushumna', color: nadiColor('sushumna') },
  { key: 'ida', label: 'Ida', color: nadiColor('ida') },
  { key: 'pingala', label: 'Pingala', color: nadiColor('pingala') },
  { key: 'spine', label: 'Spine' },
];

/** Chip row for the anatomy layers, plus a "Sushumna only" shortcut. */
export function LayerChips<T extends AnatomyLayers>({
  value,
  onChange,
  extra = [],
}: {
  value: T;
  onChange: (v: T) => void;
  extra?: { key: keyof T; label: string; color?: string }[];
}) {
  const items = [...LAYER_ITEMS, ...extra] as { key: keyof T; label: string; color?: string }[];
  const onlySushumna = value.sushumna && !value.ida && !value.pingala;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Layers">
      {items.map((it) => (
        <Chip key={String(it.key)} active={!!value[it.key]} color={it.color} onClick={() => onChange({ ...value, [it.key]: !value[it.key] })}>
          {it.label}
        </Chip>
      ))}
      <Chip
        active={onlySushumna}
        onClick={() => onChange({ ...value, sushumna: true, ida: onlySushumna, pingala: onlySushumna })}
      >
        Sushumna only
      </Chip>
    </div>
  );
}

/** A "Layers" button that reveals the chip row (keeps crowded headers clean). */
export function LayerMenu<T extends AnatomyLayers>(props: { value: T; onChange: (v: T) => void; extra?: { key: keyof T; label: string; color?: string }[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!props.defaultOpen);
  return (
    <>
      <button className="btn !min-h-9 text-xs" aria-pressed={open} aria-expanded={open} onClick={() => setOpen(!open)}>
        <LayersIcon size={16} /> Layers
      </button>
      {open && (
        <div className="w-full">
          <LayerChips {...props} />
        </div>
      )}
    </>
  );
}

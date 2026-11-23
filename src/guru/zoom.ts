import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

/**
 * Zoom and pan for an SVG by changing its viewBox: wheel / pinch to zoom (about the pointer),
 * drag to pan, double-tap to zoom in, reset to fit.
 */
export function useZoom(base: { x: number; y: number; w: number; h: number }, max = 8) {
  const [v, setV] = useState({ k: 1, cx: base.x + base.w / 2, cy: base.y + base.h / 2 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const el = useRef<SVGSVGElement | null>(null);
  const w = base.w / v.k, h = base.h / v.k;
  const viewBox = `${v.cx - w / 2} ${v.cy - h / 2} ${w} ${h}`;

  /** svg units per screen pixel, and the svg point under a client position */
  const map = (clientX: number, clientY: number) => {
    const r = el.current!.getBoundingClientRect();
    const s = Math.max(w / r.width, h / r.height);
    const ox = r.left + (r.width - w / s) / 2, oy = r.top + (r.height - h / s) / 2;
    return { s, x: v.cx - w / 2 + (clientX - ox) * s, y: v.cy - h / 2 + (clientY - oy) * s };
  };
  const zoomAt = useCallback(
    (k: number, at?: { x: number; y: number }) =>
      setV((o) => {
        const nk = Math.max(1, Math.min(max, k));
        if (!at) return { ...o, k: nk };
        const f = o.k / nk;
        return { k: nk, cx: at.x + (o.cx - at.x) * f, cy: at.y + (o.cy - at.y) * f };
      }),
    [max],
  );
  const reset = () => setV({ k: 1, cx: base.x + base.w / 2, cy: base.y + base.h / 2 });

  const bind = {
    ref: (e: SVGSVGElement | null) => void (el.current = e),
    style: { touchAction: 'none', cursor: v.k > 1 ? 'grab' : 'zoom-in' } as const,
    onWheel: (e: WheelEvent<SVGSVGElement>) => {
      const p = map(e.clientX, e.clientY);
      zoomAt(v.k * Math.exp(-e.deltaY * 0.0015), p);
    },
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.current.size === 2) {
        const [a, b] = [...pts.current.values()];
        pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: v.k };
      }
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const prev = pts.current.get(e.pointerId);
      if (!prev) return;
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.current.size === 2 && pinch.current) {
        const [a, b] = [...pts.current.values()];
        const p = map((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomAt((pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d, p);
      } else if (pts.current.size === 1 && v.k > 1) {
        const { s } = map(e.clientX, e.clientY);
        setV((o) => ({ ...o, cx: o.cx - (e.clientX - prev.x) * s, cy: o.cy - (e.clientY - prev.y) * s }));
      }
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => {
      pts.current.delete(e.pointerId);
      if (pts.current.size < 2) pinch.current = null;
    },
    onPointerCancel: (e: PointerEvent<SVGSVGElement>) => {
      pts.current.delete(e.pointerId);
      pinch.current = null;
    },
    onDoubleClick: (e: React.MouseEvent<SVGSVGElement>) => {
      const p = map(e.clientX, e.clientY);
      zoomAt(v.k >= max / 2 ? 1 : v.k * 2, p);
    },
  };
  return { viewBox, bind, k: v.k, zoomIn: () => zoomAt(v.k * 1.5), zoomOut: () => zoomAt(v.k / 1.5), reset };
}

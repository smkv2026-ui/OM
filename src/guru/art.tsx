/**
 * The lotus with the Padukas, composed as in the reference image: the lotus, the Padukas resting on
 * it, and the lotus's centre bud drawn again over the heels so they sit inside the flower.
 * Either layer can be switched off. Units: the drawing is `w` wide, centred on (0, 0).
 */
import { useId } from 'react';

export const LOTUS_ASPECT = 958 / 1024; // height / width
export const PADUKA = { w: 0.47, cx: 0.505, top: 0.13, aspect: 788 / 800 };
/** centre bud of the lotus (fractions of the lotus image) */
const BUD = { cx: 0.505, cy: 0.668, rx: 0.108, ry: 0.078 };

export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function LotusPadukas({ w, lotus = true, padukas = true, art }: { w: number; lotus?: boolean; padukas?: boolean; art: { lotus: string; padukas: string } }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const h = w * LOTUS_ASPECT;
  const x0 = -w / 2, y0 = -h / 2;
  const pw = w * PADUKA.w, ph = pw * PADUKA.aspect;
  const lotusImg = <image href={asset(art.lotus)} x={x0} y={y0} width={w} height={h} preserveAspectRatio="none" />;
  return (
    <g>
      {lotus && lotusImg}
      {padukas && <image href={asset(art.padukas)} x={x0 + w * PADUKA.cx - pw / 2} y={y0 + h * PADUKA.top} width={pw} height={ph} preserveAspectRatio="none" />}
      {lotus && padukas && (
        <>
          <defs>
            <clipPath id={`bud${id}`}>
              <ellipse cx={x0 + w * BUD.cx} cy={y0 + h * BUD.cy} rx={w * BUD.rx} ry={h * BUD.ry} />
            </clipPath>
          </defs>
          <g clipPath={`url(#bud${id})`}>{lotusImg}</g>
        </>
      )}
    </g>
  );
}

/** Same composition on a canvas (for the 3D texture). */
export async function composeCanvas(art: { lotus: string; padukas: string }, lotus: boolean, padukas: boolean, W = 1024): Promise<HTMLCanvasElement> {
  const load = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = asset(src);
    });
  const [L, P] = await Promise.all([load(art.lotus), load(art.padukas)]);
  const H = Math.round(W * LOTUS_ASPECT);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  if (lotus) g.drawImage(L, 0, 0, W, H);
  if (padukas) {
    const pw = W * PADUKA.w;
    g.drawImage(P, W * PADUKA.cx - pw / 2, H * PADUKA.top, pw, pw * PADUKA.aspect);
  }
  if (lotus && padukas) {
    g.save();
    g.beginPath();
    g.ellipse(W * BUD.cx, H * BUD.cy, W * BUD.rx, H * BUD.ry, 0, 0, Math.PI * 2);
    g.clip();
    g.drawImage(L, 0, 0, W, H);
    g.restore();
  }
  return c;
}

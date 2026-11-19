import { useId } from 'react';
import { FRONT_ARM_GAPS, FRONT_EARRINGS, FRONT_LINEART, FRONT_OUTLINE } from './geometry';
import type { Part } from './draw';
import { EYE_PATCHES, openEyes, TORSO, TORSO_MASK, type PoseFigure } from './pose';

export type PoseMode = 'premium' | 'line' | 'illus';

const TORSO_D = `${FRONT_OUTLINE} ${FRONT_ARM_GAPS.join(' ')}`;

const useIds = () => {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (s: string) => `${u}-${s}`;
};

/**
 * Front view of a meditation pose, drawn from its ordered parts.
 *  premium — the app's translucent figure: one soft fill for the whole body, plus every part's
 *            outline with the hidden pieces removed (each outline is masked by the parts in front).
 *  line    — the same outlines in text colour, no fill.
 *  illus   — an opaque line illustration (cream fill, dark ink), painted back to front.
 */
export function PoseArt({ fp, mode }: { fp: PoseFigure; mode: PoseMode }) {
  const id = useIds();
  const parts: Part[] = fp.traced ? [{ d: TORSO }] : fp.parts;
  const clip = fp.traced ? undefined : `url(#${id('cut')})`;
  const eyesMask = fp.eyes === 'closed' ? undefined : `url(#${id('eyes')})`;
  const ink = mode === 'illus' ? 'var(--illus-ink)' : mode === 'line' ? 'var(--text)' : 'var(--body-line)';
  const w = mode === 'illus' ? 1.6 : mode === 'line' ? 1.3 : 1.05;

  const torsoInk = (
    <g clipPath={clip}>
      <path d={TORSO_D} fillRule="evenodd" fill="none" stroke={ink} strokeWidth={w} strokeLinejoin="round" />
      <g mask={eyesMask}>
        <path d={FRONT_LINEART} fill={ink} fillRule="evenodd" />
      </g>
    </g>
  );
  const outline = (p: Part, key: string | number) =>
    p.d === TORSO ? (
      <g key={key}>{torsoInk}</g>
    ) : (
      <g key={key}>
        {p.d && <path d={p.d} fill="none" stroke={ink} strokeWidth={w} strokeLinejoin="round" />}
        {p.lines?.map((l, j) => <path key={j} d={l} fill="none" stroke={ink} strokeWidth={w * 0.8} strokeLinecap="round" />)}
      </g>
    );
  const solid = (p: Part, key: string | number, fill: string) =>
    p.d === TORSO ? (
      <path key={key} d={TORSO_D} fillRule="evenodd" clipPath={clip} fill={fill} />
    ) : p.d ? (
      <path key={key} d={p.d} fill={fill} />
    ) : null;

  const defs = (
    <defs>
      <clipPath id={id('cut')}>
        <path d={TORSO_MASK} />
      </clipPath>
      <mask id={id('eyes')} maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
        <rect x="-400" y="-400" width="800" height="800" fill="#fff" />
        {EYE_PATCHES.map((d) => (
          <path key={d} d={d} fill="#000" />
        ))}
      </mask>
      <linearGradient id={id('skin')} x1="0" y1="-200" x2="0" y2="185" gradientUnits="userSpaceOnUse">
        <stop offset="0" style={{ stopColor: 'var(--pose-skin-top)' }} />
        <stop offset="1" style={{ stopColor: 'var(--pose-skin-bottom)' }} />
      </linearGradient>
      {mode !== 'illus' &&
        parts.map((_, i) => (
          <mask key={i} id={id(`occ${i}`)} maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
            <rect x="-400" y="-400" width="800" height="800" fill="#fff" />
            {parts.slice(i + 1).map((q, j) => solid(q, j, '#000'))}
          </mask>
        ))}
    </defs>
  );

  return (
    <g>
      {defs}
      {mode === 'illus' ? (
        parts.map((p, i) =>
          p.d === TORSO ? (
            <g key={i}>
              <path d={TORSO_D} fillRule="evenodd" clipPath={clip} fill="var(--illus-fill)" />
              {torsoInk}
            </g>
          ) : (
            <g key={i}>
              {p.d && <path d={p.d} fill="var(--illus-fill)" stroke={ink} strokeWidth={w} strokeLinejoin="round" />}
              {p.lines?.map((l, j) => <path key={j} d={l} fill="none" stroke={ink} strokeWidth={w * 0.8} strokeLinecap="round" />)}
            </g>
          ),
        )
      ) : (
        <>
          {mode === 'premium' && <g style={{ opacity: 'var(--pose-alpha)' }}>{parts.map((p, i) => solid(p, i, `url(#${id('skin')})`))}</g>}
          {parts.map((p, i) => (
            <g key={i} mask={`url(#${id(`occ${i}`)})`}>
              {outline(p, i)}
            </g>
          ))}
        </>
      )}
      <path d={FRONT_EARRINGS} fill="#d9a48c" fillRule="evenodd" />
      {fp.eyes !== 'closed' && <OpenEyes up={fp.eyes === 'up'} ink={ink} />}
    </g>
  );
}

function OpenEyes({ up, ink }: { up: boolean; ink: string }) {
  const e = openEyes(up);
  return (
    <g>
      {e.whites.map((d) => (
        <path key={d} d={d} fill="none" stroke={ink} strokeWidth={1} />
      ))}
      {e.irises.map((d) => (
        <path key={d} d={d} fill={ink} />
      ))}
    </g>
  );
}

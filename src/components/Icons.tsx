import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export const LotusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4c2 2.4 3 4.8 3 7.2S13.9 15.5 12 17c-1.9-1.5-3-3.4-3-5.8S10 6.4 12 4Z" />
    <path d="M9.2 9.6C7 8.6 4.8 8.4 3 8.8c.3 3.6 2.4 6.6 6.2 7.7M14.8 9.6c2.2-1 4.4-1.2 6.2-.8-.3 3.6-2.4 6.6-6.2 7.7" />
    <path d="M4 19.5c2.4.9 5.1 1.2 8 1.2s5.6-.3 8-1.2" />
  </svg>
);
export const WavesIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v18" />
    <path d="M12 21c-5-3-5-6 0-9s5-6 0-9" />
    <path d="M12 21c5-3 5-6 0-9s-5-6 0-9" />
  </svg>
);
export const WindIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h16a3 3 0 1 1-3 3" />
    <path d="M3 16h7" />
  </svg>
);
export const CubeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4z" />
    <path d="m4 7.4 8 4.6 8-4.6M12 12v9.2" />
  </svg>
);
export const BookIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M9 7.5h7M9 11h5" />
  </svg>
);
export const GearIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);
export const SunIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const MoonIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
  </svg>
);
export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const PlayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const StopIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </svg>
);
export const MicIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const UploadIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
);
export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const BookmarkIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 3h12v18l-6-4-6 4z" fill={filled ? 'currentColor' : 'none'} />
  </svg>
);
export const SlidersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);
export const ResetIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
export const SpeakerIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);
export const InfoIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </svg>
);
export const DownloadIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
  </svg>
);
export const LayersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);
export const OmGlyph = ({ className }: { className?: string }) => (
  <span className={`font-deva ${className ?? ''}`} aria-hidden>
    ॐ
  </span>
);

/** A pair of Padukas */
export const PadukaIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7.6 3.5c-2 0-3 1.6-3 4 0 1.8.8 2.8.8 4.6 0 2.4-1 3.4-1 5.4 0 1.8 1.3 3 3.2 3s3.2-1.2 3.2-3c0-2-1-3-1-5.4 0-1.8.8-2.8.8-4.6 0-2.4-1-4-3-4Z" />
    <path d="M16.4 3.5c-2 0-3 1.6-3 4 0 1.8.8 2.8.8 4.6 0 2.4-1 3.4-1 5.4 0 1.8 1.3 3 3.2 3s3.2-1.2 3.2-3c0-2-1-3-1-5.4 0-1.8.8-2.8.8-4.6 0-2.4-1-4-3-4Z" />
    <circle cx="7.4" cy="16.6" r="1" />
    <circle cx="16.6" cy="16.6" r="1" />
  </svg>
);

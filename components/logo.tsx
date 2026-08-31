import type { SVGProps } from "react";

export function LogoMark({
  size = 36,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      id="brand-logo"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="logo-gloss" cx="0.25" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="logo-head" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="logo-arm-l" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#fcd34d" />
        </linearGradient>
        <linearGradient id="logo-arm-r" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="logo-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#92400e" floodOpacity="0.35" />
        </filter>
        <clipPath id="logo-squircle">
          <rect x="32" y="32" width="448" height="448" rx="112" />
        </clipPath>
      </defs>

      <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#logo-bg)" />

      <g clipPath="url(#logo-squircle)">
        <rect x="32" y="32" width="448" height="448" fill="url(#logo-gloss)" />
        <path d="M32 320 L480 96 L480 32 L32 32 Z" fill="#ffffff" opacity="0.05" />
      </g>

      <circle cx="256" cy="166" r="62" fill="url(#logo-head)" filter="url(#logo-soft)" />

      <g fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#logo-soft)">
        <path d="M124 254 L226 386" stroke="url(#logo-arm-l)" strokeWidth="70" />
        <path d="M226 386 L442 174" stroke="url(#logo-arm-r)" strokeWidth="70" />
      </g>
    </svg>
  );
}

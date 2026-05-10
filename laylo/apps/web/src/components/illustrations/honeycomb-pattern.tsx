'use client';

/**
 * HoneycombPattern — Group D (D1).
 *
 * Subtle geometric honeycomb motif rendered as a CSS background-image
 * (data URI). 4-5% opacity, behind content. Used as the background of
 * the Money + Vault hub pages — NOT on lists (would be noisy).
 *
 * Self-positions absolutely so the parent must be `position: relative`.
 *
 * Reduces motion implicitly (it's a static SVG).
 */
import * as React from 'react';

const HEX_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 96' width='56' height='96'>
  <g fill='none' stroke='#F8E71C' stroke-width='1.4'>
    <polygon points='28,2 54,16 54,46 28,60 2,46 2,16' />
    <polygon points='28,50 54,64 54,94 28,108 2,94 2,64' />
    <polygon points='0,2 14,-6 28,2 28,32 14,40 0,32' />
    <polygon points='56,2 70,-6 84,2 84,32 70,40 56,32' />
  </g>
</svg>
`.trim();

const dataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(HEX_SVG)}")`;

interface HoneycombPatternProps {
  /** 0–1 opacity. Default 0.05 (5%). Brief cap. */
  opacity?: number;
  /** Pattern tile size in px. Default 84. */
  size?: number;
  className?: string;
}

export function HoneycombPattern({
  opacity = 0.05,
  size = 84,
  className,
}: HoneycombPatternProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none absolute inset-0 -z-10',
        className ?? '',
      ].join(' ')}
      style={{
        backgroundImage: dataUri,
        backgroundRepeat: 'repeat',
        backgroundSize: `${size}px ${(size / 56) * 96}px`,
        opacity,
      }}
    />
  );
}

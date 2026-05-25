/**
 * BeeFlying — tiny cartoon bee for ambient flying animations.
 *
 * Distinct from <BeeStanding/> (the elaborate brand mascot used in
 * splash, auth hero, and empty states). This is the small generic
 * bumblebee that drifts across the auth screen behind the form —
 * yellow body with two black stripes, grey wings, one eye. Reads as
 * "🐝" at small sizes.
 *
 * Used by `BeeFlyBy` in loop mode. Theme-independent (fixed brand
 * hexes — yellow body + black outline always pop against either
 * canvas mode).
 */
import * as React from 'react';

const GOLD = '#F8E71C';
const BLACK = '#0A0A0A';
const WING_GREY = '#9CA3AF';

export interface BeeFlyingProps {
  size?: number;
  className?: string;
}

export function BeeFlying({ size = 28, className }: BeeFlyingProps) {
  return (
    <svg
      width={size * 1.3}
      height={size}
      viewBox="0 0 36 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flying bee"
      className={className}
    >
      {/* Wings — translucent grey ovals tucked behind body */}
      <ellipse
        cx={11} cy={7} rx={6.5} ry={4}
        fill={WING_GREY} fillOpacity={0.85}
        stroke={BLACK} strokeWidth={0.8}
      />
      <ellipse
        cx={23} cy={7} rx={6.5} ry={4}
        fill={WING_GREY} fillOpacity={0.85}
        stroke={BLACK} strokeWidth={0.8}
      />
      {/* Body — yellow oval with thick black outline */}
      <ellipse
        cx={18} cy={16} rx={12} ry={9}
        fill={GOLD}
        stroke={BLACK} strokeWidth={1.5}
      />
      {/* Two black stripes (slight taper for cartoon feel) */}
      <path d="M12 10 L14 23 L17 23 L15 10 Z" fill={BLACK} />
      <path d="M21 10 L19 23 L22 23 L24 10 Z" fill={BLACK} />
      {/* Single eye dot */}
      <circle cx={9.5} cy={14} r={1.3} fill={BLACK} />
    </svg>
  );
}

export default BeeFlying;

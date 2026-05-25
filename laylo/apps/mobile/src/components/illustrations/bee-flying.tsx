/**
 * BeeFlying — tiny cartoon bee for ambient flying animations.
 *
 * Distinct from <BeeStanding/> (the elaborate brand mascot used in
 * splash, auth hero, and empty states). This is the small, generic
 * bumblebee that drifts across screens behind the form — yellow body
 * with two black stripes, grey wings on top, one eye. Reads as "🐝"
 * at small sizes.
 */
import React from 'react';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';

const GOLD = '#F8E71C';
const BLACK = '#0A0A0A';
const WING_GREY = '#9CA3AF';

export type BeeFlyingProps = {
  /** Width in px. Height auto-scales to ~80% of width. Default 24. */
  size?: number;
};

export function BeeFlying({ size = 24 }: BeeFlyingProps) {
  return (
    <Svg
      width={size * 1.3}
      height={size}
      viewBox="0 0 36 28"
      fill="none"
    >
      {/* Wings — translucent grey ovals tucked behind body */}
      <Ellipse
        cx={11} cy={7} rx={6.5} ry={4}
        fill={WING_GREY} opacity={0.85}
        stroke={BLACK} strokeWidth={0.8}
      />
      <Ellipse
        cx={23} cy={7} rx={6.5} ry={4}
        fill={WING_GREY} opacity={0.85}
        stroke={BLACK} strokeWidth={0.8}
      />
      {/* Body — yellow oval with thick black outline */}
      <Ellipse
        cx={18} cy={16} rx={12} ry={9}
        fill={GOLD}
        stroke={BLACK} strokeWidth={1.5}
      />
      {/* Two black stripes (slight taper for cartoon feel) */}
      <Path d="M12 10 L14 23 L17 23 L15 10 Z" fill={BLACK} />
      <Path d="M21 10 L19 23 L22 23 L24 10 Z" fill={BLACK} />
      {/* Single eye dot */}
      <Circle cx={9.5} cy={14} r={1.3} fill={BLACK} />
    </Svg>
  );
}

export default BeeFlying;

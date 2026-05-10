/**
 * SparkleIcon — Phase 3b.
 *
 * A four-point gold star drawn with View primitives. We can't import
 * lucide-react-native (not installed) and react-native-svg isn't in
 * the workspace either. The brief forbids new dependencies, so we
 * compose the icon out of two rotated squares and a centre dot —
 * recognisable as "sparkle" while staying stylistically aligned with
 * the bee mascot (which uses the same View-based approach).
 */
import React from 'react';
import { View } from 'react-native';
import { tokens } from '../../lib/tokens';

export type SparkleIconProps = {
  size?: number;
  color?: string;
  /** Render at 50% opacity for the chip rest state. */
  dim?: boolean;
};

export function SparkleIcon({
  size = 16,
  color = tokens.accent,
  dim = false,
}: SparkleIconProps) {
  // Diamond points — drawn as rotated squares.
  const armSize = size * 0.5;
  const armThickness = size * 0.18;
  const center = size / 2;
  const opacity = dim ? 0.5 : 1;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      {/* Vertical arm */}
      <View
        style={{
          position: 'absolute',
          width: armThickness,
          height: armSize,
          backgroundColor: color,
          borderRadius: armThickness / 2,
          top: center - armSize / 2,
          left: center - armThickness / 2,
        }}
      />
      {/* Horizontal arm */}
      <View
        style={{
          position: 'absolute',
          width: armSize,
          height: armThickness,
          backgroundColor: color,
          borderRadius: armThickness / 2,
          top: center - armThickness / 2,
          left: center - armSize / 2,
        }}
      />
      {/* Centre dot for a star-like cluster look */}
      <View
        style={{
          position: 'absolute',
          width: armThickness * 1.4,
          height: armThickness * 1.4,
          backgroundColor: color,
          borderRadius: (armThickness * 1.4) / 2,
          top: center - (armThickness * 1.4) / 2,
          left: center - (armThickness * 1.4) / 2,
        }}
      />
    </View>
  );
}

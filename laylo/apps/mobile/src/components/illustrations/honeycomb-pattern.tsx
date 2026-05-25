/**
 * HoneycombPattern — mobile port of the web version (Group D / D1).
 *
 * Subtle hexagonal motif used as a backdrop on hub screens (Money,
 * Vault). Now uses react-native-svg's `Pattern` so it tiles a real
 * honeycomb (polygons) instead of the previous rotated-square hack —
 * matching apps/web/src/components/illustrations/honeycomb-pattern.tsx
 * pixel for pixel.
 *
 * Self-positions absolutely; parent must lay out as the screen root.
 * 4 % opacity by default (brief cap — high enough to read as texture,
 * low enough to never compete with content).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Polygon, Rect } from 'react-native-svg';

export type HoneycombPatternProps = {
  /** 0–1 opacity. Default 0.05 (brief cap). */
  opacity?: number;
  /** Pattern tile width in px. Default 84. (Height auto = size * 96/56.) */
  size?: number;
  /** Stroke colour. Default highlight gold. */
  color?: string;
};

export function HoneycombPattern({
  opacity = 0.05,
  size = 84,
  color = '#F8E71C',
}: HoneycombPatternProps) {
  // Web tile is 56 × 96, scaled to the requested `size` width.
  const tileH = (size / 56) * 96;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="hive"
            x={0}
            y={0}
            width={size}
            height={tileH}
            patternUnits="userSpaceOnUse"
          >
            <Polygon
              points="28,2 54,16 54,46 28,60 2,46 2,16"
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              transform={`scale(${size / 56} ${tileH / 96})`}
            />
            <Polygon
              points="28,50 54,64 54,94 28,108 2,94 2,64"
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              transform={`scale(${size / 56} ${tileH / 96})`}
            />
            <Polygon
              points="0,2 14,-6 28,2 28,32 14,40 0,32"
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              transform={`scale(${size / 56} ${tileH / 96})`}
            />
            <Polygon
              points="56,2 70,-6 84,2 84,32 70,40 56,32"
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              transform={`scale(${size / 56} ${tileH / 96})`}
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#hive)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});

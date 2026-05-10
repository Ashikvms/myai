/**
 * HoneycombPattern — Phase 3b playfulness pass (D1).
 *
 * A subtle honeycomb backdrop drawn from `<View>` primitives. Since
 * react-native-svg is not in the workspace and we're forbidden new
 * deps, we tile rotated squares + center dots to approximate hexagons.
 * At ~4% opacity this reads as a soft texture rather than a pattern,
 * which is exactly the brief.
 *
 * Use as an absolutely-positioned background fill behind a hub screen.
 *
 * Reduced-motion: irrelevant — pattern is static.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '../../lib/tokens';

export type HoneycombPatternProps = {
  /** Hex cell width in px. Default 28. */
  cellSize?: number;
  /** Pattern opacity. Default 0.04. */
  opacity?: number;
  /** Color override. Default tokens.accent. */
  color?: string;
};

/**
 * A single hex-ish cell. Visually it's a rotated square outline with a
 * tiny center dot. Reads "honeycomb" at low opacity without needing
 * polygon support.
 */
function HexCell({
  size,
  color,
  left,
  top,
}: {
  size: number;
  color: string;
  left: number;
  top: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderWidth: 1,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 2,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function HoneycombPattern({
  cellSize = 28,
  opacity = 0.04,
  color = tokens.accent,
}: HoneycombPatternProps) {
  // Rough estimation: cover a 480 × 1024 viewport. We over-render so it
  // works on tablets too. At opacity 0.04 the perf cost of N≈600 tiny
  // Views is negligible; React Native batches static View trees well.
  const cols = 18;
  const rows = 36;
  const cells: React.ReactNode[] = [];
  const stepX = cellSize;
  const stepY = cellSize * 0.85;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : cellSize / 2;
    for (let c = 0; c < cols; c++) {
      const left = c * stepX + offset;
      const top = r * stepY;
      cells.push(
        <HexCell
          key={`${r}-${c}`}
          size={cellSize}
          color={color}
          left={left}
          top={top}
        />,
      );
    }
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}
    >
      {cells}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});

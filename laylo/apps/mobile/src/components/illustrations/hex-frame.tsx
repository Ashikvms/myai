/**
 * HexFrame — clips children into a regular hexagon.
 *
 * Used for tile / avatar / mascot frames that want the hive shape
 * instead of a circle or rounded square. The hex is "pointy-top" (two
 * vertices on the vertical axis) to match the website's hive grid.
 *
 * Layout:
 *   • a wrapping `View` reserves the square footprint (`size` × `size`),
 *   • children render inside an absolutely-positioned overflow-hidden
 *     box (so RN clips them rectangularly),
 *   • an SVG overlay paints the hex outline + a same-coloured "mask
 *     border" — corners outside the hex get covered by the surrounding
 *     `bg` colour, faking a hex clip without needing `<ClipPath>` on the
 *     child tree (RN's clip-path on raster Views is unreliable).
 *
 * For pure-SVG children (e.g. a Bee pose), we *do* use react-native-svg
 * `ClipPath` + `Polygon` — `clipChildren` opt-in switches modes.
 */
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { ClipPath, Defs, G, Polygon } from 'react-native-svg';

export type HexFrameProps = {
  size: number;
  /** Background colour used to "carve" the corners. Default transparent. */
  bg?: string;
  /** Optional hairline border colour. */
  borderColor?: string;
  /** Border stroke width. Default 0 (no border). */
  borderWidth?: number;
  /** Use real SVG ClipPath (only safe when children are pure SVG). */
  svgClip?: boolean;
  children?: React.ReactNode;
};

/**
 * Generate the 6 vertices for a pointy-top hexagon inscribed in
 * a `size × size` box. apothem = size * sqrt(3)/4 ≈ 0.433 * size.
 */
function hexPoints(size: number): string {
  const s = size / 2; // radius from centre to vertex (vertical)
  const w = (Math.sqrt(3) / 2) * s; // horizontal half-width
  const cx = size / 2;
  const cy = size / 2;
  return [
    [cx, cy - s],
    [cx + w, cy - s / 2],
    [cx + w, cy + s / 2],
    [cx, cy + s],
    [cx - w, cy + s / 2],
    [cx - w, cy - s / 2],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

export function HexFrame({
  size,
  bg = 'transparent',
  borderColor,
  borderWidth = 0,
  svgClip = false,
  children,
}: HexFrameProps) {
  const pts = hexPoints(size);

  if (svgClip) {
    // SVG-only mode: clip children inside a Polygon.
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <ClipPath id="hexClip">
              <Polygon points={pts} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#hexClip)">{children}</G>
          {borderWidth > 0 && borderColor ? (
            <Polygon
              points={pts}
              fill="none"
              stroke={borderColor}
              strokeWidth={borderWidth}
            />
          ) : null}
        </Svg>
      </View>
    );
  }

  // Raster mode: render children flat, then mask the corners with
  // `bg`-coloured polygons drawn as SVG. This keeps text, images, and
  // gradients usable inside the frame.
  const cornerMaskPaths = (() => {
    const s = size / 2;
    const w = (Math.sqrt(3) / 2) * s;
    const cx = size / 2;
    const cy = size / 2;
    // Hex vertices (top, top-right, bottom-right, bottom, bottom-left, top-left).
    const v0 = [cx, cy - s];
    const v1 = [cx + w, cy - s / 2];
    const v2 = [cx + w, cy + s / 2];
    const v3 = [cx, cy + s];
    const v4 = [cx - w, cy + s / 2];
    const v5 = [cx - w, cy - s / 2];
    // Box corners.
    const c0 = [0, 0];
    const c1 = [size, 0];
    const c2 = [size, size];
    const c3 = [0, size];
    const p = (xy: number[]) => `${xy[0]},${xy[1]}`;
    return [
      // top-left wedge
      `${p(c0)} ${p(v5)} ${p(v0)}`,
      // top-right wedge
      `${p(v0)} ${p(v1)} ${p(c1)}`,
      // right edge
      `${p(v1)} ${p(c1)} ${p(c2)} ${p(v2)}`,
      // bottom-right wedge
      `${p(v2)} ${p(c2)} ${p(v3)}`,
      // bottom-left wedge
      `${p(v3)} ${p(c3)} ${p(v4)}`,
      // left edge
      `${p(v4)} ${p(c3)} ${p(c0)} ${p(v5)}`,
    ];
  })();

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, styles.flat]}>{children}</View>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {cornerMaskPaths.map((points, i) => (
          <Polygon key={i} points={points} fill={bg} />
        ))}
        {borderWidth > 0 && borderColor ? (
          <Polygon
            points={pts}
            fill="none"
            stroke={borderColor}
            strokeWidth={borderWidth}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  flat: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

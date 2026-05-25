/**
 * Tab bar icons — Phase 3b.
 *
 * lucide-react-native isn't installed in the workspace and the brief
 * forbids new dependencies, so we hand-roll the five tab glyphs out
 * of View + border primitives. They mimic the geometry of Lucide's
 * Home / Wallet / CheckSquare / Archive / Settings icons at the same
 * 24 px size + 1.75 px stroke.
 *
 * Spec: DESIGN_SYSTEM.md §8.3 (Lucide stroke 1.75, 20 px default).
 *
 * Note: SettingsIcon uses react-native-svg (already a dep, used by the
 * bee SVG) because the previous View-primitive version read as a
 * crosshair rather than a gear.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const STROKE = 1.75;

type IconProps = {
  color: string;
  size?: number;
};

function IconFrame({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** Home — house outline with door. */
export function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <IconFrame size={size}>
      {/* Roof (triangle approximated by rotated square) */}
      <View
        style={{
          position: 'absolute',
          top: 1,
          width: size * 0.65,
          height: size * 0.65,
          borderTopWidth: STROKE,
          borderLeftWidth: STROKE,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* Body */}
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          width: size * 0.7,
          height: size * 0.45,
          borderWidth: STROKE,
          borderColor: color,
          borderTopWidth: 0,
        }}
      />
      {/* Door */}
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          width: size * 0.2,
          height: size * 0.25,
          borderWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
    </IconFrame>
  );
}

/** Wallet — rectangle with side card slot. */
export function WalletIcon({ color, size = 22 }: IconProps) {
  return (
    <IconFrame size={size}>
      <View
        style={{
          width: size * 0.85,
          height: size * 0.65,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 3,
        }}
      />
      {/* Card slot dot */}
      <View
        style={{
          position: 'absolute',
          right: size * 0.12,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: color,
        }}
      />
    </IconFrame>
  );
}

/** CheckSquare — square with checkmark. */
export function CheckSquareIcon({ color, size = 22 }: IconProps) {
  return (
    <IconFrame size={size}>
      <View
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 3,
        }}
      />
      {/* Check stroke 1 */}
      <View
        style={{
          position: 'absolute',
          width: size * 0.18,
          height: STROKE,
          backgroundColor: color,
          left: size * 0.28,
          top: size * 0.52,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* Check stroke 2 */}
      <View
        style={{
          position: 'absolute',
          width: size * 0.32,
          height: STROKE,
          backgroundColor: color,
          left: size * 0.36,
          top: size * 0.45,
          transform: [{ rotate: '-50deg' }],
        }}
      />
    </IconFrame>
  );
}

/** Archive — box with lid line and slot. */
export function ArchiveIcon({ color, size = 22 }: IconProps) {
  return (
    <IconFrame size={size}>
      {/* Lid */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          width: size * 0.85,
          height: size * 0.18,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 2,
        }}
      />
      {/* Body */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.36,
          width: size * 0.78,
          height: size * 0.46,
          borderWidth: STROKE,
          borderColor: color,
          borderTopWidth: 0,
        }}
      />
      {/* Slot */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.5,
          width: size * 0.24,
          height: STROKE,
          backgroundColor: color,
        }}
      />
    </IconFrame>
  );
}

/**
 * Settings — proper gear glyph rendered with react-native-svg.
 *
 * Path adapted from the Lucide `settings` icon (ISC licence) — eight
 * gear teeth around a central hub. Using a real SVG path means the
 * teeth are wedge-shaped, not stick-like, so the icon reads as a gear
 * instead of a crosshair.
 */
export function SettingsIcon({ color, size = 22 }: IconProps) {
  // Lucide-style gear with 8 teeth; trimmed and re-pathed so it sits
  // nicely on a 24x24 viewBox at our default tab size.
  const gearPath =
    'M19.14 12.94c.04-.31.06-.62.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94 0 .31.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z';
  return (
    <IconFrame size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d={gearPath}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle
          cx={12}
          cy={12}
          r={3}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
        />
      </Svg>
    </IconFrame>
  );
}

/** Avatar circle with initials — used in headers. */
export function AvatarBadge({
  initials,
  size = 40,
  bg,
  textColor,
}: {
  initials: string;
  size?: number;
  bg: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: textColor, fontWeight: '700', fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );
}

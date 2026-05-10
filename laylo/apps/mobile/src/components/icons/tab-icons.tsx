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
 */
import React from 'react';
import { View, Text } from 'react-native';

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

/** Settings — gear approximated by ring + four ticks. */
export function SettingsIcon({ color, size = 22 }: IconProps) {
  return (
    <IconFrame size={size}>
      {/* Outer ring */}
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          borderWidth: STROKE,
          borderColor: color,
        }}
      />
      {/* Inner dot */}
      <View
        style={{
          position: 'absolute',
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          borderWidth: STROKE,
          borderColor: color,
        }}
      />
      {/* Four tick marks */}
      {[0, 90, 180, 270].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: STROKE,
            height: size * 0.2,
            backgroundColor: color,
            transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.4 }],
          }}
        />
      ))}
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

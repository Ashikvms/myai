/**
 * Bee mascot — Phase 3b mobile.
 *
 * Five poses share the same visual anatomy: gold body ellipse, two
 * black stripes, two wings, two black eye dots, two antennae with gold
 * tips. The bee is theme-independent (gold + black always).
 *
 * Implementation note: react-native-svg is not in the workspace and
 * the brief forbids adding npm packages. We compose the bee from
 * absolutely positioned <View> primitives — same visual language as
 * the rest of the codebase (TabIcon, banks tile avatar). All pieces
 * scale with the `size` prop so a 96 px bee in an empty state and a
 * 32 px bee in a chip share the same source of truth.
 *
 * Spec source: DESIGN_SYSTEM.md §8.2.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type BeeProps = {
  size?: number;
  /** Override the gold body color. Rarely needed — defaults to brand gold. */
  color?: string;
};

const GOLD = '#F8E71C';
const BLACK = '#0A0A0A';
const WHITE = '#FFFFFF';

/**
 * Frame wraps every pose. Gives every bee the same square footprint
 * and a consistent baseline (96 viewbox).
 */
function BeeFrame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: size, height: size, position: 'relative' }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Reusable body parts. All take a `unit` (size / 96) so positions and
 * dimensions scale with the requested size.
 */
function Body({ unit, color }: { unit: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 18 * unit,
        top: 32 * unit,
        width: 60 * unit,
        height: 44 * unit,
        borderRadius: 30 * unit,
        backgroundColor: color,
      }}
    />
  );
}

function Stripes({ unit }: { unit: number }) {
  // Two black stripes laid across the body like a bumblebee.
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 35 * unit,
          top: 32 * unit,
          width: 8 * unit,
          height: 44 * unit,
          backgroundColor: BLACK,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 53 * unit,
          top: 32 * unit,
          width: 8 * unit,
          height: 44 * unit,
          backgroundColor: BLACK,
        }}
      />
    </>
  );
}

function Wings({ unit }: { unit: number }) {
  // Two ellipses behind the body — drawn first so they sit underneath.
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 12 * unit,
          top: 22 * unit,
          width: 28 * unit,
          height: 22 * unit,
          borderRadius: 14 * unit,
          borderWidth: 1.5,
          borderColor: WHITE,
          opacity: 0.7,
          backgroundColor: 'transparent',
          transform: [{ rotate: '-15deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 56 * unit,
          top: 22 * unit,
          width: 28 * unit,
          height: 22 * unit,
          borderRadius: 14 * unit,
          borderWidth: 1.5,
          borderColor: WHITE,
          opacity: 0.7,
          backgroundColor: 'transparent',
          transform: [{ rotate: '15deg' }],
        }}
      />
    </>
  );
}

function Eyes({
  unit,
  closed = false,
}: {
  unit: number;
  closed?: boolean;
}) {
  if (closed) {
    // Closed = thin horizontal lines instead of dots.
    return (
      <>
        <View
          style={{
            position: 'absolute',
            left: 30 * unit,
            top: 46 * unit,
            width: 6 * unit,
            height: 1.5,
            backgroundColor: BLACK,
            borderRadius: 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 60 * unit,
            top: 46 * unit,
            width: 6 * unit,
            height: 1.5,
            backgroundColor: BLACK,
            borderRadius: 1,
          }}
        />
      </>
    );
  }
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 30 * unit,
          top: 44 * unit,
          width: 4 * unit,
          height: 4 * unit,
          borderRadius: 2 * unit,
          backgroundColor: BLACK,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 62 * unit,
          top: 44 * unit,
          width: 4 * unit,
          height: 4 * unit,
          borderRadius: 2 * unit,
          backgroundColor: BLACK,
        }}
      />
    </>
  );
}

function Antennae({ unit, droop = false }: { unit: number; droop?: boolean }) {
  const rotateLeft = droop ? '-50deg' : '-25deg';
  const rotateRight = droop ? '50deg' : '25deg';
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 30 * unit,
          top: 18 * unit,
          width: 1.5,
          height: 14 * unit,
          backgroundColor: BLACK,
          transform: [{ rotate: rotateLeft }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 25 * unit,
          top: 14 * unit,
          width: 4 * unit,
          height: 4 * unit,
          borderRadius: 2 * unit,
          backgroundColor: GOLD,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 64 * unit,
          top: 18 * unit,
          width: 1.5,
          height: 14 * unit,
          backgroundColor: BLACK,
          transform: [{ rotate: rotateRight }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 65 * unit,
          top: 14 * unit,
          width: 4 * unit,
          height: 4 * unit,
          borderRadius: 2 * unit,
          backgroundColor: GOLD,
        }}
      />
    </>
  );
}

/**
 * Pose 1 — Standing bee. Default. Used in 404, onboarding hero,
 * generic empty states.
 */
export function BeeStanding({ size = 96, color = GOLD }: BeeProps) {
  const unit = size / 96;
  return (
    <BeeFrame size={size}>
      <Wings unit={unit} />
      <Body unit={unit} color={color} />
      <Stripes unit={unit} />
      <Eyes unit={unit} />
      <Antennae unit={unit} />
    </BeeFrame>
  );
}

/**
 * Pose 2 — Looking bee (head tilted). Used as a curious onboarding
 * accent.
 */
export function BeeLooking({ size = 96, color = GOLD }: BeeProps) {
  const unit = size / 96;
  return (
    <BeeFrame size={size}>
      <View
        style={{
          width: size,
          height: size,
          position: 'absolute',
          transform: [{ rotate: '8deg' }],
        }}
      >
        <Wings unit={unit} />
        <Body unit={unit} color={color} />
        <Stripes unit={unit} />
        <Eyes unit={unit} />
        <Antennae unit={unit} />
      </View>
    </BeeFrame>
  );
}

/**
 * Pose 3 — Magnifying bee. A small magnifying-glass circle sits next
 * to the body for "search empty" states. Substitute for the brief's
 * "working bee" pose.
 */
export function BeeMagnifying({ size = 96, color = GOLD }: BeeProps) {
  const unit = size / 96;
  return (
    <BeeFrame size={size}>
      <Wings unit={unit} />
      <Body unit={unit} color={color} />
      <Stripes unit={unit} />
      <Eyes unit={unit} />
      <Antennae unit={unit} />
      {/* Magnifying glass: ring + handle */}
      <View
        style={{
          position: 'absolute',
          right: 4 * unit,
          bottom: 6 * unit,
          width: 22 * unit,
          height: 22 * unit,
          borderRadius: 11 * unit,
          borderWidth: 2,
          borderColor: BLACK,
          backgroundColor: 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 10 * unit,
          height: 2,
          backgroundColor: BLACK,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </BeeFrame>
  );
}

/**
 * Pose 4 — Sleeping bee. Closed eyes + drooping antennae + a soft "z".
 * Used for "all done" / inbox-zero / "all quiet" empty states.
 */
export function BeeSleeping({ size = 96, color = GOLD }: BeeProps) {
  const unit = size / 96;
  return (
    <BeeFrame size={size}>
      <Wings unit={unit} />
      <Body unit={unit} color={color} />
      <Stripes unit={unit} />
      <Eyes unit={unit} closed />
      <Antennae unit={unit} droop />
      <Text
        style={{
          position: 'absolute',
          right: 6 * unit,
          top: 10 * unit,
          fontSize: 14 * unit,
          fontWeight: '700',
          color: BLACK,
        }}
      >
        z
      </Text>
      <Text
        style={{
          position: 'absolute',
          right: 14 * unit,
          top: 0,
          fontSize: 10 * unit,
          fontWeight: '700',
          color: BLACK,
        }}
      >
        z
      </Text>
    </BeeFrame>
  );
}

/**
 * Pose 5 — Mail bee. Small white envelope tucked under the body for
 * "no notifications" / inbox-quiet empty states.
 */
export function BeeMail({ size = 96, color = GOLD }: BeeProps) {
  const unit = size / 96;
  return (
    <BeeFrame size={size}>
      <Wings unit={unit} />
      <Body unit={unit} color={color} />
      <Stripes unit={unit} />
      <Eyes unit={unit} />
      <Antennae unit={unit} />
      {/* Envelope */}
      <View
        style={{
          position: 'absolute',
          left: 32 * unit,
          bottom: 4 * unit,
          width: 32 * unit,
          height: 18 * unit,
          backgroundColor: WHITE,
          borderWidth: 1.5,
          borderColor: BLACK,
          borderRadius: 2,
        }}
      />
      {/* Envelope flap */}
      <View
        style={{
          position: 'absolute',
          left: 32 * unit,
          bottom: 13 * unit,
          width: 32 * unit,
          height: 9 * unit,
          backgroundColor: 'transparent',
          borderTopWidth: 1.5,
          borderRightWidth: 1.5,
          borderColor: BLACK,
          transform: [{ skewX: '-20deg' }],
        }}
      />
    </BeeFrame>
  );
}

/**
 * Convenience map for places that pick a pose dynamically.
 */
export const BEE_POSES = {
  standing: BeeStanding,
  looking: BeeLooking,
  magnifying: BeeMagnifying,
  sleeping: BeeSleeping,
  mail: BeeMail,
} as const;

export type BeePose = keyof typeof BEE_POSES;

// Keep StyleSheet around in case future variants want named styles.
// Currently unused but documented for downstream illustrations.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = StyleSheet.create({
  hidden: { display: 'none' },
});

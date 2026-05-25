/**
 * Bee mascot — mobile port of the elaborate web bee
 * (apps/web/src/components/illustrations/bee.tsx).
 *
 * 1:1 visual parity: chunky antennae with yellow orb tips, two angled
 * eyebrows (outer ends HIGH, inner ends LOW = cool/confident look),
 * solid black mouth bar, outlined wings, 4 px black outline on body.
 * Theme-independent (fixed gold + black + white — looks identical in
 * light AND dark mode).
 *
 * Spec source: DESIGN_SYSTEM.md §8.2 + REDESIGN_BRIEF.md §6.
 *
 * Existing screens import `BeeLooking` and `BeeMail`; we keep those
 * names as aliases of `BeeLookingAround` and `BeeEnvelope` so the
 * port doesn't ripple into the screen files (owned by other agents).
 */
import * as React from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

export type BeeProps = {
  size?: number;
  /** Reserved for backward-compat — fixed brand palette ignores it. */
  color?: string;
};

const GOLD = '#F8E71C';
const BLACK = '#0A0A0A';
const WHITE = '#FFFFFF';

function BeeFrame({
  size = 96,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      {children}
    </Svg>
  );
}

/** Standing bee — primary brand pose. Chunky antennae, eyebrows, mouth bar. */
export function BeeStanding({ size = 96 }: BeeProps) {
  return (
    <BeeFrame size={size}>
      {/* Antenna stalks */}
      <Path d="M36 28 L28 8" stroke={BLACK} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M60 28 L68 8" stroke={BLACK} strokeWidth={3.2} strokeLinecap="round" />
      {/* Antenna dots — chunky yellow orbs with black outline */}
      <Circle cx={28} cy={8} r={4.5} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <Circle cx={68} cy={8} r={4.5} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      {/* Wings — outlined ovals tucked behind face */}
      <Ellipse
        cx={16}
        cy={48}
        rx={13}
        ry={8}
        fill={WHITE}
        fillOpacity={0.22}
        stroke={BLACK}
        strokeOpacity={0.85}
        strokeWidth={2.4}
      />
      <Ellipse
        cx={80}
        cy={48}
        rx={13}
        ry={8}
        fill={WHITE}
        fillOpacity={0.22}
        stroke={BLACK}
        strokeOpacity={0.85}
        strokeWidth={2.4}
      />
      {/* Face — round body with 4 px black outline */}
      <Circle cx={48} cy={52} r={30} fill={GOLD} stroke={BLACK} strokeWidth={4} />
      {/* Two angled eyebrows */}
      <Path d="M22 44 L42 50" stroke={BLACK} strokeWidth={6} strokeLinecap="round" />
      <Path d="M54 50 L74 44" stroke={BLACK} strokeWidth={6} strokeLinecap="round" />
      {/* Mouth — single solid black bar */}
      <Rect x={28} y={62} width={40} height={7} rx={3.5} fill={BLACK} />
    </BeeFrame>
  );
}

/** Looking-around bee — head tilted; curiosity / "where is it?" empty states. */
export function BeeLookingAround({ size = 96 }: BeeProps) {
  return (
    <BeeFrame size={size}>
      <G transform="rotate(-8 48 48)">
        <Path
          d="M40 22 Q34 16 28 16"
          stroke={BLACK}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M56 22 Q62 14 68 14"
          stroke={BLACK}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={28} cy={16} r={2} fill={GOLD} />
        <Circle cx={68} cy={14} r={2} fill={GOLD} />
        <Ellipse
          cx={28}
          cy={42}
          rx={14}
          ry={10}
          stroke={WHITE}
          strokeOpacity={0.5}
          strokeWidth={1.5}
          fill="none"
        />
        <Ellipse
          cx={68}
          cy={42}
          rx={14}
          ry={10}
          stroke={WHITE}
          strokeOpacity={0.5}
          strokeWidth={1.5}
          fill="none"
        />
        <Ellipse cx={48} cy={52} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
        <Path
          d="M34 44 Q48 50 62 44"
          stroke={BLACK}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M34 60 Q48 66 62 60"
          stroke={BLACK}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={44} cy={50} r={2} fill={BLACK} />
        <Circle cx={56} cy={50} r={2} fill={BLACK} />
      </G>
    </BeeFrame>
  );
}

/** Magnifying-glass bee — search empty states. */
export function BeeMagnifying({ size = 96 }: BeeProps) {
  return (
    <BeeFrame size={size}>
      <Path
        d="M40 22 Q36 14 32 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M56 22 Q60 14 64 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={32} cy={12} r={2} fill={GOLD} />
      <Circle cx={64} cy={12} r={2} fill={GOLD} />
      <Ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <Ellipse
        cx={68}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <Ellipse cx={48} cy={52} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <Path
        d="M34 44 Q48 50 62 44"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M34 60 Q48 66 62 60"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={42} cy={50} r={2} fill={BLACK} />
      <Circle cx={54} cy={50} r={2} fill={BLACK} />
      {/* Magnifying glass */}
      <Circle
        cx={76}
        cy={70}
        r={9}
        stroke={BLACK}
        strokeWidth={2}
        fill={WHITE}
        fillOpacity={0.9}
      />
      <Line
        x1={84}
        y1={78}
        x2={92}
        y2={86}
        stroke={BLACK}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </BeeFrame>
  );
}

/** Sleeping bee — closed eye arcs + soft smile + z's. "All done" / "inbox zero".
 *
 *  Peaceful, content pose: NO angry eyebrows (the old `strokeWidth={5}` arcs
 *  at y=46 read as a hostile monobrow + the matching arc at y=62 read as a
 *  frown). Replaced with two upward-arcing closed eyes (⌒ ⌒) and a soft
 *  smile (‿). Antennae are drooped, Zs float top-right. */
export function BeeSleeping({ size = 96 }: BeeProps) {
  return (
    <BeeFrame size={size}>
      {/* Antennae — drooped/relaxed angle */}
      <Path
        d="M40 24 Q36 28 32 30"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M56 24 Q60 28 64 30"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={32} cy={30} r={2} fill={GOLD} />
      <Circle cx={64} cy={30} r={2} fill={GOLD} />
      {/* Wings */}
      <Ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <Ellipse
        cx={68}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Body */}
      <Ellipse cx={48} cy={54} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      {/* Closed eyes — two upward-arcing curves (⌒ ⌒) read as "resting" */}
      <Path
        d="M36 52 Q42 46 48 52"
        stroke={BLACK}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M48 52 Q54 46 60 52"
        stroke={BLACK}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      {/* Soft smile — thin gentle arc */}
      <Path
        d="M40 62 Q48 66 56 62"
        stroke={BLACK}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Z's — top-right, indicates sleep */}
      <SvgText x={76} y={26} fontSize={10} fontWeight="700" fill={BLACK}>
        z
      </SvgText>
      <SvgText x={82} y={18} fontSize={12} fontWeight="700" fill={BLACK}>
        Z
      </SvgText>
    </BeeFrame>
  );
}

/** Bee holding a tiny envelope — "no notifications" / "nothing buzzing". */
export function BeeEnvelope({ size = 96 }: BeeProps) {
  return (
    <BeeFrame size={size}>
      <Path
        d="M40 22 Q36 14 32 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M56 22 Q60 14 64 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={32} cy={12} r={2} fill={GOLD} />
      <Circle cx={64} cy={12} r={2} fill={GOLD} />
      <Ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <Ellipse
        cx={68}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <Ellipse cx={48} cy={50} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <Path
        d="M34 42 Q48 48 62 42"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M34 58 Q48 64 62 58"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={42} cy={48} r={2} fill={BLACK} />
      <Circle cx={54} cy={48} r={2} fill={BLACK} />
      {/* Envelope */}
      <Rect
        x={36}
        y={68}
        width={24}
        height={16}
        rx={1.5}
        stroke={BLACK}
        strokeWidth={2}
        fill={WHITE}
      />
      <Path
        d="M36 68 L48 78 L60 68"
        stroke={BLACK}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
    </BeeFrame>
  );
}

const HIGHLIGHT_YELLOW = '#F8E71C';

/**
 * BeeLogoMark — round-faced brand mark for nav, app icon, small chips.
 * Same fixed-colour palette as the poses; reads on both yellow + black bg.
 * 64×64 viewBox; designed to read at 28–48 px.
 */
export function BeeLogoMark({ size = 40 }: BeeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M24 18 L19 6" stroke="#0A0A0A" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M40 18 L45 6" stroke="#0A0A0A" strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={19} cy={6} r={3.4} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={1.5} />
      <Circle cx={45} cy={6} r={3.4} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={1.5} />
      <Ellipse
        cx={11}
        cy={32}
        rx={9}
        ry={5.5}
        fill="#FFFFFF"
        fillOpacity={0.18}
        stroke="#0A0A0A"
        strokeOpacity={0.85}
        strokeWidth={2}
      />
      <Ellipse
        cx={53}
        cy={32}
        rx={9}
        ry={5.5}
        fill="#FFFFFF"
        fillOpacity={0.18}
        stroke="#0A0A0A"
        strokeOpacity={0.85}
        strokeWidth={2}
      />
      <Circle cx={32} cy={34} r={20} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={3.2} />
      <Path d="M16 28 L28 33" stroke="#0A0A0A" strokeWidth={4} strokeLinecap="round" />
      <Path d="M36 33 L48 28" stroke="#0A0A0A" strokeWidth={4} strokeLinecap="round" />
      <Rect x={20} y={41} width={24} height={4.5} rx={2.25} fill="#0A0A0A" />
    </Svg>
  );
}

/**
 * Back-compat aliases.
 *
 * The mobile screens (owned by the functionality engineer) import
 * `BeeLooking` and `BeeMail` — the historical mobile names. The web
 * uses the more descriptive `BeeLookingAround` and `BeeEnvelope`.
 * Keep both spellings exported so neither codebase has to chase the
 * rename in this pass.
 */
export const BeeLooking = BeeLookingAround;
export const BeeMail = BeeEnvelope;

/**
 * Convenience map for places that pick a pose dynamically. The legacy
 * keys (`mail`, `looking`) are preserved; the web names (`envelope`,
 * `lookingAround`) are added for parity with the web export.
 */
export const BEE_POSES = {
  standing: BeeStanding,
  looking: BeeLookingAround,
  lookingAround: BeeLookingAround,
  magnifying: BeeMagnifying,
  sleeping: BeeSleeping,
  mail: BeeEnvelope,
  envelope: BeeEnvelope,
  logoMark: BeeLogoMark,
} as const;

export type BeePose = keyof typeof BEE_POSES;

export const Bee = {
  Standing: BeeStanding,
  LookingAround: BeeLookingAround,
  Magnifying: BeeMagnifying,
  Sleeping: BeeSleeping,
  Envelope: BeeEnvelope,
  LogoMark: BeeLogoMark,
};

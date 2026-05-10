/**
 * Bee mascot — 5 poses for empty/loading/404 states.
 * Geometric / flat, 2 px stroke. Gold + black + white only.
 * Theme-independent (paints raw hex so the bee always reads the same).
 *
 * Spec: DESIGN_SYSTEM.md §8.2 + REDESIGN_BRIEF.md §6.
 *
 * All poses fit a 96 × 96 viewBox. Engineers compose them via
 * named React components, accepting `size` (defaults 96) + `className`.
 */
import * as React from 'react';

export interface BeeProps {
  size?: number;
  className?: string;
}

// Fixed brand colours so every bee pose looks identical in both modes.
// The body's thick BLACK stroke gives the silhouette in light mode where
// the highlight-yellow body would otherwise blend with the canvas.
// (User feedback: "the mascot logo does not work in light mode" when the
// body+detail flipped — black face with yellow stripes read as angry mask.)
const GOLD = '#F8E71C';
const BLACK = '#0A0A0A';
const WHITE = '#FFFFFF';

function BeeFrame({
  size = 96,
  className,
  children,
  title,
}: BeeProps & { children: React.ReactNode; title: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Standing bee — default neutral pose. Matches the BeeLogoMark composition
 *  scaled up to 96×96 (wider antennae, thicker outline, clearer wings).
 *  Used on auth/onboarding heroes + most empty states. Same friendly look
 *  in both modes thanks to fixed colours + thick black outline. */
export function BeeStanding(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Standing bee">
      {/* Antenna stalks */}
      <path d="M36 28 L28 8" stroke={BLACK} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M60 28 L68 8" stroke={BLACK} strokeWidth={3.2} strokeLinecap="round" />
      {/* Antenna dots — chunky yellow orbs with black outline */}
      <circle cx={28} cy={8} r={4.5} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <circle cx={68} cy={8} r={4.5} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      {/* Wings — outlined ovals tucked behind the face. Black stroke so they
          read clearly on both the yellow canvas and the black canvas. */}
      <ellipse
        cx={16} cy={48} rx={13} ry={8}
        fill={WHITE} fillOpacity={0.18}
        stroke={BLACK} strokeOpacity={0.7} strokeWidth={2.2}
      />
      <ellipse
        cx={80} cy={48} rx={13} ry={8}
        fill={WHITE} fillOpacity={0.18}
        stroke={BLACK} strokeOpacity={0.7} strokeWidth={2.2}
      />
      {/* Face — round body with thick black outline */}
      <circle cx={48} cy={52} r={30} fill={GOLD} stroke={BLACK} strokeWidth={3.5} />
      {/* Eyebrow stripe — thick straight bar across upper third */}
      <rect x={24} y={42} width={48} height={7} rx={3.5} fill={BLACK} />
      {/* Mouth stripe — narrower bar below centre */}
      <rect x={30} y={62} width={36} height={6} rx={3} fill={BLACK} />
    </BeeFrame>
  );
}

/** Looking-around bee — head tilted. Curiosity / "where is it?" empty states. */
export function BeeLookingAround(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Looking-around bee">
      <g transform="rotate(-8 48 48)">
        {/* Antennae */}
        <path
          d="M40 22 Q34 16 28 16"
          stroke={BLACK}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 22 Q62 14 68 14"
          stroke={BLACK}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={28} cy={16} r={2} fill={GOLD} />
        <circle cx={68} cy={14} r={2} fill={GOLD} />
        {/* Wings */}
        <ellipse
          cx={28}
          cy={42}
          rx={14}
          ry={10}
          stroke={WHITE}
          strokeOpacity={0.5}
          strokeWidth={1.5}
          fill="none"
        />
        <ellipse
          cx={68}
          cy={42}
          rx={14}
          ry={10}
          stroke={WHITE}
          strokeOpacity={0.5}
          strokeWidth={1.5}
          fill="none"
        />
        <ellipse cx={48} cy={52} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
        <path
          d="M34 44 Q48 50 62 44"
          stroke={BLACK}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M34 60 Q48 66 62 60"
          stroke={BLACK}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Eyes — looking right */}
        <circle cx={44} cy={50} r={2} fill={BLACK} />
        <circle cx={56} cy={50} r={2} fill={BLACK} />
      </g>
    </BeeFrame>
  );
}

/** Bee with magnifying glass — for search empty states. */
export function BeeMagnifying(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Bee with magnifying glass">
      {/* Antennae */}
      <path
        d="M40 22 Q36 14 32 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 22 Q60 14 64 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={32} cy={12} r={2} fill={GOLD} />
      <circle cx={64} cy={12} r={2} fill={GOLD} />
      {/* Wings */}
      <ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <ellipse
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
      <ellipse cx={48} cy={52} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <path
        d="M34 44 Q48 50 62 44"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 60 Q48 66 62 60"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={42} cy={50} r={2} fill={BLACK} />
      <circle cx={54} cy={50} r={2} fill={BLACK} />
      {/* Magnifying glass */}
      <circle
        cx={76}
        cy={70}
        r={9}
        stroke={BLACK}
        strokeWidth={2}
        fill={WHITE}
        fillOpacity={0.9}
      />
      <line
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

/** Sleeping bee — closed eyes + z's. "All done" / "inbox zero". */
export function BeeSleeping(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Sleeping bee">
      {/* Antennae — drooped */}
      <path
        d="M40 24 Q36 28 32 30"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 24 Q60 28 64 30"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={32} cy={30} r={2} fill={GOLD} />
      <circle cx={64} cy={30} r={2} fill={GOLD} />
      {/* Wings */}
      <ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <ellipse
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
      <ellipse cx={48} cy={54} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <path
        d="M34 46 Q48 52 62 46"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 62 Q48 68 62 62"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Sleeping eyes — small arcs */}
      <path
        d="M40 51 Q42 53 44 51"
        stroke={BLACK}
        strokeWidth={1.75}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 51 Q54 53 56 51"
        stroke={BLACK}
        strokeWidth={1.75}
        strokeLinecap="round"
        fill="none"
      />
      {/* Z's */}
      <text
        x={76}
        y={26}
        fontSize={10}
        fontWeight={700}
        fill={BLACK}
        fontFamily="Inter, system-ui, sans-serif"
      >
        z
      </text>
      <text
        x={82}
        y={18}
        fontSize={12}
        fontWeight={700}
        fill={BLACK}
        fontFamily="Inter, system-ui, sans-serif"
      >
        Z
      </text>
    </BeeFrame>
  );
}

/** Bee holding a tiny envelope — "no notifications" / "nothing buzzing". */
export function BeeEnvelope(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Bee with envelope">
      {/* Antennae */}
      <path
        d="M40 22 Q36 14 32 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 22 Q60 14 64 12"
        stroke={BLACK}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={32} cy={12} r={2} fill={GOLD} />
      <circle cx={64} cy={12} r={2} fill={GOLD} />
      {/* Wings */}
      <ellipse
        cx={28}
        cy={42}
        rx={14}
        ry={10}
        stroke={WHITE}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
      <ellipse
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
      <ellipse cx={48} cy={50} rx={26} ry={22} fill={GOLD} stroke={BLACK} strokeWidth={2} />
      <path
        d="M34 42 Q48 48 62 42"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 58 Q48 64 62 58"
        stroke={BLACK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Eyes */}
      <circle cx={42} cy={48} r={2} fill={BLACK} />
      <circle cx={54} cy={48} r={2} fill={BLACK} />
      {/* Envelope */}
      <rect
        x={36}
        y={68}
        width={24}
        height={16}
        rx={1.5}
        stroke={BLACK}
        strokeWidth={2}
        fill={WHITE}
      />
      <path
        d="M36 68 L48 78 L60 68"
        stroke={BLACK}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
    </BeeFrame>
  );
}

/**
 * BeeLogoMark — round-faced brand mark. Uses FIXED colours (highlight yellow
 * face + black outline + black stripes) so it works on both yellow (light
 * mode) and black (dark mode) backgrounds without any theme flip needed.
 * The thick black outline gives the silhouette in light mode where the face
 * would otherwise blend with the yellow canvas.
 *
 * 64×64 viewBox; designed to read at 28–48 px when used as the brand mark.
 * Solid filled shapes everywhere (no sub-pixel strokes at small sizes).
 */
const HIGHLIGHT_YELLOW = '#F8E71C';
export function BeeLogoMark({ size = 40, className }: BeeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BillBee logo"
      className={className}
    >
      {/* Antenna stalks */}
      <path d="M24 18 L19 6" stroke="#0A0A0A" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M40 18 L45 6" stroke="#0A0A0A" strokeWidth={2.6} strokeLinecap="round" />
      {/* Antenna dots — yellow orbs with black outline */}
      <circle cx={19} cy={6} r={3.4} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={1.5} />
      <circle cx={45} cy={6} r={3.4} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={1.5} />

      {/* Wings — outlined ovals tucked behind the face */}
      <ellipse
        cx={11} cy={32} rx={9} ry={5.5}
        fill="#FFFFFF" fillOpacity={0.12}
        stroke="#0A0A0A" strokeOpacity={0.7} strokeWidth={1.8}
      />
      <ellipse
        cx={53} cy={32} rx={9} ry={5.5}
        fill="#FFFFFF" fillOpacity={0.12}
        stroke="#0A0A0A" strokeOpacity={0.7} strokeWidth={1.8}
      />

      {/* Face — round body with thick black outline (works on yellow OR black bg) */}
      <circle cx={32} cy={34} r={20} fill={HIGHLIGHT_YELLOW} stroke="#0A0A0A" strokeWidth={2.8} />

      {/* Eyebrow stripe */}
      <rect x={16} y={28} width={32} height={5} rx={2.5} fill="#0A0A0A" />
      {/* Mouth stripe */}
      <rect x={20} y={42} width={24} height={4} rx={2} fill="#0A0A0A" />
    </svg>
  );
}

export const Bee = {
  Standing: BeeStanding,
  LookingAround: BeeLookingAround,
  Magnifying: BeeMagnifying,
  Sleeping: BeeSleeping,
  Envelope: BeeEnvelope,
  LogoMark: BeeLogoMark,
};

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

// Theme-adaptive: body flips with mode (gold in dark, black in light) so the
// bee always contrasts against the canvas. White wings stay literal.
const GOLD = 'var(--bee-body)';
const BLACK = 'var(--bee-detail)';
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

/** Standing bee — default neutral pose. 404 + onboarding hero. */
export function BeeStanding(props: BeeProps) {
  return (
    <BeeFrame {...props} title="Standing bee">
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
      {/* Stripes */}
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
      {/* Eyes */}
      <circle cx={42} cy={50} r={2} fill={BLACK} />
      <circle cx={54} cy={50} r={2} fill={BLACK} />
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
 * BeeLogoMark — chunky, iconic bee designed to read at 20–32 px (logo size).
 * The empty-state poses (BeeStanding etc.) use 96×96 viewBoxes with thin 1.5px
 * strokes that disappear at small sizes; this one uses a 32×32 viewBox with
 * solid filled shapes so it stays legible inside the brand-mark square.
 *
 *   ┌────────────────┐
 *   │   . │ │ .      │   antenna dots
 *   │  ╭──┴─┴──╮     │   wings (top)
 *   │  │       │     │
 *   │  ╞═══════╡     │   body + stripes
 *   │  ╞═══════╡     │
 *   │  ╰───────╯     │
 *   └────────────────┘
 */
export function BeeLogoMark({ size = 32, className }: BeeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BillBee logo"
      className={className}
    >
      {/* Antenna dots */}
      <circle cx={11} cy={5} r={1.4} fill={BLACK} />
      <circle cx={21} cy={5} r={1.4} fill={BLACK} />
      {/* Antenna stalks */}
      <path d="M11 5 L13 11" stroke={BLACK} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M21 5 L19 11" stroke={BLACK} strokeWidth={1.4} strokeLinecap="round" />
      {/* Wings — chunky white ovals slightly behind body */}
      <ellipse cx={9} cy={12} rx={5} ry={3.2} fill={WHITE} fillOpacity={0.92} />
      <ellipse cx={23} cy={12} rx={5} ry={3.2} fill={WHITE} fillOpacity={0.92} />
      {/* Body — bold oval, tall enough to fit two stripes */}
      <ellipse cx={16} cy={20} rx={9} ry={8} fill={GOLD} />
      {/* Two thick horizontal stripes */}
      <rect x={7.5} y={17} width={17} height={2.4} rx={1.2} fill={BLACK} />
      <rect x={7.5} y={22} width={17} height={2.4} rx={1.2} fill={BLACK} />
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

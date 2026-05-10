'use client';

/**
 * HexTile — honeycomb tile primitive used by the Vault hub and Documents page
 * (LAYOUT_REDESIGN_BRIEF §2.5 + §2.7).
 *
 * Uses CSS clip-path: polygon(...) to render a true hexagon. The container
 * keeps `aspect-square` so the math works at any size.
 */
import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

interface HexTileProps {
  href?: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  /** When true, neighbour-hex outlines bloom briefly on hover — Vault delight. */
  withNeighbours?: boolean;
  ariaLabel?: string;
}

export function HexTile({
  href,
  onClick,
  active = false,
  children,
  className,
  withNeighbours = false,
  ariaLabel,
}: HexTileProps) {
  const reduce = useReducedMotion();
  const [hover, setHover] = React.useState(false);

  const inner = (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={reduce ? undefined : { scale: 1.04 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'relative aspect-square w-full',
        active
          ? 'bg-[var(--color-accent-soft)]'
          : 'bg-[var(--color-surface)]',
        'transition-colors',
        className ?? '',
      ].join(' ')}
      style={{
        clipPath: HEX_CLIP,
        WebkitClipPath: HEX_CLIP,
      }}
    >
      {/* Inner hex border — drawn as a slightly-smaller polygon backed by surface */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          clipPath: HEX_CLIP,
          WebkitClipPath: HEX_CLIP,
          background: active
            ? 'var(--color-accent)'
            : 'var(--color-border)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-[1.5px]"
        style={{
          clipPath: HEX_CLIP,
          WebkitClipPath: HEX_CLIP,
          background: active
            ? 'var(--color-accent-soft)'
            : 'var(--color-surface)',
        }}
      />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 text-center">
        {children}
      </div>
      {withNeighbours && hover && !reduce && (
        <NeighbourBloom />
      )}
    </motion.div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-[8px]"
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={active}
        className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-[8px]"
      >
        {inner}
      </button>
    );
  }
  return inner;
}

function NeighbourBloom() {
  // Six imaginary neighbour hex outlines briefly fade in around the active hex.
  const positions = [
    { x: '75%', y: '0%' },
    { x: '125%', y: '50%' },
    { x: '75%', y: '100%' },
    { x: '-25%', y: '100%' },
    { x: '-75%', y: '50%' },
    { x: '-25%', y: '0%' },
  ];
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {positions.map((p, i) => (
        <div
          key={i}
          className="absolute w-full h-full"
          style={{
            left: p.x,
            top: p.y,
            transform: 'translate(-50%, -50%)',
            clipPath: HEX_CLIP,
            WebkitClipPath: HEX_CLIP,
            background: 'var(--color-accent-dim)',
            opacity: 0.25,
          }}
        />
      ))}
    </motion.div>
  );
}

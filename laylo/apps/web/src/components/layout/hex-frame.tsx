'use client';

/**
 * HexFrame — single hexagonal clip wrapper for icons / avatars.
 *
 * Reusable hex-clip primitive that pulls the same HEX_CLIP polygon used by
 * `HexTile` and the Tasks page checkbox. The hive theme reads consistently
 * everywhere a square or circular icon container would otherwise sit.
 *
 * Usage:
 *   <HexFrame size={40}>
 *     <CreditCard className="w-5 h-5 text-[var(--color-accent)]" />
 *   </HexFrame>
 *
 * - Light + dark mode parity via CSS variable tokens.
 * - Composes with normal flex centering (children are absolutely centered).
 * - 1.5px gold-dim hairline ring inside the hex by default; pass `ring={false}`
 *   to disable when the frame sits on top of an already-coloured chip.
 */
import * as React from 'react';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

interface HexFrameProps {
  /** Pixel size of the frame (square box; hex inscribed inside). */
  size: number;
  children: React.ReactNode;
  /** Background fill token. Default: `--color-surface-2`. */
  fill?: string;
  /** Hairline ring colour. Default: `--color-accent-dim` at 0.5 alpha. */
  ringColor?: string;
  /** Disable the hairline ring entirely. */
  ring?: boolean;
  /** Extra classes for the outer wrapper (e.g. flex-shrink-0). */
  className?: string;
}

export function HexFrame({
  size,
  children,
  fill = 'var(--color-surface-2)',
  ringColor = 'var(--color-accent-dim)',
  ring = true,
  className,
}: HexFrameProps) {
  return (
    <div
      className={['relative inline-block', className ?? ''].join(' ')}
      style={{ width: size, height: size }}
      aria-hidden={false}
    >
      {ring && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            clipPath: HEX_CLIP,
            WebkitClipPath: HEX_CLIP,
            background: ringColor,
            opacity: 0.5,
          }}
        />
      )}
      <div
        aria-hidden="true"
        className={ring ? 'absolute inset-[1.5px]' : 'absolute inset-0'}
        style={{
          clipPath: HEX_CLIP,
          WebkitClipPath: HEX_CLIP,
          background: fill,
        }}
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

'use client';

/**
 * Sparkline — tiny inline chart used by Money hub's outflow tile
 * (LAYOUT_REDESIGN_BRIEF §2.4).
 *
 * 6-month outflow trend, drawn as an SVG polyline with a subtle gold fill.
 * Stroke draws in over 600ms on mount; reduce-motion shows it instantly.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  values,
  width = 240,
  height = 56,
  className,
}: SparklineProps) {
  const reduce = useReducedMotion();
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const pathD =
    'M ' +
    values
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return `${x} ${y}`;
      })
      .join(' L ');

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="6-month spending trend"
      className={className}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#spark-fill)" />
      <motion.polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ pathLength: reduce ? 1 : undefined }}
      />
    </svg>
  );
}

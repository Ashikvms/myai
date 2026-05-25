'use client';

/**
 * Vault hub — Honeycomb Tile Grid (LAYOUT_REDESIGN_BRIEF.md §2.5).
 * Three hex tiles for Documents / Reminders / Appointments arranged in
 * an offset honeycomb row. Hover blooms the imaginary neighbour cells
 * (NeighbourBloom inside HexTile) so the grid feels alive.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Bell, Calendar } from 'lucide-react';
import { AskBillBeeHero } from '@/components/ai/ask-ai';
import { HexTile } from '@/components/layout/hex-tile';
import { FallIntoPlace } from '@/components/motion/fall-into-place';

const HUB_CELLS = [
  {
    label: 'Documents',
    href: '/documents',
    icon: FileText,
    blurb: 'Papers, kept safe',
  },
  {
    label: 'Reminders',
    href: '/reminders',
    icon: Bell,
    blurb: "We'll buzz you",
  },
  {
    label: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    blurb: 'Calendar at a glance',
  },
];

export default function VaultPage() {
  const reduce = useReducedMotion();
  // Stagger the 3 hex tiles "left → middle → right" with a soft bounce,
  // letting them feel like they each drop into their own honeycomb cell.
  // First tile lands ~0.25s after the page mount.
  const HEX_DELAYS = [0.25, 0.35, 0.45];
  // Middle hex enters from the bottom (matches its translate-down offset);
  // outer hexes enter from their respective sides.
  const HEX_FROM: Array<'left' | 'bottom' | 'right'> = ['left', 'bottom', 'right'];

  return (
    <FallIntoPlace className="relative max-w-[960px] mx-auto">
      <FallIntoPlace.Item from="top" delay={0}>
      <header className="mb-8">
        <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Vault</h1>
        <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-2">
          Your personal hive archive — documents, reminders, and appointments in one place.
        </p>
      </header>
      </FallIntoPlace.Item>

      <FallIntoPlace.Item from="top" delay={0.1}>
      <div className="mb-12">
        <AskBillBeeHero placeholder="Ask BillBee about your documents, reminders, or appointments…" />
      </div>
      </FallIntoPlace.Item>

      {/* Honeycomb row — 3 cells, middle cell offset down 1/4 hex height
          so the trio reads as a true honeycomb rather than a 3-up grid.
          We use FallIntoPlace.Item per cell so the cells settle one at a
          time, left → middle → right, matching the rest of the app's
          "fall into place" choreography. */}
      <ul
        className="grid grid-cols-3 gap-3 sm:gap-6 max-w-[640px] mx-auto"
        aria-label="Vault sections"
      >
        {HUB_CELLS.map((cell, i) => (
          <li
            key={cell.href}
            // Offset the middle hex down to mimic honeycomb interlock.
            className={i === 1 ? 'translate-y-[18%]' : ''}
          >
            <FallIntoPlace.Item
              from={HEX_FROM[i] ?? 'top'}
              delay={HEX_DELAYS[i] ?? 0.25 + i * 0.1}
            >
            <motion.div
              initial={reduce ? false : { scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, delay: (HEX_DELAYS[i] ?? 0.25) + 0.05 }}
            >
              <HexTile href={cell.href} withNeighbours ariaLabel={`Open ${cell.label}`}>
                <cell.icon
                  className="w-7 h-7 text-[var(--color-accent)] mb-2"
                  strokeWidth={1.75}
                />
                <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                  {cell.label}
                </h3>
                <p className="text-[12px] leading-[16px] text-[var(--color-text-muted)] mt-1 max-w-[12ch]">
                  {cell.blurb}
                </p>
              </HexTile>
            </motion.div>
            </FallIntoPlace.Item>
          </li>
        ))}
      </ul>

      <p className="mt-16 text-center text-[12px] leading-[16px] text-[var(--color-text-subtle)]">
        Tucked away safely. 🐝
      </p>
    </FallIntoPlace>
  );
}

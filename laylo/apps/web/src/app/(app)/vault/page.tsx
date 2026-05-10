'use client';

/**
 * Vault hub — Honeycomb Tile Grid (LAYOUT_REDESIGN_BRIEF.md §2.5).
 * Three hex tiles for Documents / Reminders / Appointments arranged in
 * an offset honeycomb row. Hover blooms the imaginary neighbour cells
 * (NeighbourBloom inside HexTile) so the grid feels alive.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Bell, Calendar } from 'lucide-react';
import { AskBeedoHero } from '@/components/ai/ask-ai';
import { HexTile } from '@/components/layout/hex-tile';

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
  return (
    <div className="relative max-w-[960px] mx-auto">
      <header className="mb-8">
        <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Vault</h1>
        <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-2">
          Your personal hive archive — documents, reminders, and appointments in one place.
        </p>
      </header>

      <div className="mb-12">
        <AskBeedoHero placeholder="Ask Beedo about your documents, reminders, or appointments…" />
      </div>

      {/* Honeycomb row — 3 cells, middle cell offset down 1/4 hex height
          so the trio reads as a true honeycomb rather than a 3-up grid. */}
      <motion.ul
        initial={reduce ? false : 'hidden'}
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
        }}
        className="grid grid-cols-3 gap-3 sm:gap-6 max-w-[640px] mx-auto"
        aria-label="Vault sections"
      >
        {HUB_CELLS.map((cell, i) => (
          <motion.li
            key={cell.href}
            variants={{
              hidden: { opacity: 0, scale: 0.85, y: 16 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 24 } },
            }}
            // Offset the middle hex down to mimic honeycomb interlock.
            className={i === 1 ? 'translate-y-[18%]' : ''}
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
          </motion.li>
        ))}
      </motion.ul>

      <p className="mt-16 text-center text-[12px] leading-[16px] text-[var(--color-text-subtle)]">
        Tucked away safely. 🐝
      </p>
    </div>
  );
}

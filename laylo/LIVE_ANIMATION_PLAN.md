# LIVE_ANIMATION_PLAN.md

**Author:** Principal UI/UX + Motion Specialist
**Audience:** BillBee web engineer
**Goal:** Make the app feel ALIVE — faster route transitions, ambient bee-style life on every screen — without sacrificing performance, accessibility, or the calm tone of the design system.

The plan is opinionated: one strong choice per decision, not five options. It assumes Framer Motion (per `DESIGN_SYSTEM.md` §6.3) and respects the motion tokens already defined (`dur-micro` 120 ms, `dur-standard` 200 ms, `ease-entry` `cubic-bezier(0.4,0,0.2,1)`).

---

## 1. Page transition overhaul

### Diagnosis: why the current transition feels slow & dead

Five compounding issues in `page-transition.tsx`:

1. **`mode="wait"` is the single biggest offender.** It blocks the incoming page until the outgoing exit finishes. With a 200 ms exit + 200 ms enter, perceived latency is ~400 ms on a click that should feel instant.
2. **Symmetric in/out easing.** `ease-entry` decelerates on entry (correct), but using it for the exit makes the leaving content linger. Exits should *accelerate out* (`ease-exit` per §6.1).
3. **No loading affordance.** Data-bound routes complete the transition but render empty — feels like a stall.
4. **Layout shift on mount.** Sidebar/header re-render alongside content, so the eye reads "everything moved" not "content swapped."
5. **No shared layout primitives across routes.** The sidebar pill uses `layoutId` (good); nothing else does, so there's no continuity cue.

### Proposed transition (the strong choice)

**Switch to `mode="popLayout"` + asymmetric, faster timing + a top progress flash.** This is the single most impactful change.

```tsx
// page-transition.tsx (proposed)
'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const enterTransition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] }; // dur-micro+
const exitTransition  = { duration: 0.10, ease: [0.4, 0, 1, 1] };   // ease-exit, very fast

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: enterTransition }}
        exit={{ opacity: 0, y: -4, transition: exitTransition }}
        style={{ willChange: 'transform, opacity, filter' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

Key decisions:

- **`mode="popLayout"`** — incoming page mounts immediately over the outgoing one. Total perceived latency drops from ~400 ms to ~180 ms.
- **Asymmetric timing** — exit is half the duration of enter with `ease-exit`. Reads as "decisive."
- **8 px slide-up + 2 px blur on enter** — the blur removes one frame of pixel-detail comparison so the brain reads "fresh content arrived" instead of "content morphed." ~1 ms GPU cost, gone by frame 3.
- **Reduced-motion:** unchanged — render children directly.

### Companion 1: `<RouteProgressBar>` top flash

2 px gold line at top of viewport, fills L→R during Next route transitions. Absorbs server-data wait.

- Hooks into Next App Router transition state (`useLinkStatus` or router events).
- `--color-accent`, 70% opacity, soft glow. Pure `transform: scaleX` — GPU-only.
- Hidden under reduced motion.

### Companion 2: shared layout continuity

Add `layoutId="page-title"` to the H1 of each top-level route (dashboard, money, vault, tasks, settings). Framer interpolates position across routes with the 200 ms spring. Sells the "calm continuous app" feel. Optional but high-payoff.

### Companion 3: hover prefetch

Set `prefetch={true}` explicitly on all sidebar `<Link>`s and warm the cache on `onMouseEnter`. The *real* source of "slow transitions" is often server fetch, not animation.

---

## 2. Live elements per page

The `<FlyingBees>` pattern in the marketing hero is the reference: 3 mini bees on infinite easeInOut x/y/rotate loops, durations 11–16 s, staggered `delay`. The principle is: **slow, lazy, low-density, infinite — never demanding attention.**

We extract this into `<AmbientBees count speed paths>` (see §3) and vary it per page. Routes are listed below with one strong pick each.

### `/dashboard` — the Hive
- **`<AmbientBees count={2} speed="slow" paths="loose" />`** — two bees doing wide lazy loops in the *background* of the dashboard hero card area. NOT over the whole viewport (would interfere with click targets); confined to a `relative overflow-hidden` zone behind the greeting + KPI tiles.
- **`<PulseDot />`** on the bell icon in the header IF unread count > 0. 2 s sine pulse, gold, `box-shadow` glow only — no transform, so no jitter.
- **Animated KPI numbers** — already have `<AnimatedNumber>`. Re-trigger on dashboard mount with a 600 ms count-up. Confirms "the hive is alive" the second the page lands.

### `/money` (Money hub)
- **`<HoneyDrip />`** — a single golden droplet that forms at the top-right of the page header (~16 s interval), elongates, falls 200 px, then dissolves. Once-per-minute frequency — *not* constant. Reuses `droplet-choreography.tsx` primitive.
- **`<AmbientBees count={1} speed="medium" paths="diagonal" />`** — one bee crossing the hero band only, on a 22 s loop. Money is "where the honey is," so the bee is "checking on it."

### `/vault` (Vault hub)
- **`<HexParticles count={6} drift="up" />`** — six tiny honeycomb hex outlines (8–14 px) drifting *upward* through the vault hero region with random horizontal sway, opacity 0 → 0.3 → 0. 18–24 s lifetime each, staggered. Suggests "stored memory rising." Uses `honeycomb-pattern.tsx` glyph at small scale.
- **No bees** — vault is the "still / safe" room. Calm differs from playful.

### `/bills`
- **`<AmbientBees count={2} speed="slow" paths="loose" />`** scoped to top hero band.
- **Coin-fall on payment success** — when a bill is marked paid, drop 5 small `$` coin SVGs from the bill row, fall 60 px with `gravity` easing, fade out at 0.6 opacity. 700 ms total. Reuses `<SparkleBurst>` infrastructure (already built) but with coin sprite instead of sparkles.
- **"Bee buzz around upcoming due bill"** — for the *single most-urgent* (next 48 h) bill row, the bee mascot icon at the row's left does a gentle 3 s sine bob (`y: 0 → -2 → 0`) with a 120-degree wing flutter every 6 s. Draws the eye without alarm.

### `/tasks`
- **Drifting leaves** — three tiny leaf SVGs (gold-tinted) drift *down-right* across the page background on 25–35 s loops, rotating slowly. `<HexParticles>` with `glyph="leaf"` variant. Density 3, very low opacity (0.12).
- **Mini-confetti on task complete** — 5 gold particles burst upward 40 px from the checkbox, 600 ms, fade. Reuses `<SparkleBurst>` directly. Cap to once per 3 s if user mass-checks.
- **Reduced motion:** static checkmark only.

### `/transactions`
- **`<AmbientBees count={1} speed="medium" />`** above the table on a 20 s loop.
- **Row entry stagger** — 30 ms per row (cap at 12) on filter change. Reuses `<ListStagger>`.
- No drifting particles — the table is dense; particles compete with data scanning.

### `/documents`
- **`<HexParticles count={4} drift="up" speed="slow" />`** — lower density than vault.
- **Folder "settle"** on upload success — 1.0 → 1.08 → 1.0 scale bounce + single `<SparkleBurst>` at top-right corner.

### `/reminders`
- **`<PulseDot />`** on every overdue bell icon (cap to first 5 rows).
- **`<AmbientBees count={1} speed="slow" />`** in the empty-state region only — the bee says "nothing to remind you of."

### `/appointments`
- **Today's calendar dot bloom** — one-shot scale 1 → 1.15 → 1 over 600 ms on page mount.
- **`<AmbientBees count={1} speed="slow" />`** in the hero band.

### `/settings`
- **No ambient bees.** Settings is utilitarian; respect focus.
- Existing theme-toggle gradient sweep stays. Don't add particles around it.
- **Avatar pulse** — single 800 ms scale bounce on profile-photo update.

### `/login` and `/signup`
- After the droplet lands, the landed dot gets an `<IdleBob>` (4 s sine, ±2 px). Breathing.
- Add **`<AmbientBees count={1} speed="slow" />`** in the upper third of the auth card. 24 px, 18 s loop.
- Form-error shake — 60 ms, ±4 px translateX, 3 oscillations. Codify the pattern.

### `/` (marketing landing)
- **Keep `<FlyingBees>`** — it's the reference.
- Add `<RouteProgressBar>` so "Join the hive" → `/signup` gets the same gold flash.
- Optional: hero-mascot parallax (mouse x/y → 8 px max translate). Reduced-motion gated.

---

## 3. Reusable animation primitives to build

Engineers should build this small, opinionated set. Everything else composes from these.

| # | Component                | Purpose                                                                                          | Props                                                                                       | Notes                                                                                                       |
|---|--------------------------|--------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| 1 | `<AmbientBees>`          | Generalised `FlyingBees`. The workhorse — used on most app routes.                               | `count: 1\|2\|3`, `speed: 'slow'\|'medium'\|'fast'`, `paths: 'loose'\|'tight'\|'diagonal'`, `bounds: 'container'\|'viewport'`, `size?: number` | Renders into nearest `relative` parent unless `bounds="viewport"`. Picks `delay` deterministically from path index. |
| 2 | `<RouteProgressBar>`     | 2 px gold line at top of viewport during route changes. Single global instance in (app) layout. | none                                                                                        | Hooks into Next router events. `transform: scaleX` only, GPU-only.                                          |
| 3 | `<PulseDot>`             | Subtle gold pulse for icons (notifications, overdue indicators).                                 | `size?: number`, `color?: string`, `interval?: number` (default 2000 ms)                    | Animates `box-shadow` + `opacity` only. No layout impact. Pauses when off-screen via `IntersectionObserver`. |
| 4 | `<HoneyDrip>`            | Occasional gold droplet that forms, elongates, falls, dissolves.                                 | `interval?: number` (default 60s ± 20s jitter), `position?: 'top-right'\|'top-center'`     | Builds on existing `droplet-choreography.tsx`. Auto-pauses when tab hidden.                                 |
| 5 | `<HexParticles>`         | Drifting honeycomb hex glyphs.                                                                   | `count: 1–8`, `drift: 'up'\|'down'\|'diagonal'`, `speed?: 'slow'\|'medium'`, `glyph?: 'hex'\|'leaf'\|'dot'`, `opacity?: number` | Reuses `honeycomb-pattern.tsx` SVG. Each particle gets randomised lifetime within bounds for natural feel.  |
| 6 | `<CoinDrop>`             | Falling coin micro-burst, e.g. "bill paid."                                                      | `count?: number` (default 5), `from: { x: number; y: number }`, `onComplete?: () => void`  | Sibling of `<SparkleBurst>` with coin sprite. 700 ms gravity easing.                                        |
| 7 | `<IdleBob>`              | Wraps any child in an infinite gentle `y` sine bob (the auth-droplet idle, the bee-row hover).   | `amplitude?: number` (default 2), `duration?: number` (default 3)                           | One-line wrapper. Pure transform.                                                                           |
| 8 | `<TabVisibilityGate>`    | Context provider — exposes `isPageVisible` boolean. Animation primitives consume it to pause.    | none                                                                                        | Wraps the (app) layout. Listens to `visibilitychange`.                                                       |

`<BeeFlyBy>` (existing once-per-day bee) stays as-is — it's a separate "Easter egg" and shouldn't be folded into `<AmbientBees>`.

---

## 4. Performance budget

Hard rules. The engineer must enforce these or the app will jank.

- **Concurrently animating elements per page: ≤ 8.** Count includes ambient bees + drifting particles + pulse dots. The dashboard sample budget: 2 bees + 1 pulse dot + 3 KPI count-ups (one-shot, doesn't count after settle) = 3 sustained. Well under budget.
- **GPU-accelerated transforms only.** Animate `transform` (`translate`, `scale`, `rotate`), `opacity`, and `filter: blur` (sparingly). **Never animate `width`, `height`, `top`, `left`, `margin`, or `box-shadow`-with-blur-radius-changes.**
- **`will-change` discipline.** Set `will-change: transform` on the *animating element only*, never on parents. Remove it on `onAnimationComplete` for one-shot animations. For infinite ambient animations (bees, particles), `will-change` stays on for the lifetime of the component — accept the memory cost (small).
- **`useReducedMotion()` is mandatory at the top of every animated component.** No exceptions. If true: render static fallback (e.g., 3 static bees positioned where they'd loosely orbit) or render nothing.
- **Tab-visibility pause.** `<TabVisibilityGate>` listens to `document.visibilitychange`. When `document.hidden === true`, all ambient primitives pause via `motion.div`'s `animate` prop being toggled to a static state. Resumes on visible. Saves battery + CPU when user is in another tab.
- **Off-screen culling.** `<AmbientBees>` and `<HexParticles>` use `useInView()` on their container. If container is scrolled out of viewport for >2 s, animation pauses. Resumes on re-entry.
- **Bundle impact.** All primitives must tree-shake; Framer Motion's `LazyMotion` + `domAnimation` feature set is enough — do not import `domMax`. Saves ~25 KB.
- **No layout thrash.** Particles and bees live inside `position: absolute` containers with `pointer-events: none`. They never trigger reflow on the main content tree.
- **A11y: `aria-hidden="true"` on all decorative motion containers.** Already done in `<FlyingBees>` and `<BeeFlyBy>` — keep this discipline.
- **Input latency: zero tolerance.** No animation may delay click handlers. Use `pointer-events: none` on every decorative layer.

---

## 5. Implementation phasing

Strict order. Do not skip ahead — each phase verifies the previous one didn't regress.

### Phase 1 — Faster page transitions (immediate win, ~30 min work)
1. Replace contents of `apps/web/src/components/motion/page-transition.tsx` with the proposed `popLayout` + asymmetric timing version (§1).
2. Add `<RouteProgressBar>` component, mount once in `(app)/layout.tsx` directly inside the root `<div>`.
3. QA: navigate Dashboard ↔ Money ↔ Vault ↔ Settings rapidly. Should feel ~2× faster. Verify reduced-motion still skips animation.
4. Add `layoutId="page-title"` to H1 of each top-level page (optional polish, can defer).

**Ship this phase alone if needed.** It addresses the user's loudest complaint.

### Phase 2 — Ambient bees on all (app) routes (~2 h work)
1. Build `<AmbientBees>` primitive in `apps/web/src/components/motion/ambient-bees.tsx`. Extract `MiniBee` SVG out of marketing page into `apps/web/src/components/illustrations/mini-bee.tsx` so both can share it.
2. Build `<TabVisibilityGate>` provider, wrap the (app) layout with it.
3. Drop `<AmbientBees count={1|2} ... />` into the hero zones of `/dashboard`, `/money`, `/bills`, `/transactions`, `/appointments`, `/reminders`, `/login`, `/signup`. Always inside a `relative overflow-hidden` container, never viewport-wide.
4. QA: open Chrome DevTools Performance, record 10 s on `/dashboard`. Confirm: no layout shifts after mount, FPS stays ≥ 58, GPU memory stable.

### Phase 3 — Per-page custom elements (~3 h work)
1. Build `<HexParticles>`, `<HoneyDrip>`, `<PulseDot>`, `<CoinDrop>`, `<IdleBob>`.
2. Wire them per-route per §2:
   - `/vault` + `/documents` → `<HexParticles>`
   - `/money` → `<HoneyDrip>`
   - Header bell + `/reminders` → `<PulseDot>`
   - `/bills` payment-success → `<CoinDrop>`
   - `/login`+`/signup` post-droplet → `<IdleBob>` on the dot
   - `/tasks` → `<HexParticles glyph="leaf">` background + `<SparkleBurst>` on completion
3. QA each route in isolation: visual review + reduced-motion review + tab-hidden verification.

### Phase 4 — Polish + safety net (~1 h work)
1. Verify `<RouteProgressBar>` works with all real router transitions (including programmatic `router.push`).
2. Verify tab-visibility pause works across all primitives.
3. Add a Storybook (or simple `/dev/motion` route, dev-only) showcasing every primitive with controls — gives QA + design a single page to regression-test.
4. Lighthouse perf audit on `/dashboard` and `/money` — target Performance score ≥ 95 (it should already be there; this is the safety check that we didn't regress).
5. `prefers-reduced-motion` end-to-end test: enable in OS, walk every route, confirm zero motion.

---

## Final notes

- The user's quote — *"I want the website to feel alive"* — is satisfied not by **more** motion but by **immediate** motion. Phase 1 alone (faster page transitions + route progress bar) will deliver 70% of the perceived improvement. Phases 2–4 deliver the playful character.
- Resist the temptation to add ambient bees to *every* surface. Settings, tables, dense data screens → keep them quiet. The contrast is what makes the playful screens feel alive.
- The `<FlyingBees>` reference is correct precisely because it's *under-density* (3 bees on a huge hero) and *low frequency* (10–16 s loops). Replicate that restraint everywhere.

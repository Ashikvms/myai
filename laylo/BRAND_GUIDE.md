# BillBee Brand & Style Guide

**Version:** 1.0 (BillBee rebrand) · **Status:** Canonical for web + mobile · **Owners:** Design Lead (doc), Web Tech Lead (`tailwind.config.ts` + `globals.css`), Mobile Tech Lead (`apps/mobile/src/lib/tokens.ts`).

Read this before designing a screen, adding a token, writing a copy string, or wiring a microinteraction. The contract that makes web↔mobile feel seamless. **Supersedes** the colour table in `DESIGN_SYSTEM.md §1` and the "Laylo" titling in the two redesign briefs — those remain useful conceptual references for per-page audits, but this file wins on hexes, tokens, and copy.

---

## Table of contents

1. [Brand identity & voice](#1-brand-identity--voice)
2. [Personality & copy bank](#2-personality--copy-bank)
3. [Color system](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & layout grid](#5-spacing--layout-grid)
6. [Border radius & elevation](#6-border-radius--elevation)
7. [Component vocabulary](#7-component-vocabulary)
8. [Illustration & icon style](#8-illustration--icon-style)
9. [Layout patterns](#9-layout-patterns)
10. [Motion vocabulary](#10-motion-vocabulary)
11. [AI affordance pattern](#11-ai-affordance-pattern)
12. [Web implementation cheatsheet](#12-web-implementation-cheatsheet)
13. [Mobile implementation cheatsheet](#13-mobile-implementation-cheatsheet)
14. [Cross-platform parity checklist](#14-cross-platform-parity-checklist)
15. [Versioning & change log](#15-versioning--change-log)

---

## 1. Brand identity & voice

**Summary:** BillBee is your bumblebee for life's admin. Minimal but fun. Conversational, supportive, mildly cheeky. Never corporate.

### What BillBee is

BillBee is an AI-powered life-admin assistant. It tracks bills, subscriptions, tasks, appointments, reminders, documents, and bank transactions — and quietly buzzes about anything that needs your attention. The product mental model is a **hive**: many small things, one organised swarm, you in the centre.

### Who it's for

People who are good at most of their life but lose hours every month chasing renewals, splitting receipts, remembering what's due. They want help — but the kind of help that doesn't feel like a spreadsheet logging in to talk to them.

### The 1-line mission

> **Your bumblebee for life's admin.**

Use this verbatim on marketing, in app onboarding ("Welcome to BillBee — your bumblebee for life's admin"), and in any pitch deck. Never edit it. Never paraphrase it.

### Tone of voice — six rules

1. **Conversational, never corporate.** "Tucked away safely" — not "Operation completed successfully."
2. **Slightly cheeky, never sarcastic.** "Another one bites the dust" after a task — not "Wow, you actually finished one."
3. **Supportive, never preachy.** "All quiet. We'll buzz you when something needs attention." — not "Stay on top of things."
4. **Concrete, never generic.** "Due in 3 days · $185" — not "You have an upcoming bill."
5. **Specific bee metaphors allowed (sparingly).** "Hive," "buzz," "swarm," "honey trail." One per surface, not three.
6. **Never apologise unprompted.** "Hmm, something stung. Try again?" — not "We're so sorry for the inconvenience."

### Brand name

**BillBee** — one word, capital B twice. The product name. Never "Bill Bee," never "Billbee," never the all-caps "BILLBEE." The mascot is **"the bee"** or **"the bumblebee"** in lowercase prose.

---

## 2. Personality & copy bank

**Summary:** Every string the user sees ships from a copy bank. Web and mobile read from the same well so voice never drifts.

### Voice in practice

| Rule                                | Example (do)                                              | Anti-example (don't)                                |
| ----------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Lead with the verb                  | "Lock it in"                                              | "You can save it now"                               |
| Second-person, present tense        | "Pay the electricity bill — $142.50, due tomorrow."       | "User needs to pay electricity bill due tomorrow."  |
| Concrete over abstract              | "5 bills, 6 subs — $2,752.47/month"                       | "You have multiple recurring expenses"              |
| Bee metaphors, sparingly            | "All quiet. We'll buzz you when something needs attention." | "🐝 BUZZ BUZZ! 🐝 Time to check your bills! 🐝"   |
| One emoji per string, max           | "Got it, saved! 🐝"                                       | "Got it, saved! 🐝🍯✨"                             |
| One em-dash per string, max         | "Nothing buzzing here yet — add your first bill"          | "Nothing here — yet — add your first bill — easy"   |
| Never "Oops" or "Whoops"            | "Hmm, something stung. Try again?"                        | "Oops! Something went wrong."                       |
| Never double `!!`                   | "Crushed it."                                             | "Crushed it!!"                                      |

### Copy bank — task / success / system

These are the **production strings**. Mobile lives at `apps/mobile/src/lib/copy.ts` (one map exported as `copy`). Web mirrors the same map — engineers must keep them in sync (gap: web mirror is not yet a dedicated file — see [§14](#14-cross-platform-parity-checklist) parity checklist).

| Key            | String                                          | Where                                |
| -------------- | ----------------------------------------------- | ------------------------------------ |
| `saved`        | `Got it, saved! 🐝`                              | Toast after Save                     |
| `addToHive`    | `Add it to the hive`                            | Primary CTA on add modals            |
| `lockItIn`     | `Lock it in`                                    | Secondary "confirm" CTA              |
| `sendIt`       | `Send it`                                       | Form submit, generic                 |
| `syncStalled`  | `Hmm, sync stalled. Try again?`                 | Sync failure toast                   |
| `missedYou`    | `Missed you 🐝`                                  | Returning-user greeting              |
| `letsGetSetUp` | `Let's get you set up 🐝`                       | Onboarding header                    |
| `thatsYou`     | `That's you 🐝`                                 | Profile confirmation                 |

**Task-done toasts** — rotate randomly per completion so successive checks feel varied, not robotic. Picker lives at `randomTaskDoneToast()` in `apps/mobile/src/lib/copy.ts`.

- `Boom — done.`
- `Another one bites the dust.`
- `Look at you go!`
- `Crushed it.`
- `Off the hive.`
- `Stamp it: complete.`
- `Onto the next one!`

### Copy bank — empty states & errors

(From `REDESIGN_BRIEF.md §6`. These ship at the page callsite — **not** inside the generic `<EmptyState>` component, which keeps a neutral prop API.)

| Surface                  | String                                                          |
| ------------------------ | --------------------------------------------------------------- |
| Bills empty              | `Nothing buzzing here yet — add your first bill`                |
| Subscriptions empty      | `No subs swarming yet`                                          |
| Tasks empty              | `Inbox zero unlocked`                                           |
| Tasks empty (alt)        | `Nothing on the to-do list. Free as a bee.`                     |
| Transactions empty       | `Connect a bank to see what's been flowing`                     |
| Documents empty          | `Your vault is empty. Drop a document in.`                      |
| Reminders empty          | `All quiet. We'll buzz you when something needs attention.`     |
| Appointments empty       | `Calendar's clear. Enjoy the open hive.`                        |
| Banks empty              | `Connect a bank — we'll handle the honey trail.`                |
| Insights empty           | `Add a few things and BillBee will start spotting patterns.`    |
| Loading (generic)        | `Hang on, organising your hive…`                                |
| Loading (transactions)   | `Following the honey trail…`                                    |
| 404                      | `This page flew away`                                           |
| Generic error toast      | `Hmm, something stung. Try again?`                              |
| Network error            | `Lost the buzz. Check your connection.`                         |
| Save success             | `Tucked away safely`                                            |
| Delete confirm           | `Send this one out of the hive?`                                |
| Sign-in CTA              | `Welcome back`                                                  |
| Sign-up CTA              | `Join the hive`                                                 |
| AI chip default          | `Ask BillBee`                                                   |
| Dashboard greeting tail  | `What's worth your time today?`                                 |

### Don'ts (banned strings)

Search-and-replace these on sight:

- `Oops` / `Whoops`
- Multiple `!!` in a row
- `Please try again later.` → use `Hmm, something stung. Try again?`
- `An error has occurred` → use the contextual variant above
- `Are you sure?` (when destructive) → use `Send this one out of the hive?`

---

## 3. Color system

**Summary:** **Highlight yellow is the canvas. Black is the stand-out.** Both modes use the same semantic token names — only the hex flips. Body text is **never** yellow.

Most products are dark text on white. BillBee light mode is dark text on highlight yellow `#F8E71C`; dark mode is the symmetric mirror — yellow on black. Every token name (`--color-bg`, `--color-accent`, etc.) keeps the same meaning across modes; only the hex flips. Components consume `var(--color-*)` and Just Work either way.

### 3.1 Semantic tokens — light mode (the canonical "black-over-yellow")

| Token                      | Hex                  | Usage                                                             |
| -------------------------- | -------------------- | ----------------------------------------------------------------- |
| `--color-bg`               | `#F8E71C`            | Page background. The literal canvas.                              |
| `--color-surface`          | `#FAEC4A`            | Cards, modal bodies, elevated panels.                             |
| `--color-surface-2`        | `#FCF180`            | Nested cards, input fields, expanded card subsections.            |
| `--color-surface-hover`    | `#F4E211`            | Card/row hover, ghost button hover.                               |
| `--color-text`             | `#0A0A0A`            | Body / primary text. Headings.                                    |
| `--color-text-muted`       | `#2A2A2A`            | Secondary text, descriptions, captions.                           |
| `--color-text-subtle`      | `#4A4A0A`            | Tertiary metadata, placeholders, timestamps.                      |
| `--color-text-on-accent`   | `#F8E71C`            | Text painted on top of black CTAs (yellow on black).              |
| `--color-accent`           | `#0A0A0A`            | **Black is the accent here.** CTAs, focus rings, active indicators. |
| `--color-accent-hover`     | `#1F1F1F`            | CTA hover.                                                        |
| `--color-accent-dim`       | `#4A4A4A`            | Subdued accent for borders at rest, glow base.                    |
| `--color-accent-soft`      | `#2A2A2A`            | Tinted-black wash for chips/badges on the yellow canvas.          |
| `--color-border`           | `#B8A800`            | Dark-amber hairlines — visible on yellow.                         |
| `--color-border-strong`    | `#8A7E00`            | Hover-state borders, modal edges.                                 |
| `--color-focus-ring`       | `#0A0A0A`            | Black ring — pops on yellow.                                      |
| `--color-success`          | `#166534`            | Darker green reads better on yellow.                              |
| `--color-warning`          | `#9A3412`            | Darker orange.                                                    |
| `--color-danger`           | `#991B1B`            | Darker red.                                                       |
| `--color-overlay`          | `rgba(0,0,0,.55)`    | Modal/sheet backdrop.                                             |

### 3.2 Semantic tokens — dark mode (the symmetric mirror)

| Token                      | Hex                  | Usage                                                             |
| -------------------------- | -------------------- | ----------------------------------------------------------------- |
| `--color-bg`               | `#000000`            | Page background.                                                  |
| `--color-surface`          | `#0A0A0A`            | Cards, modals.                                                    |
| `--color-surface-2`        | `#141414`            | Nested surfaces, inputs.                                          |
| `--color-surface-hover`    | `#1A1A1A`            | Hover.                                                            |
| `--color-text`             | `#FFFFFF`            | Body.                                                             |
| `--color-text-muted`       | `#A3A3A3`            | Secondary.                                                        |
| `--color-text-subtle`      | `#737373`            | Tertiary.                                                         |
| `--color-text-on-accent`   | `#0A0A0A`            | Black text on yellow CTAs.                                        |
| `--color-accent`           | `#F8E71C`            | **Highlight yellow is the accent here.** CTAs, focus, AI affordance. |
| `--color-accent-hover`     | `#FAED4A`            | CTA hover.                                                        |
| `--color-accent-dim`       | `#8A7E00`            | Subdued accent.                                                   |
| `--color-accent-soft`      | `#3D3700`            | Oxide wash for chips.                                             |
| `--color-border`           | `#1F1F1F`            | Hairlines.                                                        |
| `--color-border-strong`    | `#2A2A2A`            | Hover/modal edges.                                                |
| `--color-focus-ring`       | `#F8E71C`            | Yellow ring on black.                                             |
| `--color-success`          | `#22C55E`            | Mobile dark-mode token (web inherits the light value — see gap).  |
| `--color-warning`          | `#F59E0B`            | Same.                                                             |
| `--color-danger`           | `#EF4444`            | Same.                                                             |
| `--color-overlay`          | `rgba(0,0,0,.65)`    | Modal backdrop.                                                   |

### 3.3 Hard accessibility rules

- **Body text is NEVER yellow.** Always `--color-text` (white in dark, black in light). Yellow body text fatigues eyes and glares on OLED.
- **Small text (< 16 px) is never yellow.** Enforced at the component level — Badge `accent` variant uses `--color-text`, not `--color-accent`.
- **CTAs painted in `--color-accent` use `--color-text-on-accent`** for the label. The pair is locked: black-on-yellow (dark mode) or yellow-on-black (light mode).
- **Yellow on black** clears WCAG AA at any size, but only **use it for accent surfaces** — CTAs, chips, focus rings, mascot, active-tab indicators. Decorative, not informational.
- **Focus ring is always `--color-focus-ring`** with 2 px outline + 2 px offset. Implemented globally in `globals.css` `:focus-visible`.

### 3.4 The bee is theme-independent

The bee mascot **does not** consume `--color-accent`. It paints fixed `GOLD` / `BLACK` / `WHITE` (`#F8E71C` / `#0A0A0A` / `#FFFFFF`) so it reads identically in both modes. There is a separate token pair `--bee-body` / `--bee-detail` reserved for the one place the bee sits **inside** an accent surface (the `.on-accent` utility flips it so contrast holds) — but in the default 5 poses + `BeeLogoMark`, palette is fixed.

---

## 4. Typography

**Summary:** One typeface — **Bricolage Grotesque** variable, axes `wght` / `opsz` / `wdth`. Eight tokens. No exceptions.

### 4.1 The font

**Bricolage Grotesque** by Mathieu Triay / ATF. Free on Google Fonts. Variable.

- Body sizes read like a clean grotesque (near-Inter readability).
- Display sizes pick up personality — tilted `g` ear, friendly `a`, counter-curved `t`. Hand-cut without going quirky.
- Fallback (only if Bricolage fails extended-script QA): **Space Grotesk**. Never Inter, never Caveat, never system in production.

### 4.2 Variable axes

| Axis    | Range    | Default (body) | Display use                          |
| ------- | -------- | -------------- | ------------------------------------ |
| `wght`  | 200–800  | 400 / 600      | 700 at hero                          |
| `opsz`  | 12–96    | 14 (body)      | 20 → 96 (auto-tunes per element)     |
| `wdth`  | 75–100   | 100            | 100 throughout — never compress      |

### 4.3 OpenType features (global)

| Feature | Where             | Effect                                              |
| ------- | ----------------- | --------------------------------------------------- |
| `cv11`  | Everywhere        | Circular zero — disambiguates from `O` in amounts.  |
| `cv05`  | Everywhere        | Straight `l` — disambiguates `1`/`I`.               |
| `ss01`  | Display ≥ 22 px   | Single-storey `a`. Display-only flourish.           |
| `tnum`  | `.tabular-nums`   | Tabular figures so count-ups don't jitter columns.  |

### 4.4 Type scale — 8 tokens (hard cap)

| Token             | Size / line | Wt  | opsz | wdth | OT features          | Use                                                  |
| ----------------- | ----------- | --- | ---- | ---- | -------------------- | ---------------------------------------------------- |
| `display`         | 64 / 68     | 700 | 96   | 100  | cv11, cv05, ss01     | Marketing hero. `tracking-[-0.02em]`.                |
| `h1` (page title) | 32 / 38     | 700 | 64   | 100  | cv11, cv05, ss01     | Top of every route. `tracking-[-0.015em]`.           |
| `h2` (section)    | 22 / 28     | 600 | 32   | 100  | cv11, cv05, ss01     | "AI Insights", "This week". `tracking-[-0.01em]`.    |
| `h3` (card title) | 16 / 22     | 600 | 20   | 100  | cv11, cv05           | Card / modal title, subsections.                     |
| `body`            | 15 / 23     | 400 | 14   | 100  | cv11, cv05           | Paragraphs, lists, descriptions.                     |
| `body-strong`     | 15 / 23     | 600 | 14   | 100  | cv11, cv05           | Inline emphasis.                                     |
| `body-sm`         | 13 / 18     | 500 | 12   | 100  | cv11, cv05           | Chips, metadata, table cells.                        |
| `caption`         | 11 / 14     | 600 | 11   | 100  | cv11, cv05           | Eyebrow labels (uppercase, `tracking-[0.08em]`).     |

Anything outside this scale is a bug.

### 4.5 Loading

- **Web** — `next/font/google` in `apps/web/src/app/layout.tsx`:
  ```ts
  import { Bricolage_Grotesque } from 'next/font/google';
  const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    axes: ['opsz', 'wdth'],
    variable: '--font-bricolage',
    display: 'swap',
  });
  ```
  Apply `${bricolage.variable}` on `<html>`; `body` reads `font-family: var(--font-bricolage), ui-sans-serif, system-ui, sans-serif` via `globals.css`. Zero CLS — Next self-hosts.
- **Mobile** — `useBricolageFont()` from `apps/mobile/src/lib/fonts.ts`. Loads four weights (`400/500/600/700`) via `expo-font` + `@expo-google-fonts/bricolage-grotesque` (TTFs shipped in the package, no network). Call once from the root layout; gate splash dismissal on the returned `fontsLoaded`. Components use `tokens.fontFamily.{body, bodyMedium, displaySemibold, display}`.

> **Gap:** mobile only loads four discrete weights — not the full variable axis. Display-axis (`opsz`/`wdth`) tuning is web-only today. If a future screen needs `opsz 96` on mobile, ship a variable TTF.

### 4.6 Rules

- **One typeface only.** No Inter, no Caveat. Only Bricolage.
- Eight tokens (above). Arbitrary sizes like `text-[10px]` are bugs.
- `wdth` stays at 100 throughout — never compress.
- Tabular numerals (`.tabular-nums`) on **every** counted/aligned number — dashboard stats, transaction amounts, day-totals.
- Body uses `opsz 14` + `cv11`/`cv05` only. Display sizes (≥ 22 px) opt into `ss01`.

See [§3](#3-color-system) for which token colours headings consume (always `--color-text` — never the accent).

---

## 5. Spacing & layout grid

**Summary:** 4 px base. Eight named steps. When in doubt, use the larger step.

| Token (mobile) | Tailwind | Value | Use                                                          |
| -------------- | -------- | ----- | ------------------------------------------------------------ |
| `xs`           | `1`      | 4 px  | Tight icon-to-text gap, chip internal padding-y.             |
| `sm`           | `2`      | 8 px  | Compact stack (chip row, badge cluster).                     |
| `md`           | `3`      | 12 px | Form field internal padding.                                 |
| `lg`           | `4`      | 16 px | Card-inner horizontal padding (small), button gap.           |
| `xl`           | `6`      | 24 px | **Default card inner padding.** Most layouts.                |
| `xxl`          | `8`      | 32 px | **Default section vertical rhythm.**                         |
| `xxxl`         | `12`     | 48 px | Page header-to-content offset, large empty-state padding.    |
| `hero`         | `16`     | 64 px | Marketing hero spacing, full-page modal padding.             |

**Generosity rule:** when in doubt, use the larger step. "Minimal-but-fun" means **breathable**, not cramped.

Mobile constant lives at `apps/mobile/src/lib/tokens.ts` (`spacing`). Web reads Tailwind's default scale, which already covers `1/2/3/4/6/8/12/16` (no custom `spacing` extension required — see `tailwind.config.ts` comment).

---

## 6. Border radius & elevation

**Summary:** TWO radii. Five shadows. Dark mode shadows become inset highlights.

### 6.1 Border radius

Two values. No exceptions.

| Token         | Value | Used by                                                        |
| ------------- | ----- | -------------------------------------------------------------- |
| `radius-sm`   | 8 px  | Chips, badges, inputs, selects, textarea, date-picker, toast.  |
| `radius-md`   | 16 px | Cards, modals, buttons, sheets, sidebar, dropdowns.            |
| `rounded-full`| —     | Avatars, dot indicators, toggle thumb only.                    |

Retired: `rounded-[6px]`, `rounded-[10px]`, `rounded-[24px]`, `rounded-[2.5rem]`. Anything else is a bug.

Mobile: `radius.sm` / `radius.md` in `apps/mobile/src/lib/tokens.ts`. Tailwind: `lg` and `xl` legacy aliases both collapse to `16px` so old callsites still compile (`tailwind.config.ts`).

### 6.2 Shadows

Light mode = real shadows on yellow (yellow shows shadow well). Dark mode = cast shadow + 1 px inset highlight (a shadow on black is invisible — the inset highlight gives the edge).

| Token         | Light                                            | Dark                                                                  | Use                                  |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------ |
| `shadow-sm`   | `0 1px 2px rgba(0,0,0,.08)`                      | `inset 0 1px 0 rgba(255,255,255,.04)`                                 | Resting card, button.                |
| `shadow-md`   | `0 4px 12px rgba(0,0,0,.12)`                     | `0 4px 12px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)`     | Hover card, dropdown.                |
| `shadow-lg`   | `0 12px 32px rgba(0,0,0,.18)`                    | `0 12px 32px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)`    | Modal, sheet.                        |
| `shadow-pop`  | `0 8px 24px rgba(0,0,0,.18)`                     | `0 8px 24px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.05)`    | Bill card hover.                     |
| `shadow-glow` | `0 0 0 3px rgba(10,10,10,.35)` (black ring)      | `0 0 0 3px rgba(248,231,28,.35)` (yellow ring)                        | "Ask BillBee" chip hover, focus rings.|

Tailwind: `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-pop` / `shadow-glow` (declared in `tailwind.config.ts` `boxShadow`).

> **Gap:** mobile does not yet have a shadow token map. Use `elevation` (Android) + `shadowColor`/`shadowOpacity`/`shadowRadius` (iOS) per-component and match the values above. A shared `apps/mobile/src/lib/shadows.ts` is a future cleanup.

---

## 7. Component vocabulary

**Summary:** 15 components. Two sizes (sm/md/lg where size matters), four-to-five variants. No new variants without bumping this doc.

| Component        | Spec (one-liner)                                                                                                              | Variants                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Button**       | `radius-md`. Sizes: sm 32 / md 40 / lg 48 px tall. `default` paints `--color-accent`; secondary/outline/ghost/danger as needed.| default · secondary · outline · ghost · danger |
| **Card**         | `radius-md`, bg `--color-surface`, 1 px `--color-border`. Inner padding 24. Hoverable variant grows to `shadow-pop` + strong border.| default · glass · hoverable                |
| **Input**        | `radius-sm`, bg `--color-surface`, 1 px `--color-border`. Focus = accent border + 25 % ring. Error = `--color-danger`.        | default · error · disabled                     |
| **Textarea**     | Inherits Input rules. `min-height: 80`. `resize-vertical` (or `resize-none` if `autoResize`).                                  | —                                              |
| **Select**       | Native `<select>`. Inherits Input rules. Chevron Lucide 16 px subtle.                                                          | —                                              |
| **DatePicker**   | Native `<input type="date">`. Inherits Input. Dark mode inverts the calendar picker indicator.                                 | —                                              |
| **Badge**        | `radius-sm`. Sizes sm/md. `accent` is the only place small text touches accent colour (uses `--color-text` for safety).        | default · accent · success · warning · danger · outline |
| **Avatar**       | `rounded-full`. Sizes 32 / 40 / 48 px. Image → initials fallback on error.                                                     | sm · md · lg                                   |
| **Modal**        | `radius-md`, padding 32, max-w 640. Backdrop `--color-overlay` + `backdrop-blur-sm`. Focus trap + Escape baked in.             | —                                              |
| **Sheet (mobile)**| Bottom sheet — `radius-md` on top corners only (16/16/0/0). `Easing.out(Easing.cubic)`, 280 ms.                              | —                                              |
| **Toast**        | `radius-md`, max-w 384, 4 s auto-dismiss + accent progress bar. **Top-anchored**, never bottom.                                | info · success · warning · error               |
| **Tab pill**     | Framer `layoutId` sliding pill, `spring-tab` (stiffness 400, damping 30). No colour fade.                                      | —                                              |
| **EmptyState**   | Centred vertical flex, padding `py-12 px-6`. Icon slot accepts a `<Bee*>` component. Title `h3`, description `body` muted.     | —                                              |
| **LoadingSpinner**| `animate-spin` 1 s linear. Sizes 16 / 24 / 32 px. Colour tokens: accent / white / muted.                                      | sm · md · lg                                   |
| **Toggle**       | Track 44 × 24 (md), `rounded-full`. Track-checked = `--color-accent`. Thumb = white on accent (only place white sits on accent).| sm · md                                        |

States (across all interactive components):
- `hover` — surface or accent hover variant
- `active` — `scale(0.98)` for 60 ms
- `focus-visible` — 2 px `--color-focus-ring` ring + 2 px offset
- `disabled` — `opacity: 0.5`, `pointer-events: none`
- `loading` — spinner replaces leading icon; preserves width via `min-width`

For variant tables, padding tables, and the per-component state matrices, see `DESIGN_SYSTEM.md §7`.

---

## 8. Illustration & icon style

**Summary:** The bee mascot is the brand's heart. Geometric flat, two-tone, fixed palette. Lucide icons stroke 1.75. No filled icons.

### 8.1 The bee — anatomy (BeeStanding / BeeLogoMark)

The bee paints **fixed colours** (`GOLD #F8E71C` · `BLACK #0A0A0A` · `WHITE #FFFFFF`) so the silhouette reads identically on yellow or black. Earlier theme-flipping made the bee read as an "angry mask" in light mode — locked palette is the fix.

- **Face:** circle, gold fill, **4 px BLACK outline** (gives silhouette in light mode where face matches the canvas).
- **Antennae:** two stalks, BLACK stroke 3.2 px, capped with chunky GOLD orbs (`r=4.5`) outlined BLACK 2 px.
- **Eyebrows:** two angled BLACK bars, 6 px stroke — **outer ends HIGH, inner ends LOW** (cool/confident look, not angry).
- **Mouth:** single solid BLACK bar (`rect`, `rx=3.5`). No teeth, no curve, no eyes.
- **Wings:** white outlined ovals at 22 % fill, BLACK stroke 2.4 px at 85 % opacity.
- **No third colour.** No neutrals beyond stroke.

Source: `apps/web/src/components/illustrations/bee.tsx`. Five poses ship today: `BeeStanding`, `BeeLookingAround`, `BeeMagnifying`, `BeeSleeping`, `BeeEnvelope`, plus `BeeLogoMark` (the brand-mark square at 64 viewBox / 40 px default).

> **Gap:** brief docs (`DESIGN_SYSTEM.md §8.2`) mention `BeeYawning`, `BeeWorking`, and `BeeCelebrating` poses that **are not implemented**. If a screen needs them, add to the same file with matching anatomy.

### 8.2 When to use which pose

| Pose             | Where                                              |
| ---------------- | -------------------------------------------------- |
| `BeeStanding`    | 404, onboarding hero, dashboard morning, default.  |
| `BeeMagnifying`  | Search empty states, dashboard midday.             |
| `BeeSleeping`    | Tasks empty ("Inbox zero unlocked"), reminders empty, dashboard after 8 pm. |
| `BeeLookingAround`| Curiosity / "where is it?" empties.               |
| `BeeEnvelope`    | "No notifications" / "nothing buzzing".            |
| `BeeLogoMark`    | Brand mark in nav + marketing.                     |

All poses fit a 96 × 96 viewBox (`BeeLogoMark` is 64 × 64). All take `size?: number` (default 96) + `className?: string`.

### 8.3 Lucide icons

- Library: `lucide-react` (web) + `lucide-react-native` (mobile). Already installed.
- **Stroke width: 1.75** across the board. Set globally via the component prop.
- **Sizes:** 16 (chips, inline metadata), 20 (default — buttons, navs), 24 (section headers, modal heads), 32 (empty-state fallback when no bee).
- **Colour:** `--color-text` by default. Accent (`--color-accent`) **only** for the AI affordance icons (`Sparkles`, `MessageSquareText`).
- **No filled variants.** Stroke style only.

### 8.4 Empty-state illustration style

- Geometric flat. One hand-drawn line accent allowed (the bee covers this).
- Two-tone — black + the accent. No third colour.
- Stroke 2 px for illustrations (slightly heavier than icons because they're larger). Round caps and joins.
- Size 96 – 128 px in empty states. Never exceed 160 px even on desktop.

### 8.5 Hive primitives

The brand also ships three hive-shaped primitives that aren't strictly illustrations but read as brand:

- **`<HoneycombPattern>`** — 5 % opacity background motif. Used as the canvas of Money + Vault hub pages. Static SVG, no motion.
- **`<HexFrame>`** — single hex-clipped wrapper for icons / avatars. Replaces square/circle frames where the hive metaphor matters.
- **`<HexTile>` / `<HiveHeader>` / `<ProgressHive>`** — composed hex-tile layouts for the Honeycomb Tile Grid, Bills Hive Header, and Tasks Progress Hive patterns.

Locations: `apps/web/src/components/illustrations/honeycomb-pattern.tsx` + `apps/web/src/components/layout/hex-*.tsx`.

---

## 9. Layout patterns

**Summary:** Seven named layout patterns — recipes, not React components yet. Each screen reaches for one.

> **Gap:** these patterns are **conventions, not components**. There is no `<BentoGrid>` or `<ConversationalStack>` export. Engineers implement the recipe per-page following the prose below + the lengthier per-page audits in `LAYOUT_REDESIGN_BRIEF.md §2`. Future cleanup: extract shared CSS-grid / flex primitives.

| Pattern                      | Used by                                | One-line recipe                                                                                              |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Bento Grid**               | Dashboard (2+3+1), Money (1+4)         | 12-col × 4-row of 180 px tiles. Asymmetric tile sizes (1 hero + smaller siblings).                            |
| **Honeycomb Tile Grid**      | Vault, Documents                       | Cards become hex-clipped tiles via `clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)`. Staggered like real honeycomb. |
| **Origami Card**             | Bills                                  | Card folds `rotateX(90deg)` `transform-origin: top` on Mark Paid. 380 ms. Surrounding cards re-flow via Framer `layout`. |
| **Conversational Stack**     | Tasks, Reminders                       | Single-column rows that read like sentences (composed copy, not "Title / Date / Status" columns).            |
| **Calendar Ribbon**          | Appointments                           | Top: 14-day horizontal scrolling ribbon with `scroll-snap`. Below: day-grouped cards with `h2` day headers.  |
| **Story Strip**              | Subscriptions                          | Horizontally-scrollable 240 × 160 tiles. Brand big, price small, renewal countdown as a thin gold ring.      |
| **Settings Hub Grid**        | Settings                               | 2 × 2 hub of 240 × 180 cards on first view; chosen section opens a full-width detail panel below. iPad-Settings pattern. |

For per-page audits + delight moments (Hive Header pulse, Origami fold, Threaded gold line on Reminders, Today-haloed Appointments column, etc.), see `LAYOUT_REDESIGN_BRIEF.md §2`.

---

## 10. Motion vocabulary

**Summary:** 14 named microinteractions + a fixed token vocabulary. Springs over linear cubic everywhere. Reduce-motion is mandatory.

### 10.1 Duration tokens

| Token            | Value   | Use                                                  |
| ---------------- | ------- | ---------------------------------------------------- |
| `dur-micro`      | 120 ms  | Chip hover, checkbox tick, focus ring.               |
| `dur-standard`   | 200 ms  | Card hover, tab-pill slide, toast slide-in.          |
| `dur-expansive`  | 320 ms  | Empty-state mount, sheet expand.                     |
| `dur-modal`      | 280 ms  | Web modal scale + drift.                             |

### 10.2 Easing

| Token          | Value                                  | Use                                       |
| -------------- | -------------------------------------- | ----------------------------------------- |
| `ease-entry`   | `cubic-bezier(0.4, 0, 0.2, 1)`         | Things appearing.                         |
| `ease-exit`    | `cubic-bezier(0.4, 0, 1, 1)`           | Things leaving — accelerates out.         |
| `spring-tab`   | `{ stiffness: 400, damping: 30 }`      | Framer `layoutId` tab-pill slide.         |
| `spring-fall`  | `{ stiffness: 240, damping: 28, mass: 0.8 }` | `<FallIntoPlace>` settling entrance.|
| `spring-pop`   | `{ stiffness: 500, damping: 25 }`      | `<MotionButton>` tap.                     |
| `gravity`      | `cubic-bezier(0.55, 0.05, 0.85, 0.5)`  | Droplet fall (login entrance).            |

Tailwind exposes `transitionDuration` (`micro`, `standard`, `expansive`, `modal`) and `transitionTimingFunction` (`entry`, `exit`) in `tailwind.config.ts`. Springs are passed inline to Framer `transition`.

### 10.3 The 14 microinteractions

Each is a one-liner. Full property-by-property spec in `DESIGN_SYSTEM.md §6.2`.

1. **Bill card hover** — `translateY(0 → -2px)` + `shadow-sm → shadow-pop`, 200 ms `ease-entry`.
2. **Task checkbox check** — box paints accent in 180 ms; check stroke draws via `pathLength: 0→1` in 200 ms; row text crossfades to 60 % + line-through in 150 ms.
3. **Empty-state bee mount** — `scale(0.9 → 1) + opacity(0 → 1)`, 320 ms. Web idles with 4 px vertical sine loop (3 s) via `<IdleBob>`.
4. **"Ask BillBee" chip hover** — opacity `0.5 → 1`, border `dim → accent`, `shadow-glow` appears. 150 ms.
5. **Tab pill slide** — Framer `layoutId`, `spring-tab`. Transform only — no colour fade.
6. **Modal open** — backdrop fade 150 ms; panel `scale(0.96 → 1) + translateY(8 → 0) + opacity(0 → 1)`, 220 ms.
7. **Bottom sheet (mobile)** — `translateY(100% → 0)` 280 ms `Easing.out(Easing.cubic)`. Backdrop 0 → 0.6.
8. **Toast slide-in** — top-anchored. `translateY(-12 → 0) + opacity(0 → 1)` 200 ms in / 150 ms out. Progress bar `scaleX(1 → 0)` over 4 s linear.
9. **Theme toggle overlay** — `.theme-fade-overlay` keyframe (`globals.css`) — radial gold/black wash, 700 ms.
10. **Sidebar active item** — `layoutId="sidebar-active"`, 4 px accent bar, `spring-tab`.
11. **Mobile FAB press** — `scale(1 → 0.95)` 120 ms + `expo-haptics impactAsync(Light)`. Long-press expands the AI sheet.
12. **Card expand** — chevron `rotate(0 → 180deg)` 200 ms; body `height(0 → auto) + opacity(0 → 1)` 220 ms.
13. **Plaid success confetti** — ≤ 8 accent particles, `translateY(0 → -120px) rotate(0 → 360deg)`, 600 ms. **Only at `/settings/banks`.**
14. **Loader (>800 ms)** — 3 accent dots, opacity `0.3 ↔ 1` staggered 80 ms. Static bee beside.

Orchestration primitives shipped at `apps/web/src/components/motion/*`:
`<FallIntoPlace>` (page entrance, `spring-fall`) · `<DropletChoreography>` (1.8 s login entrance, once per session via `sessionStorage` key `billbee:authDropletPlayed`) · `<SparkleBurst>` (task-complete particles) · `<AnimatedNumber>` (~800 ms count-up) · `<PageTransition>` (fade + 0.97→1 scale + corner-bee) · `<RouteProgressBar>` (2 px top line) · `<BeeFlyBy>` (once-per-day) · `<AmbientBees>` (GPU-only, pause when tab hidden) · `<CursorBee>` (marketing landing only).

### 10.4 Reduce-motion fallback (mandatory)

- **Web** — `useReducedMotion()` at the top of every animated component. Pass `transition={{ duration: 0 }}` (or `initial={false}`) when true. Decorative entrances are skipped; functional state changes (color/opacity that signals state) still apply instantly.
- **Mobile** — `AccessibilityInfo.isReduceMotionEnabled()` (cached in a custom hook). Wrap entry animations in `withTiming({ duration: prefersReducedMotion ? 0 : 280 })`. Reanimated's `useReducedMotion()` is also acceptable.
- **CSS** — `@media (prefers-reduced-motion: reduce)` already kills `.theme-fade-overlay` (see `globals.css`).

### 10.5 Implementation contract

- **Web:** Framer Motion only. No CSS keyframes for component-local motion (the global `.theme-fade-overlay` keyframe in `globals.css` is the lone exception).
- **Mobile:** Reanimated v3 only. Worklets **must** declare `'worklet'`; calls to non-worklet JS need `runOnJS`.
- **No new animation libraries.** No Lottie, no GSAP. Locked.

---

## 11. AI affordance pattern

**Summary:** "Ask BillBee" reads as part of the brand without overwhelming the surface. **At rest, AI chips are 50 % opacity.** The dashboard hero input is the single always-bright accent surface.

### 11.1 Where AI shows up

| Surface                                  | Trigger                | Visual                                                |
| ---------------------------------------- | ---------------------- | ----------------------------------------------------- |
| Web — Bill / Sub / Doc / Reminder / Appt card | Card hover         | Accent chip top-right, fades in 150 ms.               |
| Web — Bill/Sub expanded section          | Always visible         | Chip in section header.                               |
| Web — Task / Transaction row             | Row hover              | Chip right-aligned next to actions.                   |
| Web — Dashboard hero                     | Always visible         | Full input bar (see §11.3).                           |
| Mobile — Home header                     | Always visible         | "Ask BillBee" pill in header.                         |
| Mobile — list row                        | Tap-and-hold           | Bottom sheet opens with chip + suggested prompts.     |
| Empty state of every list                | Always visible         | Secondary "Ask BillBee to add something" link below primary CTA. |

### 11.2 Chip visual spec

**Rest (always — even when always-visible):**
- 1 px border `--color-accent-dim` at 50 % opacity. Fill transparent.
- Padding 4 px / 10 px.
- `radius-sm` (8 px).
- Icon: Lucide `Sparkles`, 14 px, stroke 1.75, `--color-accent` at 70 % opacity.
- Label: `body-sm` weight 500, `--color-text-muted`. Optional — icon-only on dense cards.

**Hover / focus / press:**
- Border `--color-accent` 100 %.
- Icon + label 100 %.
- `shadow-glow` (3 px ring — black on yellow, yellow on black).
- Transition: 150 ms `ease-entry`.

**Active / pressed:**
- Fill `--color-accent-soft`. Same border + glow.

### 11.3 Dashboard hero "Ask BillBee" input

The **only** primary accent surface on the dashboard. The whole hero element **is** the input.

- 100 % width, `radius-md`, bg `--color-surface`, border 2 px `--color-accent`, padding 16 / 20.
- Always-on `shadow-glow` at 50 % intensity (subtle).
- Leading `Sparkles` 24 px in `--color-accent`.
- Native `<input>` font `h3` (16 px), bg transparent, no border, placeholder `Ask anything about your bills, tasks, or money…` in `--color-text-subtle`.
- Trailing arrow: 32 px accent square `radius-sm`, `ArrowUp` 18 px.
- On submit → opens **slide-over (web) / bottom sheet (mobile)**. **No route change.**

### 11.4 Default per-surface prompts

Engineers wire one per surface — don't make the user think of a question.

| Surface                  | Prompt                          |
| ------------------------ | ------------------------------- |
| Bill                     | `Why did this go up?`           |
| Subscription             | `Worth keeping?`                |
| Task                     | `Break into steps`              |
| Transaction              | `Why did this repeat?`          |
| Document                 | `Summarise`                     |
| Document (with expiry)   | `When does this expire?`        |
| Appointment              | `Help me prep`                  |
| Reminder                 | `Why was this set?`             |
| Generic empty            | `Ask BillBee to add something`  |

### 11.5 Hierarchy rule (locked)

Accent chips at rest are 50 % opacity. They pop to full only on interaction. The dashboard hero input is the sole always-bright accent surface. **This prevents the page from feeling like a Christmas tree.**

---

## 12. Web implementation cheatsheet

**Summary:** Tokens in `globals.css`. Tailwind reads them as semantic colour keys. Theme via `next-themes`. Motion via Framer.

### 12.1 Where things live

| Concern             | File                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| CSS variables       | `apps/web/src/styles/globals.css` (`:root` light, `.dark` dark)          |
| Tailwind semantic colour keys | `apps/web/tailwind.config.ts` (`theme.extend.colors`)          |
| Font load           | `apps/web/src/app/layout.tsx` (`next/font/google` Bricolage)             |
| Theme provider      | `next-themes` via `apps/web/src/components/providers.tsx` (`attribute="class"`, `enableSystem={false}`) |
| Motion components   | `apps/web/src/components/motion/*`                                        |
| Bee mascot          | `apps/web/src/components/illustrations/bee.tsx`                          |
| Hive primitives     | `apps/web/src/components/layout/hex-{frame,tile}.tsx`, `hive-header.tsx`, `progress-hive.tsx`, `illustrations/honeycomb-pattern.tsx` |

### 12.2 Reading tokens

```tsx
// Preferred — semantic Tailwind key (reads from --color-* under the hood):
<button className="bg-accent text-text-on-accent rounded-md">Save</button>

// Arbitrary-value escape hatch when you need the raw var:
<div className="ring-2 ring-[var(--color-focus-ring)]" />

// In raw CSS:
.thing { background: var(--color-surface-2); }
```

### 12.3 Theme switching

```tsx
'use client';
import { useTheme } from 'next-themes';
const { theme, resolvedTheme, setTheme } = useTheme();
setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
```

**Never** toggle the `.dark` class manually with `document.documentElement.classList.add('dark')` — `next-themes` owns it. Any page using local `useState` + DOM toggle is a bug (this was the `/documents` + `/reminders` bug `REDESIGN_BRIEF §2.4–2.5` fixed).

### 12.4 Motion patterns

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { FallIntoPlace } from '@/components/motion/fall-into-place';

const reduce = useReducedMotion();

<motion.div
  initial={reduce ? false : { opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: reduce ? 0 : 0.2, ease: [0.4, 0, 0.2, 1] }}
/>

<FallIntoPlace>
  <FallIntoPlace.Item from="top" delay={0.05}>{...}</FallIntoPlace.Item>
  <FallIntoPlace.Item from="left" delay={0.1}>{...}</FallIntoPlace.Item>
</FallIntoPlace>
```

---

## 13. Mobile implementation cheatsheet

**Summary:** Tokens as TS maps via `useTokens()`. Reanimated v3 worklets. Bricolage via `expo-font`. NativeWind is **not currently active** — use StyleSheet.

### 13.1 Where things live

| Concern         | File                                                       |
| --------------- | ---------------------------------------------------------- |
| Token maps      | `apps/mobile/src/lib/tokens.ts` (`tokensLight`, `tokensDark`, `useTokens()`) |
| Spacing / radii | Same file (`spacing`, `radius` exports)                    |
| Bee palette     | Same file (`beePalette` — fixed `gold`/`black`/`white`)    |
| Font loading    | `apps/mobile/src/lib/fonts.ts` (`useBricolageFont()`)      |
| Font names      | `tokens.ts` (`fontFamily` const)                           |
| Theme context   | `apps/mobile/src/context/theme.tsx` (`useThemeOrNull()`)   |
| Conversational copy | `apps/mobile/src/lib/copy.ts` + `randomTaskDoneToast()` |

### 13.2 Reading tokens

```tsx
import { useTokens, spacing, radius, fontFamily } from '@/lib/tokens';

function Card() {
  const t = useTokens();
  return (
    <View style={{
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderColor: t.border,
      borderWidth: 1,
      padding: spacing.xl,
    }}>
      <Text style={{ color: t.text, fontFamily: fontFamily.body }}>
        Hello, hive.
      </Text>
    </View>
  );
}
```

`useTokens()` resolves from `<ThemeProvider>` first, then falls back to `useColorScheme()`. Call it **per render** so components react to theme changes instantly.

### 13.3 Font loading

```tsx
// Root layout
import { useBricolageFont } from '@/lib/fonts';
const fontsLoaded = useBricolageFont();
if (!fontsLoaded) return <SplashScreen />;
```

Available font names: `BricolageGrotesque_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold`. Use them via `tokens.fontFamily.{body, bodyMedium, displaySemibold, display}`.

### 13.4 Reanimated rules

- Every callback that runs on the UI thread declares `'worklet'` at the top.
- Calls from a worklet into non-worklet JS use `runOnJS(fn)(args)`.
- Wrap entry animations: `withTiming(target, { duration: reduceMotion ? 0 : 280, easing: Easing.out(Easing.cubic) })`.
- For sheets, use `useAnimatedStyle` + `useSharedValue`; never mutate state from the worklet.

### 13.5 The bee on mobile

`react-native-svg` port of the same anatomy from `apps/web/.../bee.tsx`. Same fixed `beePalette` (gold/black/white) — the bee is theme-independent. Use the same pose vocabulary (`BeeStanding`, `BeeSleeping`, etc.).

> **Gap:** mobile bee components are not yet centralised in a shared lib — port from the web file 1:1 when adding to a mobile screen, keeping anatomy identical.

### 13.6 NativeWind status

NativeWind is **not currently active** in `apps/mobile`. Don't reach for Tailwind class names. Style with `StyleSheet.create` consuming the `useTokens()` map. If/when NativeWind 4 is wired, it would read the same CSS variable strategy via a mobile `global.css`.

---

## 14. Cross-platform parity checklist

**Summary:** A new screen is shippable when it passes this checklist on both platforms.

Every screen must:

- [ ] **Render in both themes.** Toggle dark/light — no FOUC, no leftover indigo, no hardcoded hex outside the token maps.
- [ ] **Read every colour via the semantic token** (`--color-*` on web, `useTokens()` on mobile). No `#FFD700`, no `#6366F1`, no inline RGB except inside the token files themselves.
- [ ] **Read every typographic size via the 8-token scale.** No `text-[10px]`, no `fontSize: 14.5`.
- [ ] **Use a layout pattern from [§9](#9-layout-patterns).** If none fit, add a new one to that section before inventing.
- [ ] **Strings live in the copy bank.** Mobile = `apps/mobile/src/lib/copy.ts`. Web = the same map (gap: not yet a single file — keep them in lockstep manually until ported).
- [ ] **Bee mascot is identical** on both platforms — same anatomy, same fixed palette, same pose vocabulary.
- [ ] **Motion uses named tokens** (`dur-micro` / `dur-standard` / `dur-expansive` / `dur-modal` / `ease-entry` / `ease-exit` / `spring-tab` / `spring-fall`).
- [ ] **`prefers-reduced-motion` is honoured.** `useReducedMotion()` (web) or `AccessibilityInfo` (mobile) wraps every entrance and decorative loop.
- [ ] **AI chip at rest = 50 % opacity.** Only the dashboard hero is always-bright accent.
- [ ] **Focus-visible ring** is `--color-focus-ring` 2 px + 2 px offset on every interactive element.
- [ ] **Body text is never `--color-accent`.** Headlines aren't either.
- [ ] **Tabular numerals** on every counted/aligned number (`.tabular-nums` on web, equivalent feature setting on mobile).
- [ ] **Empty state ships a bee** + the §2 copy + a primary CTA + a secondary "Ask BillBee" link.
- [ ] **Loading > 800 ms** shows a bee + 3 staggered accent dots (not a grey skeleton). For < 800 ms, render nothing.
- [ ] **No new animation library, font, or icon set.** Framer + Reanimated + Bricolage + Lucide.

---

## 15. Versioning & change log

**Summary:** Bump version when you add a token, add a pattern, or break a callsite. Doc owner = Design Lead; tech owners listed.

### Versioning rules

- **Patch (1.0.x)** — copy bank additions, microcopy tweaks, doc clarifications. No code change needed.
- **Minor (1.x.0)** — new token, new pose, new layout pattern, new microinteraction. Web + mobile tech leads sign off in the same PR.
- **Major (x.0.0)** — palette flip, type-family swap, breaking component rename. Requires user (product owner) sign-off.

### Change log

#### v1.0 — 2026-05 — BillBee rebrand
- Rebrand Laylo / Life Admin AI → **BillBee** ("your bumblebee for life's admin").
- New canvas: highlight yellow `#F8E71C` (light) ↔ black `#000000` (dark) — symmetric inversion of identical semantic token names.
- Single typeface Bricolage Grotesque (variable). Hive theme primitives, bee mascot locked palette, AI affordance pattern, motion orchestration, copy bank — all shipped per the sections above.

### Owners

| Surface                              | Owner                |
| ------------------------------------ | -------------------- |
| This document                        | Design Lead          |
| `apps/web/tailwind.config.ts` + `globals.css` | Web Tech Lead |
| `apps/mobile/src/lib/tokens.ts` + `fonts.ts` + `copy.ts` | Mobile Tech Lead |
| Bee mascot anatomy                   | Design Lead (+ both tech leads on visual sign-off) |
| Copy bank                            | Design Lead          |

### Open gaps (must be resolved before v1.1)

- Web copy bank file (single source of truth, mirrored from `apps/mobile/src/lib/copy.ts`).
- Mobile shadow token map (`apps/mobile/src/lib/shadows.ts`).
- Mobile shared bee components (port `bee.tsx` to `react-native-svg` once, not per-screen).
- Variable-axis Bricolage TTF on mobile (currently four discrete weights only).
- `BeeYawning` / `BeeWorking` / `BeeCelebrating` poses referenced in `DESIGN_SYSTEM.md §8.2` but not implemented.
- Layout patterns are conventions — extract `<BentoGrid>` / `<ConversationalStack>` primitives if reuse warrants it.
- Dark-mode semantic colours (`success` / `warning` / `danger`) on **web** still inherit the light hex (`#166534` / `#9A3412` / `#991B1B`) under `.dark` in `globals.css` — they should swap to the brighter `#22C55E` / `#F59E0B` / `#EF4444` already in `tokensDark`. (Mobile is correct; web is a follow-up.)

---

## End of brand guide

This file is the contract. When it conflicts with `DESIGN_SYSTEM.md`, `REDESIGN_BRIEF.md`, or `LAYOUT_REDESIGN_BRIEF.md`, **this file wins**. Those documents are kept as conceptual references and per-page audits. For tokens, copy, and motion vocabulary: read this.

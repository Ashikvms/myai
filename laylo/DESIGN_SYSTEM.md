# Beedo Design System — Black + Bumblebee Gold

**Author:** Principal UI / Visual Designer (Phase 2 of 5)
**Branch:** `feat/redesign-black-yellow`
**Status:** Source of truth for Phases 3a (Web) and 3b (Mobile). Locked palette + tokens.
**Inputs:** `REDESIGN_BRIEF.md` §4 (visual direction), §5 (microinteractions), §6 (copy), §8 (handoff), §9 (risks).

This document specifies every token, every component variant, every animation curve. Phases 3a/3b consume this — do not invent tokens, do not pick alternative hexes, do not introduce new radii.

---

## 1. Color tokens

All colors are defined as **CSS custom properties**. Components consume them via Tailwind arbitrary values like `bg-[var(--color-accent)]`. Theme switching (light ↔ dark) is driven by Tailwind `darkMode: 'class'` — `:root` carries light values, `.dark` carries overrides. NativeWind 4 reads the same variable strategy via the mobile global.css.

### 1.1 Semantic tokens

| Token                    | Light hex   | Dark hex    | Usage                                                                               |
| ------------------------ | ----------- | ----------- | ----------------------------------------------------------------------------------- |
| `--color-bg`             | `#FFFFFF`   | `#000000`   | Page background. The literal canvas.                                                |
| `--color-surface`        | `#FAFAFA`   | `#0A0A0A`   | Cards, modal bodies, sidebar, elevated panels.                                      |
| `--color-surface-2`      | `#F4F4F5`   | `#141414`   | Nested cards, input fields, expanded card subsections.                              |
| `--color-surface-hover`  | `#EFEFEF`   | `#1A1A1A`   | Card/row hover, ghost button hover.                                                 |
| `--color-text`           | `#0A0A0A`   | `#FFFFFF`   | Body / primary text. Headings.                                                      |
| `--color-text-muted`     | `#525252`   | `#A3A3A3`   | Secondary text, descriptions, captions.                                             |
| `--color-text-subtle`    | `#737373`   | `#737373`   | Tertiary metadata, placeholders, timestamps. Same in both modes — already neutral.  |
| `--color-text-on-accent` | `#0A0A0A`   | `#0A0A0A`   | Text painted on top of gold (always near-black). Never white on gold.               |
| `--color-accent`         | `#FFD700`   | `#FFD700`   | Gold. The single brand accent. CTAs, focus rings, active indicators, AI affordance. |
| `--color-accent-hover`   | `#FFCA1A`   | `#FFCA1A`   | Gold hover state. Slight push toward orange so it feels pressed.                    |
| `--color-accent-dim`     | `#8A7400`   | `#8A7400`   | Subdued gold for borders at rest, glow base. Brief §4.1 `gold.dim`.                 |
| `--color-accent-soft`    | `#FFF4B8`   | `#3D3300`   | Tinted gold backgrounds for chips/badges. Light mode = pale wash, dark = oxide.     |
| `--color-border`         | `#E5E5E5`   | `#1F1F1F`   | Hairlines, dividers, default card borders.                                          |
| `--color-border-strong`  | `#D4D4D4`   | `#2A2A2A`   | Hover-state borders, modal edges, separators between sections.                      |
| `--color-focus-ring`     | `#FFD700`   | `#FFD700`   | Focus outline for keyboard nav. Always gold.                                        |
| `--color-success`        | `#22C55E`   | `#22C55E`   | Toast success, success badges. Sparingly.                                           |
| `--color-warning`        | `#F59E0B`   | `#F59E0B`   | Toast warning, "expiring" badges. Sparingly.                                        |
| `--color-danger`         | `#EF4444`   | `#EF4444`   | Toast danger, destructive button, error text.                                       |
| `--color-overlay`        | `rgba(0,0,0,.5)` | `rgba(0,0,0,.65)` | Modal/sheet backdrop.                                                          |

### 1.2 Hard accessibility rules (Brief §9.1)

- **Body text is NEVER gold.** Always `--color-text` (white in dark, near-black in light). Yellow body text fatigues + glares on OLED.
- **Gold-on-black is 17.4:1 contrast** — excellent for ≥16 px CTAs, but never use it for paragraph text.
- **Small text (<16 px) is never gold.** This is enforced at component level; see §7 Badge `accent` variant — it uses `--color-text` not `--color-accent`.
- **Buttons painted gold use `--color-text-on-accent`** (near-black) for the label.

### 1.3 Indigo migration

Every reference to `#6366F1`, `from-primary-*`, `to-purple-*`, `bg-indigo-*` is removed at the token level. Engineers will grep for the literal hex `#6366F1` and the Tailwind class `primary-*` after Phase 2 ships.

---

## 2. Typography — single typeface design language

System: **Bricolage Grotesque** (Mathieu Triay / ATF) for everything. ONE family, three variable axes deliver the entire hierarchy. Free on Google Fonts.

> Supersedes the prior Fraunces spec. See `LAYOUT_REDESIGN_BRIEF.md` §1 for the rationale (user rejected serif; Bricolage = grotesque body + hand-cut display personality, no quirk-tax).

- **Web:** loaded via `next/font/google` with `axes: ['opsz', 'wdth']`, `variable: '--font-bricolage'`, `display: 'swap'` (see `apps/web/src/app/layout.tsx`). Served self-hosted by Next; zero CLS.
- **Mobile:** intent set in `apps/mobile/src/lib/tokens.ts`; runtime font loading via `expo-font` with TTFs in `assets/fonts/` is a follow-up (currently System fallback). Not blocking.

### 2.1 Variable axes

Bricolage Grotesque is variable across:
| Axis    | Range    | Default (body) | Display use                         |
|---------|----------|----------------|-------------------------------------|
| `wght`  | 200–800  | 400 / 600      | 700 for hero                        |
| `opsz`  | 12–96    | 14 (body)      | 20 → 96 (auto-tunes per element)    |
| `wdth`  | 75–100   | 100            | 100 throughout (no compression)     |

The trick: same letterforms feel **clean and grotesque at body sizes** (near-Inter readability), **warm and slightly hand-cut at display sizes** (tilted `g` ear, friendly `a`, counter-curved `t`). One font, two personalities — same trick Fraunces tried, minus the serif.

### 2.2 OpenType features (global)

| Feature | Where applied | Effect |
|---------|---------------|--------|
| `cv11`  | Body + headings + tabular | Circular zero — disambiguates from `O` in amounts. |
| `cv05`  | Body + headings + tabular | Straight `l` — disambiguates `1` / `I` in passwords + amounts. |
| `ss01`  | Display ≥ 22 px (h1, h2, `.heading-display`) | Single-storey `a` — display-only flourish. |
| `tnum`  | `.tabular-nums` only | Tabular-figure spacing so count-ups don't jitter. |

### 2.3 Type scale + axis settings (8 tokens — hard cap)

| Token             | Size / line-height | Weight | opsz | wdth | OT features          | Use case |
|-------------------|--------------------|--------|------|------|----------------------|----------|
| **Display**       | 64 / 68            | 700    | 96   | 100  | cv11, cv05, ss01     | Marketing hero. `tracking-[-0.02em]`. |
| **Page Title (h1)** | 32 / 38          | 700    | 64   | 100  | cv11, cv05, ss01     | Top of every route. `tracking-[-0.015em]`. |
| **Section (h2)**  | 22 / 28            | 600    | 32   | 100  | cv11, cv05, ss01     | "AI Insights", "This week". `tracking-[-0.01em]`. |
| **Card Title (h3)** | 16 / 22          | 600    | 20   | 100  | cv11, cv05           | Card / modal title, subsections. |
| **Body**          | 15 / 23            | 400    | 14   | 100  | cv11, cv05           | Paragraphs, lists, descriptions. |
| **Body Strong**   | 15 / 23            | 600    | 14   | 100  | cv11, cv05           | Inline emphasis. |
| **Body-sm**       | 13 / 18            | 500    | 12   | 100  | cv11, cv05           | Chips, metadata, table cells. |
| **Caption**       | 11 / 14            | 600    | 11   | 100  | cv11, cv05           | Eyebrow labels (uppercase, `tracking-[0.08em]`). |

The previous "Subheader (h4–h6)" range **collapses into h3** — anything outside this 8-token scale is a bug.

Implementation: body axes set via `font-variation-settings` on `body`; heading axes set on `h1`–`h6` selectors in `apps/web/src/styles/globals.css`. Pages don't need explicit class changes — the cascade handles it. Tabular numerals via `.tabular-nums` for any element with counted/aligned numbers (dashboard stats, transaction amounts).

### 2.4 Rules

- **One typeface only** — no Inter, no Caveat, no system fallback in production code. Only Bricolage Grotesque variable.
- Eight tokens maximum (per scale above). Anything outside is a bug.
- Body uses `opsz` 14 + `cv11`/`cv05` only; display sizes (≥22 px) opt into `ss01` for the single-storey `a`.
- `wdth` stays at 100 throughout — never compress.
- Tabular nums on stats so count-up animations don't jitter columns.
- **Fallback typeface (if Bricolage fails QA on extended scripts):** Space Grotesk. Cabinet Grotesk / Switzer / Satoshi are paid-commercial — out.

---

## 3. Spacing

4 px grid. **Eight tokens. No `space-5`, `space-7`, no arbitrary `gap-[5px]`.**

| Token | Value | Tailwind | Use                                                      |
| ----- | ----- | -------- | -------------------------------------------------------- |
| `0`   | 0     | `0`      |                                                          |
| `1`   | 4 px  | `1`      | Tight icon-to-text gap, chip internal padding-y.         |
| `2`   | 8 px  | `2`      | Compact stack (chip row, badge cluster).                 |
| `3`   | 12 px | `3`      | Form field internal padding.                             |
| `4`   | 16 px | `4`      | Card-inner horizontal padding (small cards), button gap. |
| `6`   | 24 px | `6`      | **Default card inner padding** (was 20). Most layouts.   |
| `8`   | 32 px | `8`      | **Default section vertical rhythm** (was 24).            |
| `12`  | 48 px | `12`     | Page header-to-content offset, large empty-state padding.|
| `16`  | 64 px | `16`     | Marketing hero spacing, full-page modal padding.         |

**Generosity rule:** when in doubt, use the larger step. The brief reads "minimal-but-fun" — minimal means breathable, not cramped.

---

## 4. Border radius

**Two values only.** Brief §4.4 locked.

| Token         | Value | Used by                                                        |
| ------------- | ----- | -------------------------------------------------------------- |
| `radius-sm`   | 8 px  | Chips, badges, inputs, selects, textarea, date-picker, toast.  |
| `radius-md`   | 16 px | Cards, modals, buttons, sheets, sidebar, dropdowns.            |
| `rounded-full` | —    | Avatars, dot indicators, toggle thumb only. Nothing else.      |

**Retired:** `rounded-[6px]`, `rounded-[10px]`, `rounded-[24px]`, `rounded-[2.5rem]`. All map to `radius-sm` or `radius-md`.

| Surface  | Radius      | Notes                                                              |
| -------- | ----------- | ------------------------------------------------------------------ |
| Card     | `radius-md` | Includes Plaid widgets, dashboard tiles.                           |
| Button   | `radius-md` | All sizes. Sm size keeps 16 px even though it's only 32 px tall.   |
| Input    | `radius-sm` | Includes select, textarea, date-picker, search bars.               |
| Badge    | `radius-sm` | (Was `rounded-full` — switching to 8 px softens the bumblebee.)    |
| Pill chip| `radius-sm` | Filter pills, category chips, AI chips.                            |
| Modal    | `radius-md` | Mobile bottom-sheet uses `radius-md` only on top corners (16/16/0/0). |

---

## 5. Shadows

Light mode uses real shadows. Dark mode shadows are mostly invisible on `#000`, so dark mode substitutes a **1 px gold-tinted top-edge highlight** + a softer cast shadow.

| Token         | Light value                                         | Dark value                                                  | Use                                  |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `shadow-sm`   | `0 1px 2px rgba(0,0,0,.05)`                         | `inset 0 1px 0 rgba(255,255,255,.04)`                       | Resting card, button.                |
| `shadow-md`   | `0 4px 12px rgba(0,0,0,.08)`                        | `0 4px 12px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)` | Hover card, dropdown.            |
| `shadow-lg`   | `0 12px 32px rgba(0,0,0,.12)`                       | `0 12px 32px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)` | Modal, sheet.                    |
| `shadow-glow` | `0 0 0 3px rgba(255,215,0,.25)`                     | `0 0 0 3px rgba(255,215,0,.35)`                             | "Ask AI" chip hover, focus rings.    |
| `shadow-pop`  | `0 8px 24px rgba(0,0,0,.12)`                        | `0 8px 24px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.05)` | Bill card hover (Brief §5.1).    |

**Implementation note:** shadows are declared as Tailwind `boxShadow` extensions so engineers write `shadow-sm` / `shadow-pop`, not raw arbitrary values.

---

## 6. Motion specifications

Every microinteraction in Brief §5 is enumerated below. Reduced-motion fallback is mandatory — if `prefers-reduced-motion: reduce` is true, decorative entrances are disabled (set duration to 1 ms), but functional state changes (color, opacity changes that signal state) still apply instantly.

### 6.1 Tokens (reusable)

| Token          | Value                                  | Notes                                                  |
| -------------- | -------------------------------------- | ------------------------------------------------------ |
| `dur-micro`    | 120 ms                                 | Chip hover, checkbox tick, focus ring.                 |
| `dur-standard` | 200 ms                                 | Card hover, tab-pill slide, toast slide-in.            |
| `dur-expansive`| 320 ms                                 | Empty-state mount, sheet expand.                       |
| `dur-modal`    | 280 ms                                 | Web modal scale + drift.                               |
| `ease-entry`   | `cubic-bezier(0.4, 0, 0.2, 1)`         | Things appearing.                                      |
| `ease-exit`    | `cubic-bezier(0.4, 0, 1, 1)`           | Things leaving — accelerates out.                      |
| `spring-tab`   | `{ stiffness: 400, damping: 30 }`      | Framer Motion spring for `layoutId` tab-pill slide.    |

### 6.2 Catalogue (one-row-per-interaction)

| # | Interaction (Brief §5)        | Duration          | Easing        | Animated properties                                                              | Reduced-motion fallback                                  |
| - | ----------------------------- | ----------------- | ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1 | Bill card hover               | `dur-standard`    | `ease-entry`  | `transform: translateY(0 → -2px)`, `box-shadow: shadow-sm → shadow-pop`         | Skip translate; shadow swap is instant.                  |
| 2 | Task checkbox check           | 180 ms paint, 200 ms stroke, 150 ms text crossfade | `ease-entry` | Box `background-color: transparent → --color-accent`; check `pathLength: 0→1`; row `opacity: 1→0.6` + line-through. | Apply final state instantly; skip stroke draw.       |
| 3 | Empty-state bee mount         | `dur-expansive`   | `ease-entry`  | `transform: scale(0.9 → 1)`, `opacity: 0 → 1`. Web: idle `translateY(0 ↔ -4px)` 3s sine loop. Mobile: 1× 360° spin. | Skip mount + idle. Final state immediate.            |
| 4 | "Ask AI" chip hover           | 150 ms            | `ease-entry`  | `border-color: --color-accent-dim → --color-accent`; `opacity: 0.5 → 1`; `box-shadow: none → shadow-glow`. | Color/opacity change instant; skip glow.            |
| 5 | Tab pill slide (sub-tabs)     | 200 ms (Framer spring) | `spring-tab` | Framer `layoutId` — `transform` only. No color fade.                          | Snap to position; no transition.                         |
| 6 | Modal open                    | 150 ms backdrop, 220 ms panel | `ease-entry` | Backdrop `opacity: 0→1`; panel `transform: scale(0.96 → 1) translateY(8px → 0)` + `opacity: 0 → 1`. | Backdrop fade only; panel snaps in. |
| 7 | Bottom-sheet (mobile)         | 280 ms            | Reanimated `Easing.out(Easing.cubic)` | `transform: translateY(100% → 0)`; backdrop `opacity: 0 → 0.6`.       | Snap to position; backdrop fades 100 ms.                 |
| 8 | Toast slide-in                | 200 ms in, 4 s on screen, 150 ms out | `ease-entry` in / `ease-exit` out | `transform: translateY(-12px → 0)` + `opacity: 0 → 1`. Progress bar `transform: scaleX(1 → 0)` over 4 s linear. | Skip slide; opacity fade only.                |
| 9 | Theme toggle overlay          | 700 ms            | `ease-in-out` | Existing `.theme-fade-overlay` keyframes. Recoloured to gold/black washes.       | Disable overlay entirely; theme swaps instantly.         |
| 10| Sidebar active item           | 200 ms (Framer spring) | `spring-tab` | `layoutId="sidebar-active"` bar; `transform` only. Width 4 px (was 3). Color `--color-accent`. | Snap to position; no transition. |
| 11| Mobile FAB press              | 60 ms haptic + 120 ms scale | `ease-entry` | `transform: scale(1 → 0.95)`. Reanimated. Long-press → expands sheet (#7).  | Skip scale; haptic still fires (it's not motion).        |
| 12| Card expand (Bills/Subs)      | 200 ms chevron, 220 ms section | `ease-entry` | Chevron `transform: rotate(0 → 180deg)`; body `height: 0 → auto`, `opacity: 0 → 1`. | Skip height transition; toggle visibility instantly.|
| 13| Plaid success confetti        | 600 ms total      | `ease-exit`   | ≤8 gold particles, `transform: translateY(0 → -120px) rotate(0 → 360deg)`, `opacity: 1 → 0`. **`/settings/banks` only.** | Skip entirely.                              |
| 14| Loader (>800 ms)              | 200 ms per dot, infinite | `ease-in-out` | 3 gold dots `opacity: 0.3 ↔ 1` staggered 80 ms. Bee mascot static beside. | Static bee + static "Loading…" copy.                   |
| 15| Empty-state CTA hover         | 250 ms            | `ease-entry`  | Animated SVG border via `strokeDashoffset: total → 0`; text color unchanged.     | Skip stroke draw; show final border instantly.           |

### 6.3 Implementation contract

- **Web:** Framer Motion is the only animation library. Use `motion.*` components + `AnimatePresence`. Read `useReducedMotion()` at the top of every animated component and pass `transition={{ duration: 0 }}` when true.
- **Mobile:** Reanimated v3 only. Wrap entry animations in `withTiming({ duration: prefersReducedMotion ? 0 : 280 })`. Mobile reads `AccessibilityInfo.isReduceMotionEnabled()`.
- **No CSS keyframes** for component-local animations — only the global `.theme-fade-overlay` in `globals.css` keeps its keyframe rule (Brief §5.9).

---

## 7. Component specs

Every component in `packages/ui/src/components/` (14 total). Spec covers variants, sizes, states, and how light/dark map to tokens. Engineers in Phase 3 must not invent additional variants.

### 7.1 Button (`button.tsx`)

| Variant     | Light bg               | Dark bg                | Light text             | Dark text              | Border                          |
| ----------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ------------------------------- |
| `default`   | `--color-accent`       | `--color-accent`       | `--color-text-on-accent` | `--color-text-on-accent` | none                          |
| `secondary` | `--color-surface-2`    | `--color-surface-2`    | `--color-text`         | `--color-text`         | none                            |
| `outline`   | transparent            | transparent            | `--color-text`         | `--color-text`         | 1 px `--color-border-strong`    |
| `ghost`     | transparent            | transparent            | `--color-text-muted`   | `--color-text-muted`   | none. Hover: bg `--color-surface-hover`. |
| `danger`    | `--color-danger`       | `--color-danger`       | `#FFFFFF`              | `#FFFFFF`              | none                            |

| Size  | Height | Padding-x | Text size  | Radius      |
| ----- | ------ | --------- | ---------- | ----------- |
| `sm`  | 32 px  | 12 px     | `body-sm`  | `radius-md` |
| `md`  | 40 px  | 16 px     | `body`     | `radius-md` |
| `lg`  | 48 px  | 24 px     | `h3` (16)  | `radius-md` |

**States:**
- `hover` (default): `--color-accent-hover`. Other variants: `--color-surface-hover` overlay.
- `active`: `transform: scale(0.98)` for 60 ms.
- `focus-visible`: `ring-2 ring-[var(--color-focus-ring)] ring-offset-2 ring-offset-[var(--color-bg)]`.
- `disabled`: `opacity: 0.5`, `pointer-events: none`.
- `loading`: spinner replaces `iconLeft`; preserves width via `min-width`. Spinner inherits text color.

### 7.2 Card (`card.tsx`)

| Variant   | Bg                  | Border                       | Notes                                               |
| --------- | ------------------- | ---------------------------- | --------------------------------------------------- |
| `default` | `--color-surface`   | 1 px `--color-border`        | Standard list item, dashboard tile.                 |
| `glass`   | `--color-surface` @ 70% + `backdrop-blur-xl` | 1 px `--color-border` @ 50% | Sticky toolbars only. Use sparingly.        |

**Hoverable:** `hover:border-[var(--color-border-strong)]`, `hover:shadow-pop`, `cursor-pointer`. (Animation per §6 #1.)

**Padding:** Card itself has no padding. `CardHeader`/`CardContent`/`CardFooter` apply `p-6` (24 px). `CardHeader` gets `pb-0`. `CardFooter` gets `pt-0` + 1 px top border.

**CardTitle:** uses `h3` token. **CardDescription:** uses `body-sm` with `--color-text-muted`.

### 7.3 Input (`input.tsx`)

| State     | Border                            | Focus ring                                    |
| --------- | --------------------------------- | --------------------------------------------- |
| `default` | 1 px `--color-border`             | Border becomes `--color-accent`, ring `--color-accent` @ 25%. |
| `error`   | 1 px `--color-danger`             | Border + ring `--color-danger` @ 25%.         |
| `disabled`| `--color-border`, bg `--color-surface-2`, opacity 0.5. | —                              |

- Bg: `--color-surface` (matches card surface).
- Text: `--color-text`. Placeholder: `--color-text-subtle`.
- Padding: `12px 16px` (size `md`). Height auto (controlled by line-height + padding).
- Radius: `radius-sm` (8 px).
- Label: `body-sm` weight 500, color `--color-text-muted`.
- Error message: `body-sm` color `--color-danger`. `role="alert"`.
- `iconLeft`/`iconRight`: Lucide stroke 1.75; absolute positioned 12 px from edge; text color `--color-text-subtle`.

### 7.4 Textarea (`textarea.tsx`)

Same surface/border/focus rules as Input. `resize-vertical` default, `resize-none` if `autoResize`. `min-height: 80px`. Char count: `body-sm`, color `--color-text-subtle`, `tabular-nums`, right-aligned.

### 7.5 Select (`select.tsx`)

Same surface/border/focus rules as Input. Native `<select>` element kept (don't reach for a custom dropdown — engineers maintain). Chevron icon: Lucide `ChevronDown`, 16 px, `--color-text-subtle`. Padding-right: 40 px (room for chevron).

### 7.6 DatePicker (`date-picker.tsx`)

Same as Input. Native `<input type="date">`. **Dark mode caveat:** invert the calendar icon via `dark:[&::-webkit-calendar-picker-indicator]:invert`.

### 7.7 Badge (`badge.tsx`)

Now `radius-sm` (8 px), not `rounded-full`. Brief §4.4 hard rule.

| Variant   | Light bg                   | Dark bg                    | Light text          | Dark text           |
| --------- | -------------------------- | -------------------------- | ------------------- | ------------------- |
| `default` | `--color-surface-2`        | `--color-surface-2`        | `--color-text`      | `--color-text`      |
| `accent`  | `--color-accent-soft`      | `--color-accent-soft`      | `--color-text`      | `--color-accent`    |
| `success` | `rgba(34,197,94,.10)`      | `rgba(34,197,94,.20)`      | `#15803D`           | `#86EFAC`           |
| `warning` | `rgba(245,158,11,.10)`     | `rgba(245,158,11,.20)`     | `#B45309`           | `#FCD34D`           |
| `danger`  | `rgba(239,68,68,.10)`      | `rgba(239,68,68,.20)`      | `#B91C1C`           | `#FCA5A5`           |
| `outline` | transparent                | transparent                | `--color-text`      | `--color-text`      | (border 1 px `--color-border`) |

**Note:** the `accent` variant in dark mode is the only place small text is gold — but dark-mode small gold on the soft oxide background `#3D3300` clears WCAG AA at 13 px (~5.6:1). Verified by Phase 4.

| Size | Padding         | Text       |
| ---- | --------------- | ---------- |
| `sm` | 6 px / 2 px     | `caption`  |
| `md` | 10 px / 4 px    | `body-sm`  |

### 7.8 Avatar (`avatar.tsx`)

| Size | Diameter |
| ---- | -------- |
| `sm` | 32 px    |
| `md` | 40 px    |
| `lg` | 48 px    |

Bg: `--color-surface-2`. Initials text: `--color-text-muted`. Image fallback to initials on error (already implemented). `rounded-full` retained — only place this radius is allowed besides Toggle thumb.

### 7.9 Modal (`modal.tsx`)

- Backdrop: `--color-overlay` + `backdrop-blur-sm`. Animation per §6 #6.
- Panel bg: `--color-surface`. Border: 1 px `--color-border-strong` (only visible in dark mode where it functions as the edge).
- Radius: `radius-md`. Padding: 32 px (`p-8`).
- Max-width: 640 px (`max-w-[640px]`). Was `max-w-lg` (512 px) — bumping for content-heavy modals (Add Bill, Add Sub).
- ModalTitle: `h2`. ModalDescription: `body`, color `--color-text-muted`.
- Close button: 24×24 hit area, top-right 16 px; icon Lucide `X` stroke 1.75; hover bg `--color-surface-hover`.
- Focus trap + Escape already implemented. Do not change behaviour.

### 7.10 EmptyState (`empty-state.tsx`)

Generic component. Page-level callsites supply Brief §6 copy + the bee mascot (§8 below).

- Container: vertical flex centred, padding `py-12 px-6` (48 px / 24 px).
- Icon slot: 64 px diameter container; centered above title; in this generic component the slot is `--color-text-subtle` — engineers pass a `<Bee>` component for personality.
- Title: `h3` color `--color-text`. Centered.
- Description: `body` color `--color-text-muted`, max-width 28rem (`max-w-md`), centered.
- Action: spaced 24 px below description.

### 7.11 LoadingSpinner (`loading-spinner.tsx`)

| Size | Diameter |
| ---- | -------- |
| `sm` | 16 px    |
| `md` | 24 px    |
| `lg` | 32 px    |

| Color    | Token                  |
| -------- | ---------------------- |
| `accent` | `--color-accent` (gold — was `primary` indigo) |
| `white`  | `#FFFFFF`              |
| `muted`  | `--color-text-subtle`  |

`role="status"` + `aria-label="Loading"` already present. Animation: `animate-spin` (1 s linear).

### 7.12 Skeleton (`skeleton.tsx`)

| Variant  | Default shape     |
| -------- | ----------------- |
| `text`   | `radius-sm`, h-16 px (1 line of body) |
| `circle` | `rounded-full`    |
| `rect`   | `radius-md`       |

Bg: `--color-surface-2`. Animation: `animate-pulse` (default Tailwind). Honors `prefers-reduced-motion` automatically (Tailwind opts pulse out under reduce).

### 7.13 Toast (`toast.tsx`)

| Type     | Left border (6 px) | Icon color           | Bg                  |
| -------- | ------------------ | -------------------- | ------------------- |
| `info`   | `--color-accent`   | `--color-accent`     | `--color-surface`   |
| `success`| `--color-success`  | `--color-success`    | `--color-surface`   |
| `warning`| `--color-warning`  | `--color-warning`    | `--color-surface`   |
| `error`  | `--color-danger`   | `--color-danger`     | `--color-surface`   |

- Top-anchored slide (Brief §5.8). Replaces existing bottom-right anchoring.
- Container: max-w 384 px, padding 16 px, `radius-md`, shadow-md.
- Title: `body` weight 500. Description: `body-sm` color `--color-text-muted`.
- Auto-dismiss 4 s (Brief §5.8 — was 5 s in implementation; spec wins). Progress bar 2 px tall, color `--color-accent`, scaleX 1→0 over 4 s linear.
- Close button: same pattern as Modal close.

### 7.14 Toggle (`toggle.tsx`)

- Track: 44 × 24 (md), 36 × 20 (sm). `rounded-full`.
- Track checked: `--color-accent`. Thumb on accent: `#FFFFFF` (only place white sits on gold — fine because thumb is purely decorative, never overlaid with text).
- Track unchecked: `--color-surface-2`. Thumb: `--color-text` (light) / `--color-text` (dark, white).
- Focus ring: `--color-focus-ring`.
- Label: `body` color `--color-text`. Cursor pointer when enabled.

### 7.15 UpgradePrompt (`upgrade-prompt.tsx`)

- Container: `radius-md`, bg `--color-surface`, border 1 px `--color-accent` @ 30%, padding 32 px.
- Star icon: 40 px circle bg `--color-accent-soft`, icon Lucide `Sparkles` 20 px stroke 1.75 color `--color-accent`.
- Title: `h3` color `--color-text`.
- Description: `body` color `--color-text-muted`.
- CTA: Button `default` (gold), size `md`. Replaces the inlined indigo button.
- **No gradient backgrounds.** Brief §4.1 hard rule.

---

## 8. Illustration / icon style guidance

### 8.1 Empty-state illustrations

- **Style:** geometric flat. One hand-drawn line accent allowed (per Brief §4.7).
- **Two-tone:** black + gold only. No third colour, no neutrals beyond stroke.
- **Stroke:** 2 px (slightly heavier than icons because illustrations are larger). Round caps + joins.
- **Size:** 96–128 px in empty states. Not exceeding 160 px even on desktop.

### 8.2 Bee mascot

The bee is the brand's personality marker. Brief §4.7 places it in: 404, every empty state, loaders >800 ms, mobile onboarding hero. Engineers compose simple inline SVGs from these descriptions — no external asset, no PNG.

**Anatomy (consistent across poses):**
- Body: gold (`--color-accent`) ellipse.
- Stripes: 2× black (`--color-text` in light, paint `#0A0A0A` regardless of theme — bee is theme-independent).
- Wings: white outline @ 50% opacity, no fill. Stroke 1.5 px.
- Eyes: 2× black 2 px circles.
- Antennae: black 1.5 px stroke, ending in tiny gold dots.

**Required poses (Brief §8 Phase 2 deliverable §4):**

1. **Standing bee** (`bee-standing`) — default. Faces forward, wings flat, neutral expression. Use in 404 and onboarding hero.
2. **Yawning bee** (`bee-yawning`) — droopy antennae, small "z" above head. Use in `tasks` empty ("Inbox zero unlocked").
3. **Sleeping bee** (`bee-sleeping`) — closed eyes (tiny black arcs), antennae down, three "z"s. Use in `reminders` empty ("All quiet").
4. **Working bee** (`bee-working`) — forward lean, holding tiny clipboard (gold rect with 3 black ticks). Use in `bills`, `documents` empty.
5. **Celebrating bee** (`bee-celebrating`) — arms up, both eyes wink (asymmetric arcs), 3 small gold particles around head. Use after success states (Plaid connect).

All poses fit a 96 × 96 viewBox. Engineers ship as five sibling components in `packages/ui/src/illustrations/bee.tsx` exporting `<BeeStanding />`, `<BeeYawning />`, etc., taking a `size` prop (defaults to 96).

### 8.3 Lucide icons

- Library: `lucide-react` (web) + `lucide-react-native` (mobile). Already installed.
- **Stroke width: 1.75** across the board. Brief §4.5. Set globally via the icon component prop, not per call.
- **Sizes:** 16 px (chips, inline metadata), 20 px (default — buttons, navs), 24 px (section headers, modal heads), 32 px (empty-state fallback when no bee).
- **Colour:** `--color-text` by default. Gold only when explicitly the AI affordance icon (Sparkles, MessageSquareText) — see §9.
- No filled Lucide variants. Stroke style only.

---

## 9. AI affordance pattern

The "Ask AI" affordance is the single most opinionated visual decision in this redesign. It must read as part of the brand without overwhelming the surface. Brief §3.3 + §9.3 constrain it.

### 9.1 Where it appears

| Surface            | Trigger                               | Visual                                                           |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------- |
| Web — Bill card    | Card hover                            | Gold chip in card top-right, fades in 150 ms.                    |
| Web — Bill expanded| Always visible                        | Chip in expanded section header.                                 |
| Web — Task row     | Row hover                             | Chip right-aligned next to delete.                               |
| Web — Transaction row | Row hover                          | Chip right-aligned.                                              |
| Web — Document/Reminder/Appointment card | Card hover               | Chip top-right.                                                  |
| Web — Dashboard hero | Always visible                      | Full input bar (see §9.3).                                       |
| Mobile — Bill / Task / Transaction row | Tap-and-hold (long press) | Bottom sheet appears with chip + suggested prompts.            |
| Mobile — Home header | Always visible                      | "Ask Beedo" pill in header.                                      |
| Mobile — Bills/Tasks empty state | Always visible            | Secondary "Ask Beedo to add something" link below primary CTA.   |

### 9.2 Chip visual spec

**Rest state (always — even when always-visible):**
- 1 px border `--color-accent-dim` (`#8A7400`) at 50% opacity. Fill transparent.
- Padding: 4 px / 10 px (`py-1 px-2.5`).
- Radius: `radius-sm`.
- Icon: Lucide `Sparkles`, 14 px, stroke 1.75, color `--color-accent` at 70% opacity.
- Label: `body-sm` weight 500, color `--color-text-muted`. Optional — chip can be icon-only on dense cards.

**Hover / press-in:**
- Border: `--color-accent` at 100% opacity (1 px).
- Icon + label opacity: 100%.
- Box-shadow: `shadow-glow` (3 px gold ring).
- Transition per §6 #4.

**Active / pressed:**
- Background fill: `--color-accent-soft`.
- Same border + glow.

**Default prompt copy** (Brief §3.3) — engineers must apply per surface:

| Surface       | Prompt label                  |
| ------------- | ----------------------------- |
| Bill          | "Why did this go up?"         |
| Subscription  | "Worth keeping?"              |
| Task          | "Break into steps"            |
| Transaction   | "Why did this repeat?"        |
| Document      | "Summarise"                   |
| Document (with expiry) | "When does this expire?" |
| Appointment   | "Help me prep"                |
| Reminder      | "Why was this set?"           |
| Generic empty | "Ask Beedo to add something"  |

### 9.3 Dashboard hero "Ask Beedo" input

The single primary gold surface on the dashboard. **The whole hero element is the input.**

- Container: 100% width, `radius-md`, bg `--color-surface`, border 2 px `--color-accent`, padding 16 px / 20 px, `shadow-glow` always-on at 50% intensity (subtle).
- Sparkle icon: Lucide `Sparkles` 24 px, color `--color-accent`, leading.
- Input: native `<input>`, font `h3` (16 px), bg transparent, no border, placeholder "Ask anything about your bills, tasks, or money…" color `--color-text-subtle`.
- Submit: arrow icon button on right, 32 px gold square, `radius-sm`, icon Lucide `ArrowUp` 18 px black.
- On submit: opens slide-over (web) / bottom sheet (mobile). **No route change.**

### 9.4 Mobile equivalent

Header chip: pill 36 px tall, gold border 1 px @ 50%, sparkle icon + "Ask Beedo" label. Tap → opens bottom sheet (`dur-expansive`, `Easing.out(Easing.cubic)`).

Long-press on any list row → contextual bottom sheet pre-filled with that row's default prompt.

### 9.5 Hierarchy rule (Brief §9.3)

Gold chips at rest are 50% opacity. They pop to full only on interaction. The dashboard hero input is the sole always-bright gold surface. This prevents the page from feeling like a Christmas tree.

---

## 10. Layout spec

### 10.1 Dashboard

- **Hero:** "Ask Beedo" input bar (§9.3) full width, top of page. 32 px below greeting.
- **Stat row:** single row, **3 tiles max** (was 4 differently-coloured). All tiles use the same `Card` `default` variant. Gold accent appears once — on the `value` of the most-actionable tile (e.g. "Due this week").
- **Section grid:** 2-column on desktop (≥1024 px), 1-column below. Sections: AI Insights (left, full-bleed if alone), Upcoming Bills, Recent Transactions, Tasks Snapshot.
- **Gutters:** 24 px between cards. 32 px between sections.
- **Max content width:** 1280 px. Centre. 32 px page padding-x desktop, 16 px mobile.

### 10.2 List pages (Bills, Tasks, Transactions, Documents, Reminders, Appointments)

- **Single column.** No sidebar clutter (the brief explicitly removes the transactions sidebar).
- **Sticky header:** Page title (`h1`), filter pills row, search/add button row. White surface, 1 px bottom border.
- **Card list:** full-width cards stacked with 12 px vertical gap. Each row uses `Card hoverable`.
- **Row anatomy (target):** Lucide icon (20 px) + title (`h3`) + 1-line metadata (`body-sm` muted) + amount (`body` `tabular-nums`) right-aligned + AI chip on hover. Maximum 5 visible elements per row at rest.
- **Empty state:** centred Bee mascot + Brief §6 copy + primary "Add" button + secondary "Ask Beedo" link.
- **Max content width:** 960 px. Reading-line concern — list items get long.

### 10.3 Detail / modal

- Centre, **max-width 640 px**, `radius-md`, padding 32 px.
- Title block: `h2` + optional `body` description, 24 px below.
- Form fields: stacked, 16 px vertical gap.
- Footer: right-aligned button row, 24 px above bottom edge, secondary `ghost` left of primary `default`.

### 10.4 Settings

- **Web:** vertical tab nav left (200 px), content panel right (max-w 720 px). Active tab indicator: 4 px gold left bar (per Brief §5.10), `layoutId="settings-active"`.
- **Mobile:** accordion list. Each section is a collapsible card. Tapping expands per Card-expand animation §6 #12.

### 10.5 Auth (login/signup)

- Centred 400 px card. Bee mascot 96 px above title.
- "Sign In" CTA → "Welcome back" (Brief §6).
- "Get Started" CTA → "Join the hive".
- Single-column form.

### 10.6 Marketing

- Hero: `display` headline, gold word(s) inline (e.g. "Your **bumblebee** for life's admin"), 64 px below logo.
- CTA row: 24 px button gap. Primary `default` (gold) + secondary `outline`.
- Sections: 96 px vertical rhythm, 1280 px max content width.

---

## End of design system

**Phase 3a (Web)** and **Phase 3b (Mobile)** consume this document directly. No tokens to invent. No colours to choose. Open questions go to the user — not to invention.

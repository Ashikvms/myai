# Laylo Redesign Brief — Black + Bumblebee Gold

**Author:** Principal Design Strategist (Phase 1 of 5)
**Branch:** `feat/redesign-black-yellow`
**Status:** Source of truth for Phases 2–4. All downstream agents MUST read this file before touching code.
**Locked decisions:** AI-as-page is removed (embedded contextually instead); palette is `#000000` + `#FFD700` only; tone is minimal-but-fun; theme bug in reminders + documents must be repaired with `useTheme()`.

---

## 1. Executive Summary

Repaint Laylo from indigo-gradient SaaS into a black-and-gold "bumblebee" product. Visual + IA only — no features, no backend, no Plaid, no schema changes. Three deliverables: (1) locked two-tone palette `#000000` + `#FFD700` replacing indigo `#6366F1` + purple gradient across ~20 files; (2) `/assistant` deleted entirely (web + mobile), AI moves to context chips on Bills/Tasks/Transactions/Insights + a dashboard hero "Ask Laylo" input — web nav drops 8→5, mobile tabs 5→4; (3) two confirmed theme bugs (reminders + documents) repaired via `useTheme()`, plus copy/microinteraction polish per §5–§6. Out of scope: §7.

---

## 2. Current State Audit

### 2.1 Web — `/dashboard` (`apps/web/src/app/(app)/dashboard/page.tsx`, 772 LOC)
- 4 distinct gradient stat cards (lines 310–360) — should be one gold accent.
- Quick actions row uses another 4 gradients incl. "Ask AI" pill (lines 363–382).
- AI Insights renders 3 colour-coded border-left bars (amber/blue/rose, lines 412–451).
- 8 stacked sections, each with its own icon ramp and colour.
- **Prototype `viewState` toolbar (lines 733–750) leaks into production. DELETE.**
- Theme: local `useState` + `document.documentElement.classList.add('dark')` (lines 249–259), NOT `useTheme()`.
- AI surface today: a single gradient "Ask AI" button → `/assistant`. Post-redesign: inline "Ask AI" chips on Bills/Tasks/Transactions/Insights + dashboard hero "Ask Laylo" input.

### 2.2 Web — `/bills` (Bills + Subs) (`apps/web/src/app/(app)/bills/page.tsx`, 1,332 LOC, largest)
- `CATEGORY_COLORS` defines **10 distinct gradient pairs** (lines 57–118) — biggest noise source in repo.
- Each card: icon + name + amount + chevron + 4 chips = 8 elements (lines 397–456).
- AddBillModal + AddSubModal are 200+ LOC each, duplicated (lines 627–1019).
- Indigo→purple `layoutId` tab pill (lines 1183–1188).
- **Prototype state toolbar (lines 1300–1318). DELETE.**
- Theme: buggy DOM-class toggle (lines 1035–1045). NOT `useTheme()`.
- AI surface: none → add "Why did this go up?" / "Cheaper alternatives?" chips.

### 2.3 Web — `/tasks` (`apps/web/src/app/(app)/tasks/page.tsx`, 718 LOC)
- 7 categories × 3 priorities = 21 colour combos in lookup tables.
- 5 filter pills + per-row 4–5 chips + checkbox + delete.
- Prototype state toolbar present.
- Theme: same buggy DOM-only pattern.
- AI surface: none → per-task "Break into steps" chip.

### 2.4 Web — `/documents` (`apps/web/src/app/(app)/documents/page.tsx`, 797 LOC)
- 8 document-category gradients (lines 45+).
- Grid/List toggle + category filter chips + expiration warning + file-type badge per card.
- **CONFIRMED THEME BUG — line 222** uses `useState(() => { … MutationObserver … })` (initializer, not effect). Observer never reattaches on re-renders, no cleanup, theme toggle doesn't update this page until reload. **Fix: `const { resolvedTheme } = useTheme();`.**
- AI surface: none → per-doc "Summarise this" / "When does this expire?" chips.

### 2.5 Web — `/reminders` (`apps/web/src/app/(app)/reminders/page.tsx`, 658 LOC)
- 6 LinkedType gradient configs (lines 41–110); 3 filter tabs; 3 chips per reminder.
- **CONFIRMED THEME BUG — line 172**, identical `useState(() => {…})` antipattern. Same fix.
- AI surface: none → "Why was this set?" chip.

### 2.6 Web — `/appointments` (`apps/web/src/app/(app)/appointments/page.tsx`, 676 LOC)
- 6 ApptCategory gradients (Health=red, Finance=green, Car=amber, Personal=purple, Work=blue, Other=gray).
- Each card: icon + title + date + time + location + reminder-chip + category-chip + chevron.
- Theme: works (uses global next-themes).
- AI surface: none → "Help me prep" chip.

### 2.7 Web — `/transactions` (`apps/web/src/app/(app)/transactions/page.tsx`, 441 LOC)
- Two-pane (account picker + filter sidebar + list) is dense on mobile.
- Up/Down arrow circles in two colours per row; toolbar combines search + filter + paging + account chips.
- Theme: works. AI surface: none → per-row "Why did this repeat?" / "Categorise" chip.

### 2.8 Web — `/settings` + `/settings/banks` (468 + 453 LOC)
- Section heading icons each carry a brand-tinted bg (Bell/Palette/Shield/Crown). Plaid connect rows use indigo gradient buttons.
- Theme: works. AI surface: not needed.

### 2.9 Web — `/assistant` (TO BE DELETED)
**File:** `apps/web/src/app/(app)/assistant/page.tsx` (433 LOC)

This entire file is removed in Phase 3a. References to delete:
- `/Users/ashiks/Documents/myai/laylo/apps/web/src/app/(app)/layout.tsx:34` — nav item `'AI Assistant'`
- `/Users/ashiks/Documents/myai/laylo/apps/web/src/app/(app)/layout.tsx:16` — `MessageSquare` import (only used for the assistant nav item — keep the import only if reused for an "Ask AI" chip, otherwise remove)
- `/Users/ashiks/Documents/myai/laylo/apps/mobile/app/(tabs)/_layout.tsx:55–66` — `Tabs.Screen name="assistant"` (the centre "💬" tab) plus its custom `centerIconWrapper` styling
- `/Users/ashiks/Documents/myai/laylo/apps/mobile/app/(tabs)/assistant.tsx` — entire file deletes
- `/Users/ashiks/Documents/myai/laylo/apps/mobile/.expo/types/router.d.ts` — auto-regenerated; will rebuild

### 2.10 Web — Marketing (`apps/web/src/app/(marketing)/layout.tsx` + `page.tsx`)
`from-primary-500 to-purple-500` gradient on logo + CTA (lines 51, 83, 131, 150). "Life Admin AI" copy (lines 54, 153, 168). Replace gradient → solid gold; rename → "Laylo".

### 2.11 Mobile tabs (`apps/mobile/app/(tabs)/_layout.tsx`, 140 LOC)
5 tabs: Home / Tasks / Assistant (centre raised) / Documents / Settings. Hardcoded `#6366F1` line 6. Emoji-based `TabIcon`. Centre raised "💬" FAB is the most prominent element — DELETE.

### 2.12 Mobile Home (`apps/mobile/app/(tabs)/index.tsx`, 627 LOC)
Hardcoded `#6366F1` line 16. 4 stat cards each carry a different colour (`#6366F1` / `#F59E0B` / `#8B5CF6` / `#10B981`, lines 24–28). Insights cards coloured (amber/red/green). Quick actions include "Ask AI" emoji.

### 2.13 Mobile — other tabs
- `(tabs)/tasks.tsx` (365 LOC), `(tabs)/documents.tsx` (337), `(tabs)/settings.tsx` (383) — each own colour ramp; recolour pass required.
- `(tabs)/assistant.tsx` (348 LOC) — DELETE.
- Stack screens `app/{onboarding,auth,bills,appointments,reminders,banks,transactions}.tsx` — all need recolour.

### 2.14 Shared UI — `packages/ui/src/components/`
14 components, **all** carrying `#6366F1`: `avatar`, `badge`, `button`, `card`, `date-picker`, `empty-state`, `input`, `loading-spinner`, `modal`, `select`, `skeleton`, `textarea`, `toast`, `toggle`, `upgrade-prompt`. Plus `apps/web/tailwind.config.ts` (entire `primary` ramp 50–900 is indigo) and `apps/web/src/styles/globals.css` (`.gradient-text` + theme-fade overlay use indigo).

---

## 3. Information Architecture Changes

### 3.1 Web nav (proposed)
Current (8, `(app)/layout.tsx:27-36`): Dashboard · Tasks · Bills & Subs · Appointments · Reminders · Documents · AI Assistant · Settings.
**Proposed (5): Dashboard · Tasks · Money · Vault · Settings.**
- **Money** unifies Bills + Subs + Transactions + Banks via sub-tabs on the existing `/bills` route (rebrand heading; keep `/bills`, `/transactions`, `/settings/banks` reachable).
- **Vault** unifies Documents + Reminders + Appointments via sub-tabs on `/documents`.
- AI Assistant — DELETE.

### 3.2 Mobile tabs (proposed)
Current (5): Home · Tasks · Assistant (centre raised) · Documents · Settings.
**Proposed (4, flat row): Home · Tasks · Money · Settings.**
- Documents demoted to stack route, opened from a Vault card on Home.
- Centre FAB pattern removed — replaced by a small gold "Ask Laylo" chip in Home header.

### 3.3 AI surfaces post-redesign
- **Dashboard hero (web + mobile):** "Ask Laylo" input bar at top, placeholder "Ask anything about your bills, tasks, or money…". Submit opens slide-over (web) / bottom sheet (mobile) — NOT a route change.
- **Per-row chips** (default prompts): Bill "Why did this go up?"; Subscription "Worth keeping?"; Task "Break into steps"; Transaction "Why did this repeat?"; Document "Summarise" (+ "When does this expire?" if expiry); Appointment "Help me prep"; Reminder "Why was this set?".
- **AI Insights** on dashboard: primary "Ask follow-up" action.
- **Empty state of every list:** secondary "Ask Laylo to add something" below primary Add button.

### 3.4 Removed routes
- `/assistant` (web) — directory `apps/web/src/app/(app)/assistant/` deleted.
- `(tabs)/assistant` (mobile) — file deleted; tab entry removed from `_layout.tsx`.
- No other deletions; demotions only.

### 3.5 Renames
- "AI Assistant" → "Ask Laylo" (chip label, not a destination).
- "Bills & Subscriptions" → "Money".
- "Documents/Reminders/Appointments" → "Vault" (umbrella label).
- "Life Admin AI" → "Laylo" (marketing pages).

---

## 4. Visual Direction (handoff to Phase 2 UI Designer)

### 4.1 Colour palette
| Token | Hex | Use |
|---|---|---|
| `bg.dark` / `bg.light` | `#000000` / `#FFFFFF` | Page bg |
| `surface.dark` / `.light` | `#0A0A0A` / `#FAFAFA` | Cards, modals |
| `border.dark` / `.light` | `#1F1F1F` / `#E5E5E5` | Hairlines |
| `gold` | `#FFD700` | Single brand accent: CTAs, active states, focus rings, AI chip border/glow, brand mark. Never body text. |
| `gold.hover` / `gold.dim` | `#FFCA1A` / `#8A7400` | CTA hover; subdued backgrounds |
| `text.primary.dark` / `.light` | `#FFFFFF` / `#0A0A0A` | Body |
| `text.secondary.dark` / `.light` | `#A3A3A3` / `#525252` | Secondary |
| `success` / `warning` / `danger` | `#22C55E` / `#F59E0B` / `#EF4444` | Toasts + tint states only |

**Hard rule:** delete every `purple-500`, every `from-X-500 to-Y-500` gradient. Only sanctioned accent is solid gold, never a gradient. Category differentiation = Lucide icon, not colour.

### 4.2 Typography (Inter web, System mobile — both already shipped)
`display 48/56/700` (marketing hero only) · `h1 32/40/700` (page title, was 30) · `h2 22/28/600` (section heading) · `h3 16/22/600` (card title) · `body 15/22/400` · `small 13/18/500` (chips/metadata) · `caption 11/14/600 uppercase tracking-wider` (eyebrow). Retire all arbitrary sizes (`text-[10px]`, `text-[11px]`, `text-2xl`, `text-3xl`, etc.) — tokens only.

### 4.3 Spacing
4 px grid. Tokens: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Default card inner padding 24 (was 20). Default section vertical rhythm 32 (was 24).

### 4.4 Border radius
Two values only. `radius.sm = 8` (chips, badges, inputs). `radius.md = 16` (cards, modals, buttons, everything else). No `rounded-full` outside avatars/dots/toggles. Retire 6/10/24 and `rounded-[2.5rem]`.

### 4.5 Iconography
Lucide React (web) + lucide-react-native (mobile). Stroke weight 1.75 (was 2). Sizes: 16 (chips), 20 (default), 24 (section heads), 32 (empty-state).

### 4.6 Motion principles
Durations: micro 120 ms / standard 200 ms / expansive 320 ms (modals 280). Easing: `cubic-bezier(0.4,0,0.2,1)` entries, `cubic-bezier(0.4,0,1,1)` exits. Animate opacity + transform only. Respect `prefers-reduced-motion` (disable decorative entrances, keep functional). Card stagger 50 ms (was 60).

### 4.7 Illustration
Geometric flat + one hand-drawn line accent. Two-tone (black + gold) only. Bee mascot (gold body, black stripes) appears in: 404 page, empty state of every list, loading state >800 ms, mobile onboarding hero. No section-divider illustrations. No spot illustrations on populated screens.

---

## 5. Microinteractions Catalogue

The Phase 3a/3b engineers must implement all of these. Use Framer Motion (web — already installed) and Reanimated (mobile — already installed).

1. **Bill card hover (web):** translateY -2 px; shadow grows `0 1px 2px rgba(0,0,0,.05)` → `0 8px 24px rgba(0,0,0,.12)`, 200 ms ease-out.
2. **Task checkbox:** on check, gold fill paints in 180 ms; check-mark stroke draws via `pathLength: 0→1` in 200 ms; row text crossfades to 60% opacity + line-through in 150 ms.
3. **Empty-state bee:** mascot enters scale 0.9→1, opacity 0→1 in 320 ms; web idles with 4 px vertical sine loop (3 s); mobile does one-off 360° spin on mount.
4. **"Ask AI" chip:** rest = 1 px gold outline @ 50% opacity. Hover/press-in = full opacity + 6 px gold glow (`box-shadow: 0 0 0 3px rgba(255,215,0,.25)`), 150 ms.
5. **Tab switch (sub-tabs):** Framer `layoutId` slide, 200 ms spring (stiffness 400, damping 30). No colour fade.
6. **Modal open:** backdrop fade 150 ms; modal scale 0.96→1 + translateY 8→0 in 220 ms ease-out.
7. **Drawer / bottom sheet (mobile):** slide-up `translateY 100%→0%` in 280 ms `Easing.out(Easing.cubic)`; backdrop 0→0.6 same window.
8. **Toast:** slide in from top; 6 px left-border (gold info, semantic for success/warn/danger); auto-dismiss 4 s with thin gold progress bar.
9. **Theme toggle:** keep existing `use-theme-transition.ts` overlay; recolour gradients indigo→gold; keep 700 ms timing.
10. **Sidebar active item (web):** existing `layoutId="sidebar-active"` bar (`(app)/layout.tsx:132-138`); recolour to `#FFD700`, widen 3→4 px.
11. **Add button (mobile Home FAB):** gold pill; press scales 0.95 + 60 ms `expo-haptics impactAsync(Light)`; long-press expands "Ask Laylo" sheet.
12. **Card expand (Bills/Subs):** chevron rotates 0→180 in 200 ms; section `height 0→auto + opacity 0→1` in 220 ms. Already implemented — retain.
13. **Plaid success:** brief gold confetti burst (≤8 particles, 600 ms) on `plaidSuccess` at `/settings/banks` only. NO confetti elsewhere.
14. **Loading >800 ms:** bee mascot + 3 staggered yellow dots cycling opacity (200 ms each); replaces grey skeleton blocks.
15. **Empty-state CTA hover:** button border self-draws in 250 ms via animated `strokeDashoffset`.

---

## 6. Personality Copy Bank

Apply these replacements globally. Phase 3a/3b agents must grep for the OLD strings and swap.

| Surface | OLD string | NEW string |
|---|---|---|
| Bills empty | "No bills yet" | "Nothing buzzing here yet — add your first bill" |
| Subscriptions empty | "No subscriptions yet" | "No subs swarming yet" |
| Tasks empty | "All caught up!" | "Inbox zero unlocked" |
| Tasks empty (alt) | "No tasks yet" | "Nothing on the to-do list. Free as a bee." |
| Transactions empty | "No transactions" | "Connect a bank to see what's been flowing" |
| Documents empty | "No documents yet" | "Your vault is empty. Drop a document in." |
| Reminders empty | "No reminders" | "All quiet. We'll buzz you when something needs attention." |
| Appointments empty | "No appointments" | "Calendar's clear. Enjoy the open hive." |
| Banks empty | "No banks connected" | "Connect a bank — we'll handle the honey trail." |
| Insights empty | "No insights yet" | "Add a few things and Laylo will start spotting patterns." |
| Loading (generic) | "Loading…" | "Hang on, organising your hive…" |
| Loading (transactions) | "Loading transactions…" | "Following the honey trail…" |
| 404 page | "Page not found" | "This page flew away" |
| Generic error toast | "Something went wrong" | "Hmm, something stung. Try again?" |
| Network error | "Connection failed" | "Lost the buzz. Check your connection." |
| Save success | "Saved" | "Tucked away safely" |
| Delete confirm | "Are you sure?" | "Send this one out of the hive?" |
| Sign-in CTA | "Sign In" | "Welcome back" |
| Sign-up CTA | "Get Started" | "Join the hive" |
| AI chip default placeholder | "Ask AI" | "Ask Laylo" |
| Dashboard greeting (existing morning/afternoon) — keep, but append | — | "What needs your attention today?" → "What's worth your time today?" |

Tone rules: never use exclamation points twice in a row. One emoji max per string. Avoid "—" em-dash overuse (no more than one per string). Never use "Oops" or "Whoops".

---

## 7. Out of Scope (do NOT touch)

- New features (chat history, search, sharing, exports). Paint job only.
- Backend/API (`apps/api` untouched). Database schema, Prisma migrations, seed data.
- Plaid behaviour — `/settings/banks`, `dashboard-widgets.tsx`, `lib/api/transactions.ts`: recolour only.
- New routes (only `/assistant` removed).
- New animation libraries — only Framer Motion + Reanimated (already installed). No Lottie/GSAP.
- Auth, JWT, OAuth flows.
- Marketing copy beyond rename + recolour.
- `data-testid` attributes — must not rename; preserve Playwright tests.

---

## 8. Phase Handoff Matrix

### Phase 2 — UI Designer
**Must produce:**
1. **Design tokens file** at `/Users/ashiks/Documents/myai/laylo/packages/ui/src/tokens.ts` exporting all §4.1 colours, §4.2 type scale, §4.3 spacing, §4.4 radii. Plain TS object — no theme provider yet.
2. **Updated `apps/web/tailwind.config.ts`** — replace the entire `primary` ramp (50–900) with a single `gold` token + map semantics to §4.1. Update `surface`, `card`, add `border` tokens.
3. **Restyled `packages/ui/src/components/`** — all 14 components retoned to gold palette. Touch every file in the list at §2.14. Snapshot each in light + dark with all variants (default/secondary/outline/ghost/danger × sm/md/lg).
4. **Bee mascot SVG** at `/Users/ashiks/Documents/myai/laylo/packages/ui/src/illustrations/bee.tsx` — 2-tone, single-component, takes `size` prop. Plus 4 empty-state variants (yawning bee, sleeping bee, working bee, celebrating bee).
5. **Updated `apps/web/src/styles/globals.css`** — recolour `.theme-fade-overlay` gradients to gold/black; recolour `.gradient-text` to a flat gold (delete the gradient class entirely if no longer needed).

### Phase 3a — Frontend (Web) Engineer
1. **DELETE** `apps/web/src/app/(app)/assistant/` directory.
2. **`apps/web/src/app/(app)/layout.tsx`** — strip `'AI Assistant'` from `NAV_ITEMS` (line 34); compress nav to 5 items per §3.1; recolour active-state + logo gradient to gold.
3. **`dashboard/page.tsx`** — DELETE prototype toolbar (lines 733–750) + all `viewState` branching; replace local-DOM theme toggle (lines 249–259) with `useTheme()`; collapse 4 stat-card gradients to single gold accent; add "Ask Laylo" hero input + slide-over.
4. **`bills/page.tsx`** — DELETE `CATEGORY_COLORS` (57–118); category distinguished by Lucide icon only; DELETE prototype toolbar (1300–1318); fix theme via `useTheme()`; add "Ask AI" chip in expanded BillCard + SubscriptionCard; rebrand heading "Money".
5. **`tasks/page.tsx`** — teardown category/priority colour map; recolour checkbox to gold; add per-task "Break into steps" chip; remove prototype toolbar; fix theme.
6. **`documents/page.tsx`** — **CRITICAL** — replace broken `useState(() => { observer })` at line 222 with `useTheme()`; recolour 8-category gradient table; add "Summarise" chip; remove prototype toolbar.
7. **`reminders/page.tsx`** — **CRITICAL** — same theme fix at line 172; recolour 6-category table; add "Ask Laylo" chip.
8. **`appointments/page.tsx`** — recolour 6-category gradient table; add "Help me prep" chip.
9. **`transactions/page.tsx`** — recolour up/down arrow chips (gold income / neutral expense); add per-row chip.
10. **`settings/page.tsx`** + **`settings/banks/page.tsx`** + **`components/banking/dashboard-widgets.tsx`** — recolour all `#6366F1`. Preserve Plaid behaviour exactly.
11. **`(marketing)/layout.tsx`** + **`(marketing)/page.tsx`** — replace "Life Admin AI" with "Laylo"; gradients to gold.
12. **`providers.tsx`** — verify `enableSystem={false}` + `attribute="class"` (no change expected).
13. **Apply copy bank §6** via grep+swap across all touched files.
14. **Verify** `apps/web/src/lib/use-theme-transition.ts` overlay gradients recoloured by Phase 2's globals.css update.

### Phase 3b — Mobile Engineer
**Must execute:**
1. **DELETE** `apps/mobile/app/(tabs)/assistant.tsx`.
2. **Edit** `apps/mobile/app/(tabs)/_layout.tsx` — remove `Tabs.Screen name="assistant"` block (lines 55–66); remove `centerIconWrapper` styles (lines 113–139); recolour `COLORS.primary` from `#6366F1` to `#FFD700`; reduce to 4 tabs per §3.2.
3. **Edit** `apps/mobile/app/(tabs)/index.tsx` — recolour hardcoded `#6366F1` (line 16); replace 4 stat-card colours with single gold accent + Lucide-RN icon; add "Ask Laylo" chip in header; remove docs from STATS (now in Money tab).
4. **Edit** `apps/mobile/app/(tabs)/tasks.tsx` — recolour, add "Help me schedule" chip per task.
5. **Edit** `apps/mobile/app/(tabs)/documents.tsx` — keep file but route is no longer a tab; reachable via Vault card on Home.
6. **Edit** `apps/mobile/app/(tabs)/settings.tsx` — recolour, apply copy bank.
7. **Edit** `apps/mobile/app/onboarding.tsx`, `auth.tsx`, `bills.tsx`, `appointments.tsx`, `reminders.tsx`, `banks.tsx`, `transactions.tsx` — recolour pass + copy bank.
8. **Add** bee illustration component (port the SVG from Phase 2 to react-native-svg). Use in onboarding hero + empty states.
9. **Verify** Reanimated is used for: tab switch, sheet slide-up, task-checkbox animation. No new libraries.

### Phase 4 — QA Engineer
1. Theme parity — toggle on every route (`/`, `/login`, `/signup`, `/dashboard`, `/tasks`, `/bills`, `/documents`, `/reminders`, `/appointments`, `/transactions`, `/settings`, `/settings/banks`); assert no FOUC. Focus on `/documents` + `/reminders` (the two bug fixes).
2. Login → dashboard transition in dark mode: no light flash.
3. No `/assistant` reachable (404 on web; no mobile tab); directory removed.
4. Every "Ask AI" surface from §3.3 present + clickable.
5. Microinteractions §5 — tick through.
6. Copy bank §6 — grep old strings ("No bills yet", "All caught up", "Loading…") — all gone.
7. axe-core on every route; gold-on-black ≥WCAG AA for 16 px+ only; small text never gold.
8. Snapshot-diff Plaid screens against baseline — colours change, behaviour does not.

---

## 9. Risks + Recommendations

### 9.1 Accessibility — yellow on black contrast
`#FFD700` on `#000000` is ~17.4:1 (excellent), but yellow body text fatigues eyes and glares on OLED. **Hard rule:** gold = accents/CTAs/focus rings/active indicators only. Body text is always white (dark) / `#0A0A0A` (light). Never paragraph-on-gold.

### 9.2 `/assistant` deletion fallout
`MessageSquare` icon + "AI Assistant" copy referenced in: `apps/web/src/app/(app)/layout.tsx`; `apps/web/src/app/(marketing)/page.tsx` (lines 88, 286, 379, 537, 623–624); `apps/mobile/app/onboarding.tsx` (lines 20, 39); `apps/mobile/app/index.tsx` (line 7). Update: "Your AI assistant for life's admin" → "Your bumblebee for life's admin". The product still has AI — it's just no longer a destination.

### 9.3 "Ask AI" button noise
If every card carries a full-weight gold chip, gold stops feeling special. Hierarchy rule: chips are 1 px gold outline at 40% opacity at rest, pop to full gold + glow only on hover/press-in. The dashboard hero "Ask Laylo" input is the single primary gold surface.

### 9.4 Mobile tab consolidation re-homing
4-tab mobile collapses: drop Assistant; demote Documents from tab to stack route accessible from a Vault card on Home. Existing top-level stack screens (`bills`, `appointments`, `reminders`, `banks`, `transactions`) consolidate under the new Money tab.

### 9.5 Prototype `viewState` toolbar leftover (SHIP BLOCKER)
`dashboard`, `bills`, `tasks` (and similar pattern in `documents`) still render the Default/Dark/Mobile/Loading/Empty toolbar from the prototype phase — visible in production today. Phase 3a must remove this first per file before recolouring.

### 9.6 Plaid + redesign collision
Plaid Link iframe is unaffected by colour changes (renders in its own iframe), but the surrounding chrome (connect button, success banner) at `/settings/banks` and `dashboard-widgets.tsx` must be manually retested after recolour. Behaviour MUST NOT change.

### 9.7 Copy bank scope
Apply §6 copy at page-level strings, NOT inside generic `packages/ui/EmptyState` — that component keeps a generic prop API; playful copy lives at callsites.

### 9.8 Theme toggle overlay sequencing
`use-theme-transition.ts` creates the DOM overlay imperatively (lines 17–29). Phase 2 must ship the new gold gradient values in `globals.css` BEFORE Phase 3a deletes old indigo references, otherwise the overlay flashes the old colour for one render.

---

## End of Brief

Read fully before Phase 2. Phase 2 deliverables gate Phases 3a/3b.

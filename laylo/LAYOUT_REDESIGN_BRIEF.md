# Laylo Layout Redesign Brief — Joyful Information, One Voice

**Author:** Principal UX/UI Design Expert (Phase 7). **Branch:** `feat/redesign-black-yellow`. **Replaces** `DESIGN_SYSTEM.md` §2 (Fraunces) + §10 (Layout). Tokens, spacing, radii, motion, AI affordance pattern stay locked.

User's three asks: (1) drop Fraunces; (2) make pages playful — *feel* it; (3) login opens with a droplet that falls, ripples, and choreographs the form into place.

---

## 1. Font pick — **Bricolage Grotesque**

Bricolage Grotesque (Mathieu Triay / ATF). Free on Google Fonts. Variable across `wght`, `opsz`, `wdth` — optical-size is the unlock.

**Why this over the obvious.** Bricolage is a grotesque — same readability family as Inter/Geist/Switzer — but with a slightly hand-cut quality (tilted `g` ear, friendly `a`, counter-curved `t`) that reads warm without going quirky. Body sizes = near-Inter; display sizes = personality emerges. Same trick Fraunces tried with `SOFT`/`WONK` — minus the serif the user rejected.

**Rejected:** **Inter/Geist** (neutral, boring — Laylo is a bee, not a Linear clone). **Plus Jakarta / Manrope / Outfit** (all read as "rounded Inter"). **Sora** (geometric/cold — "fintech," not "honey"). Cabinet Grotesk / Switzer / Satoshi are paid-commercial — out. **Space Grotesk** is the only credible runner-up; fallback if Bricolage fails QA on extended scripts.

**Loading** — `next/font/google` in `apps/web/src/app/layout.tsx` with `subsets: ['latin'], axes: ['opsz', 'wdth'], display: 'swap', variable: '--font-bricolage'`. Apply on `<html>`; set `font-family: var(--font-bricolage), ui-sans-serif, system-ui, sans-serif` on `body` in `globals.css`. Drop Fraunces. Mobile — intent in `apps/mobile/src/lib/tokens.ts`; TTF via `expo-font` follow-up.

**Axes:** `wght` 200–800 (body 400/600, hero 700), `opsz` 12–96 (auto-tunes), `wdth` 100 throughout.

**OpenType features (global):** `cv11` circular zero; `ss01` single-storey `a` (display ≥ 22 px only); `tnum` tabular nums on `.tabular-nums`; `cv05` straight `l` (disambiguates `1`/`I` in passwords + amounts).

```css
body { font-feature-settings: 'cv11', 'cv05'; }
h1, h2, .display { font-feature-settings: 'cv11', 'cv05', 'ss01'; }
.tabular-nums { font-feature-settings: 'cv11', 'cv05', 'tnum'; }
```

**Type scale (8 tokens — hard cap):**

| Token         | Size/line | Wt  | opsz | Use                                          |
| ------------- | --------- | --- | ---- | -------------------------------------------- |
| `display`     | 64 / 68   | 700 | 96   | Marketing hero. `tracking-[-0.02em]`.        |
| `h1`          | 32 / 38   | 700 | 64   | Page title. `tracking-[-0.015em]`.           |
| `h2`          | 22 / 28   | 600 | 32   | Section heading. `tracking-[-0.01em]`.       |
| `h3`          | 16 / 22   | 600 | 20   | Card title, modal title, subsections.        |
| `body`        | 15 / 23   | 400 | 14   | Paragraph (LH 22→23 for Bricolage cap-height). |
| `body-strong` | 15 / 23   | 600 | 14   | Inline emphasis.                             |
| `body-sm`     | 13 / 18   | 500 | 12   | Chips, metadata, table cells.                |
| `caption`     | 11 / 14   | 600 | 11   | Eyebrow (uppercase, `tracking-[0.08em]`).    |

DESIGN_SYSTEM's "Subheader (h4–h6)" range collapses into `h3`. Anything outside this scale is a bug.

---

## 2. Joyful layout audit + redesign — per page

Patterns: **Bento Grid** (Dashboard, Money) · **Honeycomb Tile Grid** (Vault, Documents) · **Conversational Stack** (Tasks, Reminders) · **Origami Card** (Bills) · **Calendar Ribbon** (Appointments) · **Story Strip** (Subscriptions) · **Settings Hub Grid** (Settings).

---

### 2.1 Dashboard — Bento Grid 2+3+1

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/dashboard/page.tsx`

**Joyless today:** 5+ stacked same-width sections (lines 176–334) — reads like Confluence. 3 identical stat cards (lines 177–181) — no hero metric. AI Insights / Today's Tasks / Bills Due (lines 194–318) all use the same `space-y-3` rhythm — three lists in a row reads as a spreadsheet.

**Redesigned: Bento Grid 2+3+1.** 12 cols × 4 rows of 180 px desktop:

```
┌──────────────────────┬─────────────┐
│ HERO (cols 1–8)      │ STAT (9–12) │  row 1
│ Ask Laylo + greeting │ Today's #   │
├────────────┬─────────┴─────┬───────┤
│ INSIGHT lg │ INSIGHT       │STREAK │  row 2
│ (1–5)      │ (6–8)         │(11–12)│
├────────────┴───────┬───────┴───────┤
│ BILLS (1–7)        │ TASK (8–12)   │  row 3
└────────────────────┴───────────────┘
```

- **Hero** (1–8, row 1): existing `AskLayloHero` + greeting + bee overlaid right corner. Greeting folds into the input ("Good morning, Alex. Ask anything…"). Bee pose by hour: `BeeStanding` morning, `BeeMagnifying` midday, `BeeSleeping` after 8 pm.
- **Hero stat** (9–12, row 1): one number, one label, most actionable right now ("Due in 3 days · $185"). `display` size. The day's headline.
- **Insight tiles** (row 2): three asymmetric, leftmost twice as wide. The wide one auto-rotates between `DEMO_INSIGHTS` every 8 s.
- **Streak tile** (11–12, row 2): "Cleared tasks 4 days in a row" + 5-dot streak. Derived from `tasks` array.
- **Bills row** (1–7, row 3): existing 2 bill cards laid horizontally. Each is an `Origami Card` (folds on Mark Paid).
- **Task tile** (8–12, row 3): one task — the most urgent. Big checkbox. On check it slides up off the tile and is replaced by the next with spring physics.
- **Banking widgets** collapse to a single inline row below the bento — reads as footer.

Mobile = single column: greeting → hero stat → insight → today's task → bills (horizontal scroll) → banking.

**Delight moments:** (1) **Time-of-day bee** swaps pose by hour, 600 ms crossfade. (2) **Insight roulette** crossfades every 8 s with a 1-px gold drain bar.

---

### 2.2 Bills — Origami Card stack with Hive Header

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/bills/page.tsx`

**Joyless today:** Full-width strips (line 138+); 5 bills = 5 stripes, reads like CSV. Mark-Paid sweep + coin (lines 149–171) is great but the card *stays put* — "I just did it" has nowhere to land. Bills tab + Subs tab use identical shape; bills are urgent, subs are a roster — different mental models.

**Redesigned: Origami Card with Hive Header.**

- **Hive Header** at top: horizontal strip of small hex pips — 1 per bill — gold paid, dim gold due, red-tinted overdue. Hover → tooltip. Answers "how much is left this month?" visually.
- **Bills tab — Origami Card 2-col grid:** existing card content, 2-up not 1-up, 16 px gutter, `transform-style: preserve-3d`. On Mark Paid: (1) existing gold-sweep + coin (keep — the moment of joy); (2) card folds `rotateX(90deg)`, `transform-origin: top`, 380 ms `ease-in`; (3) remaining cards re-flow via Framer `layout`; (4) after 600 ms a "1 paid this month" toast slides in with `🪙`.
- **Subs tab — Story Strip:** horizontally-scrollable tiles (240×160), brand big, price small, renewal countdown as a thin gold ring around the tile (clockwise drain). Below: a vertical compact list for users who hate horizontal scroll.
- **Hierarchy:** monthly outflow shown once below the Hive Header in `h1` ("$2,752.47 / month — 5 bills, 6 subs").

**Delight moments:** (1) **Origami fold on paid** — replaces "card stays put" with "card disappears into the hive." (2) **Hive Header pulse** — when all bills are paid, every hex pip pulses gold in cascade (50 ms stagger) + page background gets a 200 ms gold wash.

---

### 2.3 Tasks — Conversational Stack with Progress Hive

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/tasks/page.tsx`

**Joyless today:** Tasks styled identically regardless of priority/category. Header counts (line 195) are the only progress signal — no visual *bar*. 5 filter pills (lines 207–245) fight for attention with the tasks.

`SparkleBurst` + `InboxZeroOverlay` are excellent — keep both.

**Redesigned: Conversational Stack with Progress Hive.**

- **Progress Hive** above the list (replaces filter pills): row of small hex pips (1 per task) — gold completed, hollow pending — with a thin gold connecting line underneath that fills left-to-right as the user clears tasks. Visualises the *climb*. Click a pip → scrolls that task into view. The 5 filter pills move into a `<select>` dropdown.
- **Tasks get a tone.** Primary label is a single voice line, second person, present tense, composed from category + priority + dueDate:
  - High priority + bill → *"Pay the electricity bill — $142.50, due tomorrow."*
  - Health → *"Book the dentist for that cleaning."*
  - Personal → *"Pick up groceries when you're out."*

  `title` stays as data; the rendered string is composed. A friend wrote the list, not a database.
- **Priority gravity.** High-priority at top with 2 px gold left-bar. Medium/low smaller (`13px`), looser, no bar. Visual weight tells the user where to look without making them read.
- **Checkbox is a hex.** Replace the rounded-square (line 238) with a hexagon — fills gold + draws check stroke on tick. Ties to the Progress Hive — same vocabulary.
- Empty state retains `BeeSleeping` + existing inbox-zero overlay.

**Delight moments:** (1) **Progress Hive fill** — each completion paints its pip 200 ms gold; the line grows to match. After the last pip it *overshoots* 4 px and bounces back (spring 350/22). (2) **Bee whisper on hover** — hovering a task >800 ms: a 24-px `BeeStanding` peeks from below the page edge at bottom-right. Disappears on hover-end.

---

### 2.4 Money (hub) — Bento Grid 1+4 with Live Numbers

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/money/page.tsx`

**Joyless today:** 4 link cards in a 2×2 grid (lines 70–120) — identical, generic "quick links." Hero is AskLayloHero (line 59) — same as dashboard, copy-paste. HoneycombPattern (line 50) sits behind a flat layout.

**Redesigned: Bento Grid 1+4 with Live Numbers.**

- **One large hero tile** (right 5 cols, 2 rows): "This month's outflow" — big animated number ($2,752.47) + 6-month sparkline below. Not a link — *information*.
- **Four smaller hub cards** wrap the hero — Bills, Subs, Transactions, Banks. Each shows live count in `h2` + a one-line preview: **"Bills · 5 active · Next: Rent in 5 days."**
- Replace AskLayloHero with a smaller top-right chip. The hero belongs to the outflow number; dashboard owns the search input.
- HoneycombPattern opacity bumps to 8%.

**Delight moments:** (1) **Outflow ticker** — animates 0 → actual over 800 ms on mount; every minute a "+$0.00" pulses as heartbeat. (2) **Hub card hover preview** — hovering Bills flips it sideways (1.5°); preview line expands to a 3-row mini-list.

---

### 2.5 Vault (hub) — Honeycomb Tile Grid

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/vault/page.tsx`

**Joyless today:** 3 cards in 2-col grid (lines 50–110); third sits alone. Calls itself a "vault" but nothing reads as containment. HoneycombPattern background but tiles aren't honeycomb-themed.

**Redesigned: Honeycomb Tile Grid.**

- Each hub card becomes a literal honeycomb tile via `clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)`. Three hexes tilted at top, overlapping; centre hex sits 12 px lower — actual honeycomb staggering.
- Inside each hex: 32 px Lucide icon, `h3` label, count ("17 documents"). Hover scales to 1.04 + `shadow-glow`.
- Below: "Recently added" shelf — 5 thumbnail tiles (square, 16 px gap) of latest docs/reminders/appointments mixed. Vault feels curated.
- HoneycombPattern bumps to 8% — load-bearing texture.

**Delight moments:** (1) **Hex hover lift** — hovering a hex briefly outlines 6 imaginary neighbouring cells in dim gold for 300 ms. (2) **Recently added shimmer** — first thumbnail does a slow gold sweep on mount (450 ms `ease-out`).

---

### 2.6 Transactions — Day-Grouped Conversational Stack

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/transactions/page.tsx`

**Joyless today:** Paginated list of uniform thin rows — CSV with rounded corners. Filters hidden in a side-panel (line 198). Every transaction looks like every other.

**Redesigned: Day-Grouped Conversational Stack. Kill the table feel.**

- Group by day. Day header is a sticky pill ("Today · Tue 28 Apr · $124.50 spent · $0 in") in `h2`.
- Within a day: outflows = thin gold-dim left-bar; inflows = success-green left-bar; recurring (matched to sub/bill) = small gold ring badge top-right.
- Amount large (`h3`), right-aligned. Merchant `body`. Single category chip. **No arrow circles.**
- **Single sticky filter pill bar at top**, not a drawer: "All · This month · Income · Expenses · Recurring · Search…"
- "Load more" → gold pill.

**Delight moments:** (1) **Day-total pulse** — header total counts up (`AnimatedNumber`) when day cards mount. (2) **Recurring ring snap** — on hover, badge draws in (`pathLength: 0→1`, 200 ms) and shows "matched to: Netflix" inline.

---

### 2.7 Documents — Honeycomb Tile Grid (compact)

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/documents/page.tsx`

**Joyless today:** Grid/list toggle (lines 149–174) — both views uniform, no "filing cabinet" feel. 9 same-size category chips (line 188+). Doc cards all carry `FileText` despite 8 distinct categories.

**Redesigned: Honeycomb Tile Grid (compact) with Category Hexes.**

- **Category hex bar at top:** 8 hexagons (one per category), 64 px tall, category Lucide + count ("Insurance · 3"). Active fills with `--color-accent-soft`, others outline only.
- **Documents below:** 2-col grid (3-col wide). Each doc card is a "file folder" — card with a 4 px gold tab on top. Body: file-type Lucide, title, issue/expiry. If expiring, the gold tab pulses (1500 ms loop, opacity 0.6 ↔ 1).
- **Grid/list toggle deleted.** Single grid — lists make documents feel like data, grids make them feel like things you own.

**Delight moments:** (1) **Filing-tab pulse on expiring** as above. (2) **Honeycomb category transition** — un-selected hexes shrink to 0.92 + de-saturate; selected grows to 1.08; doc grid runs a 200 ms `layout` animation.

---

### 2.8 Reminders — Conversational Stack with Time Distance

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/reminders/page.tsx`

**Joyless today:** Reminders styled like tasks (line 145+) — same card shape, same chips. But reminders are passive (they fire), tasks are active (you do them). No representation of *time* — every reminder sits at the same vertical rhythm.

**Redesigned: Conversational Stack with Time Distance.**

- **Group by horizon:** "Soon" (<7 days), "This month" (<30), "Later" (>30). Each gets an `h2` header with count.
- Each reminder is a single line, no card — row with 8 px gold dot at left, title `body`, time `body-sm` muted at right. **The further away, the dimmer the dot** (5 months → 25%-opacity; tomorrow → full). Visual time-decay.
- On hover: row expands to a 1-line voice copy ("I'll buzz you on Tuesday at 9 am about renewing your vehicle registration"), dismiss/delete, existing `AskAiChip`.
- Faint vertical gold line connects the dots in each group — a "thread of reminders" (1-px `bg-[var(--color-accent)]`, `opacity: 0.15`).

The form *does* the calming. Time as visual axis.

**Delight moments:** (1) **Threaded gold line** — like flipping through a planner. (2) **Bee whisper on dismiss** — gold dot grows to 16 px and fades into a tiny `BeeStanding` that flies up and off the right edge over 400 ms; reminder collapses (height → 0).

---

### 2.9 Appointments — Calendar Ribbon

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/appointments/page.tsx`

**Joyless today:** Cards stacked chronologically — no calendar, though appointments are inherently calendar-shaped. "Show past" toggle (line 91) is afterthought.

**Redesigned: Calendar Ribbon + Day Cards.**

- **Top: 14-day horizontal scrolling ribbon.** Each day is a column: weekday ("Tue"), date ("28") `h3`, 0–3 gold dots if there are appointments. Today gets a thin gold underline (`layoutId="appt-today"`). Click → scrolls to that day.
- **Below: day-grouped cards.** Each day opens with `h2` ("Tue, April 28 · 1 appointment"). Categories = 8-px chip in title row; time `h3` left, title `body-strong` right.
- **Past collapses to a single "Past" expander** at bottom — default view = today + future only.

**Delight moments:** (1) **Ribbon scroll-snap** — CSS `scroll-snap-type` snaps to days; each snap springs the active-day underline. (2) **Today is haloed** — today's column has a slow breathing gold radial (0.15 → 0.25, 4 s cycle).

---

### 2.10 Settings — Settings Hub Grid

**File:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(app)/settings/page.tsx`

**Joyless today:** Vertical stack of `SectionCard` (lines 109+). 5 sections each using 100% of the 720 px width — even when content is three toggles. Profile and Notifications get identical visual weight despite different shapes.

**Redesigned: Settings Hub Grid.**

- **First page: 4-card hub** (2×2 grid, 240×180): Profile · Notifications · Appearance · Privacy & Data. Each: icon + title + 1-line summary ("4 channels enabled" / "Dark mode" / "Public profile off"). Click → opens that section in a full-width detail panel below.
- **Detail panel** slides in with 200 ms `layout`. Hub stays visible — Settings is shallow; you don't navigate, you reveal (iPad Settings pattern).
- Profile detail = 2-col form. Notifications = 2-col grid of toggles (3×2).

**Delight moments:** (1) **Hub card swap-in** — picking one dims the other 3 to 0.5; detail panel slides up below. (2) **Theme toggle gold ripple** — replace overlay fade with a gold ripple from the toggle itself (concentric ring scaling 0 → 800 px, opacity 0.25 → 0, 700 ms).

---

## 3. Login droplet choreography

User's ask: a droplet falls, ripples, the form choreographs into place. Storyboard frame-by-frame below.

**Files:** `/Users/ashiks/Desktop/myai/laylo/apps/web/src/app/(marketing)/login/page.tsx` + `signup/page.tsx`. New shared component `apps/web/src/components/motion/droplet-entrance.tsx`.

**Total duration:** 1,800 ms (1.8 s). Below = rushed; above = waiting too long to type.

**Trigger policy: ONCE per session.** `sessionStorage.setItem('laylo:authDropletPlayed', '1')` after first play. Subsequent visits skip to resting instantly. A beautiful animation seen 5× per session becomes friction — once is magic, twice is delay. Shared flag across login + signup.

**Reduce-motion fallback:** `useReducedMotion()` short-circuits everything. Droplet + ripples skipped. Form elements use the existing `initial: {opacity:0, y:16} → animate: {opacity:1, y:0}` over 200 ms.

### Storyboard

**t = 0 ms.** Page blank. Background is `--color-bg`. Auth card mounted, contents at `opacity: 0`. Layout exists; children invisible — no reflow later.

**t = 0 → 400 ms — The fall.** Golden teardrop SVG (32×48 px) starts at `y: -48px`, `x: viewport center`, `opacity: 1`. Animates `y: -48` → `y: viewportHeight * 0.33` (impact point: 1/3 from top, dead centre — where the bee rests in the card). Easing: custom *gravity* `cubic-bezier(0.55, 0.05, 0.85, 0.5)` (acceleration), 400 ms. Bottom tip elongates as it accelerates — `scaleY: 1 → 1.1` over the same window. Optical "stretching."

**t = 400 ms — Impact.** Droplet `opacity: 1 → 0` over 60 ms (`easeOut`). `scale: 1 → 0.6` over 60 ms ("absorbs" into impact).

**t = 400 → 700 ms — Three concentric ripples.** Three circles centred at impact, `stroke: var(--color-accent)`, `fill: none`, `stroke-width: 1.5`:
- Ripple A: `r: 0 → 80px`, `opacity: 0.6 → 0`, 300 ms `easeOut`, delay 0.
- Ripple B: `r: 0 → 120px`, `opacity: 0.5 → 0`, 300 ms, delay 80 ms.
- Ripple C: `r: 0 → 160px`, `opacity: 0.4 → 0`, 300 ms, delay 160 ms.

Implementation: `motion.svg` sized to viewport, three `motion.circle` with `cx`/`cy` at impact, `useAnimationControls` + `Promise.all` after droplet's `onAnimationComplete`.

**t = 600 → 1,200 ms — Form choreography.** Form elements are absolute-positioned in the auth card; each animates from a hidden offset to resting. Cascade radiates *outward* from impact — title above, inputs left+right, buttons below, footer last.

| Element                          | Hidden state                       | Delay (rel. t=400) | Dur. | Spring        |
| -------------------------------- | ---------------------------------- | ------------------ | ---- | ------------- |
| Bee + "Welcome back" wordmark    | `y: -24px, opacity: 0`             | 200 ms (=t=600)    | 350  | spring 380/28 |
| Sub-title                        | `y: -16px, opacity: 0`             | 280 ms             | 320  | spring 380/28 |
| Email input                      | `x: -32px, opacity: 0`             | 380 ms             | 360  | spring 360/26 |
| Password input                   | `x: 32px, opacity: 0`              | 460 ms             | 360  | spring 360/26 |
| Submit button                    | `y: 24px, opacity: 0, scale: 0.96` | 560 ms             | 380  | spring 320/24 |
| Divider ("or")                   | `opacity: 0`                       | 680 ms             | 200  | tween         |
| Google sign-in outline button    | `y: 16px, opacity: 0`              | 720 ms             | 320  | spring 320/24 |
| "Don't have an account?" footer  | `opacity: 0`                       | 880 ms             | 220  | tween         |

Total wall-clock from droplet start → 0 to 1,800 ms.

**t = 1,200 → ∞ — Idle.** Bee breathes (existing `animate={{ scale: [1, 1.03, 1] }}` 4 s, login line 73). Active input gets a 1 px gold focus ring (existing). The soft gold radial halo at line 64–71 stays — the breadcrumb that says "this is where the droplet landed."

### Framer Motion implementation contract

New component `<DropletEntrance>` wraps the auth card. Uses `useAnimationControls()` + `useReducedMotion()`. Sequence: `await dropletControls.start(...) → await Promise.all([rippleA, rippleB, rippleC]) → form children animate via per-element `delay` relative to parent mount`.

Droplet SVG (inline, no external asset):
```svg
<svg viewBox="0 0 32 48"><path d="M16 2 C 16 2, 4 22, 4 32 a 12 12 0 0 0 24 0 C 28 22, 16 2, 16 2 z" fill="var(--color-accent)" /></svg>
```

Session flag check on mount:
```ts
useEffect(() => {
  if (sessionStorage.getItem('laylo:authDropletPlayed') !== '1') {
    setShouldPlay(true);
    sessionStorage.setItem('laylo:authDropletPlayed', '1');
  }
}, []);
```
If `!shouldPlay || reduce`: skip droplet/ripple; pass `initial={false}` to all form motion components.

### Signup page

`apps/web/src/app/(marketing)/signup/page.tsx` reuses `<DropletEntrance>` with one variant: droplet `scale: 1.2`, *4* ripples (4th to `r: 200px`). Signup is a bigger commitment; entrance is slightly more emphatic. Same 1,800 ms total, same shared session flag.

---

## 4. Cross-cutting delight moments

Five subtle joys across the product. None block the user; all reduce-motion-aware.

1. **Time-of-day greeting variant.** Dashboard greeting varies by time + weekday — *"Monday. Let's earn it, Alex."* / *"Friday. Almost there."* / *"Weekend mode, Alex."* 14 variants, picked from `(weekday * 4 + timeBucket)` so the greeting persists within an hour.
2. **Bee fly-by, once per day.** First page load of the day: a 24-px `BeeStanding` flies left→right across the top of the viewport in 1.6 s on a sine-wave Y. Anchored to `(app)/layout.tsx`. Date stored in localStorage.
3. **Milestone toast.** When user crosses a count milestone (5 bills paid this month, 10 tasks cleared this week, 3 docs uploaded this session): gold toast slides in top-right + tiny `BeeStanding`. Auto-dismiss 5 s. Once per milestone via new `useMilestoneTracker(metric, threshold)` hook.
4. **Tab-bar icon wobble on switch.** Icon of newly-active nav item wobbles `rotate: [0, -6, 6, -3, 0]` over 320 ms.
5. **Cursor honey trail** (off by default, opt-in via Settings). 3-dot fading gold trail decaying in 400 ms.

---

## 5. What to keep from the existing playfulness

| Element                           | Verdict  | Rationale                                                          |
| --------------------------------- | -------- | ------------------------------------------------------------------ |
| 1.5° card hover wobble            | Keep     | Subtle, tactile. Stays on every hover-able card.                   |
| Sparkle burst on task complete    | Keep     | Best moment in the product. Don't touch.                           |
| Gold sweep on bill paid           | Keep + augment | Keep sweep + coin; add Origami fold afterward (§2.2).        |
| Inbox-zero overlay                | Keep     | Earned celebration. Already gated on N>0 → 0.                      |
| Honeycomb backgrounds on hubs     | Keep + intensify | Bump to ~8% opacity on Money + Vault — load-bearing.        |
| Animated dashboard numbers        | Keep + expand | `AnimatedNumber` on Money outflow, Vault counts, day-totals.  |
| Page cross-fades                  | Keep     | `PageTransition` 200 ms is right.                                  |
| Breathing bee on auth             | Keep     | Strong signature — augment with droplet entrance, don't disturb.   |

Nothing to kill. Phase 6 was on the right path; layout was the missing layer.

---

## 6. Implementation phasing

**C1 — Typography swap.** 3 files: `apps/web/src/app/layout.tsx`, `globals.css`, `DESIGN_SYSTEM.md` §2 rewrite. ~30 min, low risk. **Ship first** — lowest-risk, highest-felt change.

**C2 — Per-page layouts.** 10 web pages; mobile parity as separate sub-phase. Order (high-felt first): Dashboard → Bills → Tasks → Money + Vault hubs → Transactions → Documents → Reminders → Appointments → Settings. Parallelise web vs mobile = two agents; within web, dashboard + hubs = one agent, list pages = another.

**C3 — Login droplet.** 1 file (login) + 1 mirror (signup) + 1 shared component. ~2 hours incl. QA. Independent of C1/C2 — runs in parallel with either.

**Execution:** ship C1 first (under an hour). Run C3 in parallel with C2. C2 splits into two web agents + one mobile agent.

---

## 7. Open questions for the user

1. **Confirm Bricolage Grotesque?** Opposite of Fraunces — modern sans, playful at large sizes. Only alternative I'd consider is Space Grotesk (cooler, techier).
2. **Origami fold replaces Bills' "card stays in list" after Mark Paid?** Once paid, the card folds up and disappears from the active list (accessible via a "Paid this month" expander at bottom).
3. **Login droplet plays once per session (sessionStorage)?** Or every visit (laggy by the third login)? Strong rec: once per session.

---

## End of brief

`DESIGN_SYSTEM.md` §2 (Fraunces) + §10 (Layout) are superseded. Tokens, spacing, radii, motion, AI affordance pattern in `DESIGN_SYSTEM.md` stay source of truth. Engineers read `DESIGN_SYSTEM.md` for tokens and *this* file for layout + typography.

# Handoff: Sunflower · Personal Productivity Dashboard

A single-user productivity dashboard styled as a calm Japanese-handdrawn
notepad. The user picks 3 priorities a day ("Rule of 3"), checks off
habits and tasks, and a sketched sunflower in a pot reflects how the day
is going. Mood: low-stimulation, satisfying, OLED-safe.

---

## About the design files

The files in `design/` are an **HTML design prototype** built to
communicate the intended look, layout, copy, and interactions. They are
**reference material, not production code.** Recreate these designs in
the target codebase using its established stack and patterns (React +
your component library is a natural fit). If no codebase exists yet, the
recommended stack is:

- **Frontend:** Next.js (App Router) + React + Tailwind CSS, with CSS
  variables for the palette to enable easy themeing
- **Storage (single-user PWA):** IndexedDB via Dexie for tasks/notes;
  a manifest + service worker for installability
- **Mobile:** the same PWA, tested as installed iOS/Android home-screen
  app — no separate native build needed for v1

The HTML prototype renders SVG illustrations and uses raw template
strings for layout density. In production these should become real
React components with proper state, accessibility, and persistence.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, illustration style,
content, and component states are final-intent. Implement pixel-close
to what the prototype shows. Minor adjustments for accessibility (focus
rings, hit targets) are welcome — see "Accessibility" below.

The sunflower illustration is intentionally hand-drawn-looking and is
the brand's anchor. Keep it as inline SVG (do not rasterize). A
production refinement would be to commission a real ink+watercolor
sunflower set (4 states × maybe 2 angles each) and swap in PNGs at 2x.

---

## Design tokens

### Colors

All colors are **OLED-safe** — no pure white, no high-saturation
primaries. Define as CSS variables on `:root` and use everywhere.

```css
:root {
  /* paper / surfaces */
  --paper:         #F5EFE6;   /* base warm off-white */
  --paper-warm:    #EFE7DA;   /* secondary surface (tab bar bg, hover) */
  --paper-shadow:  #E6DCC9;   /* edge shadow tint */

  /* ink */
  --ink:           #2B2622;   /* primary text + borders */
  --ink-soft:      #4A423B;   /* body text */
  --ink-faint:     #8A8175;   /* muted text, completed text color */

  /* accents */
  --sage:          #8A9A82;   /* success / habits / progress fill */
  --sage-deep:     #6C7D65;   /* sage emphasis */
  --sage-wash:     #C8D2BF;   /* sage background tint */

  --terracotta:        #C08775;   /* live state, today, attention */
  --terracotta-deep:   #A06A58;   /* terracotta emphasis */
  --terracotta-wash:   #E6C9BD;   /* terracotta background tint */

  /* rule lines */
  --rule:          rgba(43, 38, 34, 0.10);
  --rule-strong:   rgba(43, 38, 34, 0.22);
}
```

**Usage rules:**
- Primary text: `--ink`
- Muted text (completed, secondary meta): `--ink-faint`
- Progress, sage washes, success: `--sage` family
- Today highlight, running timer, attention: `--terracotta` family
- No other colors anywhere in the UI. Sunflower internals use earthy
  yellows (#d9a857, #caa05b, #b39265, #9a8a6d) — keep these scoped to
  the SVG only.

### Typography

Two Google Fonts only.

```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
```

- **Caveat** — handwriting, used for body, titles, numbers, everything
  user-facing
- **Kalam** — print-handwriting, used **only** for tiny `UPPERCASE`
  meta labels ("priority 1", "today", "week avg") with `letter-spacing:
  0.08em`

Suggested type scale (px), all set in Caveat unless noted:

| Token        | Size | Weight | Line height | Use                       |
|--------------|------|--------|-------------|---------------------------|
| `display`    | 44   | 700    | 1.0         | Date header               |
| `h1`         | 36   | 700    | 1.0         | Range view title          |
| `h2`         | 30   | 700    | 1.0         | Mobile page titles        |
| `h3`         | 22–24| 700    | 1.1         | Section headers, task title |
| `body-lg`    | 22   | 500    | 1.2         | Task labels, R3 labels    |
| `body`       | 20   | 500    | 1.25        | List items, paragraphs    |
| `body-sm`    | 18   | 500    | 1.25        | Meta lines                |
| `caption`    | 16   | 500    | 1.2         | Helper text, hints        |
| `tiny`       | 11   | 400 (Kalam) | 1.0  | UPPERCASE meta labels, `letter-spacing: 0.08em`, color `--ink-faint` |

Default font-family on `<body>`: `'Caveat', cursive`.

### Spacing

8-px scale. Card paddings settle at 14/18, 22/28, or 28/32. Outer
artboard padding is 26/32 (desktop) and 16 (mobile).

### Radius

Borders use a slight wobble (see "SVG filters"), but the underlying
border-radius values are:
- Cards / pills / boxes: **4 px**
- Inputs / small chips: **3 px**
- Progress bar: **8 px** (pill)
- Buttons: **4 px**

### SVG filters — the "hand-drawn" effect

The whole design depends on two reusable SVG filters. Place this once
at the root of the app (e.g. inside `<body>` in the layout):

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="wobble">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="1.6"/>
    </filter>
    <filter id="blob" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
  </defs>
</svg>
```

- `filter: url(#wobble)` is applied to **every bordered card, checkbox,
  progress bar, tab bar, sunflower SVG** to give edges a hand-drawn
  jitter. This is non-negotiable for the aesthetic.
- `filter: url(#blob)` is the soft "watercolor wash" — used behind
  sunflower petals and behind the pot to suggest watercolor under-paint.

### Strikethrough

Use **native** `text-decoration: line-through` so multi-line wrapped
text strikes every line (a custom `::after` underline draws one line
through the bounding box and lands in the gap between wrapped lines —
this was a bug fixed in prototype iteration). Style:

```css
.strike {
  color: var(--ink-faint);
  text-decoration: line-through;
  text-decoration-color: var(--ink);
  text-decoration-thickness: 2px;
  text-decoration-skip-ink: none;
}
```

### Paper texture

`.paper` background combines three layers:
1. Base color `--paper`
2. Two small-radius radial-gradient dot patterns (subtle speckle, 2.5%
   opacity each) at offset frequencies to avoid moiré
3. A `::before` pseudo with two corner radial gradients giving very
   faint inner shadows in the corners

Optional: `.ruled` adds 32-px-spaced horizontal lines for notebook
paper. `.ruled-dense` is 24-px. `.ruled-margin` adds a single vertical
terracotta margin line at 56 px from the left (used on the notepad).

### Soft highlighters

Used to "highlight" Rule-of-3 cards and "today" pills. Defined as
linear-gradients with a small vertical inset, applied as background:

- `.wash-sage`  — `rgba(138,154,130,0.14)` flat
- `.wash-terra` — `rgba(192,135,117,0.14)` flat
- `.highlight-sage` / `.highlight-terra` — used as inline text
  highlighter behind a span

---

## Screens

### 1 · Desktop one-page dashboard (1400 × 940 design canvas)

The single hub. No nav — everything is here.

**Layout:** two-column grid, `1fr 460px`, 24-px gap, 26/32 padding.

**Left column (top to bottom):**

1. **Header row** — flex row, space-between.
   - Left: stacked: `tiny` "wednesday" / `display` "May 13" (with
     terracotta `underline-hand` wash)
   - Right: 1–5 day range pill strip + "← today" annotation + helper
     "drag edges to widen window"

2. **Progress card** — ink-box-soft border, padding 14/18. Contains
   label "today's progress · 3 of 8 done" + right-aligned percentage
   in sage (38%), the sketched progress bar, and a sub-line "1h 40m
   of est. 2h 52m logged".

3. **Rule of 3 row** — section header "Rule of 3 — the three things
   that would make today a win" (sage). Three equal-flex cards.

4. **Daily habits** — section header "Daily habits — quiet, repeating,
   hold-the-line" (terracotta). Ink-box-soft container with `ruled-dense`
   background. List of recurring task rows.

5. **Open tasks** — (no header) numbered list of incomplete tasks on
   ruled-paper background.

6. **Done** — "Done" sage subheader; struck-through completed tasks at
   reduced contrast.

7. **Footer button row** — three ghost buttons: `+ add task`,
   `archive`, `settings`. Right-aligned "last synced · 2 min ago".

**Right column:**

1. **Sunflower card** (380 px tall) — `ink-box-soft` + `dotgrid`
   background. Top row: "your sunflower" + tiny meta "day 23 ·
   drooping". SVG sunflower fills the card flex-end (pot on bottom
   edge). Bottom caption (handwritten muted): "finish 1 more priority
   and i'll perk back up by evening."

2. **Stats card** — four-column row:
   - "today" — 38%
   - "week avg" — 73% in sage
   - "time deficit" — −1h 12m in terracotta
   - Below: "streak" row with 14 small hand-drawn squares (alpha
     varies by completion) and "9 days" in sage.

3. **Notepad** — `ink-box-soft` + `ruled-margin` + `ruled-dense`,
   padding `14px 18px 14px 70px` (70 px left to clear the margin
   line). Auto-saved scratch notes, in handwriting, line-height 32 px
   to match the ruled lines.

**Realistic content (use as-is):**

- Date: Wednesday, May 13
- Rule of 3:
  1. Finish AAKRUTI concept doc — 45min — **running** (12:48 elapsed)
  2. Workout — strength A — 30min — open
  3. Email Harvard SEAS admissions — 15min — done ✓
- Daily habits: Morning pages 10min (done), Meditate 12min (done),
  Read — Bird by Bird 20min, Stretch + mobility 8min, Duolingo —
  Japanese 5min
- Open tasks: 1. Call dentist re: cleaning (5min), 2. Refactor billing
  query (25min), 3. Reply to Anika — Saturday plans (10min, "(short!)"),
  4. Pick up dry cleaning (10min), 5. Order new sketchpad + ink
  refills (5min)
- Done: Inbox zero (20min), Stand-up + notes (15min), Submit timesheet
  (5min)

---

### 2 · A single task — three states

A task row is the atomic unit. Three states displayed as separate
cards (in the prototype, side-by-side 420 × 120 each):

| State    | Checkbox                              | Label style                    | Trailing                                                        |
|----------|---------------------------------------|--------------------------------|-----------------------------------------------------------------|
| open     | Empty hand-drawn square               | Caveat 24, primary ink         | `▸ start` (muted monospace)                                     |
| running  | Filled pulsing terracotta inner square (`@keyframes pulse` 1.4 s ease-in-out infinite, opacity 0.55→1, scale 0.85→1) | Same as open                   | Elapsed time "▸ 12:48 elapsed" in terracotta + a thin progress bar (`12 of 25 min`) |
| done     | Hand-drawn ✓ in terracotta-deep on filled box, slight rotation (-6°) | `.strike` class (ink-faint with line-through) | "+1 ✿" reward badge in sage; sub-line "finished 22min · 3min under est." |

Reward badge "+1 ✿" appears on completion and animates out after
showing (suggested: scale-fade over 800 ms).

---

### 3 · The Rule of 3 row — empty + filled

A flex row of three equal cards.

**Empty slot:**
- Dashed ink border (`ink-box-dashed`)
- Tiny meta "priority N"
- Ghosted prompt "what matters most?" at 55% opacity
- Sub-line "— tap to set —" at 50%

**Filled slot:**
- Sage wash background (`wash-sage`)
- Solid ink border with wobble
- Tiny meta "priority N" top-left
- Top-right shows state:
  - filled: estimate as monospace muted
  - running: "▸ running 12:48" in terracotta + a washi-tape paper
    accent (terracotta dashed band, rotated -3°) anchored top-right
  - done: "✓ done" in terracotta-deep + label gets `.strike`

Tapping/clicking an empty slot opens an inline editor (label + time
estimate). Cards are reorderable by drag (move slot 1↔2↔3).

---

### 4 · Sunflower — four health states

The sunflower is a 200 × 300 viewBox SVG. Four explicit health states
drive distinct illustrations:

| State    | Trigger                                                | Visual                                                              |
|----------|--------------------------------------------------------|---------------------------------------------------------------------|
| thriving | All 3 priorities done + at least one bonus task        | Head upright, 14 large gold petals (two layers), bright wash, perky leaves up |
| healthy  | On pace (≥2/3 priorities done by mid-day, no big deficit) | Head upright, 12 amber petals, leaves up                          |
| drooping | Behind pace (1/3 priorities, or time deficit > 30 min) | Head tilted 35° + offset right, 10 muted petals, leaves drooping  |
| wilting  | Neglected — no priorities done for 3 days in a row     | Head fully down 110°, 8 small drab petals, leaves curled, 3 fallen petals on the soil |

**Anatomy (all states share):**
- **Watercolor wash** behind head: a `filter: url(#blob)` blurred
  circle in matching tone, opacity 0.4–0.55
- **Petals**: teardrop paths in two layers — a back layer half-rotated
  for fullness (opacity 0.72, stroke 0.7) and a front layer (opacity
  0.94, stroke 0.95). Each petal has tiny randomized rotation jitter
  (≤±2.5°) and length jitter to feel hand-drawn.
- **Head center**: filled dark-brown circle with ink outline + a few
  small "seed" dots (omitted in drooping/wilting)
- **Stem**: ink-sage path with wobble filter
- **Leaves**: filled sage paths with darker outline + a thin central
  vein
- **Pot**: trapezoid with watercolor wash under-paint (`filter:
  url(#blob)`) + ink outline with wobble + rim line + soil ellipse +
  vertical pot hatching

Implementation note: the prototype's `sunflower.js` is a clean
reference — port it as a `<Sunflower state="..." />` React component
that returns inline SVG. Keep all four state configs as constants.

---

### 5 · Date-range view (1400 × 820)

5 days side-by-side. Each day is a column with:
- Header: weekday + day number, right-aligned completion % and
  "done/total · deficit" sub-line
- A 160-px mini-flower zone (dot-grid background; today gets an inner
  terracotta border highlight; future days at 0.55 opacity)
- A thin sketched progress bar
- Rule-of-3 mini-list with dot prefix (`✓` sage, `▸` terracotta, `○`
  muted)
- A bottom annotation line ("← today · meetings ate the morning", etc.)

Above the columns: a `ink-box-soft` summary strip with week avg /
priorities done / total deficit / streak, and a one-line callout
("⤷ wednesday's drooping flower is dragging the average").

Top-right controls: window-size selector ("5 days"), prev/next week
buttons.

The range view is the primary read-out for understanding momentum
across days. It is **read-only** — tasks are still managed from Today.

---

### 6 · Mobile PWA (390 × 780, 5 tabs)

Each tab is a vertical scroll; a fixed 5-tab bottom bar with sketched
icons. Active tab uses terracotta-deep color + a small terracotta
underline under the label. Inactive tabs use `--ink-faint`.

**Tabs:**

1. **Today** — date + progress, 5-day strip, Rule of 3 (vertical
   stack), habits, today list
2. **Range** — week label + avg, 5-day column row (mini-flowers +
   progress bars), summary card, brief weekly notes
3. **Notepad** — title + "+ new page" button, horizontal scroll of
   note-page chips (today/aakruti/books/moving — terracotta-washed
   for active), single-page ruled notepad
4. **Stats** — large sunflower card + caption, 4 stat boxes (today /
   week avg / deficit / streak), 30-day completion heatmap (15-col
   grid, sage opacity by completion)
5. **Archive** — searchable list of past days; each day is a row with
   a tiny sunflower thumbnail, weekday/date, task count, percentage,
   and a 1-line preview of the 3 most-recent struck tasks

**Tab-bar icons:** simple geometric SVGs (square / 3 bars / page +
lines / pie / box-stack), all run through `filter: url(#wobble)`.

---

## Interactions & behavior

### Task lifecycle

```
[open]  ── tap timer button ──▶ [running]
[open]  ── tap checkbox ─────▶ [done]
[running] ── tap checkbox ──▶ [done] (auto-stops timer)
[running] ── tap timer ─────▶ [paused] (visual identical to open, retains elapsed)
[done]  ── tap checkbox ─────▶ [open]  (uncheck)
```

- Estimated time is set at creation; elapsed time is tracked while
  `running`. On done, save `actualMs` and compute `delta = est - actual`.
- Time deficit (today) = Σ (actual − est) for all completed tasks
  today. Negative = over-budget (terracotta); positive = under-budget
  (sage).

### Rule of 3

- Pinned at top, always exactly 3 slots
- Each slot is either empty or links to a real task
- Reorderable by drag
- A task assigned to R3 still appears in (or is promoted out of) the
  main list — the prototype shows R3 + main list as separate UI but
  same underlying task records

### Sunflower state machine (run on every task change + once per minute)

```
if (today.r3.done == 3 && today.bonusDone >= 1) → thriving
else if (today.r3.done >= 2 || (today.r3.done >= 1 && deficit > -30min)) → healthy
else if (today.r3.done >= 1 || deficit > -90min) → drooping
else → wilting

after 3 consecutive days with no r3 completion → wilting (overrides above)
```

Transitions are cross-faded over 600 ms (opacity + tiny scale, no
rotation). On reaching `thriving` for the first time today, a small
particle of 3 yellow dots floats up from the pot for ~1.5 s.

### Animations

- **Timer running dot**: `@keyframes pulse` 1.4 s ease-in-out infinite,
  alternating opacity 0.55→1 and scale 0.85→1
- **Sunflower transition**: 600 ms cross-fade
- **Task-done check**: stamp-in (scale 0.6→1 + opacity 0→1) over 220 ms
  ease-out, then the strikethrough draws across 280 ms ease-out
- **Washi tape** appears on the running R3 card via scale-y 0→1 over
  180 ms
- **Reward "+1 ✿"**: appear 200 ms scale 0.7→1.05→1, hold 600 ms, fade
  out 400 ms

### Date-range slider

- 1-, 3-, or 5-day range
- The pill row at the top of desktop is the range selector — clicking
  a day changes the focused day; drag-extending the edges (or using
  the explicit "5 days" pill) widens the window
- Active day is `wash-terra` with solid ink border
- Inactive days are `ink-box-soft`

### Notepad

- Single rich-text-ish surface per "page" (chip-tabbed)
- Auto-saves after 800 ms idle
- Markdown-light only: `**bold**`, lists via `-`, no headings/links

### Habits

- Habits are tasks with `recurrence: 'daily'`
- Reset to open at local midnight
- Habit completion contributes to streak, NOT to the day's progress
  bar (separate counter)

### Streak

- A "streak day" = R3 had ≥1 done that day
- Render 14 small squares on the desktop and 30 on the mobile stats
  page; opacity is `0.15 + completion * 0.55`

---

## State / data model (suggested)

```ts
type TaskState = 'open' | 'running' | 'done';
type Recurrence = 'none' | 'daily' | 'weekday' | 'weekly';

type Task = {
  id: string;
  label: string;
  estMinutes: number;
  state: TaskState;
  createdAt: number;
  startedAt?: number;        // ms timestamp of current run start
  elapsedMs: number;         // accumulated runtime across pauses
  completedAt?: number;
  actualMs?: number;          // set on done
  recurrence: Recurrence;
  isHabit?: boolean;          // shorthand: recurrence !== 'none'
  ruleOf3Slot?: 1 | 2 | 3;    // if pinned to R3 today
  order: number;              // for manual sort within list
  dayKey: string;             // 'YYYY-MM-DD' the task is scheduled for
};

type Day = {
  dayKey: string;
  ruleOf3: [TaskId|null, TaskId|null, TaskId|null];
  notes: string;              // scratch notepad page content
  flowerState: 'thriving'|'healthy'|'drooping'|'wilting';
  computedAt: number;
};

type Settings = {
  habitSlots: TaskId[];       // ordered habit list
  notepadPages: { id: string; title: string; body: string }[];
};
```

Storage: IndexedDB (Dexie). Schema versioning recommended even for v1.

---

## Accessibility

- Focus rings: every interactive element gets a 2-px `--terracotta`
  outline with 2-px offset. Do NOT use `outline: none` without a
  replacement.
- Hit targets: 44×44 px minimum on mobile (buttons, checkboxes, tab
  bar icons).
- The wobble filter degrades to a static border on `prefers-reduced-motion:
  reduce` — the pulsing timer dot also collapses to a steady fill in
  that mode, and the sunflower transition becomes instant.
- All hand-drawn iconography in the tab bar has visible text labels.
- Color contrast: `--ink` on `--paper` is 11.8:1 (AAA). `--ink-faint`
  on `--paper` is 4.7:1 — keep `--ink-faint` for non-essential text
  only (struck tasks, meta).

---

## Implementation notes

- **No emoji.** The only glyphs allowed are ✓ ✿ ▸ ○ ⤷ — and the
  sunflower is drawn, never an emoji.
- **No icon libraries** for the tab bar — use the small inline SVGs
  shown in the prototype (`screens.js` → `tabBar` function).
- **No drop shadows beyond what's already in the design**. The
  hand-drawn border is the depth cue.
- **Cards never nest more than 2 deep.** If a section needs more
  hierarchy, use a ruled background, not another border.
- **Mobile tab bar** is fixed bottom, 78-px tall including safe-area
  inset. Body content has `padding-bottom: 78px`.
- **The sunflower SVG should be a single component**, not multiple per
  state — pass `state` as a prop and switch the config.

---

## Files in `design/`

- `index.html` — entry; imports React + Babel + design canvas and
  composes the 6 sections
- `paper.css` — all CSS tokens, paper texture, ink/wobble borders,
  type, hand-drawn checkbox, strike, highlight, helpers
- `screens-parts.js` — shared building blocks: task row, R3 card,
  section header, date strip, progress bar, sunflower card
- `screens.js` — every screen's HTML content (desktop, three task
  states, two R3 rows, four flower states, range view, five mobile
  tabs)
- `sunflower.js` — the SVG illustration generator. **The source of
  truth for petal shape, leaf shape, pot shape, and the four health
  configs.**
- `design-canvas.jsx` — the pan/zoom presentation shell used to view
  all artboards together. Not part of the product — ignore on
  implementation.

To view the prototype: open `design/index.html` in a browser. It runs
entirely client-side; no build step.

---

## Out of scope for v1

- Multi-user / sharing
- Sync across devices (single-device IndexedDB only)
- Calendar integration
- Custom flower species
- Theming (only the one warm-paper palette)
- Notifications
- Settings page (the "settings" button in the prototype can be a stub)

---

## Open questions for the product owner

1. Where do recurring tasks live across days — duplicated per dayKey,
   or rolled-up by template? (Affects archive/range view rendering.)
2. Should the notepad sync into the day record or be a separate
   per-page corpus? Prototype currently shows day-scoped notes on
   desktop and a paged notepad on mobile.
3. Is "time deficit" worth including in v1, or should v1 ship without
   it and reintroduce after estimate-accuracy baseline data exists?
4. Does the sunflower carry over health between days, or fully reset
   at midnight? (Prototype implies same-day evaluation only.)

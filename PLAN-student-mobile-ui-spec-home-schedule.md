# Student Mobile UI Spec (Home + Schedule First)

> Purpose: lock the mobile design system and the first two "golden screens" before implementing the rest of the student mobile app.

Goal: turn the current desktop-compressed student experience into a phone-native app flow while preserving the existing brand palette, existing student features, and as much of the current route structure as possible.

Architecture: keep one student route tree, one mobile shell, and one shared component system. Build the visual and interaction language first, prove it on `Home` and `Schedule`, then roll the same system into `Clock`, `Trade`, and `Availability`.

Tech stack: Vue 3, Vuetify 3, Vue Router, existing MDI icon set.

---

## Product north star

The student mobile app should feel:
- mobile-native instead of desktop-compressed
- calm and precise instead of dense and noisy
- action-first instead of navigation-first
- consistent across tabs instead of page-by-page improvised

This spec borrows from the reference app's discipline:
- strong vertical rhythm
- repeatable section templates
- few visual weights
- clear CTA hierarchy
- simple bottom navigation

This spec does **not** change the existing brand palette.

---

## Primary mobile IA

Bottom tab bar for student phone screens:
- `Home`
- `Schedule`
- `Clock`
- `Trade`
- `Availability`

Secondary access:
- notifications via bell in top bar
- profile/settings via avatar sheet
- departments and qualifications as secondary routes
- tasks remain secondary unless usage proves they deserve tab status

Rule:
- tab = repeated weekly/daily student job
- header icon = status or account access
- sheet/menu = occasional tools

---

## Shared mobile shell rules

### 1. Screen structure

Every top-level student screen follows this order:
1. top app bar
2. title block
3. primary action/status section
4. supporting sections
5. bottom tab bar

### 2. Top app bar

Phone top bar contains:
- page title only when the main title block is not already visible in the viewport, or a compact page label if needed
- notifications icon on the right
- avatar trigger on the right
- no hamburger on phone

Behavior:
- sticky
- lightweight divider on bottom
- safe-area aware

### 3. Bottom tab bar

Behavior:
- fixed on phone
- always visible
- icon + label always shown
- active tab uses brand maroon
- inactive tabs use muted slate/gray
- no center floating CTA button for phase 1; consistency matters more than novelty

Recommended icon set:
- `Home`: `mdi-home-variant-outline` / `mdi-home-variant`
- `Schedule`: `mdi-calendar-clock-outline` / `mdi-calendar-clock`
- `Clock`: `mdi-clock-outline` / `mdi-clock`
- `Trade`: `mdi-swap-horizontal-circle-outline` / `mdi-swap-horizontal-circle`
- `Availability`: `mdi-calendar-edit`

Badge rules:
- `Trade`: badge only for actionable incoming requests
- `Availability`: warning dot only for sync failure or stale sync

### 4. CTA hierarchy

Use only three button levels:

1. Primary
- filled
- brand maroon background
- white text
- used once per section, ideally once per screen

2. Secondary
- tonal or outlined
- used for alternate but still important actions

3. Utility
- text button
- used for `View all`, `Retry`, `Dismiss`, `Learn more`

Rules:
- no screen should open with more than one equally dominant CTA
- destructive actions must never use the same visual weight as the primary CTA

### 5. Card family

All cards should feel like one system.

Card types:
- status card
- summary metric card
- action card
- list item card
- empty-state card

Shared card rules:
- white surface
- large radius
- subtle border or subtle shadow, never heavy on both
- clear internal spacing
- title, support text, and CTA alignment consistent across all tabs

### 6. Typography

Visual hierarchy:
- eyebrow label: small, muted, uppercase or small caps feel
- page title: large, bold, dark
- section title: bold, smaller than page title
- support text: medium gray
- metric value: bold and compact

Rules:
- page should usually have one visual H1
- support text should explain purpose, not restate the title

### 7. Spacing system

Spacing should be consistent and finite.

Use these conceptual steps:
- screen edge padding: large
- intra-card padding: medium
- gap between stacked cards: medium-large
- gap between title and support text: small
- gap between sections: large

Rule:
- layout should feel like a single vertical rhythm, not custom spacing per section

### 8. Interaction rules

General behaviors:
- primary interactions are tap-first, not hover-dependent
- swipe gestures are optional enhancements, not core dependencies
- cards open detail or action sheet on tap
- confirmations use bottom sheet or dialog depending on action severity
- success uses snackbar/toast
- error uses inline banner with one recovery action

Loading:
- skeletons for lists/cards
- avoid layout jumps during loading

Empty states:
- one sentence that explains the state
- one next action only

---

## Golden screen 1: Home

### Purpose

Home answers: "What matters right now?"

Student jobs on Home:
- check if I need to clock in
- see my next shift
- see urgent requests or assignments
- jump to the right workflow quickly

### Information priority

Order of content:
1. greeting + date
2. today status card
3. next shift card or no-shift card
4. open shifts preview
5. pending requests preview
6. weekly summary

### Section spec

#### A. Greeting block

Contains:
- greeting with first name
- current day/date

Rules:
- warm but compact
- no oversized empty hero area

#### B. Today status card

Purpose:
- show the single most important action right now

States:
- not clocked in
- clocked in
- on break
- no active shift

Content:
- icon
- status label
- supporting status text
- one primary CTA

Primary CTAs by state:
- not clocked in: `Clock In`
- clocked in: `Clock Out`
- on break: `End Break`
- no active shift: `View Schedule`

Recommended icons:
- `mdi-clock-outline`
- `mdi-clock-check-outline`
- `mdi-coffee-outline`

#### C. Next shift card

Purpose:
- show the next meaningful work commitment

Content:
- department or position
- date/time
- optional location
- one secondary CTA

Secondary CTA:
- `View Shift Details`

Optional utility CTA:
- `Find Cover` only if the shift is eligible and close enough to matter

#### D. Open shifts preview

Purpose:
- surface quick opportunities without forcing a full navigation first

Content:
- section title
- `View all` utility CTA
- 1-3 shift preview cards

Each preview card shows:
- department
- time
- shift type or status chip

Tap result:
- opens `Schedule` on `Open Shifts`

#### E. Pending requests preview

Purpose:
- surface trades, acknowledgements, or items requiring response

Content:
- section title
- count badge if non-zero
- top 1-3 items

Tap result:
- trade items open `Trade`
- assignment acknowledgement opens detail/action sheet

#### F. Weekly summary

Purpose:
- provide low-friction progress context, not primary action

Metrics:
- hours this week
- shifts this week
- estimated earnings

Rules:
- keep visually lighter than the today status and next shift sections
- this is supportive, not the hero

### Home empty-state rules

If no shifts:
- show no-shift card with clear message
- CTA routes to `Schedule`

If nothing urgent:
- Home should still feel intentional, not empty
- today status + weekly summary remain visible

---

## Golden screen 2: Schedule

### Purpose

Schedule answers: "What am I working and what can I pick up?"

Student jobs on Schedule:
- see my assigned shifts
- browse open shifts
- claim an open shift
- inspect shift details
- start a cover/trade action from a scheduled shift

### Default mobile model

Phone-first default:
- list/cards first
- not full desktop-style weekly calendar as the primary view

Use:
- top segmented control
- grouped shift cards by date
- compact week selector

Optional:
- calendar/grid can remain available as a secondary mode later, not phase 1 default

### Information priority

Order of content:
1. title + active week range
2. week navigation control
3. segmented control: `My Shifts | Open Shifts`
4. grouped shift cards
5. optional empty state or helper tips

### Section spec

#### A. Title block

Contains:
- page title `Schedule`
- active week range
- one sentence of support text only if it adds value

#### B. Week navigator

Controls:
- previous week
- current week reset (`Today` or `This week`)
- next week

Rules:
- compact
- thumb-friendly
- should not visually overpower the segmented control

#### C. Segmented control

Two states:
- `My Shifts`
- `Open Shifts`

Behavior:
- switching segments updates list in place
- selected state is clearly visible
- segment labels should never truncate awkwardly

#### D. My Shifts list

Group by date.

Each card contains:
- date group header
- department
- time range
- position
- location if relevant
- status chips if needed

Primary interaction:
- tap card opens shift detail sheet/page

Shift detail actions:
- `Find Cover` or `Request Trade` when allowed
- `View Details`

#### E. Open Shifts list

Each card contains:
- department
- time range
- position
- open status indicator
- one clear CTA

Primary CTA:
- `Claim Shift`

Secondary behavior:
- tap card opens detail sheet before claim if more context is needed

Rules:
- claim flow should feel safe and explicit
- do not bury the claim action under multiple nested menus

### Schedule empty-state rules

If `My Shifts` is empty:
- explain no upcoming shifts
- CTA: `Browse Open Shifts`

If `Open Shifts` is empty:
- explain no current openings
- no fake CTA; offer passive retry or refresh only if needed

---

## Shared supporting components for Home + Schedule

### 1. Notification bell

Use:
- `mdi-bell-outline`

Behavior:
- top-right only
- badge only for meaningful unread/actionable count

### 2. Avatar menu/sheet

Contains:
- profile
- settings
- sign out

Do not use as a dumping ground for core student workflows.

### 3. Status chips

Use chips sparingly for:
- open
- pending
- urgent
- synced / sync failed

Chip colors must map to status semantics consistently.

### 4. Progress bars

Use only where progress is actually meaningful:
- funding-style progress bars from the reference app should not be copied blindly
- only use in student app if a real completion/progress concept exists

### 5. Action sheets

Use bottom sheets for:
- shift actions
- request actions
- confirmation choices that are richer than one button

---

## Visual token guidance

Keep existing brand palette, but use it more selectively.

Recommended role mapping:
- brand maroon: primary CTA, active states, emphasis moments
- deep near-black/slate: titles and high-priority text
- muted blue-gray/slate: support text and secondary labels
- soft off-white background: app canvas
- white: cards/surfaces
- semantic green/orange/red: status only

Rules:
- maroon should guide focus, not paint the whole screen
- if everything is brand-colored, nothing feels important

---

## Implementation sequence

### Phase 0: Spec + shell

1. Freeze:
- spacing scale
- radius scale
- card rules
- button hierarchy
- tab bar style
- top bar style

2. Update mobile shell:
- remove drawer behavior on phone
- enforce bottom tabs
- finalize top-right bell + avatar behavior

Exit criteria:
- mobile shell is stable
- no page still depends on phone drawer nav

### Phase 1: Home

Build Home as the first golden screen.

Scope:
- greeting block
- today status card
- next shift card
- open shifts preview
- pending requests preview
- weekly summary

Exit criteria:
- screen feels coherent on phone
- CTA hierarchy is obvious
- no desktop-compressed artifacts remain

### Phase 2: Schedule

Build Schedule as the second golden screen.

Scope:
- week header
- week nav controls
- segmented control
- my shifts list
- open shifts list
- card/detail behavior

Exit criteria:
- schedule works as a mobile list-first workflow
- claiming open shifts and opening shift details feel direct

### Phase 3: Roll system into remaining tabs

Then update:
- Clock
- Trade
- Availability

Availability should be treated as a workflow redesign, not only a visual cleanup.

---

## Review checklist

Each mobile screen must pass these checks:
- Is the first visible action the most important student action?
- Is there one dominant CTA, not multiple competing ones?
- Does the layout read as a phone-first design rather than a shrunk desktop page?
- Are spacing and card styles consistent with other tabs?
- Can a student complete the main task in 1-3 taps?
- Are icons supporting comprehension instead of adding noise?

---

## Immediate next action

Start implementation with the mobile shell + `Home`.

Why:
- Home sets the visual system
- Home establishes section rhythm, summary cards, CTA hierarchy, and top bar behavior
- once Home is right, Schedule can reuse most of the same design language

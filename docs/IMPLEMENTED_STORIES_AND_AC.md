# Implemented Stories And Acceptance Criteria

Last updated: April 18, 2026  
Source of truth used: merged `dev` PRs in frontend + backend repos.

## Scope Legend
- `Dashboard`: Student or Manager dashboard experience
- `Schedule`: Shift calendars and open shifts
- `Hours`: Student availability + class sync
- `Approvals`: Manager decision workflows
- `Workers`: Manager student-worker management
- `Platform`: Cross-cutting API, auth, reliability, and nav

---

## Epic A: Student Mobile/PWA Experience

### A1. Student mobile shell with bottom navigation
**Story**: As a student, I can use the app in a mobile-first shell with bottom navigation so I can complete core tasks on a phone.

**AC**
- Given I am on a student route on mobile, when the page loads, then I see mobile bottom navigation for core student flows.
- Given I navigate between student tabs, when switching tabs, then I stay in the same student shell context.
- Given I am on desktop, when loading student pages, then desktop layout remains available.

### A2. Student dashboard mobile layout and priority cards
**Story**: As a student, I can see a mobile-optimized dashboard with key priorities first (clock status, next shift, open shifts, pending items).

**AC**
- Given I am on student dashboard, when data loads, then I see clock status, next shift, and weekly summary cards.
- Given I have pending acknowledgements, when dashboard renders, then acknowledgement actions are visible without opening another page.
- Given dashboard data fails, when load returns error, then I see a retryable error state.

### A3. Pull-to-refresh on student mobile pages
**Story**: As a student, I can pull down to refresh key mobile views so I can reload schedule/availability quickly.

**AC**
- Given I am on mobile student views that support pull-to-refresh, when I pull down, then data reload is triggered.
- Given refresh completes, when data returns, then UI state updates without full app restart.

### A4. Notification-route fallback hardening
**Story**: As a student, I am redirected to valid student pages from notifications so broken manager-only links do not block me.

**AC**
- Given a notification includes manager approvals link, when opened as student, then app redirects to a valid student page.
- Given fallback route logic executes, when role is student, then link resolution avoids manager-only route targets.

---

## Epic B: Student Hours (Availability + Class Schedule)

### B1. Calendar grid view for student availability
**Story**: As a student, I can view my availability in a weekly calendar block view so overlaps are easy to understand.

**AC**
- Given I open Hours > My Availability, when calendar mode is selected, then blocks render by day/time grid.
- Given class/available/unavailable entries exist, when rendered, then each type is visually distinct.
- Given no blocks exist for a period, when grid renders, then empty slots are shown without errors.

### B2. Week/day navigation in Hours
**Story**: As a student, I can move across weeks and inspect day focus so I can review past and future availability.

**AC**
- Given I am in Hours, when I tap previous/next controls, then week range updates.
- Given I tap Today, when action executes, then view jumps to current week/day.
- Given list mode day pills are used, when a day is selected, then selected day state is consistent.

### B3. Class schedule sync into locked unavailable blocks
**Story**: As a student, my class schedule is synced into availability as locked class blocks so managers cannot schedule me in class time.

**AC**
- Given class sync runs successfully, when blocks are created/updated, then class entries are marked as locked class schedule.
- Given class sync runs repeatedly, when no external class changes occurred, then sync is idempotent.
- Given I attempt to create manual availability overlapping locked class block, when save is attempted, then request is rejected.

### B4. Class sync status and diagnostics hardening
**Story**: As a student and support/admin team, class sync status is reliable and debuggable so issues can be diagnosed.

**AC**
- Given class sync is configured, when status endpoint is called, then derived sync status is returned.
- Given stale auth/session userId shape, when class sync runs, then backend resolves user context robustly.
- Given debug endpoints/UI were used for diagnosis, when production cleanup completed, then temporary debug controls are removed from student Hours UI.

### B5. Day-pill visual cleanup
**Story**: As a student, I do not see redundant red dots under day pills because class blocks already communicate class time.

**AC**
- Given Hours day pills render, when view loads, then red dot indicators are absent.
- Given class data exists, when calendar is shown, then class visibility remains via class blocks.

---

## Epic C: Open Shifts, Cover/Pickup/Swap Flow

### C1. Two-stage cover request backend workflow
**Story**: As a student, I can request cover for my shift and managers can approve progression through cover/pickup stages.

**AC**
- Given I request cover, when manager approves stage 1, then shift is posted open for pickup workflow.
- Given another student volunteers, when manager approves stage 2, then shift assignment transfers and acknowledgement is created.
- Given manager declines at any stage, when decision is saved, then request status and notifications reflect the outcome.

### C2. Department-visible open request pool
**Story**: As a student worker, I can see cover requests from coworkers in my department.

**AC**
- Given cover requests exist in my department, when pool feed is queried, then eligible requests are returned.
- Given I am not in that department, when querying pool, then unrelated requests are excluded.

### C3. Hide non-pickable open shifts from students
**Story**: As a student, I only see open shifts I can actually pick up (no class/time-off/unavailable conflicts).

**AC**
- Given open shifts overlap my unavailable/class/time-off windows, when dashboard or open-shifts list loads, then those shifts are excluded.
- Given no conflicts exist, when open shifts load, then eligible shifts are shown.
- Given counts are shown, when list is filtered, then counts match filtered data.

### C4. Include cover-approved shifts in open-shifts query
**Story**: As a student, I can see shifts that were approved for cover and posted open.

**AC**
- Given a shift is marked cover-approved and available, when open-shifts endpoint runs, then it appears in open shifts.
- Given shift is cancelled or otherwise unavailable, when queried, then it does not appear.

### C5. Robust pickup handling + expired shift suppression
**Story**: As a student, pickup works for valid open shifts and expired shifts are not shown.

**AC**
- Given a shift end time is already past current time, when open shifts are fetched, then it is excluded.
- Given a pickup request is made on a valid open shift, when backend processes claim, then a valid approval request is created/updated without orphan errors.
- Given pickup targets invalid/missing shift state, when backend validates, then user receives deterministic failure message.

---

## Epic D: Manager Approvals and Approval UX

### D1. Pending-focused approvals interface
**Story**: As a manager, I can review pending items quickly without mixed history clutter.

**AC**
- Given manager opens Approvals, when page loads, then pending actions are grouped by Time Off / Cover / Pickup / Swap / Acknowledgements.
- Given there are no pending items in a section, when rendering, then clear empty states are shown.
- Given I approve/deny, when action completes, then list refreshes and feedback snackbar appears.

### D2. Remove duplicate open-shift-claims approval path
**Story**: As a manager, there is one canonical approval flow for shift requests, reducing duplicate logic and UI confusion.

**AC**
- Given manager approvals API is used, when requests are reviewed, then `/manager/swap-requests` is the canonical path.
- Given legacy open-shift-claims endpoints/routes, when cleanup is merged, then duplicate routes are removed.
- Given approvals UI is loaded, when shift requests tab renders, then duplicate open-shift-claims section is absent.

### D3. Terminology normalization across app
**Story**: As any user, I see consistent request terms across pages and actions.

**AC**
- Given request-related UI labels, when rendered, then canonical terms are used: `Cover Request`, `Pickup Request`, `Swap Request`, `Time Off`, `Open Shifts`.
- Given old labels (`Find Cover`, `Trade Board`, etc.), when terminology sweep merged, then they are replaced in primary UX surfaces.

---

## Epic E: Manager Student Workers Experience

### E1. Worker availability readability improvements
**Story**: As a manager, I can inspect worker availability without parsing dense text blobs.

**AC**
- Given Student Workers page loads, when cards render, then weekly availability is presented in compact structured blocks.
- Given worker details modal opens, when viewing weekly availability, then data is grouped and visually scannable.
- Given high slot volume, when preview exceeds available space, then overflow handling communicates additional items.

### E2. Student workers availability compact calendar bar preview
**Story**: As a manager, I can scan each worker’s week quickly via compact 7-day summary.

**AC**
- Given worker card renders, when availability exists, then each day shows concise summary blocks.
- Given available/unavailable counts, when card renders, then totals are visible and consistent with preview data.

### E3. Worker class schedule retrieval in detail modal
**Story**: As a manager, I can inspect class schedule details for a worker to make scheduling decisions.

**AC**
- Given worker detail modal class schedule tab, when opened, then current class schedule entries are shown.
- Given schedule refresh action, when triggered, then class schedule data is reloaded.

---

## Epic F: Manager Shift Assignment Quality

### F1. Assignable-worker filtering endpoint
**Story**: As a manager, when creating a shift I get only eligible workers for the selected window/position/department.

**AC**
- Given date/time/department context, when assignable-workers endpoint is queried, then workers with conflicts are filtered out.
- Given position is selected, when query includes position, then only qualified workers are returned.
- Given manager create shift form updates date/time/position, when inputs change, then worker options refresh accordingly.

### F2. Assignment conflict hard validation
**Story**: As a manager, invalid assignments are blocked server-side, not just warned.

**AC**
- Given assignment conflicts with worker availability/time-off/class constraints, when create/update is attempted, then API returns conflict response.
- Given no conflict exists, when create/update is attempted, then assignment persists successfully.

---

## Epic G: Clock-In Reliability

### G1. Own-shifts clock-in visibility across department edge cases
**Story**: As a student worker, my assigned shift appears for clock-in even if active-department context is stale/misaligned.

**AC**
- Given my shift is assigned to me, when clock-in list is loaded with own-shift query, then shift is visible for clock-in logic.
- Given I am not querying my own shifts, when manager/other scoped queries run, then department filtering behavior remains intact.

### G2. Clock-in empty-state clarity
**Story**: As a student, if no valid shift is clockable I receive clear guidance.

**AC**
- Given no current/near shift is available for clock-in, when clock page opens, then actionable empty-state message is displayed.

---

## Epic H: Platform Reliability / Maintenance

### H1. Remove orphan legacy API surface
**Story**: As developers maintaining the app, we keep one active request workflow model and remove dead paths.

**AC**
- Given legacy `shift_trade` model/controller/routes were unused, when refactor merges, then dead files/routes are removed.
- Given app startup and route loading, when server boots, then no references to removed legacy files remain.

### H2. Deployment/runtime stability hardening
**Story**: As the team, deploy and startup paths are resilient enough to avoid production outages.

**AC**
- Given migration and startup edge cases, when backend starts/deploys, then known fatal startup failures are avoided.
- Given diagnostics are needed post-deploy, when deploy scripts run, then logs and restart behavior are available for troubleshooting.

---

## Current Decision Notes (requested)

### Trade Board page
Decision direction: remove as standalone navigation and keep swap/cover actions embedded in schedule/dashboard flows.

### Open shift expiry logic
Intended logic: open shifts should auto-disappear after end time; managers should not need manual cleanup for expired pickup opportunities.

### Manager calendar parity
Direction requested: upgrade manager Student Workers availability view toward a true time-grid calendar (similar to Student Hours) and reduce current visual clutter.

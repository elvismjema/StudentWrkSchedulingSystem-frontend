# Implemented Stories And Acceptance Criteria

Last updated: April 18, 2026  
Scope source: merged `dev` work in frontend + backend repos, plus in-flight PRs called out separately.

## 1) Shipped Stories (Merged To `dev`)

### S-01 Student Dashboard (Mobile Shell)
Story: As a student, I can access core flows from a mobile-first shell so I can manage shifts on phone.

Acceptance Criteria:
- Given student mobile routes, when the app loads, then a mobile bottom navigation shell is rendered.
- Given navigation between student core pages, when I switch tabs, then shell context is preserved.
- Given dashboard load, when data is available, then I can see clock status, next shift, and open-shift preview.

### S-02 Student Hours Calendar View
Story: As a student, I can view my availability in a weekly calendar block grid.

Acceptance Criteria:
- Given Hours > My Availability, when Calendar mode is selected, then entries render as day/time blocks.
- Given class/available/unavailable blocks, when shown, then each type is visibly distinct.
- Given no entries for a slot, when grid renders, then empty slots remain available for interaction.

### S-03 Student Hours Week/Day Navigation
Story: As a student, I can navigate availability across current/past/future weeks and day focus.

Acceptance Criteria:
- Given week controls, when previous/next is tapped, then displayed week changes.
- Given Today control, when tapped, then week/day focus returns to current date.
- Given list mode day pills, when selecting a day, then only selected day content is active.

### S-04 Student Hours Cleanup (Debug + Dot Noise)
Story: As a student, the Hours page is cleaner and production-safe.

Acceptance Criteria:
- Given production Hours UI, when page loads, then debug and manual class-sync controls are not shown.
- Given day pills in list mode, when rendered, then red dot indicators are removed.
- Given class data exists, when calendar is visible, then class visibility still comes from class blocks.

### S-05 Class-Sync Reliability
Story: As a student, class schedule sync writes stable locked availability blocks.

Acceptance Criteria:
- Given class sync runs, when classes exist, then locked class-schedule availability blocks are created/updated.
- Given repeated sync with same source data, when rerun, then duplicate class blocks are not created.
- Given stale session userId shape, when sync endpoints run, then user is resolved safely from auth/session context.

### S-06 Open Shifts Visibility Filter
Story: As a student, I only see pickup opportunities I can actually work.

Acceptance Criteria:
- Given shift conflicts with my unavailable/class/time-off windows, when open shifts are fetched, then it is excluded.
- Given no conflicts, when open shifts load, then eligible shifts remain visible.
- Given dashboard open-shift count, when preview is rendered, then count matches filtered results.

### S-07 Cover-Approved Shifts Included In Open Pool
Story: As a student, I can see shifts that were manager-approved for cover and posted open.

Acceptance Criteria:
- Given a shift is in cover-approved open state, when open-shifts query runs, then it appears in pickup list.
- Given shift is no longer eligible, when query runs, then it is excluded.

### S-08 Clock-In Department Edge Case Fix
Story: As a student/worker, my own assigned shift remains clock-in visible even with active-department mismatch.

Acceptance Criteria:
- Given my own assigned shifts query, when backend applies filters, then active-department filter does not hide my shift.
- Given non-self scoped queries, when backend applies filters, then department scoping still applies.

### S-09 Manager Approvals Pending-Only Consolidation
Story: As a manager, I can review pending approvals without duplicate approval surfaces.

Acceptance Criteria:
- Given manager approvals page, when loaded, then pending actions are grouped by actionable type.
- Given no pending items in a section, when rendered, then an empty-state is shown.
- Given duplicate open-shift-claims path, when consolidation landed, then approvals flow uses canonical swap-requests path.

### S-10 Manager Approvals Visual Polish
Story: As a manager, approvals page has cleaner hierarchy for quick actioning.

Acceptance Criteria:
- Given pending approvals view, when rendered, then section hierarchy and cards are clearer for scan/read.
- Given action buttons and states, when used, then feedback and list refresh stay coherent.

### S-11 Manager Student Workers Readability Upgrade
Story: As a manager, I can scan worker availability without dense raw text.

Acceptance Criteria:
- Given student workers page, when cards render, then weekly availability is shown in structured visual blocks.
- Given worker details modal, when opened, then availability/class schedule sections are separated and readable.
- Given high per-day slot count, when preview overflows, then overflow indicators (e.g., “+N more”) are shown.

### S-12 Manager Assignable Worker Filtering (Create Shift)
Story: As a manager, worker options in create-shift are pre-filtered by eligibility.

Acceptance Criteria:
- Given date/time/department inputs, when assignable-worker query runs, then conflicting workers are excluded.
- Given position selection, when query includes position, then only qualified workers are returned.
- Given form input changes, when manager edits shift parameters, then candidate list is refreshed.

### S-13 Notification Self-Scope Hardening
Story: As a user, notification API calls and links do not break due to redundant/mismatched userId query assumptions.

Acceptance Criteria:
- Given self-scoped notifications endpoints, when frontend calls API, then unnecessary userId query args are not sent.
- Given notification deep links across roles, when route is invalid for role, then fallback routes stay valid.

### S-14 Legacy Backend Surface Cleanup
Story: As maintainers, request approval logic uses one canonical backend model path.

Acceptance Criteria:
- Given legacy orphan `shift_trade` surface, when refactor merged, then dead model/controller/routes are removed.
- Given manager approvals API usage, when reviewed, then duplicate open-shift-claims flow is not required.

## 2) In-Flight (Not Yet Merged To `dev`)

### I-01 Open Shift Auto-Expiry + Pickup Hardening
Branch/PR:
- Backend: `fix/open-shifts-cover-approved-query`
- PR: https://github.com/elvismjema/StudentWrkSchedulingSystem-backend/pull/122

Story: As a student, expired open shifts disappear automatically and pickup does not fail on valid open states.

Acceptance Criteria:
- Given shift end time is in the past, when open shifts or dashboard preview load, then the shift is excluded.
- Given open shift claim path cannot find an expected cover-request row, when the shift is otherwise open, then pickup falls back to normal request creation instead of 500.

### I-02 Remove Standalone Trade Board
Branch/PR:
- Frontend: `chore/remove-trade-board`
- PR: https://github.com/elvismjema/StudentWrkSchedulingSystem-frontend/pull/216

Story: As a student, I don’t have a redundant Trade Board page; swap/pickup actions live in schedule/dashboard.

Acceptance Criteria:
- Given student primary nav, when app loads, then Trade tab/menu item is removed.
- Given legacy `/student/trade-board` URL, when opened, then it redirects to `/student/schedule`.
- Given student notification fallback to manager approvals, when opened, then fallback route resolves to student schedule.

## 3) Logic Decisions Confirmed

### D-01 Pickup expiration behavior
- Open shifts should auto-expire by backend datetime filtering.
- Manager should not manually remove already-ended pickup opportunities.

### D-02 Trade Board product direction
- Standalone Trade Board is being removed.
- Cover/pickup/swap actions should be embedded in schedule/dashboard flows.

### D-03 Manager calendar parity direction
- Student-workers availability should continue moving from pill clutter to true time-grid calendar readability (same visual grammar as Student Hours).

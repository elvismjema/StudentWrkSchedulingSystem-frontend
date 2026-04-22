# Shift Assignment — Manager Flow

How the manager-side "assign a worker to a shift" flow works, end-to-end.
This covers the UX contract, the eligibility rules, and the division of work
between frontend and backend.

---

## Manager mental model (UX goal)

A manager should be able to:

1. Pick a **date and time window** → immediately see everyone in the
   department who is actually free in that window. Not who _might_ be free
   once you narrow by position — who is free, full stop.
2. Pick a **position** → the list narrows to the subset of those free
   workers who are assigned to that position.
3. Assign.

Two actions. All the filtering rules happen in the background.

This is intentionally different from a single "position-gated" flow. When a
manager is still deciding which position to schedule, they should be able to
see the time window's occupancy first, then pick position with full
information.

---

## Two-step flow on the frontend

### Step 1 — Time window → department-wide eligible list

As soon as `department_id + shift_date + start_time + end_time` are all set,
the frontend calls:

```
GET /shifts/assignable-workers
    ?department_id=<id>
    &shift_date=YYYY-MM-DD
    &start_time=HH:MM
    &end_time=HH:MM
    [&exclude_shift_id=<id>]   // edit flow only
```

**Note: `position_id` is intentionally omitted from this request.**

The backend returns every worker in the department who passes the eligibility
rules (see below). The response includes each worker's `position_id` and
`position_name` so the frontend can narrow client-side in Step 2 without
another round-trip.

### Step 2 — Position → client-side narrowing

When the manager picks a position, the already-fetched list is filtered
client-side:

```js
workers.filter(w => w.position_id === selectedPositionId)
```

No network request. Instant feedback. Position switching is free.

If the manager had a worker pre-selected and then switches position, the
selection is cleared if the worker is no longer in the narrowed set, so the
manager is forced to pick from the correct list.

### Save guard (revalidation before submit)

Right before create/update fires, the frontend re-calls
`/shifts/assignable-workers` with the full set of params (including
`position_id`) and verifies the selected worker is still in the returned
list. If not, save is blocked and the dropdown is reloaded so the manager
picks again.

This protects against a narrow race: manager fills the form, someone else
modifies an overlapping shift or the worker flips their availability, then
manager clicks save.

### Where this lives

- `src/views/ShiftManagement.vue` — main manager schedule page (create +
  edit dialogs)
- `src/components/CreateShiftModal.vue` — modal entry point from other
  screens
- `src/views/ManagerCreateShift.vue` — dedicated create-shift page
- `src/services/shiftService.js` — the `getAssignableWorkers()` helper

All three entry points use the same Step 1 / Step 2 pattern for consistency.

---

## Eligibility rules (enforced by the backend)

`GET /shifts/assignable-workers` returns workers who pass **all** of these.
Rules are checked in this order by `validateAssignmentEligibility` in
`app/controllers/shift.controller.js`:

| # | Rule                                            | Validator                             |
|---|-------------------------------------------------|---------------------------------------|
| 1 | Worker is a member of the department (and the given position if one is supplied) | `validateDepartmentMembership`        |
| 2 | Worker has no overlapping existing assigned shift | `validateNoAssignedShiftOverlap`      |
| 3 | Worker is not on approved time-off for the date | `validateApprovedTimeOffCoverage`     |
| 4 | Worker has no class scheduled during the window | `validateClassScheduleConflict`       |
| 5 | Worker has not marked themselves unavailable for the window | `validateNoUnavailableConflicts`      |

Plus a sixth, department-level gate:

| 6 | Buffer time between shifts meets department minimum | `validateBufferTime`                 |

The buffer time check respects `exclude_shift_id` so editing a shift does
not count that shift against its own assigned worker.

### What "unavailable" means (rule 5)

The availability table stores both approved and pending unavailability
requests. Both count as blocking here — even a pending request prevents
assignment, because a manager assigning a worker over their own pending
request is the problematic case.

### What happens if `position_id` IS provided

The endpoint accepts optional `position_id`. If supplied, rule 1 additionally
requires the worker to be assigned to that specific position. The frontend
uses this only for the save guard (final check), not the initial fetch.

---

## API contract

### Request

`GET /shifts/assignable-workers`

| Param              | Type    | Required | Notes                                                         |
|--------------------|---------|----------|---------------------------------------------------------------|
| `department_id`    | number  | yes      | Scope of the search                                           |
| `shift_date`       | string  | yes      | `YYYY-MM-DD`                                                  |
| `start_time`       | string  | yes      | `HH:MM` 24h                                                   |
| `end_time`         | string  | yes      | `HH:MM` 24h                                                   |
| `position_id`      | number  | no       | If provided, filters to workers assigned to this position     |
| `exclude_shift_id` | number  | no       | Shift being edited; excluded from self-overlap checks         |

Auth: `verifyToken + requireManager + requireDepartmentManager`. The caller
is always filtered out of the response.

### Response

```json
{
  "data": [
    {
      "id": 42,
      "userId": 42,
      "fName": "Jane",
      "lName": "Doe",
      "email": "jane@example.edu",
      "position_id": 7,
      "position_name": "Front Desk"
    }
  ]
}
```

`position_id` and `position_name` MUST be included for the client-side Step 2
narrowing to work.

### Errors

- `400` — missing required param (`department_id`, `shift_date`,
  `start_time`, `end_time`)
- `500` — upstream error; frontend surfaces `error.response.data.message`

---

## Why backend is the final authority

Frontend filtering is an aid to the manager, not a security boundary. Even
if the frontend has stale state or is bypassed entirely, `POST /shifts` and
`PUT /shifts/:id` re-run `validateAssignmentEligibility` before persisting.
An invalid assignment cannot be saved. The frontend filter is just to keep
the manager from seeing invalid options in the first place.

---

## Related files

Frontend:
- `src/views/ShiftManagement.vue`
- `src/components/CreateShiftModal.vue`
- `src/views/ManagerCreateShift.vue`
- `src/services/shiftService.js`

Backend:
- `app/controllers/shift.controller.js` (`listAssignableWorkers`,
  `validateAssignmentEligibility`, `validateBufferTime`)
- `app/routes/shift.routes.js`
- `__tests__/controllers/shift.assignment-validation.tests.js`
- `__tests__/integration/shiftAssignment.tests.js`

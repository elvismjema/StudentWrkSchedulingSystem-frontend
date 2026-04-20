/**
 * useClockWindow
 * -------------------------------------------------------------
 * Pure helpers for deciding whether a student is clocking in/out
 * within their scheduled shift window.
 *
 * Policy (decided with product on 2026-04-19):
 *   - Shift starts within \u00b115 min of now \u2192 on-schedule clock-in.
 *   - Shift ends   within \u00b115 min of now \u2192 on-schedule clock-out.
 *   - Anything else \u2192 off-schedule. UI should warn the student and
 *     the clock record should carry an off_schedule flag so the
 *     manager can see it in approvals.
 *
 * The helpers are intentionally tiny + pure so they\u2019re trivial to
 * unit-test and reuse from both /student/clock and /student/dashboard.
 */

const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * Build a Date from a shift\u2019s date + time field, tolerating a few
 * shapes (backend mostly sends `shift_date` + `start_time|end_time`).
 */
function buildDT(shift, field) {
  if (!shift) return null;
  const time = shift[field];
  if (!time) return null;
  // Already a full datetime
  if (typeof time === 'string' && (time.includes('T') || (time.includes('-') && time.length > 10))) {
    const d = new Date(time);
    return isNaN(d) ? null : d;
  }
  const date = shift.shift_date || shift.date;
  if (!date) return null;
  const d = new Date(String(date).slice(0, 10) + 'T' + time);
  return isNaN(d) ? null : d;
}

/**
 * Is `now` within \u00b115 min of the shift\u2019s scheduled `start_time`?
 * Returns false (off-schedule) when the shift is missing or the
 * datetime can\u2019t be parsed \u2014 the UI warns in that case.
 */
export function isWithinClockInWindow(shift, now = Date.now()) {
  const start = buildDT(shift, 'start_time');
  if (!start) return false;
  return Math.abs(start.getTime() - now) <= FIFTEEN_MIN;
}

/**
 * Is `now` within \u00b115 min of the shift\u2019s scheduled `end_time`?
 */
export function isWithinClockOutWindow(shift, now = Date.now()) {
  const end = buildDT(shift, 'end_time');
  if (!end) return false;
  return Math.abs(end.getTime() - now) <= FIFTEEN_MIN;
}

/**
 * Given the student\u2019s clock state and their shifts, return the
 * decision object the UI needs to render the right dialog.
 *
 * @param {object} ctx
 * @param {'in'|'out'} ctx.action
 * @param {object|null} ctx.activeShift  \u2014 the shift in play right now
 *   (for clock-in this is usually the upcoming/current one; for
 *   clock-out it\u2019s the shift tied to the open clock record)
 * @param {number} [ctx.now]
 * @returns {{ offSchedule: boolean, shift: object|null, reason: string }}
 */
export function evaluateClockAction({ action, activeShift, now = Date.now() }) {
  if (action === 'in') {
    const onWindow = isWithinClockInWindow(activeShift, now);
    return {
      offSchedule: !onWindow,
      shift: activeShift || null,
      reason: onWindow ? '' : 'No scheduled shift within 15 minutes of now',
    };
  }
  if (action === 'out') {
    const onWindow = isWithinClockOutWindow(activeShift, now);
    return {
      offSchedule: !onWindow,
      shift: activeShift || null,
      reason: onWindow ? '' : 'Clocking out more than 15 minutes from scheduled end',
    };
  }
  return { offSchedule: true, shift: null, reason: 'Unknown action' };
}

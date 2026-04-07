/**
 * Shared shift date/time helpers.
 *
 * The backend returns `shift_date` (YYYY-MM-DD) and `start_time` / `end_time`
 * (HH:mm:ss) as separate fields.  These helpers combine them into full
 * datetime strings that `new Date()` can parse reliably.
 */

/** Combine separate shift_date + time fields into a parseable datetime string */
export function buildDateTime(shift, timeField) {
  const time = shift[timeField];
  if (!time) return null;
  // Handle Date objects
  if (time instanceof Date) return time.toISOString();
  // If time is already a full datetime (contains 'T' or '-'), use as-is
  if (typeof time === "string" && (time.includes("T") || (time.includes("-") && time.length > 10))) return time;
  // Bare time — combine with shift_date
  const date = shift.shift_date || shift.date;
  if (date) {
    const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
    return dateStr + "T" + time;
  }
  return null;
}

export function shiftStartDT(shift) {
  return buildDateTime(shift, "start_time") || buildDateTime(shift, "startTime") || shift.start_time || shift.startTime || shift.shift_start;
}

export function shiftEndDT(shift) {
  return buildDateTime(shift, "end_time") || buildDateTime(shift, "endTime") || shift.end_time || shift.endTime || shift.shift_end;
}

export function shiftDateStr(shift) {
  return shift.shift_date || shift.date || shift.start_time || shift.shift_start;
}

export function formatTimeRange(shift) {
  if (!shift) return "";
  const fmt = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  return `${fmt(shiftStartDT(shift))} – ${fmt(shiftEndDT(shift))}`;
}

export function formatShiftDate(dateStr) {
  if (!dateStr) return "";
  const d = dateStr instanceof Date ? dateStr : new Date(typeof dateStr === "string" && dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

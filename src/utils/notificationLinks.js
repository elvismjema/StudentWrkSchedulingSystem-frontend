const normalizeRole = (role = "") => {
  const normalized = String(role).trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "manager") return "manager";
  return "student";
};

const isExternalLink = (link = "") => /^(https?:)?\/\//i.test(link) || /^mailto:|^tel:/i.test(link);

const getScheduleRoute = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "manager" || normalized === "admin"
    ? "/manager/schedule"
    : "/student/schedule";
};

const getApprovalsRoute = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "manager" || normalized === "admin"
    ? "/manager/approvals"
    : "/student/schedule";
};

const byTypeFallback = (type, role) => {
  const normalizedType = String(type || "").toLowerCase();

  if (["shift_assignment", "shift_change", "shift_cancellation", "shift_reassignment", "shift_reminder"].includes(normalizedType)) {
    return getScheduleRoute(role);
  }

  if (["coverage_gap", "availability_conflict", "schedule_published"].includes(normalizedType)) {
    return getScheduleRoute(role);
  }

  return null;
};

export const resolveNotificationLink = (notification, role) => {
  const rawLink = String(notification?.link || "").trim();

  if (!rawLink) {
    return byTypeFallback(notification?.type, role);
  }

  if (isExternalLink(rawLink)) {
    return rawLink;
  }

  // Fully-qualified in-app routes are preferred as-is.
  if (rawLink.startsWith("/student/") || rawLink.startsWith("/manager/") || rawLink.startsWith("/admin/")) {
    if (rawLink.startsWith("/student/") && normalizeRole(role) !== "student") {
      // Keep manager/admin users inside their app shell.
      if (rawLink.includes("/schedule")) return "/manager/schedule";
      return byTypeFallback(notification?.type, role);
    }
    if (rawLink.startsWith("/manager/") && normalizeRole(role) === "student") {
      if (rawLink.includes("/approvals")) return "/student/schedule";
      return byTypeFallback(notification?.type, role);
    }
    return rawLink;
  }

  // Legacy or partial routes emitted by backend services.
  if (/^\/schedule(\/|$)/.test(rawLink)) {
    return getScheduleRoute(role);
  }

  if (/^\/shifts\//.test(rawLink)) {
    return getScheduleRoute(role);
  }

  if (/^\/swap-requests\//.test(rawLink)) {
    return getApprovalsRoute(role);
  }

  if (/^\/approvals(\/|$)/.test(rawLink)) {
    return getApprovalsRoute(role);
  }

  if (rawLink.startsWith("/")) {
    return rawLink;
  }

  return byTypeFallback(notification?.type, role);
};

export const isExternalNotificationLink = (link = "") => isExternalLink(link);
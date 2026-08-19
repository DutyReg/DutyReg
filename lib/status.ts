import type { AttendanceStatus } from "@/lib/types";

/**
 * Toggle button model for marking attendance: a click sets the clicked
 * status to active (1); clicking the already-active button clears it back
 * to the zero state (0 = "not marked", persisted as `unknown`).
 */
export function toggleStatus(
  current: AttendanceStatus,
  clicked: Exclude<AttendanceStatus, "unknown">,
): AttendanceStatus {
  return current === clicked ? "unknown" : clicked;
}

/**
 * Global late rule: a recorded in-time later than the company's shift start
 * counts as present-but-late. Only applies while the row is present/late —
 * absent and not-marked rows are left untouched.
 *
 * Times are compared as zero-padded "HH:MM" strings (24h), which sorts
 * correctly.
 */
export function applyLateRule(
  status: AttendanceStatus,
  inTime: string | null,
  startTime: string | null,
): AttendanceStatus {
  if (status !== "present" && status !== "late") return status;
  if (!inTime || !startTime) return status;

  const inMin = inTime.slice(0, 5);
  const startMin = startTime.slice(0, 5);
  if (inMin === startMin) return "present";
  return inMin > startMin ? "late" : "present";
}

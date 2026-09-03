import type { AttendanceStatus, Role } from "@/lib/types";

export const ROLES = ["owner", "supervisor", "viewer"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  supervisor: "Supervisor",
  viewer: "Viewer",
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  unknown: "Not marked",
};

export const TIME_ZONE = "Asia/Colombo";
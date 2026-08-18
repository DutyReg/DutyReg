import type { Role } from "@/lib/types";

type Permission =
  | "manage_company"
  | "manage_sites"
  | "manage_workers"
  | "manage_members"
  | "edit_attendance"
  | "view_reports"
  | "share_reports";

export const PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "manage_company",
    "manage_sites",
    "manage_workers",
    "manage_members",
    "edit_attendance",
    "view_reports",
    "share_reports",
  ],
  supervisor: ["edit_attendance", "view_reports", "share_reports"],
  viewer: ["view_reports", "share_reports"],
};

export function can(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(permission);
}

export function canEditAttendance(role: Role | null): boolean {
  return can(role, "edit_attendance");
}

export function isOwner(role: Role | null): boolean {
  return role === "owner";
}
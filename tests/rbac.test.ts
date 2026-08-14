import { describe, expect, it } from "vitest";

import { can, canEditAttendance, isOwner, nextStatus, PERMISSIONS } from "@/lib/rbac";

describe("PERMISSIONS matrix", () => {
  it("owner manages everything", () => {
    const perms = PERMISSIONS.owner;
    expect(perms).toContain("manage_company");
    expect(perms).toContain("manage_sites");
    expect(perms).toContain("manage_workers");
    expect(perms).toContain("manage_members");
    expect(perms).toContain("edit_attendance");
    expect(perms).toContain("view_reports");
  });

  it("supervisor edits attendance but not settings", () => {
    expect(canEditAttendance("supervisor")).toBe(true);
    expect(can("supervisor", "manage_sites")).toBe(false);
    expect(can("supervisor", "manage_members")).toBe(false);
    expect(can("supervisor", "view_reports")).toBe(true);
  });

  it("viewer is read-only", () => {
    expect(canEditAttendance("viewer")).toBe(false);
    expect(can("viewer", "view_reports")).toBe(true);
    expect(can("viewer", "share_reports")).toBe(true);
    expect(can("viewer", "manage_company")).toBe(false);
  });

  it("rejects null roles", () => {
    expect(canEditAttendance(null)).toBe(false);
    expect(isOwner(null)).toBe(false);
    expect(can(null, "view_reports")).toBe(false);
  });
});

describe("nextStatus cycle", () => {
  it("cycles present -> absent -> unknown -> present", () => {
    expect(nextStatus("present")).toBe("absent");
    expect(nextStatus("absent")).toBe("unknown");
    expect(nextStatus("unknown")).toBe("present");
  });
});
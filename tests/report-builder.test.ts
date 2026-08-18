import { describe, expect, it } from "vitest";

import {
  buildReportText,
  countStatuses,
  whatsAppLink,
  type ReportData,
} from "@/lib/report-builder";

const baseReport: ReportData = {
  company_name: "Sunrise Cleaning",
  site_name: "Colombo Main Site",
  sheet_date: "2026-08-13",
  rows: [
    { worker_name: "Nimal Perera", worker_code: "W001", status: "present", in_time: "08:00", out_time: "16:30", note: null },
    { worker_name: "Kumari Silva", worker_code: null, status: "absent", in_time: null, out_time: null, note: "Left early" },
    { worker_name: "Ruwan Fernando", worker_code: "W003", status: "late", in_time: "08:45", out_time: "17:00", note: null },
    { worker_name: "Chamara Jayasuriya", worker_code: "W004", status: "unknown", in_time: null, out_time: null, note: null },
  ],
  updated_at: "14:05",
  updated_by_name: "Kasun",
};

describe("buildReportText", () => {
  it("includes the header lines with company, site and date", () => {
    const text = buildReportText(baseReport);
    expect(text).toContain("DayMark Attendance Report");
    expect(text).toContain("Company: Sunrise Cleaning");
    expect(text).toContain("Site: Colombo Main Site");
    expect(text).toContain("Date: 2026-08-13");
  });

  it("counts statuses correctly", () => {
    const text = buildReportText(baseReport);
    expect(text).toContain("Present: 1 | Absent: 1 | Late: 1");
  });

  it("lists workers in order with status and time", () => {
    const text = buildReportText(baseReport);
    expect(text).toContain("1. Nimal Perera (W001) — Present In 08:00, Out 16:30");
    expect(text).toContain("2. Kumari Silva — Absent — Left early");
    expect(text).toContain("3. Ruwan Fernando (W003) — Late In 08:45, Out 17:00");
    expect(text).toContain("4. Chamara Jayasuriya (W004) — Not marked");
  });

  it("appends last-updated attribution", () => {
    const text = buildReportText(baseReport);
    expect(text).toContain("Last updated: 14:05 by Kasun");
  });

  it("handles long worker names without breaking", () => {
    const longName = "Dilani Wickramasinghe Abeykoon Fernando Perera".repeat(2);
    const report = { ...baseReport, rows: [{ ...baseReport.rows[0], worker_name: longName }] };
    const text = buildReportText(report);
    expect(text).toContain(longName);
  });

  it("handles an empty worker list", () => {
    const text = buildReportText({ ...baseReport, rows: [] });
    expect(text).toContain("Present: 0 | Absent: 0 | Late: 0");
  });

  it("omits last-updated line when there is no update", () => {
    const report = { ...baseReport, updated_at: null, updated_by_name: null };
    const text = buildReportText(report);
    expect(text).not.toContain("Last updated");
  });
});

describe("countStatuses", () => {
  it("counts only known statuses", () => {
    const counts = countStatuses([
      { status: "present" },
      { status: "present" },
      { status: "absent" },
      { status: "late" },
      { status: "unknown" },
    ]);
    expect(counts).toEqual({ present: 2, absent: 1, late: 1, unknown: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(countStatuses([])).toEqual({ present: 0, absent: 0, late: 0, unknown: 0 });
  });
});

describe("whatsAppLink", () => {
  it("encodes the text and targets wa.me", () => {
    const link = whatsAppLink("Hello World & friends");
    expect(link).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(link)).toContain("Hello World & friends");
  });
});
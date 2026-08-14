import { describe, expect, it } from "vitest";

import {
  formatColomboClock,
  formatSheetDate,
  parseSheetDate,
  safeDate,
  shiftDay,
  todayInColombo,
} from "@/lib/date";

describe("todayInColombo", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayInColombo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("converts a UTC timestamp near midnight correctly (SL is UTC+5:30)", () => {
    // 2026-08-13T18:30:00Z = 2026-08-14 00:00 in Colombo
    const date = new Date("2026-08-13T18:30:00.000Z");
    expect(todayInColombo(date)).toBe("2026-08-14");
  });

  it("keeps an early morning UTC timestamp on the same Colombo date", () => {
    // 2026-08-13T00:00:00Z = 2026-08-13 05:30 in Colombo
    const date = new Date("2026-08-13T00:00:00.000Z");
    expect(todayInColombo(date)).toBe("2026-08-13");
  });
});

describe("safeDate", () => {
  it("accepts a valid date", () => {
    expect(safeDate("2026-08-13")).toBe("2026-08-13");
  });

  it("rejects malformed input and falls back to today", () => {
    expect(safeDate("not-a-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(safeDate("2026-13-99")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(safeDate(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shiftDay", () => {
  it("moves forward and backward across month boundaries", () => {
    expect(shiftDay("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("formatSheetDate", () => {
  it("formats a sheet date without timezone drift", () => {
    expect(formatSheetDate("2026-08-13")).toContain("2026");
    expect(formatSheetDate("2026-08-13")).toContain("Aug");
  });
});

describe("parseSheetDate", () => {
  it("parses to UTC noon so formatting never shifts the day", () => {
    const parsed = parseSheetDate("2026-08-13");
    expect(parsed.toISOString().startsWith("2026-08-13")).toBe(true);
  });
});

describe("formatColomboClock", () => {
  it("truncates HH:MM:SS to HH:MM", () => {
    expect(formatColomboClock("08:05:42")).toBe("08:05");
    expect(formatColomboClock(null)).toBe("–");
  });
});
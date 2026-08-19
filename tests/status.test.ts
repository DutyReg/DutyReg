import { describe, expect, it } from "vitest";

import { applyLateRule, toggleStatus } from "@/lib/status";

describe("toggleStatus", () => {
  it("activates a status when nothing is marked", () => {
    expect(toggleStatus("unknown", "present")).toBe("present");
    expect(toggleStatus("unknown", "absent")).toBe("absent");
    expect(toggleStatus("unknown", "late")).toBe("late");
  });

  it("switches between statuses", () => {
    expect(toggleStatus("present", "absent")).toBe("absent");
    expect(toggleStatus("present", "late")).toBe("late");
    expect(toggleStatus("absent", "present")).toBe("present");
  });

  it("clears back to not-marked when the active button is clicked again", () => {
    expect(toggleStatus("present", "present")).toBe("unknown");
    expect(toggleStatus("absent", "absent")).toBe("unknown");
    expect(toggleStatus("late", "late")).toBe("unknown");
  });
});

describe("applyLateRule", () => {
  const start = "08:00";

  it("marks present-but-late when in-time is after the start time", () => {
    expect(applyLateRule("present", "08:45", start)).toBe("late");
    expect(applyLateRule("late", "10:15", start)).toBe("late");
  });

  it("keeps present when in-time is on or before the start time", () => {
    expect(applyLateRule("present", "08:00", start)).toBe("present");
    expect(applyLateRule("present", "07:55", start)).toBe("present");
    expect(applyLateRule("late", "07:30", start)).toBe("present");
  });

  it("leaves absent and not-marked rows untouched", () => {
    expect(applyLateRule("absent", "09:00", start)).toBe("absent");
    expect(applyLateRule("unknown", "09:00", start)).toBe("unknown");
  });

  it("returns the status unchanged when there is no in-time or start time", () => {
    expect(applyLateRule("present", null, start)).toBe("present");
    expect(applyLateRule("present", "09:00", null)).toBe("present");
    expect(applyLateRule("present", "", start)).toBe("present");
  });
});

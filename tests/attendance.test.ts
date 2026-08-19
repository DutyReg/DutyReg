import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase, asSupabaseClient, type FakeSupabaseClient } from "@/tests/helpers/fake-supabase";
import type { AttendanceEntry, AttendanceSheet, Worker } from "@/lib/types";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getOrCreateSheet } from "@/lib/attendance";

const sheet: AttendanceSheet = {
  id: "s1",
  company_id: "c1",
  site_id: "site1",
  sheet_date: "2026-08-13",
  status: "open",
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-08-13T04:00:00.000Z",
  updated_at: "2026-08-13T04:00:00.000Z",
};

const workers: Worker[] = [
  {
    id: "w1",
    company_id: "c1",
    site_id: "site1",
    name: "Nimal Perera",
    worker_code: "W001",
    active: true,
    created_at: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "w2",
    company_id: "c1",
    site_id: null,
    name: "Kumari Silva",
    worker_code: null,
    active: true,
    created_at: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "w3",
    company_id: "c1",
    site_id: "site1",
    name: "Ruwan Fernando",
    worker_code: "W003",
    active: true,
    created_at: "2026-08-01T00:00:00.000Z",
  },
];

const entryFor = (workerId: string, status: string): AttendanceEntry => ({
  id: `e-${workerId}`,
  sheet_id: "s1",
  worker_id: workerId,
  status: status as AttendanceEntry["status"],
  in_time: null,
  out_time: null,
  note: null,
  updated_at: "2026-08-13T04:00:00.000Z",
});

let client: FakeSupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  client = fakeSupabase();
  vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));
});

describe("getOrCreateSheet", () => {
  it("returns the existing sheet with entries sorted in worker order, backfilling missing rows", async () => {
    // Entries arrive out of order; w2 has no entry yet.
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: sheet }],
        workers: [{ data: workers }],
        attendance_entries: [
          { data: [entryFor("w3", "present"), entryFor("w1", "absent")] },
          { data: [entryFor("w2", "unknown")] },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sheet).toBe(sheet);
    expect(result.data.workers).toBe(workers);
    expect(result.data.entries.map((e) => e.worker_id)).toEqual(["w1", "w2", "w3"]);

    const backfill = client.history.find(
      (c) => c.table === "attendance_entries" && c.method === "insert",
    );
    expect(backfill).toBeDefined();
    expect(backfill?.args[0]).toEqual([
      {
        sheet_id: "s1",
        worker_id: "w2",
        status: "unknown",
        updated_at: expect.any(String),
      },
    ]);
  });

  it("creates a sheet when none exists and populates entries for all workers", async () => {
    const createdSheet = { ...sheet, id: "s2", created_at: "2026-08-13T05:00:00.000Z" };
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: null }, { data: createdSheet }],
        sites: [{ data: { company_id: "c1" } }],
        workers: [{ data: workers }],
        attendance_entries: [{ data: [] }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sheet).toBe(createdSheet);
    expect(result.data.entries).toEqual([]);

    const sheetInsert = client.history.find(
      (c) => c.table === "attendance_sheets" && c.method === "insert",
    );
    expect(sheetInsert?.args[0]).toMatchObject({
      company_id: "c1",
      site_id: "site1",
      sheet_date: "2026-08-13",
      created_by: "u1",
      updated_by: "u1",
    });
  });

  it("reports an error when the site is not found", async () => {
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: null }],
        sites: [{ data: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("missing-site", "2026-08-13", "u1");
    expect(result).toEqual({ ok: false, error: "Site not found." });
  });

  it("reports an error when the insert fails without raising an error", async () => {
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: null }, { data: null, error: null }],
        sites: [{ data: { company_id: "c1" } }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");
    expect(result).toEqual({ ok: false, error: "Could not prepare the sheet." });
  });

  it("re-reads the sheet after a duplicate-insert race and uses the existing one", async () => {
    const existing = { ...sheet, id: "s-race" };
    client = fakeSupabase({
      tables: {
        attendance_sheets: [
          { data: null },
          { data: null, error: { message: "duplicate key value violates unique constraint" } },
          { data: existing },
        ],
        sites: [{ data: { company_id: "c1" } }],
        workers: [{ data: workers }],
        attendance_entries: [{ data: [] }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sheet).toBe(existing);
  });

  it("reports an error when the re-read after a race still finds nothing", async () => {
    client = fakeSupabase({
      tables: {
        attendance_sheets: [
          { data: null },
          { data: null, error: { message: "duplicate key value violates unique constraint" } },
          { data: null },
        ],
        sites: [{ data: { company_id: "c1" } }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");
    expect(result).toEqual({ ok: false, error: "Could not prepare the sheet." });
  });

  it("reports an error when workers or entries fail to load", async () => {
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: sheet }],
        workers: [{ data: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");
    expect(result).toEqual({ ok: false, error: "Could not load the sheet." });
  });

  it("queries the sheet scoped by site and date", async () => {
    client = fakeSupabase({
      tables: {
        attendance_sheets: [{ data: sheet }],
        workers: [{ data: workers }],
        attendance_entries: [{ data: [] }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    const result = await getOrCreateSheet("site1", "2026-08-13", "u1");
    expect(result.ok).toBe(true);
    expect(client.history).toContainEqual({ table: "attendance_sheets", method: "eq", args: ["site_id", "site1"] });
    expect(client.history).toContainEqual({ table: "attendance_sheets", method: "eq", args: ["sheet_date", "2026-08-13"] });
  });
});

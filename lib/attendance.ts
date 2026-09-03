import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceEntry,
  AttendanceSheet,
  Worker,
} from "@/lib/types";

type SheetBundle = {
  sheet: AttendanceSheet;
  workers: Worker[];
  entries: AttendanceEntry[];
};

/**
 * Server-side get-or-create for a day's sheet:
 * - one sheet per site per date (DB unique constraint backs this)
 * - entries exist for every active worker of the site (company-wide workers
 *   whose own site is unset, or matches the sheet's site)
 */
export async function getOrCreateSheet(
  siteId: string,
  sheetDate: string,
  userId: string,
): Promise<{ ok: true; data: SheetBundle } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("attendance_sheets")
    .select("*")
    .eq("site_id", siteId)
    .eq("sheet_date", sheetDate)
    .maybeSingle<AttendanceSheet>();

  if (!sheet) {
    const { data: site } = await supabase
      .from("sites")
      .select("company_id")
      .eq("id", siteId)
      .single<{ company_id: string }>();

    if (!site) return { ok: false, error: "Site not found." };

    const now = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from("attendance_sheets")
      .insert({
        company_id: site.company_id,
        site_id: siteId,
        sheet_date: sheetDate,
        created_by: userId,
        updated_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .maybeSingle<AttendanceSheet>();

    if (created) return populateEntries(created, siteId);

    if (!insertError) return { ok: false, error: "Could not prepare the sheet." };

    // Likely a duplicate-sheet race (another device saved first): re-read.
    const { data: existing } = await supabase
      .from("attendance_sheets")
      .select("*")
      .eq("site_id", siteId)
      .eq("sheet_date", sheetDate)
      .maybeSingle<AttendanceSheet>();

    if (!existing) return { ok: false, error: "Could not prepare the sheet." };
    return populateEntries(existing, siteId);
  }

  return populateEntries(sheet, siteId);
}

async function populateEntries(
  sheet: AttendanceSheet,
  siteId: string,
): Promise<{ ok: true; data: SheetBundle } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .eq("company_id", sheet.company_id)
    .eq("active", true)
    .or(`site_id.eq.${siteId},site_id.is.null`)
    .order("name")
    .returns<Worker[]>();

  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("*")
    .eq("sheet_id", sheet.id)
    .returns<AttendanceEntry[]>();

  if (!workers || !entries) return { ok: false, error: "Could not load the sheet." };

  const entryMap = new Map(entries.map((entry) => [entry.worker_id, entry]));
  const missing = workers.filter((worker) => !entryMap.has(worker.id));

  if (missing.length > 0) {
    const now = new Date().toISOString();
    const { data: inserted } = await supabase
      .from("attendance_entries")
      .insert(
        missing.map((worker) => ({
          sheet_id: sheet.id,
          worker_id: worker.id,
          status: "unknown",
          updated_at: now,
        })),
      )
      .select("*")
      .returns<AttendanceEntry[]>();

    if (inserted) entries.push(...inserted);
  }

  entries.sort(
    (a, b) =>
      workers.findIndex((w) => w.id === a.worker_id) -
      workers.findIndex((w) => w.id === b.worker_id),
  );

  return { ok: true, data: { sheet, workers, entries } };
}
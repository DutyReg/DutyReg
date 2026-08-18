import { redirect } from "next/navigation";

import { AttendanceSheetClient } from "@/components/attendance/sheet-client";
import { PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { getOrCreateSheet } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";
import { safeDate, formatSheetDate } from "@/lib/date";
import type { Site } from "@/lib/types";
import { canEditAttendance } from "@/lib/rbac";
import { STATUS_LABELS } from "@/lib/constants";

export const metadata = { title: "Mark attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; site?: string }>;
}) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");
  if (!canEditAttendance(ctx.role)) redirect("/dashboard");

  const params = await searchParams;
  const date = safeDate(params.date);
  const supabase = await createClient();

  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("company_id", ctx.company.id)
    .eq("active", true)
    .order("name")
    .returns<Site[]>();

  const siteList = sites ?? [];
  const requestedSite = siteList.find((s) => s.id === params.site);
  const site = requestedSite ?? siteList[0] ?? null;

  let bundle = null;
  if (site) {
    const result = await getOrCreateSheet(site.id, date, ctx.user.id);
    if (result.ok) bundle = result.data;
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Mark attendance"
        description={formatSheetDate(date)}
      />

      {!site || siteList.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          No active sites. Ask the owner to add one in Settings.
        </p>
      ) : (
        <AttendanceSheetClient
          sheetId={bundle?.sheet.id ?? ""}
          siteId={site.id}
          date={date}
          siteName={site.name}
          userId={ctx.user.id}
          sites={siteList.map((s) => ({ id: s.id, name: s.name }))}
          loadError={bundle ? null : "Could not prepare today's sheet. Check your connection and refresh."}
          workers={(bundle?.workers ?? []).map((w) => ({
            id: w.id,
            name: w.name,
            worker_code: w.worker_code,
          }))}
          initialEntries={(bundle?.entries ?? []).map((e) => ({
            entryId: e.id,
            workerId: e.worker_id,
            status: e.status,
            in_time: e.in_time?.slice(0, 5) ?? null,
            out_time: e.out_time?.slice(0, 5) ?? null,
            note: e.note,
          }))}
          statusLabels={STATUS_LABELS}
          defaultInTime={ctx.company.start_time?.slice(0, 5) ?? null}
          defaultOutTime={ctx.company.end_time?.slice(0, 5) ?? null}
        />
      )}
    </div>
  );
}
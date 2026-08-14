import Link from "next/link";
import { redirect } from "next/navigation";

import { ReportShare } from "@/components/report-share";
import { Card, Chip, EmptyState, PageHeader, Select } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  countStatuses,
  type ReportData,
  type ReportRow,
} from "@/lib/report-builder";
import { formatColomboClock, formatSheetDate, formatTime, safeDate, shiftDay, todayInColombo } from "@/lib/date";
import type { AttendanceEntry, AttendanceSheet, Site, Worker } from "@/lib/types";
import { canEditAttendance } from "@/lib/rbac";

export const metadata = { title: "Today" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; site?: string }>;
}) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");

  const params = await searchParams;
  const date = safeDate(params.date);
  const today = todayInColombo();
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

  let sheet: AttendanceSheet | null = null;
  let entries: AttendanceEntry[] = [];
  let workers: Worker[] = [];
  let updatedByName: string | null = null;

  if (site) {
    const { data: sheetData } = await supabase
      .from("attendance_sheets")
      .select("*")
      .eq("site_id", site.id)
      .eq("sheet_date", date)
      .maybeSingle<AttendanceSheet>();
    sheet = sheetData ?? null;

    if (sheet) {
      const [entriesResult, workersResult, profileResult] = await Promise.all([
        supabase
          .from("attendance_entries")
          .select("*")
          .eq("sheet_id", sheet.id)
          .returns<AttendanceEntry[]>(),
        supabase
          .from("workers")
          .select("*")
          .eq("company_id", ctx.company.id)
          .eq("active", true)
          .or(`site_id.eq.${site.id},site_id.is.null`)
          .order("name")
          .returns<Worker[]>(),
        sheet.updated_by
          ? supabase
              .from("profiles")
              .select("full_name")
              .eq("id", sheet.updated_by)
              .maybeSingle<{ full_name: string | null }>()
          : Promise.resolve({ data: null }),
      ]);
      entries = entriesResult.data ?? [];
      workers = workersResult.data ?? [];
      updatedByName = profileResult.data?.full_name ?? null;
    }
  }

  const counts = countStatuses(entries);
  const entryByWorker = new Map(entries.map((entry) => [entry.worker_id, entry]));

  const rows: ReportRow[] = workers.map((worker) => {
    const entry = entryByWorker.get(worker.id);
    return {
      worker_name: worker.name,
      worker_code: worker.worker_code,
      status: entry?.status ?? "unknown",
      in_time: entry?.in_time ? formatColomboClock(entry.in_time) : null,
      out_time: entry?.out_time ? formatColomboClock(entry.out_time) : null,
      note: entry?.note ?? null,
    };
  });

  const report: ReportData = {
    company_name: ctx.company.name,
    site_name: site?.name ?? "",
    sheet_date: date,
    rows,
    updated_at: sheet ? formatTime(sheet.updated_at) : null,
    updated_by_name: updatedByName,
  };

  const editable = canEditAttendance(ctx.role);
  const prevDay = shiftDay(date, -1);
  const nextDay = shiftDay(date, 1);
  const isToday = date === today;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={isToday ? "Today at a glance" : formatSheetDate(date)}
        description={site ? `Site: ${site.name}` : "No active sites yet"}
        action={
          <Chip tone={isToday ? "positive" : "neutral"}>{isToday ? "Today" : "Past day"}</Chip>
        }
      />

      {siteList.length > 1 ? (
        <form method="GET" action="/dashboard" className="grid gap-3">
          <input type="hidden" name="date" value={date} />
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Site</span>
            <Select name="site" defaultValue={site?.id} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
              {siteList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
        </form>
      ) : null}

      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard?date=${prevDay}&site=${site?.id ?? ""}`}
          aria-label="Previous day"
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors active:bg-zinc-100 dark:active:bg-zinc-800/70"
        >
          <ChevronLeftIcon />
        </Link>
        <p className="flex-1 text-center font-mono text-sm text-muted">{date}</p>
        {isToday ? (
          <span className="inline-flex size-11 items-center justify-center rounded-full text-muted" aria-hidden>
            <ChevronRightIcon />
          </span>
        ) : (
          <Link
            href={`/dashboard?date=${nextDay}&site=${site?.id ?? ""}`}
            aria-label="Next day"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors active:bg-zinc-100 dark:active:bg-zinc-800/70"
          >
            <ChevronRightIcon />
          </Link>
        )}
      </div>

      {!site ? (
        <EmptyState
          title="No active sites"
          body="Ask the company owner to add a site in Settings before recording attendance."
          action={
            editable ? (
              <Link href="/settings/sites" className="mt-1 text-sm font-semibold text-ink underline decoration-primary decoration-2 underline-offset-2">
                Add a site
              </Link>
            ) : null
          }
        />
      ) : !sheet ? (
        <EmptyState
          title="No attendance recorded for this day"
          body="A sheet is created the first time someone opens it. Ask your supervisor to mark the day, or open this date on the Mark screen."
          action={
            editable ? (
              <Link
                href={`/attendance?date=${date}&site=${site.id}`}
                className="mt-2 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-inverse-text dark:bg-white dark:text-inverse-text"
              >
                Open & mark attendance
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Present" value={counts.present} tone="positive" />
            <SummaryCard label="Absent" value={counts.absent} tone="negative" />
            <SummaryCard label="Not marked" value={counts.unknown} tone="neutral" />
          </div>

          <Card>
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-ink">
                {rows.length} worker{rows.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted">
                Last updated: {report.updated_at ?? "–"}
                {updatedByName ? ` by ${updatedByName}` : ""}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <WorkerRow key={`${row.worker_name}-${row.worker_code}`} row={row} />
              ))}
            </ul>
          </Card>

          <Card className="px-4 py-5">
            <ReportShare report={report} canEdit={editable} />
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const styles = {
    positive: "text-present",
    negative: "text-absent",
    neutral: "text-ink",
  };
  return (
    <Card className="px-4 py-4">
      <p className={`text-[32px] font-bold tabular-nums tracking-tight ${styles[tone]}`}>{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </Card>
  );
}

function WorkerRow({ row }: { row: ReportRow }) {
  const statusChip = {
    present: <Chip tone="positive">Present</Chip>,
    absent: <Chip tone="negative">Absent</Chip>,
    unknown: <Chip tone="warning">Not marked</Chip>,
  }[row.status];

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{row.worker_name}</p>
        <p className="font-mono text-xs text-muted">
          {row.in_time ? `In ${row.in_time}` : "–"}
          {row.out_time ? ` · Out ${row.out_time}` : ""}
          {row.note ? ` · ${row.note}` : ""}
        </p>
      </div>
      {statusChip}
    </li>
  );
}
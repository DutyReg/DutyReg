"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckIcon } from "@/components/icons";
import { Btn, Chip, Select } from "@/components/ui";
import { buildReportText, whatsAppLink, type ReportData } from "@/lib/report-builder";
import { applyLateRule, toggleStatus } from "@/lib/status";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type RowStatus = "present" | "absent" | "late" | "unknown";

interface RowState {
  entryId: string | null;
  status: RowStatus;
  in_time: string | null;
  out_time: string | null;
  note: string | null;
}

interface WorkerInput {
  id: string;
  name: string;
  worker_code: string | null;
}

interface EntryInput {
  entryId: string;
  workerId: string;
  status: RowStatus;
  in_time: string | null;
  out_time: string | null;
  note: string | null;
}

type SaveState = "saved" | "saving" | "unsaved";

const SAVE_DELAY_MS = 900;

export function AttendanceSheetClient({
  sheetId,
  siteId,
  siteName,
  companyName,
  date,
  userId,
  sites,
  workers,
  initialEntries,
  loadError,
  statusLabels,
  defaultInTime,
  defaultOutTime,
}: {
  sheetId: string;
  siteId: string;
  siteName: string;
  companyName: string;
  date: string;
  userId: string;
  sites: { id: string; name: string }[];
  workers: WorkerInput[];
  initialEntries: EntryInput[];
  loadError: string | null;
  statusLabels: Record<RowStatus, string>;
  defaultInTime: string | null;
  defaultOutTime: string | null;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const map: Record<string, RowState> = {};
    const byWorker = new Map(initialEntries.map((entry) => [entry.workerId, entry]));
    for (const worker of workers) {
      const entry = byWorker.get(worker.id);
      map[worker.id] = entry
        ? {
            entryId: entry.entryId,
            status: entry.status,
            in_time: entry.in_time,
            out_time: entry.out_time,
            note: entry.note,
          }
        : { entryId: null, status: "unknown", in_time: null, out_time: null, note: null };
    }
    return map;
  });

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [siteJump, setSiteJump] = useState(siteId);
  const router = useRouter();

  const rowsRef = useRef(rows);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function setRow(workerId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [workerId]: { ...prev[workerId], ...patch } }));
    scheduleSave();
  }

  function scheduleSave() {
    dirtyRef.current = true;
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  const buildPayload = useCallback(
    function buildPayload(now: string) {
      return Object.entries(rowsRef.current).map(([workerId, row]) => ({
        id: row.entryId ?? undefined,
        sheet_id: sheetId,
        worker_id: workerId,
        status: row.status,
        in_time: row.in_time ? `${row.in_time}:00` : null,
        out_time: row.out_time ? `${row.out_time}:00` : null,
        note: row.note?.trim() ? row.note.trim() : null,
        updated_at: now,
      }));
    },
    [sheetId],
  );

  const flush = useCallback(async function flush() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveState("saving");

    const supabase = createClient();
    const now = new Date().toISOString();
    const payload = buildPayload(now);

    const { error } = await supabase
      .from("attendance_entries")
      .upsert(payload, { onConflict: "sheet_id,worker_id" });

    if (error) {
      setSaveState("unsaved");
      console.error("DutyReg save failed", error.message);
      return false;
    }

    await supabase
      .from("attendance_sheets")
      .update({ updated_at: now, updated_by: userId })
      .eq("id", sheetId);

    dirtyRef.current = false;
    setSaveState("saved");
    return true;
  }, [buildPayload, sheetId, userId]);

  /** Last-chance save that survives a full page unload (refresh/close tab). */
  const flushWithKeepalive = useCallback(async function flushWithKeepalive() {
    const accessToken = readAccessTokenFromCookie();
    if (!accessToken) return;

    const now = new Date().toISOString();
    const payload = buildPayload(now);
    const base = supabaseUrl();
    const headers: Record<string, string> = {
      apikey: supabasePublishableKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    };

    void fetch(`${base}/rest/v1/attendance_entries?on_conflict=sheet_id%2Cworker_id`, {
      method: "POST",
      keepalive: true,
      headers,
      body: JSON.stringify(payload),
    });
  }, [buildPayload]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (dirtyRef.current) void flush();
    };
  }, [flush]);

  useEffect(() => {
    function onPageHide() {
      if (!dirtyRef.current) return;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void flushWithKeepalive();
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushWithKeepalive]);

  async function markAllPresent() {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const worker of workers) {
        const current = prev[worker.id];
        next[worker.id] =
          current.status === "unknown"
            ? {
                ...current,
                status: "present",
                in_time: current.in_time ?? defaultInTime,
                out_time: current.out_time ?? defaultOutTime,
              }
            : current;
      }
      return next;
    });
    scheduleSave();
  }

  function handleStatusClick(workerId: string, clicked: Exclude<RowStatus, "unknown">) {
    setRows((prev) => {
      const current = prev[workerId];
      const status = toggleStatus(current.status, clicked);
      const patch: Partial<RowState> = { status };
      if (status === "present") {
        patch.in_time = current.in_time ?? defaultInTime;
        patch.out_time = current.out_time ?? defaultOutTime;
      } else if (status === "late") {
        patch.in_time = current.in_time ?? null;
        patch.out_time = current.out_time ?? defaultOutTime;
      } else {
        patch.in_time = null;
        patch.out_time = null;
      }
      return { ...prev, [workerId]: { ...current, ...patch } };
    });
    scheduleSave();
  }

  function handleTimeChange(
    workerId: string,
    field: "in_time" | "out_time",
    value: string | null,
  ) {
    setRows((prev) => {
      const current = prev[workerId];
      const patch: Partial<RowState> = { [field]: value };
      if (field === "in_time") {
        patch.status = applyLateRule(current.status, value, defaultInTime);
      }
      return { ...prev, [workerId]: { ...current, ...patch } };
    });
    scheduleSave();
  }

  const report = useMemo<ReportData>(() => {
    const entryRows = workers.map((worker) => {
      const row = rows[worker.id] ?? { status: "unknown" as RowStatus, in_time: null, out_time: null, note: null };
      return {
        worker_name: worker.name,
        worker_code: worker.worker_code,
        status: row.status,
        in_time: row.in_time,
        out_time: row.out_time,
        note: row.note,
      };
    });
    return {
      company_name: companyName,
      site_name: siteName,
      sheet_date: date,
      rows: entryRows,
      updated_at: null,
      updated_by_name: null,
    };
  }, [rows, workers, siteName, companyName, date]);

  const reportText = useMemo(() => buildReportText(report), [report]);
  const hasAnything = workers.length > 0;
  const presentCount = Object.values(rows).filter((r) => r.status === "present").length;
  const absentCount = Object.values(rows).filter((r) => r.status === "absent").length;
  const lateCount = Object.values(rows).filter((r) => r.status === "late").length;

  async function handleCopy() {
    await navigator.clipboard.writeText(reportText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  const saveChip = {
    saved: <Chip tone="positive">Saved</Chip>,
    saving: <Chip tone="neutral"><SavingGlyph /> Saving</Chip>,
    unsaved: <Chip tone="warning">Not saved</Chip>,
  }[saveState];

  if (loadError) {
    return (
      <div className="grid gap-3">
        <p className="rounded-lg border border-absent-border bg-absent-soft px-4 py-3 text-sm font-medium text-absent-ink">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-base font-semibold text-ink">{siteName}</p>
          <p className="font-mono text-xs text-muted">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-muted">
            <span className="font-semibold text-present">{presentCount}</span> ·{" "}
            <span className="font-semibold text-warning-ink">{lateCount}</span> ·{" "}
            <span className="font-semibold text-absent">{absentCount}</span>
          </span>
          {saveChip}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="secondary" onClick={() => void flush()} disabled={saveState === "saving"}>
          <CheckIcon /> {saveState === "saving" ? "Saving…" : "Save now"}
        </Btn>
        {saveState === "unsaved" ? (
          <Btn variant="ghost" onClick={() => void flush()}>
            Retry
          </Btn>
        ) : null}
      </div>

      <div className="grid gap-3">
        <Btn variant="accent" size="lg" className="w-full" onClick={markAllPresent} disabled={!hasAnything}>
          <CheckIcon /> Mark all present
        </Btn>
        <p className="px-1 text-center text-xs text-muted">
          Fills any worker not yet marked. You can change anyone afterwards.
        </p>
      </div>

      {hasAnything ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((worker, index) => (
            <WorkerRowCard
              key={worker.id}
              index={index + 1}
              worker={worker}
              row={rows[worker.id]}
              statusLabels={statusLabels}
              onStatus={(clicked) => handleStatusClick(worker.id, clicked)}
              onTime={(field, value) => handleTimeChange(worker.id, field, value)}
              onNote={(value) => setRow(worker.id, { note: value })}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          No active workers for this site yet. Ask the owner to add workers in Settings.
        </p>
      )}

      <div className="grid gap-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">Share the day&apos;s report</p>
          <Link
            href={`/attendance?date=${date}&site=${siteId}`}
            className="text-xs font-semibold text-muted underline underline-offset-2"
          >
            Refresh
          </Link>
        </div>
        <Btn size="lg" className="w-full" onClick={() => window.open(whatsAppLink(reportText), "_blank", "noopener")}>
          Share on WhatsApp
        </Btn>
        {typeof navigator !== "undefined" && navigator.share ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" onClick={handleCopy}>
              {copyState === "copied" ? "Copied" : "Copy text"}
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => navigator.share?.({ title: "DutyReg attendance report", text: reportText }).catch(() => {})}
            >
              More options
            </Btn>
          </div>
        ) : (
          <Btn variant="secondary" className="w-full" onClick={handleCopy}>
            {copyState === "copied" ? "Copied" : "Copy text"}
          </Btn>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <label className="shrink-0 text-sm font-medium text-ink" htmlFor="site-jump">
          Another site
        </label>
        <Select
          id="site-jump"
          value={siteJump}
          onChange={(e) => {
            const value = e.target.value;
            const flushPromise = saveState === "unsaved" ? flush() : Promise.resolve();
            void flushPromise;
            setSiteJump(value);
            router.push(`/attendance?date=${date}&site=${value}`);
          }}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function WorkerRowCard({
  index,
  worker,
  row,
  statusLabels,
  onStatus,
  onTime,
  onNote,
}: {
  index: number;
  worker: WorkerInput;
  row: RowState;
  statusLabels: Record<RowStatus, string>;
  onStatus: (clicked: Exclude<RowStatus, "unknown">) => void;
  onTime: (field: "in_time" | "out_time", value: string | null) => void;
  onNote: (value: string | null) => void;
}) {
  const timed = row.status === "present" || row.status === "late";

  return (
    <li className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 font-mono text-xs text-muted dark:bg-zinc-800">
            {index}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{worker.name}</p>
            {worker.worker_code ? (
              <p className="font-mono text-xs text-muted">{worker.worker_code}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-3.5 py-3">
        <StatusButton
          active={row.status === "present"}
          activeClass="bg-present text-white"
          label={statusLabels.present}
          onClick={() => onStatus("present")}
        />
        <StatusButton
          active={row.status === "absent"}
          activeClass="bg-absent text-white"
          label={statusLabels.absent}
          onClick={() => onStatus("absent")}
        />
        <StatusButton
          active={row.status === "late"}
          activeClass="bg-warning text-warning-ink"
          label={statusLabels.late}
          onClick={() => onStatus("late")}
        />
      </div>

      <div className="grid gap-3 border-t border-border px-3.5 py-3">
        {timed ? (
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label={row.status === "late" ? "In time (late arrival)" : "In time"}
              value={row.in_time}
              disabled={!timed}
              onChange={(value) => onTime("in_time", value)}
            />
            <TimeField
              label="Out time"
              value={row.out_time}
              disabled={!timed}
              onChange={(value) => onTime("out_time", value)}
            />
          </div>
        ) : null}
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted">Note (optional)</span>
          <input
            type="text"
            value={row.note ?? ""}
            placeholder="Left early, half day, etc."
            onChange={(e) => onNote(e.target.value || null)}
            className="h-11 w-full rounded-lg border border-border bg-surface-soft px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 dark:bg-surface-soft"
          />
        </label>
      </div>
    </li>
  );
}

function StatusButton({
  active,
  activeClass,
  label,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors
        ${active ? activeClass : "border border-border bg-surface text-muted hover:text-ink dark:bg-zinc-800/60"}`}
    >
      {label}
    </button>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className={`grid gap-1 ${disabled ? "opacity-45" : ""}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type="time"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-11 w-full rounded-lg border border-border bg-surface-soft px-3 text-sm text-ink disabled:bg-zinc-50 dark:bg-surface-soft dark:disabled:bg-zinc-800"
      />
    </label>
  );
}

function SavingGlyph() {
  return <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />;
}

function readAccessTokenFromCookie(): string | null {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("sb-") && entry.includes("-auth-token="));
    if (!cookie) return null;
    const encoded = cookie.slice(cookie.indexOf("=") + 1);
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const session = JSON.parse(atob(padded));
    return typeof session.access_token === "string" ? session.access_token : null;
  } catch {
    return null;
  }
}
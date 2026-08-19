import type { AttendanceEntry } from "@/lib/types";

export interface ReportRow {
  worker_name: string;
  worker_code: string | null;
  status: "present" | "absent" | "late" | "unknown";
  in_time: string | null;
  out_time: string | null;
  note: string | null;
}

export interface ReportData {
  company_name: string;
  site_name: string;
  sheet_date: string;
  rows: ReportRow[];
  updated_at: string | null;
  updated_by_name: string | null;
}

/** Plain, WhatsApp-friendly text report. */
export function buildReportText(data: ReportData): string {
  const lines: string[] = [];
  lines.push("DutyReg Attendance Report");
  lines.push(`Company: ${data.company_name}`);
  lines.push(`Site: ${data.site_name}`);
  lines.push(`Date: ${data.sheet_date}`);
  lines.push("");

  const present = data.rows.filter((r) => r.status === "present").length;
  const absent = data.rows.filter((r) => r.status === "absent").length;
  const late = data.rows.filter((r) => r.status === "late").length;
  lines.push(`Present: ${present} | Absent: ${absent} | Late: ${late}`);
  lines.push("");

  data.rows.forEach((row, index) => {
    const status =
      row.status === "present"
        ? "Present"
        : row.status === "absent"
          ? "Absent"
          : row.status === "late"
            ? "Late"
            : "Not marked";
    const code = row.worker_code ? ` (${row.worker_code})` : "";
    const time =
      row.status === "present" || row.status === "late"
        ? [row.in_time ? `In ${row.in_time}` : null, row.out_time ? `Out ${row.out_time}` : null]
            .filter(Boolean)
            .join(", ")
        : "";
    const note = row.note ? ` — ${row.note}` : "";
    lines.push(`${index + 1}. ${row.worker_name}${code} — ${status}${time ? ` ${time}` : ""}${note}`);
  });

  lines.push("");
  if (data.updated_at) {
    const who = data.updated_by_name ? ` by ${data.updated_by_name}` : "";
    lines.push(`Last updated: ${data.updated_at}${who}`);
  }
  lines.push("Shared via DutyReg");

  return lines.join("\n");
}

/** Counts used by dashboard summaries. */
export function countStatuses(entries: Pick<AttendanceEntry, "status">[]): {
  present: number;
  absent: number;
  late: number;
  unknown: number;
} {
  let present = 0;
  let absent = 0;
  let late = 0;
  let unknown = 0;
  for (const entry of entries) {
    if (entry.status === "present") present += 1;
    else if (entry.status === "absent") absent += 1;
    else if (entry.status === "late") late += 1;
    else unknown += 1;
  }
  return { present, absent, late, unknown };
}

/** WhatsApp share URL for a report. */
export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
import { TIME_ZONE } from "@/lib/constants";

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DISPLAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Today's date in the Asia/Colombo timezone, as a YYYY-MM-DD string. */
export function todayInColombo(date: Date = new Date()): string {
  const parts = DAY_FORMAT.formatToParts(date);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}

/** Parse a YYYY-MM-DD string as a date in the Colombo timezone (not shifted by local tz). */
export function parseSheetDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "Mon, 13 Aug 2026" from a YYYY-MM-DD string. */
export function formatSheetDate(isoDate: string): string {
  return DISPLAY_FORMAT.format(parseSheetDate(isoDate));
}

/** "13 Aug" — short form for compact UI. */
export function formatSheetDateShort(isoDate: string): string {
  const d = parseSheetDate(isoDate);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** "14:05" in Colombo time from a full timestamp string. */
export function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

/** Local time for an attendance entry in/out time column value (HH:MM:SS in Colombo). */
export function formatColomboClock(value: string | null): string {
  if (!value) return "–";
  return value.slice(0, 5);
}

/** Validate a YYYY-MM-DD date string; returns it if valid, otherwise today in Colombo. */
export function safeDate(value: string | null | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() === m - 1 &&
      probe.getUTCDate() === d
    ) {
      return value;
    }
  }
  return todayInColombo();
}

/** Shift a YYYY-MM-DD string by a number of days (UTC math keeps it tz-safe). */
export function shiftDay(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${probe.getUTCFullYear()}-${pad(probe.getUTCMonth() + 1)}-${pad(probe.getUTCDate())}`;
}
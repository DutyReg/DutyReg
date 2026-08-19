-- =============================================================================
-- DayMark — late status + company-wide work hours
--
-- 1. A worker can be recorded as 'late': counts as present (in summaries it
--    appears as its own Late bucket) and keeps custom in/out times.
-- 2. Companies get a global shift start/end time; attendance marking defaults
--    to these and an in-time later than the start time is recorded as late.
-- =============================================================================

alter table public.companies
  add column start_time time not null default '08:00',
  add column end_time time not null default '17:00';

alter table public.attendance_entries
  drop constraint attendance_entries_status_check;

alter table public.attendance_entries
  add constraint attendance_entries_status_check
  check (status in ('present', 'absent', 'late', 'unknown'));

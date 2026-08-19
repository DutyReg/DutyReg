-- Realtime: publish row changes for the tables the app renders live.
-- RLS still applies: a subscriber only receives rows they can select.
alter publication supabase_realtime
  add table public.sites,
  public.workers,
  public.company_members,
  public.attendance_sheets,
  public.attendance_entries;
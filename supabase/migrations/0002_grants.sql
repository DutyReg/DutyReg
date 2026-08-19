-- =============================================================================
-- DayMark — role grants for the Supabase API
--
-- RLS policies filter rows; these grants let the API roles reach the tables
-- at all. Written explicitly so behavior is identical across projects whose
-- platform default privileges may differ.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage on all sequences in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Future objects created in the public schema get the same treatment.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

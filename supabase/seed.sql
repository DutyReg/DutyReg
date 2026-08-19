-- =============================================================================
-- DayMark — demo seed data (development only)
--
-- Run this AFTER applying 0001_init.sql and AFTER creating a demo user in
-- Supabase Auth (project Settings → Authentication → Users → Add user, or via
-- the app's sign-up form). The script links the demo user to the company via
-- the email below so the membership trigger policies apply.
-- =============================================================================

-- Demo owner account created through Supabase Auth with this email:
do $$
declare
  v_owner uuid;
  v_company uuid;
  v_site uuid;
begin
  select id into v_owner from auth.users where lower(email) = 'demo@daymark.app';
  if v_owner is null then
    raise notice 'No auth user with email demo@daymark.app found. Create one first, then re-run this seed.';
    return;
  end if;

  -- Idempotent: skip when a company already exists for this user.
  if exists (
    select 1 from company_members where user_id = v_owner
  ) then
    raise notice 'Demo user already belongs to a company. Skipping.';
    return;
  end if;

  insert into companies (name) values ('Demo Cleaning Co') returning id into v_company;

  insert into company_members (company_id, user_id, role)
  values (v_company, v_owner, 'owner');

  insert into sites (company_id, name) values (v_company, 'Colombo Main Site')
  returning id into v_site;

  insert into sites (company_id, name) values (v_company, 'Galle Town House');

  insert into workers (company_id, site_id, name, worker_code, active) values
    (v_company, v_site, 'Nimal Perera',    'W001', true),
    (v_company, v_site, 'Kumari Silva',    'W002', true),
    (v_company, v_site, 'Ruwan Fernando',  'W003', true),
    (v_company, null,   'Chamara Jayasuriya', 'W004', true),
    (v_company, null,   'Dilani Wickramasinghe', 'W005', false),
    (v_company, v_site, 'Sampath Abeysinghe',    'W006', true),
    (v_company, v_site, 'Ishara Rajapaksha',     'W007', true);

  raise notice 'Demo company created for demo@daymark.app';
end $$;
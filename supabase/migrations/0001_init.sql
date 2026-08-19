-- =============================================================================
-- DayMark — initial schema
-- Apply via Supabase SQL editor (or `supabase db push` once the CLI is linked).
-- Tables follow the pilot spec: one sheet per site per date, one entry per
-- worker per sheet. All access is guarded by Row Level Security.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — mirrors auth.users so the app can display names/emails safely
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- companies & memberships
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'supervisor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- ---------------------------------------------------------------------------
-- sites & workers
-- ---------------------------------------------------------------------------

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  worker_code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index workers_site_idx on public.workers(site_id);

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------

create table public.attendance_sheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  sheet_date date not null,
  status text not null default 'open',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, sheet_date)
);

create index attendance_sheets_company_date_idx
  on public.attendance_sheets(company_id, sheet_date);

create table public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.attendance_sheets(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  status text not null default 'unknown' check (status in ('present', 'absent', 'unknown')),
  in_time time,
  out_time time,
  note text,
  updated_at timestamptz not null default now(),
  unique (sheet_id, worker_id)
);

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.sites enable row level security;
alter table public.workers enable row level security;
alter table public.attendance_sheets enable row level security;
alter table public.attendance_entries enable row level security;

-- Role of the calling user inside a company (null = not a member).
-- Runs security definer so it can be used inside RLS policies without recursion.
create or replace function public.member_role(p_company uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.company_members
  where company_id = p_company and user_id = auth.uid()
$$;

-- profiles: users read and update their own profile only
create policy "profiles_own_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = id);

-- companies: members read; owners update
create policy "companies_member_select" on public.companies
  for select using (public.member_role(id) is not null);

create policy "companies_owner_update" on public.companies
  for update using (public.member_role(id) = 'owner');

-- company_members: members read; mutations happen through rpc functions only
create policy "members_member_select" on public.company_members
  for select using (public.member_role(company_id) is not null);

-- sites: members read; owners write
create policy "sites_member_select" on public.sites
  for select using (public.member_role(company_id) is not null);

create policy "sites_owner_write" on public.sites
  for all
  using (public.member_role(company_id) = 'owner')
  with check (public.member_role(company_id) = 'owner');

-- workers: members read; owners write
create policy "workers_member_select" on public.workers
  for select using (public.member_role(company_id) is not null);

create policy "workers_owner_write" on public.workers
  for all
  using (public.member_role(company_id) = 'owner')
  with check (public.member_role(company_id) = 'owner');

-- attendance sheets: members read; owners and supervisors write
create policy "sheets_member_select" on public.attendance_sheets
  for select using (public.member_role(company_id) is not null);

create policy "sheets_editor_write" on public.attendance_sheets
  for all
  using (public.member_role(company_id) in ('owner', 'supervisor'))
  with check (public.member_role(company_id) in ('owner', 'supervisor'));

-- attendance entries: members read; owners and supervisors write
create policy "entries_member_select" on public.attendance_entries
  for select using (
    exists (
      select 1 from public.attendance_sheets s
      where s.id = sheet_id
        and public.member_role(s.company_id) is not null
    )
  );

create policy "entries_editor_write" on public.attendance_entries
  for all
  using (
    exists (
      select 1 from public.attendance_sheets s
      where s.id = sheet_id
        and public.member_role(s.company_id) in ('owner', 'supervisor')
    )
  )
  with check (
    exists (
      select 1 from public.attendance_sheets s
      where s.id = sheet_id
        and public.member_role(s.company_id) in ('owner', 'supervisor')
    )
  );

-- ---------------------------------------------------------------------------
-- rpc functions for flows that need elevation or cross-table checks
-- ---------------------------------------------------------------------------

-- Create a company and make the caller its owner.
create or replace function public.create_company(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if char_length(trim(p_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  select company_id into v_existing
  from company_members
  where user_id = auth.uid()
  limit 1;

  if v_existing is not null then
    raise exception 'You are already a member of a company';
  end if;

  insert into companies (name) values (trim(p_name))
  returning id into v_company;

  insert into company_members (company_id, user_id, role)
  values (v_company, auth.uid(), 'owner');

  return v_company;
end;
$$;

-- Owner adds a member by email. The invited user must have signed up first
-- (manual onboarding per pilot spec).
create or replace function public.add_company_member(
  p_company uuid,
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_company is null or p_email is null or char_length(trim(p_email)) = 0 then
    raise exception 'Email is required';
  end if;
  if p_role not in ('owner', 'supervisor', 'viewer') then
    raise exception 'Invalid role';
  end if;

  select role into v_role
  from company_members
  where company_id = p_company and user_id = auth.uid();

  if v_role is null then
    raise exception 'Access denied';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the company owner can manage members';
  end if;

  select id into v_user
  from auth.users
  where lower(email) = lower(trim(p_email));

  if v_user is null then
    raise exception 'No account found for this email. Ask the person to sign up first, then add them again.';
  end if;

  insert into company_members (company_id, user_id, role)
  values (p_company, v_user, p_role)
  on conflict (company_id, user_id)
  do update set role = excluded.role;
end;
$$;

-- Owner changes another member's role. Owners cannot change their own role.
create or replace function public.update_company_member(
  p_company uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_user_id is null or p_role not in ('owner', 'supervisor', 'viewer') then
    raise exception 'Invalid role';
  end if;

  select role into v_role
  from company_members
  where company_id = p_company and user_id = auth.uid();

  if v_role is null then
    raise exception 'Access denied';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the company owner can manage members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  update company_members
  set role = p_role
  where company_id = p_company and user_id = p_user_id;
end;
$$;

-- Owner removes a member. A company must keep at least one owner, and an
-- owner cannot remove themselves.
create or replace function public.remove_company_member(
  p_company uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_user_id is null then
    raise exception 'Member is required';
  end if;

  select role into v_role
  from company_members
  where company_id = p_company and user_id = auth.uid();

  if v_role is null then
    raise exception 'Access denied';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the company owner can manage members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;

  if exists (
    select 1 from company_members
    where company_id = p_company and user_id = p_user_id and role = 'owner'
  ) then
    if (select count(*) from company_members
        where company_id = p_company and role = 'owner') <= 1 then
      raise exception 'A company needs at least one owner';
    end if;
  end if;

  delete from company_members
  where company_id = p_company and user_id = p_user_id;
end;
$$;
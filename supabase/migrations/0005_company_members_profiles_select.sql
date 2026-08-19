-- Company members must be able to read each other's profiles so the members
-- page and dashboard "updated by" can show names and emails. Self-select was
-- the only policy before, so other members rendered as blank cards.

create policy "profiles_company_members_select" on public.profiles
  for select
  using (
    exists (
      select 1
      from public.company_members viewer
      where viewer.user_id = auth.uid()
        and exists (
          select 1
          from public.company_members target
          where target.company_id = viewer.company_id
            and target.user_id = profiles.id
        )
    )
  );
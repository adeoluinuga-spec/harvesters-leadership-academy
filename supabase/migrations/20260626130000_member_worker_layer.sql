-- Membership layer: every learner belongs to a campus/church; team and leader are optional.
create table if not exists public.ministry_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  unit_type text not null check (unit_type in ('cell', 'department', 'team', 'small_group')),
  leader_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (campus_id, name, unit_type)
);

alter table public.users
  add column if not exists account_type text not null default 'leader'
    check (account_type in ('member', 'worker', 'leader')),
  add column if not exists direct_leader_id uuid references public.users(id) on delete set null,
  add column if not exists ministry_unit_id uuid references public.ministry_units(id) on delete set null;

-- Existing non-leadership records are safely classified as members. Existing leaders retain their status.
update public.users
set account_type = case
  when role in ('Member', 'Worker') then lower(role)
  else 'leader'
end
where account_type is null or account_type = 'leader';

create index if not exists ministry_units_organization_id_idx on public.ministry_units(organization_id);
create index if not exists ministry_units_campus_id_idx on public.ministry_units(campus_id);
create index if not exists ministry_units_leader_id_idx on public.ministry_units(leader_id);
create index if not exists users_direct_leader_id_idx on public.users(direct_leader_id);
create index if not exists users_ministry_unit_id_idx on public.users(ministry_unit_id);
create index if not exists users_account_type_idx on public.users(account_type);

alter table public.ministry_units enable row level security;

create policy "ministry units authenticated read"
  on public.ministry_units for select
  using (auth.uid() is not null);

create policy "ministry units platform admin manage"
  on public.ministry_units for all
  using (exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
  ))
  with check (exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
  ));

-- Course audience rules supplement the existing leadership_targets field.
create table if not exists public.course_audiences (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  audience_type text not null check (audience_type in ('all_authenticated', 'account_type', 'role', 'campus', 'ministry_unit', 'direct_reports')),
  audience_value text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check ((audience_type = 'all_authenticated' and audience_value is null) or (audience_type <> 'all_authenticated' and audience_value is not null))
);

create index if not exists course_audiences_course_id_idx on public.course_audiences(course_id);
alter table public.course_audiences enable row level security;

create policy "course audiences authenticated read"
  on public.course_audiences for select using (auth.uid() is not null);

create policy "course audiences platform admin manage"
  on public.course_audiences for all
  using (exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
  ))
  with check (exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
  ));

-- New self-signups enter as members. They choose their church/campus during onboarding;
-- only the first account is promoted manually by deployment administration.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id, email, designation, full_name, avatar_url, role, account_type,
    organization_id, onboarding_completed, created_at
  ) values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'designation'), ''), 'None'),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    'Member',
    'member',
    null,
    false,
    timezone('utc'::text, now())
  ) on conflict (id) do update set
    email = excluded.email,
    designation = coalesce(nullif(btrim(public.users.designation), ''), excluded.designation),
    full_name = coalesce(public.users.full_name, excluded.full_name),
    avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

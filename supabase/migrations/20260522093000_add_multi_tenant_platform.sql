create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  plan text not null default 'ministry',
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.organizations (name, slug, status, plan)
values ('Harvesters International Christian Centre', 'harvesters', 'active', 'ministry')
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      plan = excluded.plan;

alter table public.users
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.groups
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.subgroups
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.campuses
  add column if not exists organization_id uuid references public.organizations(id);

update public.groups
set organization_id = (select id from public.organizations where slug = 'harvesters')
where organization_id is null;

update public.subgroups
set organization_id = coalesce(
  (
    select groups.organization_id
    from public.groups
    where groups.id = subgroups.group_id
  ),
  (select id from public.organizations where slug = 'harvesters')
)
where organization_id is null;

update public.campuses
set organization_id = coalesce(
  (
    select groups.organization_id
    from public.groups
    where groups.id = campuses.group_id
  ),
  (
    select subgroups.organization_id
    from public.subgroups
    where subgroups.id = campuses.subgroup_id
  ),
  (select id from public.organizations where slug = 'harvesters')
)
where organization_id is null;

update public.users
set organization_id = coalesce(
  (
    select campuses.organization_id
    from public.campuses
    where campuses.id = users.campus_id
  ),
  (
    select subgroups.organization_id
    from public.subgroups
    where subgroups.id = users.subgroup_id
  ),
  (
    select groups.organization_id
    from public.groups
    where groups.id = users.group_id
  ),
  case
    when coalesce(users.role, '') in ('Platform Super Admin', 'Super Admin', 'Admin') then null
    else (select id from public.organizations where slug = 'harvesters')
  end
)
where organization_id is null;

update public.users
set role = 'Platform Super Admin'
where role in ('Super Admin', 'Admin');

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    designation,
    full_name,
    avatar_url,
    role,
    organization_id,
    onboarding_completed,
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'designation'), ''), 'None'),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'role'), ''),
      case
        when exists (select 1 from public.users) then 'Cell Leader / Assistant HOD'
        else 'Platform Super Admin'
      end
    ),
    null,
    false,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
    set email = excluded.email,
        designation = coalesce(nullif(btrim(public.users.designation), ''), excluded.designation),
        full_name = coalesce(public.users.full_name, excluded.full_name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
        role = case
          when public.users.role in ('Super Admin', 'Admin') then 'Platform Super Admin'
          else coalesce(public.users.role, excluded.role)
        end,
        organization_id = public.users.organization_id;

  return new;
end;
$$;

create index if not exists users_organization_id_idx on public.users (organization_id);
create index if not exists groups_organization_id_idx on public.groups (organization_id);
create index if not exists subgroups_organization_id_idx on public.subgroups (organization_id);
create index if not exists campuses_organization_id_idx on public.campuses (organization_id);

alter table public.organizations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'Users can read own organization'
  ) then
    create policy "Users can read own organization"
      on public.organizations
      for select
      using (
        exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and (
              users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
              or users.organization_id = organizations.id
            )
        )
      );
  end if;
end;
$$;

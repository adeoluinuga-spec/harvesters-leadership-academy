-- Canonical campus structure and discipleship membership model.
-- Direction → Team/District → Sub-team/Community → Department/Zone → Unit/Area → Cell

alter table public.ministry_units
  add column if not exists parent_id uuid references public.ministry_units(id) on delete restrict;

alter table public.ministry_units
  drop constraint if exists ministry_units_unit_type_check;

update public.ministry_units
set unit_type = case unit_type
  when 'team' then 'team_district'
  when 'department' then 'department_zone'
  when 'small_group' then 'cell'
  else unit_type
end
where unit_type in ('team', 'department', 'small_group');

alter table public.ministry_units
  add constraint ministry_units_unit_type_check check (
    unit_type in (
      'direction',
      'team_district',
      'subteam_community',
      'department_zone',
      'unit_area',
      'cell'
    )
  );

create index if not exists ministry_units_parent_id_idx on public.ministry_units(parent_id);

-- Rename the former generic Member state to Attendee unless the person has
-- already been assigned to a real ministry structure.
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check check (
    account_type in ('attendee', 'member', 'worker', 'leader')
  );

update public.users
set account_type = 'attendee', role = 'Attendee'
where account_type = 'member'
  and ministry_unit_id is null;

-- Enforce the structure and automatically derive direct leader assignment
-- from the selected unit, so a client cannot attach itself to another campus.
create or replace function public.validate_ministry_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_row public.ministry_units;
  parent_type text;
begin
  if new.account_type = 'attendee' then
    if new.ministry_unit_id is not null then
      raise exception 'Attendees cannot be assigned to a ministry unit';
    end if;
    new.direct_leader_id := null;
    return new;
  end if;

  if new.account_type in ('member', 'worker') and new.ministry_unit_id is null then
    raise exception '% accounts require a ministry unit', initcap(new.account_type);
  end if;

  if new.ministry_unit_id is not null then
    select * into unit_row from public.ministry_units where id = new.ministry_unit_id;
    if not found then raise exception 'Selected ministry unit does not exist'; end if;
    if new.campus_id is distinct from unit_row.campus_id then
      raise exception 'A person and their ministry unit must belong to the same campus';
    end if;
    if new.account_type = 'worker' and unit_row.unit_type not in ('department_zone', 'unit_area') then
      raise exception 'Workers must belong to a department, zone, unit, or area';
    end if;
    if new.account_type = 'member' and unit_row.unit_type <> 'cell' then
      raise exception 'Members must belong to a cell';
    end if;
    new.direct_leader_id := unit_row.leader_id;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ministry_membership_before_write on public.users;
create trigger validate_ministry_membership_before_write
  before insert or update of account_type, campus_id, ministry_unit_id, direct_leader_id
  on public.users
  for each row execute function public.validate_ministry_membership();

create or replace function public.validate_ministry_unit_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare parent_row public.ministry_units;
begin
  if new.unit_type = 'direction' then
    if new.parent_id is not null then raise exception 'Directions cannot have a parent unit'; end if;
    return new;
  end if;
  if new.parent_id is null then raise exception '% requires a parent unit', new.unit_type; end if;
  select * into parent_row from public.ministry_units where id = new.parent_id;
  if not found or parent_row.campus_id <> new.campus_id then
    raise exception 'A ministry unit parent must exist in the same campus';
  end if;
  if (new.unit_type = 'team_district' and parent_row.unit_type <> 'direction')
    or (new.unit_type = 'subteam_community' and parent_row.unit_type <> 'team_district')
    or (new.unit_type = 'department_zone' and parent_row.unit_type <> 'subteam_community')
    or (new.unit_type = 'unit_area' and parent_row.unit_type <> 'department_zone')
    or (new.unit_type = 'cell' and parent_row.unit_type <> 'unit_area') then
    raise exception 'Invalid ministry hierarchy parent for %', new.unit_type;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ministry_unit_hierarchy_before_write on public.ministry_units;
create trigger validate_ministry_unit_hierarchy_before_write
  before insert or update of unit_type, campus_id, parent_id
  on public.ministry_units
  for each row execute function public.validate_ministry_unit_hierarchy();

-- New signups are campus attendees. They become workers or cell members only
-- when they select an existing structure during onboarding or are assigned by an admin.
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
    new.id, new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'designation'), ''), 'None'),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    'Attendee', 'attendee', null, false, timezone('utc'::text, now())
  ) on conflict (id) do update set
    email = excluded.email,
    designation = coalesce(nullif(btrim(public.users.designation), ''), excluded.designation),
    full_name = coalesce(public.users.full_name, excluded.full_name),
    avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

-- Operational administrators are scoped chiefs-of-staff, not platform admins.
-- Group Admin scope is public.users.group_id; Campus Admin scope is campus_id.
alter table public.courses
  add column if not exists management_scope text not null default 'platform',
  add column if not exists group_id uuid references public.groups(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null;

alter table public.courses
  drop constraint if exists courses_management_scope_check;

alter table public.courses
  add constraint courses_management_scope_check check (
    (management_scope = 'platform' and group_id is null and campus_id is null)
    or (management_scope = 'group' and group_id is not null and campus_id is null)
    or (management_scope = 'campus' and campus_id is not null)
  );

create index if not exists courses_group_id_idx on public.courses(group_id);
create index if not exists courses_campus_id_idx on public.courses(campus_id);
create index if not exists users_role_group_id_idx on public.users(role, group_id);
create index if not exists users_role_campus_id_idx on public.users(role, campus_id);

drop policy if exists "ministry units scoped operational admin manage" on public.ministry_units;
create policy "ministry units scoped operational admin manage"
  on public.ministry_units for all to authenticated
  using (
    exists (
      select 1 from public.users actor
      where actor.id = auth.uid()
        and (
          actor.role in ('Platform Super Admin', 'Super Admin', 'Admin')
          or (actor.role = 'Campus Admin' and public.ministry_units.campus_id = actor.campus_id)
          or (actor.role = 'Group Admin' and exists (
            select 1 from public.campuses c
            where c.id = public.ministry_units.campus_id and c.group_id = actor.group_id
          ))
        )
    )
  )
  with check (
    exists (
      select 1 from public.users actor
      where actor.id = auth.uid()
        and (
          actor.role in ('Platform Super Admin', 'Super Admin', 'Admin')
          or (actor.role = 'Campus Admin' and public.ministry_units.campus_id = actor.campus_id)
          or (actor.role = 'Group Admin' and exists (
            select 1 from public.campuses c
            where c.id = public.ministry_units.campus_id and c.group_id = actor.group_id
          ))
        )
    )
  );

-- Scoped operations policy for courses. Read policies from earlier migrations
-- remain in force; this grants writes only inside the administrator's scope.
drop policy if exists "Courses: scoped operational admin manage" on public.courses;
create policy "Courses: scoped operational admin manage"
  on public.courses for all to authenticated
  using (
    exists (
      select 1 from public.users actor
      where actor.id = auth.uid()
        and (
          actor.role in ('Platform Super Admin', 'Super Admin', 'Admin')
          or (actor.role = 'Group Admin' and public.courses.management_scope = 'group' and public.courses.group_id = actor.group_id)
          or (actor.role = 'Campus Admin' and public.courses.management_scope = 'campus' and public.courses.campus_id = actor.campus_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users actor
      where actor.id = auth.uid()
        and (
          actor.role in ('Platform Super Admin', 'Super Admin', 'Admin')
          or (actor.role = 'Group Admin' and public.courses.management_scope = 'group' and public.courses.group_id = actor.group_id)
          or (actor.role = 'Campus Admin' and public.courses.management_scope = 'campus' and public.courses.campus_id = actor.campus_id)
        )
    )
  );

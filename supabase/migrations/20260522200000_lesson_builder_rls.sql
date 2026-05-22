-- ============================================================
-- Lesson Builder RLS: allow course authors to manage modules
-- and lessons for their own courses.
--
-- Previously only Platform Super Admin could write to these
-- tables, silently blocking Group Pastors, Campus Pastors etc.
-- ============================================================

-- ── course_modules ────────────────────────────────────────────

-- Replace the old blanket admin-only policy
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'course_modules'
      and policyname = 'Modules: admin manage'
  ) then
    drop policy "Modules: admin manage" on public.course_modules;
  end if;
end; $$;

-- Super admins: full access to all course modules
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'course_modules'
      and policyname = 'Modules: admin full manage'
  ) then
    create policy "Modules: admin full manage"
      on public.course_modules for all
      using (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
        )
      )
      with check (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
        )
      );
  end if;
end; $$;

-- Course authors: manage modules only for their own courses
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'course_modules'
      and policyname = 'Modules: author manage own'
  ) then
    create policy "Modules: author manage own"
      on public.course_modules for all
      using (
        exists (
          select 1 from public.courses c
          where c.id = course_modules.course_id
            and c.created_by = auth.uid()
            and exists (
              select 1 from public.users u
              where u.id = auth.uid()
                and u.role in (
                  'Group Pastor',
                  'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor',
                  'Campus Pastor'
                )
            )
        )
      )
      with check (
        exists (
          select 1 from public.courses c
          where c.id = course_modules.course_id
            and c.created_by = auth.uid()
            and exists (
              select 1 from public.users u
              where u.id = auth.uid()
                and u.role in (
                  'Group Pastor',
                  'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor',
                  'Campus Pastor'
                )
            )
        )
      );
  end if;
end; $$;

-- ── lessons ───────────────────────────────────────────────────

-- Replace the old blanket admin-only policy
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons'
      and policyname = 'Lessons: admin manage'
  ) then
    drop policy "Lessons: admin manage" on public.lessons;
  end if;
end; $$;

-- Super admins: full access to all lessons
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons'
      and policyname = 'Lessons: admin full manage'
  ) then
    create policy "Lessons: admin full manage"
      on public.lessons for all
      using (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
        )
      )
      with check (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Platform Super Admin', 'Super Admin', 'Admin')
        )
      );
  end if;
end; $$;

-- Course authors: manage lessons only for their own courses
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lessons'
      and policyname = 'Lessons: author manage own'
  ) then
    create policy "Lessons: author manage own"
      on public.lessons for all
      using (
        exists (
          select 1 from public.courses c
          where c.id = lessons.course_id
            and c.created_by = auth.uid()
            and exists (
              select 1 from public.users u
              where u.id = auth.uid()
                and u.role in (
                  'Group Pastor',
                  'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor',
                  'Campus Pastor'
                )
            )
        )
      )
      with check (
        exists (
          select 1 from public.courses c
          where c.id = lessons.course_id
            and c.created_by = auth.uid()
            and exists (
              select 1 from public.users u
              where u.id = auth.uid()
                and u.role in (
                  'Group Pastor',
                  'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor',
                  'Campus Pastor'
                )
            )
        )
      );
  end if;
end; $$;

-- ── Performance indexes ───────────────────────────────────────

create index if not exists course_modules_course_order_idx
  on public.course_modules(course_id, order_index);

create index if not exists lessons_module_id_idx
  on public.lessons(module_id);

create index if not exists lessons_course_order_idx
  on public.lessons(course_id, order_index);

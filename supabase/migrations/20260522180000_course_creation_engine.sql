-- ============================================================
-- Course Creation Engine: Schema Extension + Storage
-- ============================================================

-- Extend public.courses with full production fields
alter table public.courses
  add column if not exists overview          text,
  add column if not exists instructor_role   text,
  add column if not exists leadership_targets text[] not null default '{}',
  add column if not exists difficulty_level  text    not null default 'Foundational',
  add column if not exists is_required       boolean not null default false,
  add column if not exists status            text    not null default 'draft';

-- Back-fill instructor_role from instructor_title for existing rows
update public.courses
set instructor_role = instructor_title
where instructor_role is null
  and instructor_title is not null;

-- Back-fill status from is_published for existing rows
update public.courses
set status = case when is_published then 'published' else 'draft' end
where status = 'draft';

-- Keep is_published in sync as a derived convenience column going forward.
-- Applications should write status; is_published is set automatically via trigger.
create or replace function public.sync_course_publish_status()
returns trigger language plpgsql as $$
begin
  new.is_published := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists sync_course_publish_status_trigger on public.courses;
create trigger sync_course_publish_status_trigger
  before insert or update on public.courses
  for each row execute function public.sync_course_publish_status();

-- Index for common management queries
create index if not exists courses_status_idx    on public.courses(status);
create index if not exists courses_required_idx  on public.courses(is_required);
create index if not exists courses_created_by_idx on public.courses(created_by);

-- ============================================================
-- Updated RLS: allow Group Pastors to manage their own courses
-- ============================================================

-- Drop old admin-only policy and replace with wider author + admin policy
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'Courses: admin manage') then
    drop policy "Courses: admin manage" on public.courses;
  end if;
end; $$;

-- Admin manage: Platform Super Admin can manage everything
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'Courses: admin full manage') then
    create policy "Courses: admin full manage"
      on public.courses for all
      using (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role = 'Platform Super Admin'
        )
      )
      with check (
        exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role = 'Platform Super Admin'
        )
      );
  end if;
end; $$;

-- Author manage: Group Pastors and Sub-Group Pastors can create and manage courses they own
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'Courses: author manage own') then
    create policy "Courses: author manage own"
      on public.courses for all
      using (
        auth.uid() = created_by
        and exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Group Pastor', 'Sub-Group Pastor', 'Subgroup Pastor', 'Campus Pastor')
        )
      )
      with check (
        auth.uid() = created_by
        and exists (
          select 1 from public.users
          where users.id = auth.uid()
            and users.role in ('Group Pastor', 'Sub-Group Pastor', 'Subgroup Pastor', 'Campus Pastor')
        )
      );
  end if;
end; $$;

-- Drop the old read policy and replace with one that also shows own drafts to authors
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'Courses: authenticated read') then
    drop policy "Courses: authenticated read" on public.courses;
  end if;
end; $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'Courses: read') then
    create policy "Courses: read"
      on public.courses for select
      using (
        auth.uid() is not null
        and (
          status = 'published'
          or created_by = auth.uid()
          or exists (
            select 1 from public.users
            where users.id = auth.uid()
              and users.role = 'Platform Super Admin'
          )
        )
      );
  end if;
end; $$;

-- ============================================================
-- Supabase Storage: course-thumbnails bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-thumbnails',
  'course-thumbnails',
  true,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types= excluded.allowed_mime_types;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Course thumbnails: public read'
  ) then
    create policy "Course thumbnails: public read"
      on storage.objects for select
      using (bucket_id = 'course-thumbnails');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Course thumbnails: authenticated upload'
  ) then
    create policy "Course thumbnails: authenticated upload"
      on storage.objects for insert
      with check (
        bucket_id = 'course-thumbnails'
        and auth.uid() is not null
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Course thumbnails: authenticated update'
  ) then
    create policy "Course thumbnails: authenticated update"
      on storage.objects for update
      using (
        bucket_id = 'course-thumbnails'
        and auth.uid() is not null
      )
      with check (
        bucket_id = 'course-thumbnails'
        and auth.uid() is not null
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Course thumbnails: author delete'
  ) then
    create policy "Course thumbnails: author delete"
      on storage.objects for delete
      using (
        bucket_id = 'course-thumbnails'
        and auth.uid() is not null
      );
  end if;
end; $$;

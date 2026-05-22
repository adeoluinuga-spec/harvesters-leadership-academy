-- Sync is_published boolean with status column for all existing courses.
-- Courses set to 'published' via the MVP form only had status updated,
-- not is_published, so they were invisible to the catalog query.

update public.courses
  set is_published = true
  where status = 'published' and is_published = false;

update public.courses
  set is_published = false
  where status in ('draft', 'archived') and is_published = true;

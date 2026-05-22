-- ============================================================
-- MVP: add video_url column to courses
-- ============================================================

alter table public.courses
  add column if not exists video_url text;

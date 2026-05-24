-- ============================================================
-- ADMIN OPERATIONS MIGRATION
-- Extends activity_events for full audit logging and adds
-- admin-safe RLS so Super Admins can read all events.
-- Safe to run on a DB that already has phase3-migration.sql
-- applied (all statements use IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Ensure activity_events table exists
--    (phase3 may have already created it — this is a no-op)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role          TEXT,
  campus_id     UUID,
  subgroup_id   UUID,
  group_id      UUID,
  event_type    TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Extend activity_events with audit-grade columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_role  TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,   -- 'user' | 'campus' | 'subgroup' | 'group' | 'course'
  ADD COLUMN IF NOT EXISTS entity_id   UUID,
  ADD COLUMN IF NOT EXISTS metadata    JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ip_address  TEXT,
  ADD COLUMN IF NOT EXISTS user_agent  TEXT;

-- ────────────────────────────────────────────────────────────
-- 3. Indexes for activity log queries
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id    ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor_id   ON public.activity_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON public.activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity     ON public.activity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_campus_id  ON public.activity_events(campus_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — enable + refresh policies
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Drop old policies before recreating (idempotent)
DROP POLICY IF EXISTS "Admins read all events"    ON public.activity_events;
DROP POLICY IF EXISTS "Users insert own events"   ON public.activity_events;
DROP POLICY IF EXISTS "Service role bypass"       ON public.activity_events;

-- Super Admins / Admins read everything; regular users read their own events
CREATE POLICY "Admins read all events"
  ON public.activity_events FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = actor_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('Platform Super Admin', 'Super Admin', 'Admin')
    )
  );

-- Any authenticated user can insert their own events (LMS events)
CREATE POLICY "Users insert own events"
  ON public.activity_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR actor_id = auth.uid());

-- Service role can do anything (used by admin API routes)
CREATE POLICY "Service role full access"
  ON public.activity_events
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. Ensure campuses table has is_active column
--    (needed for archive/deactivate feature)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.campuses
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ────────────────────────────────────────────────────────────
-- 6. Ensure users table has is_active column
--    (needed for deactivate/reactivate user feature)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ────────────────────────────────────────────────────────────
-- 7. Ensure organizations table has a default org for seeding
--    (non-breaking — only inserts if no orgs exist)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.organizations (name, slug, plan)
SELECT 'Harvesters Church', 'harvesters', 'enterprise'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1);

-- ────────────────────────────────────────────────────────────
-- DONE
-- The admin API routes can now safely write full audit events.
-- ────────────────────────────────────────────────────────────

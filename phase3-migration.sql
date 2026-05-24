-- ============================================================
-- PHASE 3 — LEADERSHIP INTELLIGENCE & ANALYTICS
-- Run this entire script in Supabase SQL editor
-- ============================================================

-- ============================================================
-- 1. ACTIVITY EVENTS
-- Central audit log for all user actions
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_activity_events_user_id    ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON public.activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_campus_id  ON public.activity_events(campus_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all events; users can only read their own
CREATE POLICY "Admins read all events"
  ON public.activity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('Platform Super Admin', 'Super Admin', 'Admin')
    )
  );

CREATE POLICY "Users insert own events"
  ON public.activity_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role bypass"
  ON public.activity_events
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. NOTIFICATIONS
-- In-app notification inbox per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,           -- 'alert' | 'info' | 'success' | 'warning'
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  action_url TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 3. LEADERSHIP METRICS (per-user, computed cache)
-- Refreshed by the analytics engine on key events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leadership_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engagement_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  consistency_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  completion_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  assessment_pass_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  courses_enrolled     INT NOT NULL DEFAULT 0,
  courses_completed    INT NOT NULL DEFAULT 0,
  certificates_earned  INT NOT NULL DEFAULT 0,
  last_active_at       TIMESTAMPTZ,
  inactivity_days      INT NOT NULL DEFAULT 0,
  growth_velocity      NUMERIC(5,2) NOT NULL DEFAULT 0,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadership_metrics_user ON public.leadership_metrics(user_id);

ALTER TABLE public.leadership_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and pastors read metrics"
  ON public.leadership_metrics FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN (
          'Platform Super Admin', 'Super Admin', 'Admin',
          'Group Pastor', 'Subgroup Pastor', 'Sub-Group Pastor', 'Campus Pastor', 'Campus Admin'
        )
    )
  );

CREATE POLICY "System upserts metrics"
  ON public.leadership_metrics FOR ALL
  WITH CHECK (true);

-- ============================================================
-- 4. CAMPUS METRICS (per-campus aggregate cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campus_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id            UUID UNIQUE NOT NULL,
  total_leaders        INT NOT NULL DEFAULT 0,
  active_leaders       INT NOT NULL DEFAULT 0,
  enrolled_leaders     INT NOT NULL DEFAULT 0,
  completed_leaders    INT NOT NULL DEFAULT 0,
  avg_completion_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_engagement_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  certificates_issued  INT NOT NULL DEFAULT 0,
  assessment_pass_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and pastors read campus metrics"
  ON public.campus_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN (
          'Platform Super Admin', 'Super Admin', 'Admin',
          'Group Pastor', 'Subgroup Pastor', 'Sub-Group Pastor', 'Campus Pastor', 'Campus Admin'
        )
    )
  );

CREATE POLICY "System upserts campus metrics"
  ON public.campus_metrics FOR ALL WITH CHECK (true);

-- ============================================================
-- 5. SUBGROUP METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subgroup_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id         UUID UNIQUE NOT NULL,
  total_campuses      INT NOT NULL DEFAULT 0,
  total_leaders       INT NOT NULL DEFAULT 0,
  active_leaders      INT NOT NULL DEFAULT 0,
  enrolled_leaders    INT NOT NULL DEFAULT 0,
  avg_completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  certificates_issued INT NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subgroup_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastors read subgroup metrics" ON public.subgroup_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()
      AND role IN ('Platform Super Admin','Super Admin','Admin','Group Pastor','Subgroup Pastor','Sub-Group Pastor'))
  );
CREATE POLICY "System upserts subgroup metrics" ON public.subgroup_metrics FOR ALL WITH CHECK (true);

-- ============================================================
-- 6. GROUP METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID UNIQUE NOT NULL,
  total_subgroups     INT NOT NULL DEFAULT 0,
  total_campuses      INT NOT NULL DEFAULT 0,
  total_leaders       INT NOT NULL DEFAULT 0,
  active_leaders      INT NOT NULL DEFAULT 0,
  avg_completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  certificates_issued INT NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group pastors read group metrics" ON public.group_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()
      AND role IN ('Platform Super Admin','Super Admin','Admin','Group Pastor'))
  );
CREATE POLICY "System upserts group metrics" ON public.group_metrics FOR ALL WITH CHECK (true);

-- ============================================================
-- 7. LEADERSHIP PATHWAYS
-- Defines promotion requirements between roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leadership_pathways (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role            TEXT NOT NULL,
  to_role              TEXT NOT NULL,
  description          TEXT,
  required_courses     TEXT[] NOT NULL DEFAULT '{}',   -- course slugs
  required_assessments TEXT[] NOT NULL DEFAULT '{}',   -- assessment ids
  min_engagement_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_certificates     INT NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_role, to_role)
);

ALTER TABLE public.leadership_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pathways" ON public.leadership_pathways FOR SELECT USING (true);
CREATE POLICY "Admins manage pathways" ON public.leadership_pathways FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()
      AND role IN ('Platform Super Admin','Super Admin','Admin'))
  );

-- ============================================================
-- 8. SEED: default leadership pathways (editable in admin later)
-- ============================================================
INSERT INTO public.leadership_pathways (from_role, to_role, description, min_certificates)
VALUES
  ('Cell Leader',    'Zonal Leader',     'Cell Leader progression to Zonal Leadership', 1),
  ('Zonal Leader',   'Community Leader', 'Zonal to Community Leader pathway',           2),
  ('Community Leader','Area Leader',     'Community to Area Leader pathway',             3),
  ('Area Leader',    'Campus Pastor',    'Area Leader to Campus Pastoral role',          4)
ON CONFLICT (from_role, to_role) DO NOTHING;

-- ============================================================
-- DONE
-- Run analytics/event and notifications API routes will now work
-- ============================================================

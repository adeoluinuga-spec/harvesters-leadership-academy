-- ============================================================
-- RLS Read Policies: Hierarchy Visibility
-- ============================================================
-- Adds read policies on public.users, public.groups,
-- public.subgroups, and public.campuses so that:
--
--   Super Admin (Platform Super Admin / Super Admin / Admin)
--     → can read ALL rows in every table
--
--   Group Pastor
--     → can read their own group
--     → can read subgroups that belong to their group
--     → can read campuses that belong to those subgroups
--     → can read users assigned to those campuses
--
--   Subgroup Pastor
--     → can read their own subgroup
--     → can read campuses in their subgroup
--     → can read users assigned to those campuses
--
--   Campus Pastor (and below)
--     → can read their own campus row
--     → can read users assigned to their campus
--
-- The existing "Users can read own profile" policy is left in
-- place — multiple SELECT policies are OR-combined by Postgres.
--
-- All policies are idempotent (IF NOT EXISTS).
-- ============================================================

-- ── Helper: get the calling user's role without hitting RLS ──
-- SECURITY DEFINER bypasses RLS so the function can read
-- public.users freely, breaking the circular-reference problem.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ── Helper: get the calling user's group_id ──
CREATE OR REPLACE FUNCTION public.current_user_group_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.users WHERE id = auth.uid()
$$;

-- ── Helper: get the calling user's subgroup_id ──
CREATE OR REPLACE FUNCTION public.current_user_subgroup_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subgroup_id FROM public.users WHERE id = auth.uid()
$$;

-- ── Helper: get the calling user's campus_id ──
CREATE OR REPLACE FUNCTION public.current_user_campus_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT campus_id FROM public.users WHERE id = auth.uid()
$$;


-- ============================================================
-- public.groups
-- ============================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'groups'
    AND policyname = 'Admins can read all groups'
  ) THEN
    CREATE POLICY "Admins can read all groups"
      ON public.groups FOR SELECT
      USING (
        public.current_user_role() IN (
          'Platform Super Admin', 'Super Admin', 'Admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'groups'
    AND policyname = 'Group Pastor can read own group'
  ) THEN
    CREATE POLICY "Group Pastor can read own group"
      ON public.groups FOR SELECT
      USING (
        public.current_user_role() IN ('Group Pastor')
        AND id = public.current_user_group_id()
      );
  END IF;
END $$;


-- ============================================================
-- public.subgroups
-- ============================================================

ALTER TABLE public.subgroups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subgroups'
    AND policyname = 'Admins can read all subgroups'
  ) THEN
    CREATE POLICY "Admins can read all subgroups"
      ON public.subgroups FOR SELECT
      USING (
        public.current_user_role() IN (
          'Platform Super Admin', 'Super Admin', 'Admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subgroups'
    AND policyname = 'Group Pastor can read their subgroups'
  ) THEN
    CREATE POLICY "Group Pastor can read their subgroups"
      ON public.subgroups FOR SELECT
      USING (
        public.current_user_role() IN ('Group Pastor')
        AND group_id = public.current_user_group_id()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subgroups'
    AND policyname = 'Subgroup Pastor can read own subgroup'
  ) THEN
    CREATE POLICY "Subgroup Pastor can read own subgroup"
      ON public.subgroups FOR SELECT
      USING (
        public.current_user_role() IN (
          'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor'
        )
        AND id = public.current_user_subgroup_id()
      );
  END IF;
END $$;


-- ============================================================
-- public.campuses
-- ============================================================

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campuses'
    AND policyname = 'Admins can read all campuses'
  ) THEN
    CREATE POLICY "Admins can read all campuses"
      ON public.campuses FOR SELECT
      USING (
        public.current_user_role() IN (
          'Platform Super Admin', 'Super Admin', 'Admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campuses'
    AND policyname = 'Group Pastor can read their campuses'
  ) THEN
    CREATE POLICY "Group Pastor can read their campuses"
      ON public.campuses FOR SELECT
      USING (
        public.current_user_role() IN ('Group Pastor')
        AND EXISTS (
          SELECT 1 FROM public.subgroups sg
          WHERE sg.id = subgroup_id
          AND sg.group_id = public.current_user_group_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campuses'
    AND policyname = 'Subgroup Pastor can read their campuses'
  ) THEN
    CREATE POLICY "Subgroup Pastor can read their campuses"
      ON public.campuses FOR SELECT
      USING (
        public.current_user_role() IN (
          'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor'
        )
        AND subgroup_id = public.current_user_subgroup_id()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campuses'
    AND policyname = 'Campus Pastor can read own campus'
  ) THEN
    CREATE POLICY "Campus Pastor can read own campus"
      ON public.campuses FOR SELECT
      USING (id = public.current_user_campus_id());
  END IF;
END $$;


-- ============================================================
-- public.users  (extends the existing self-read policy)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Admins can read all users'
  ) THEN
    CREATE POLICY "Admins can read all users"
      ON public.users FOR SELECT
      USING (
        public.current_user_role() IN (
          'Platform Super Admin', 'Super Admin', 'Admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Group Pastor can read users in their group'
  ) THEN
    CREATE POLICY "Group Pastor can read users in their group"
      ON public.users FOR SELECT
      USING (
        public.current_user_role() IN ('Group Pastor')
        AND EXISTS (
          SELECT 1
          FROM public.campuses c
          JOIN public.subgroups sg ON sg.id = c.subgroup_id
          WHERE c.id = campus_id
          AND sg.group_id = public.current_user_group_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Subgroup Pastor can read users in their subgroup'
  ) THEN
    CREATE POLICY "Subgroup Pastor can read users in their subgroup"
      ON public.users FOR SELECT
      USING (
        public.current_user_role() IN (
          'Sub-Group Pastor', 'Subgroup Pastor', 'Sub-group Pastor'
        )
        AND EXISTS (
          SELECT 1 FROM public.campuses c
          WHERE c.id = campus_id
          AND c.subgroup_id = public.current_user_subgroup_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Campus Pastor can read users in their campus'
  ) THEN
    CREATE POLICY "Campus Pastor can read users in their campus"
      ON public.users FOR SELECT
      USING (campus_id = public.current_user_campus_id());
  END IF;
END $$;

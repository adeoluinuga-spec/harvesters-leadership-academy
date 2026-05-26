-- ============================================================
-- COMMUNICATION LAYER
-- Announcements, campaigns, reminders, read receipts,
-- templates, and notification preferences.
-- All tables use RLS; service-role bypasses for API writes.
-- ============================================================

-- ─── Messages (announcements / campaign messages / reminders) ───
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role          TEXT        NOT NULL,
  type                 TEXT        NOT NULL DEFAULT 'announcement'
                         CHECK (type IN ('announcement', 'campaign', 'reminder')),
  title                TEXT        NOT NULL,
  body                 TEXT        NOT NULL,
  priority             TEXT        NOT NULL DEFAULT 'normal'
                         CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- Audience scoping
  audience_scope       TEXT        NOT NULL DEFAULT 'platform'
                         CHECK (audience_scope IN (
                           'platform', 'group', 'subgroup', 'campus',
                           'cadre', 'course', 'inactive', 'uncertified', 'specific'
                         )),
  audience_group_id    UUID        REFERENCES public.groups(id)    ON DELETE SET NULL,
  audience_subgroup_id UUID        REFERENCES public.subgroups(id) ON DELETE SET NULL,
  audience_campus_id   UUID        REFERENCES public.campuses(id)  ON DELETE SET NULL,
  audience_cadre       TEXT,
  audience_course_id   UUID        REFERENCES public.courses(id)   ON DELETE SET NULL,
  audience_user_ids    UUID[]      DEFAULT '{}',
  -- Content extras
  cta_label            TEXT,
  cta_url              TEXT,
  attachments          JSONB       NOT NULL DEFAULT '[]',
  -- Lifecycle
  scheduled_at         TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  status               TEXT        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  campaign_id          UUID,
  recipient_count      INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Read receipts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- ─── Resolved recipient list per message ───────────────────────
CREATE TABLE IF NOT EXISTS public.communication_recipients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID        NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  status       TEXT        NOT NULL DEFAULT 'delivered'
                 CHECK (status IN ('pending', 'delivered', 'failed')),
  UNIQUE (message_id, user_id)
);

-- ─── Reusable templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL DEFAULT 'announcement'
                CHECK (type IN ('announcement', 'campaign', 'reminder')),
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'normal',
  cta_label   TEXT,
  cta_url     TEXT,
  is_global   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Campaign groupings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  description          TEXT,
  status               TEXT        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  audience_scope       TEXT        NOT NULL DEFAULT 'platform',
  audience_group_id    UUID        REFERENCES public.groups(id)    ON DELETE SET NULL,
  audience_subgroup_id UUID        REFERENCES public.subgroups(id) ON DELETE SET NULL,
  audience_campus_id   UUID        REFERENCES public.campuses(id)  ON DELETE SET NULL,
  message_count        INT         NOT NULL DEFAULT 0,
  recipient_count      INT         NOT NULL DEFAULT 0,
  starts_at            TIMESTAMPTZ,
  ends_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Automated reminder rules ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  trigger_type         TEXT        NOT NULL
                         CHECK (trigger_type IN (
                           'enrolled_inactive', 'started_incomplete',
                           'assessment_incomplete', 'onboarding_incomplete',
                           'uncertified', 'no_enrollment'
                         )),
  trigger_days         INT         NOT NULL DEFAULT 7,
  message_title        TEXT        NOT NULL,
  message_body         TEXT        NOT NULL,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  audience_scope       TEXT        NOT NULL DEFAULT 'platform',
  audience_group_id    UUID        REFERENCES public.groups(id)    ON DELETE SET NULL,
  audience_subgroup_id UUID        REFERENCES public.subgroups(id) ON DELETE SET NULL,
  audience_campus_id   UUID        REFERENCES public.campuses(id)  ON DELETE SET NULL,
  last_triggered_at    TIMESTAMPTZ,
  trigger_count        INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Per-user notification preferences ────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled        BOOLEAN     NOT NULL DEFAULT true,
  in_app_enabled       BOOLEAN     NOT NULL DEFAULT true,
  reminders_enabled    BOOLEAN     NOT NULL DEFAULT true,
  assessment_nudges    BOOLEAN     NOT NULL DEFAULT true,
  certification_alerts BOOLEAN     NOT NULL DEFAULT true,
  announcement_alerts  BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_comm_msg_sender     ON public.communication_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_status     ON public.communication_messages(status);
CREATE INDEX IF NOT EXISTS idx_comm_msg_sent_at    ON public.communication_messages(sent_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_comm_msg_campaign   ON public.communication_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_msg_reads_user      ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_reads_message   ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_comm_recip_user     ON public.communication_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_recip_message  ON public.communication_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_rem_rules_active    ON public.reminder_rules(is_active);

-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE public.communication_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recipients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- communication_messages ──────────────────────────────────────
-- Senders can read/write their own messages.
-- Recipients can read messages addressed to them.
DROP POLICY IF EXISTS "comm_msg_sender_all"      ON public.communication_messages;
DROP POLICY IF EXISTS "comm_msg_recipient_read"  ON public.communication_messages;

CREATE POLICY "comm_msg_sender_all"
  ON public.communication_messages FOR ALL
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "comm_msg_recipient_read"
  ON public.communication_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.communication_recipients cr
      WHERE cr.message_id = id AND cr.user_id = auth.uid()
    )
  );

-- message_reads ───────────────────────────────────────────────
DROP POLICY IF EXISTS "msg_reads_own" ON public.message_reads;
CREATE POLICY "msg_reads_own"
  ON public.message_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- communication_recipients ────────────────────────────────────
DROP POLICY IF EXISTS "comm_recip_own_read" ON public.communication_recipients;
CREATE POLICY "comm_recip_own_read"
  ON public.communication_recipients FOR SELECT
  USING (user_id = auth.uid());

-- communication_templates ─────────────────────────────────────
DROP POLICY IF EXISTS "comm_tpl_read"         ON public.communication_templates;
DROP POLICY IF EXISTS "comm_tpl_manage_own"   ON public.communication_templates;

CREATE POLICY "comm_tpl_read"
  ON public.communication_templates FOR SELECT
  USING (is_global = true OR created_by = auth.uid());

CREATE POLICY "comm_tpl_manage_own"
  ON public.communication_templates FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- communication_campaigns ─────────────────────────────────────
DROP POLICY IF EXISTS "comm_camp_own" ON public.communication_campaigns;
CREATE POLICY "comm_camp_own"
  ON public.communication_campaigns FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- reminder_rules ──────────────────────────────────────────────
DROP POLICY IF EXISTS "rem_rules_read"        ON public.reminder_rules;
DROP POLICY IF EXISTS "rem_rules_manage_own"  ON public.reminder_rules;

CREATE POLICY "rem_rules_read"
  ON public.reminder_rules FOR SELECT
  USING (true);

CREATE POLICY "rem_rules_manage_own"
  ON public.reminder_rules FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- notification_preferences ────────────────────────────────────
DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_own"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Updated-at trigger (reuse or create)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_comm_messages_updated_at
    BEFORE UPDATE ON public.communication_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_comm_templates_updated_at
    BEFORE UPDATE ON public.communication_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_comm_campaigns_updated_at
    BEFORE UPDATE ON public.communication_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_reminder_rules_updated_at
    BEFORE UPDATE ON public.reminder_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_notif_prefs_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Seed default reminder rules (idempotent)
-- Inserted without created_by — service role will manage these.
-- We skip seeding since we don't know admin UUID at migration time.
-- Admins create rules via the UI on first login.
-- ============================================================

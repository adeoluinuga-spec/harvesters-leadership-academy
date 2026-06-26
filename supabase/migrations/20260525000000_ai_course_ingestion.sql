-- AI Course Ingestion: stores raw inputs and generated payloads for the
-- AI Course Builder workflow before admin review and publish.

CREATE TABLE IF NOT EXISTS public.ai_course_generations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type    TEXT        NOT NULL
                   CHECK (source_type IN ('youtube','vimeo','transcript_text','transcript_file')),
  source_url     TEXT,
  transcript     TEXT,
  generated_payload JSONB   NOT NULL DEFAULT '{}'::JSONB,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_course_generations ENABLE ROW LEVEL SECURITY;

-- Only Super Admins and Platform Super Admins can access generation records
DROP POLICY IF EXISTS "Admins can manage ai_course_generations" ON public.ai_course_generations;
CREATE POLICY "Admins can manage ai_course_generations"
  ON public.ai_course_generations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('Platform Super Admin', 'Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('Platform Super Admin', 'Super Admin', 'Admin')
    )
  );

-- Index for listing by creator
CREATE INDEX IF NOT EXISTS ai_course_generations_created_by_idx
  ON public.ai_course_generations (created_by, created_at DESC);

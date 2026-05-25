-- Backfill any auth.users rows that are missing from public.users.
--
-- This is safe to run multiple times — ON CONFLICT (id) DO NOTHING means
-- existing public.users rows are never touched.
--
-- When to run this:
--   • Users signed up before the on_auth_user_created trigger was deployed.
--   • The trigger was temporarily broken or bypassed.
--   • Any other reason auth.users and public.users fell out of sync.
--
-- Role logic:
--   If raw_user_meta_data carries a role, use it.
--   Otherwise default to 'Cell Leader', because the Platform Super Admin
--   row already exists in public.users and is excluded by the WHERE clause.

INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_url,
  designation,
  role,
  onboarding_completed,
  is_active,
  campus_id,
  subgroup_id,
  group_id,
  organization_id,
  created_at
)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(BTRIM(au.raw_user_meta_data->>'full_name'), ''),
    au.email
  ),
  NULLIF(BTRIM(au.raw_user_meta_data->>'avatar_url'), ''),
  COALESCE(
    NULLIF(BTRIM(au.raw_user_meta_data->>'designation'), ''),
    'None'
  ),
  COALESCE(
    NULLIF(BTRIM(au.raw_user_meta_data->>'role'), ''),
    'Cell Leader'
  ),
  false,
  true,
  NULL,  -- campus_id: admin can assign after review
  NULL,  -- subgroup_id
  NULL,  -- group_id
  NULL,  -- organization_id
  COALESCE(au.created_at, timezone('utc', now()))
FROM auth.users AS au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.users AS pu
  WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

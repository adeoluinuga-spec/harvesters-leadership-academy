# Launch Checklist

Use this checklist before promoting Harvesters Leadership Academy to a production audience.

## Configuration

- Production Supabase project exists.
- All files in `supabase/migrations/` have been applied in order.
- Vercel has the production values for every required variable in `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and email provider keys are stored only as server-side secrets.
- Supabase Auth redirect URLs include the production domain and local development URL.
- Storage buckets from migrations are present: `avatars` and `course-thumbnails`.

## Access And Scope

- First `Platform Super Admin` account is assigned.
- Every `Group Admin` has a valid `group_id`.
- Every `Campus Admin` has a valid `campus_id`.
- Unknown or incomplete profiles route to a valid dashboard or onboarding path.
- Scoped admins cannot create, edit, publish, archive, or delete content outside their assigned scope.

## Product Workflows

- Attendee signup, onboarding, and dashboard landing work.
- Course enrollment, lesson playback, progress saving, assessment submission, and certificate generation work.
- YouTube course and lesson videos play on course detail and learner pages.
- Vimeo and direct video links still play for legacy content.
- Admin course creation, editing, lesson management, assessment management, publishing, archiving, and deletion paths work.
- Structure management supports groups, subgroups, campuses, ministry units, and leaders.
- Communications can create messages, campaigns, templates, reminders, and notifications.
- Admin invitations send when Resend is configured.
- AI course builder works with `AI_COURSE_PROVIDER=openai`, or falls back intentionally with `AI_COURSE_PROVIDER=local`.

## Verification

- `npm run test` passes.
- `npm run build` passes.
- `npm run smoke` passes.
- GitHub smoke workflow is green on `main`.
- `npm run lint` result is reviewed; remaining lint debt is accepted or fixed before strict launch.

## Data And Security

- No demo or mock course data is required for production screens.
- No secrets are committed.
- RLS policies are enabled on application tables.
- Admin activity events are visible enough for operational review.
- Deleting courses with learner history archives them instead of destroying progress records.

## Rollout

- Production URL is verified after deployment.
- A small pilot group completes the attendee and admin journeys.
- Support owner and escalation path are agreed before inviting the wider audience.

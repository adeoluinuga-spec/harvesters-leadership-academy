# Harvesters Leadership Academy — Project Bible

**Status:** active build  
**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase, OpenAI  
**Primary organisation:** Harvesters International Christian Centre

## 1. Product north star

Harvesters Leadership Academy is a role-aware leadership growth ecosystem for a church/ministry network. It combines structured learning, assessment and certification with pastoral visibility into the health and development of leaders across a ministry hierarchy.

The product should make three things feel natural:

1. Leaders can find, complete and prove the right learning for their current and aspiring ministry role.
2. Pastoral leaders can see the learning health of the people and units entrusted to them.
3. Platform administrators can operate the hierarchy, learning catalogue and communication programme from one place.

## 2. Users, hierarchy and authority

### Leadership structure

`Organisation → Group → Subgroup → Campus → Direction → Team/District → Sub-Team/Community → Department/Zone → Unit/Area → Cell`

Every learner belongs to a campus. The campus discipleship structure is represented by `ministry_units`, whose parent-child rules are enforced in the database.

| Layer | Typical leader | Who belongs beneath it |
| --- | --- | --- |
| Direction | Directional Leader | Teams/Districts |
| Team/District | Pastoral or District Leader | Sub-Teams/Communities |
| Sub-Team/Community | Sub-Team Head or Community Leader | Departments/Zones |
| Department/Zone | HOD or Zonal Leader | Units/Areas and Workers |
| Unit/Area | Assistant HOD or Area Leader | Cells |
| Cell | Cell Leader | Members |

Account types are separate from leadership roles: **Attendee** (campus only), **Member** (Cell), **Worker** (Department/Zone or Unit/Area), and **Leader**. A member or worker’s direct leader is derived from their selected structure unit.

### Role families

| Family | Roles represented in the app | Primary responsibility |
| --- | --- | --- |
| Platform administration | Platform Super Admin, Super Admin, Admin | Tenant governance, hierarchy administration, catalogue operations, platform analytics and communication administration. |
| Scoped operations | Group Admin, Campus Admin | Chief-of-staff authority within the assigned Group or Campus only. |
| Senior pastoral oversight | Group Pastor, Sub-Group Pastor, Campus Pastor | Pastoral oversight of the corresponding ministry scope. |
| Directional/departmental oversight | Directional Leader, District Pastor / Pastoral Leader | Oversight across directional leadership layers. |
| Frontline leadership | Community Leader, Area Leader, Zonal Leader / HOD, Cell Leader / Assistant HOD, Leader | Personal learning and the relevant local leadership journey. |

`Super Admin` and `Admin` are treated in much of the code as platform-admin aliases. The canonical modern role is `Platform Super Admin`.

### Access model

- Client pages use `ProtectedRoute` to require a valid Supabase session and an allowed role.
- Incomplete ordinary profiles are redirected to onboarding.
- Server APIs independently check roles/scopes before returning admin, hierarchy, LMS or communication data.
- Supabase Row Level Security policies enforce user, hierarchy and administrative boundaries at the data layer.
- Service-role access is used only in server-side administrative helpers.

## 3. Core product areas

### Identity and onboarding

- Email/password signup and login using Supabase Auth.
- Password-reset flow.
- Automatic `public.users` profile provisioning for Auth users.
- Onboarding captures identity details, campus, ministry role, current leadership role, aspiration and years in ministry.
- Campus Pastor assignment is protected against duplicate campus claims.
- Onboarding distinguishes Attendees, Cell Members, Workers, and Leaders.

### Learning Management System

- Course catalogue with role/leadership-level visibility controls.
- Course detail, enrolment, modules and lessons.
- Lesson video playback; Vimeo URLs are supported.
- Lesson progress and notes.
- Assessments, questions, attempts and results.
- Certificate generation, certificate view and public verification by certificate number.
- Admin course creation, editing, lesson/module management, thumbnails, publishing/status actions and assessment building.
- Course ownership is scoped to platform, group, or campus; Group and Campus Admins can manage only their own scope.

### AI-assisted course development

- Admin AI Course Builder and Course Intelligence screens.
- An API route uses the configured OpenAI key to ingest/generate course material and assessments.
- AI generation records are retained in `ai_course_generations` for authorised admins.

### Hierarchy and oversight

- Platform, group, subgroup and campus dashboards.
- Hierarchy explorer and scoped leader views.
- Performance/learning oversight components for campus and subgroup levels.
- Admin operations for users, campuses, groups and subgroups.
- Structure Management at `/dashboard/admin/structure` builds the campus pathway from Directions through Cells.
- Analytics, leadership metrics and activity events.

### Communications

- Announcements/messages, recipient targeting, read tracking and notifications.
- Campaigns, reusable templates and reminder rules.
- Communication analytics.
- Audience selection is intended to follow the ministry hierarchy and administrative permissions.

## 4. Key user journeys

### A new leader

`Sign up → verify/create profile → onboarding → dashboard → browse courses → enrol → learn → complete assessment → receive/view certificate`

### A campus or pastoral leader

`Sign in → scoped dashboard → inspect leader/course performance → communicate with scope → support learning completion`

### A Platform Super Admin

`Sign in → admin dashboard → manage organisation hierarchy/users → create or publish courses → build assessments/AI-assisted content → review activity and analytics → send communications`

## 5. Application map

### Public and account pages

- `/` redirects to `/dashboard`.
- `/login`, `/signup`, `/onboarding`, `/invitation`, `/access-denied`
- `/verify/[certNumber]` is the public certificate-verification endpoint/page.

### Learning pages

- `/courses`, `/courses/[id]`, `/courses/[id]/learn`, `/courses/[id]/certificate`
- `/assessments`, `/certificates`, `/ai-course-intelligence`
- `/dashboard/admin/courses/*` for course, lesson and assessment administration.

### Dashboard and operations pages

- `/dashboard` routes users to the appropriate role dashboard.
- `/dashboard/admin/*` covers admin home, users/activity, campuses/groups/subgroups, structure management, courses and AI Course Builder.
- `/dashboard/campus`, `/dashboard/group`, `/dashboard/subgroup`, `/dashboard/community`, `/dashboard/directional`, `/dashboard/leader`
- Legacy/direct role dashboard routes also exist: `/campus-dashboard`, `/group-dashboard`, `/subgroup-dashboard`, `/directional-dashboard`, `/leader-dashboard`.
- `/analytics`, `/notifications`, `/users`, `/leaders/[id]`.

### Communication pages

- `/dashboard/comms`
- `/dashboard/comms/announcements`, `/campaigns`, `/templates`, `/reminders`, `/analytics`

### API domains

- `/api/auth/*` — profile, campus lookup and onboarding.
- `/api/lms/*` — enrolment, progress, assessment and course-admin actions.
- `/api/admin/*` — administrative users, hierarchy units, activity and stats.
- `/api/hierarchy/*` — role/scope-aware hierarchy reads.
- `/api/comms/*` — messages, campaigns, templates, reminders and communication analytics.
- `/api/analytics/event`, `/api/notifications`, `/api/ai-course-builder`.

## 6. Data model

### Foundational identity and tenancy

- `auth.users` — Supabase-managed authentication accounts.
- `public.users` — academy profile, role and hierarchical assignments.
- `organizations` — tenant/organisation records.
- `groups`, `subgroups`, `campuses` — ministry structure.
- `ministry_units` — Directions through Cells, their parent-child relationship, and designated leaders.
- `public.users.account_type`, `ministry_unit_id`, `direct_leader_id` — attendee/member/worker/leader assignment.
- `roles` / departments are referenced as lookup relationships where present.

### LMS

- `courses`, `course_modules`, `lessons`
- `enrollments`, `lesson_progress`, `lesson_notes`
- `assessments`, `assessment_questions`, `assessment_attempts`
- `certificates`
- `ai_course_generations`
- `course_audiences`; `courses.management_scope`, `group_id`, and `campus_id` for scoped course ownership and delivery.

### Oversight and communications

- `activity_events`
- `leadership_metrics`, `campus_metrics`, `subgroup_metrics`, `group_metrics`
- `leadership_pathways`
- `notifications`
- `communication_messages`, `communication_recipients`, `message_reads`
- `communication_templates`, `communication_campaigns`, `reminder_rules`, `notification_preferences`

Database change history lives in `supabase/migrations/`; `phase3-migration.sql` contains earlier dashboard/metric additions that should be reconciled with the migration history before production rollout.

## 7. Integrations and secrets

| Integration | Purpose | Configuration |
| --- | --- | --- |
| Supabase | Auth, Postgres, RLS and storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| OpenAI | AI course ingestion/generation | `OPENAI_API_KEY` |
| Vimeo | Course video playback when Vimeo links are used | video URLs; no dedicated environment variable currently found |
| Resend | Branded leadership invitations and communication email delivery | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_REPLY_TO` |

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, database passwords or user passwords to the client, source control or documentation.

## 8. Current engineering state

### What is strong

- The app has a coherent domain model: hierarchy, learning, oversight and communications reinforce each other.
- The database has explicit RLS policies rather than relying solely on UI role checks.
- The product already has a broad set of real pages and server APIs rather than mock-only screens.

### Immediate technical debt

The current production build passes (`npm run build`). The lint check still has pre-existing React-effect, unused-code, and formatting warnings/errors that should be resolved before release hardening.

The README is still the stock Next.js README and should eventually be replaced or point here.

## 9. Operating principles

1. **Scope every action.** A leader should only see their permitted ministry level and descendants.
2. **Keep the canonical role vocabulary clean.** Prefer `Platform Super Admin` over legacy aliases in new work.
3. **Enforce in the database and the server.** UI checks improve experience; RLS/server checks protect data.
4. **Treat learning completion as evidence.** Progress, assessments and certificates should remain auditable.
5. **Do not let AI publish unchecked learning.** Generated content should remain an authorised-editor workflow.
6. **Keep secrets out of logs, documentation and client bundles.**

## 10. Recommended next sequence

1. Assign the first Group Admin and Campus Admin users with their matching `group_id` or `campus_id`.
2. Populate each campus structure in Structure Management.
3. Fix the remaining lint failures and add scope-focused end-to-end tests.
4. Replace the default README with a short setup guide that links to this Bible.

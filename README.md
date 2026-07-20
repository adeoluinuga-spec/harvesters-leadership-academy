# Harvesters Leadership Academy

Harvesters Leadership Academy is a Next.js learning and leadership operations platform for Harvesters ministry teams. It combines role-based dashboards, scoped administration, LMS course delivery, hierarchy oversight, communications, certificates, and AI-assisted course building.

For the deeper product and technical map, read [PROJECT_BIBLE.md](PROJECT_BIBLE.md).

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, Postgres, RLS, and Storage
- Tailwind CSS 4
- OpenAI-backed AI course generation, with a local transcript parser fallback
- Resend for invitation and communication email delivery
- YouTube-first hosted video playback, with Vimeo and direct video compatibility

## Requirements

- Node.js 22 or newer
- npm
- Supabase project access
- Vercel project access for deployment

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from the safe template:

```bash
cp .env.example .env.local
```

3. Fill in the Supabase values and any optional integration keys.

4. Run the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Environment Variables

Required for the app to connect to Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended for production:

- `OPENAI_API_KEY`
- `AI_COURSE_PROVIDER`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and Resend keys are server-only secrets. Do not expose them in client code, logs, screenshots, or committed files.

## Supabase Setup

Apply the migrations in `supabase/migrations/` to a Supabase project before using the app. These migrations define the LMS, hierarchy, communication, scoped admin, invitations, RLS policies, triggers, and storage buckets.

Important storage buckets created by migrations:

- `avatars`
- `course-thumbnails`

After the first real admin account exists, assign the appropriate role and scope in `public.users`:

- `Platform Super Admin`: global platform access
- `Group Admin`: requires a valid `group_id`
- `Campus Admin`: requires a valid `campus_id`

Then populate structure records in this order:

1. Groups
2. Subgroups
3. Campuses
4. Ministry units
5. Leaders and members

## Scripts

```bash
npm run dev      # start local development
npm run test     # run regression checks
npm run build    # create a production build
npm run smoke    # run tests and production build
npm run lint     # run ESLint
```

`npm run smoke` is the minimum pre-deploy check.

## Deployment

The app is intended to deploy on Vercel.

1. Connect the GitHub repository to Vercel.
2. Set the same environment variables from `.env.example` in Vercel project settings.
3. Confirm the Supabase production project has all migrations applied.
4. Run `npm run smoke` locally before merging release changes.
5. Deploy from `main`.

The GitHub smoke workflow runs tests and `next build` on pushes and pull requests to `main`.

## Launch Checklist

- Supabase production migrations applied.
- RLS policies reviewed for the production project.
- First `Platform Super Admin` assigned.
- Group and campus admin users assigned with matching scope IDs.
- Course thumbnails upload correctly.
- YouTube course and lesson videos play on public and learner pages.
- OpenAI provider configured or `AI_COURSE_PROVIDER=local` selected.
- Resend configured if invitation and email delivery are needed.
- `npm run smoke` passes.
- Known lint cleanup is either resolved or explicitly accepted for launch.

## Known Follow-Up

The production build and regression tests pass. `npm run lint` still has pre-existing cleanup work noted in [PROJECT_BIBLE.md](PROJECT_BIBLE.md); treat that as the next hardening item before a stricter launch gate.

-- ============================================================
-- LMS Engine: Core Tables, RLS, and Seed Data
-- ============================================================

-- Courses
create table if not exists public.courses (
  id                uuid        primary key default gen_random_uuid(),
  organization_id   uuid        references public.organizations(id) on delete set null,
  slug              text        not null unique,
  title             text        not null,
  description       text,
  thumbnail_url     text,
  category          text        not null default 'General',
  level             text        not null default 'All leaders',
  instructor_name   text        not null default 'Academy Instructor',
  instructor_title  text,
  duration_minutes  int         not null default 0,
  is_published      boolean     not null default false,
  is_featured       boolean     not null default false,
  created_by        uuid        references auth.users(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

-- Modules (optional groupings of lessons)
create table if not exists public.course_modules (
  id          uuid        primary key default gen_random_uuid(),
  course_id   uuid        not null references public.courses(id) on delete cascade,
  title       text        not null,
  description text,
  order_index int         not null default 0,
  created_at  timestamptz not null default timezone('utc', now())
);

-- Lessons
create table if not exists public.lessons (
  id                  uuid        primary key default gen_random_uuid(),
  course_id           uuid        not null references public.courses(id) on delete cascade,
  module_id           uuid        references public.course_modules(id) on delete set null,
  title               text        not null,
  description         text,
  video_url           text,
  duration_seconds    int         not null default 0,
  transcript          text,
  resources           jsonb       not null default '[]'::jsonb,
  order_index         int         not null default 0,
  is_preview          boolean     not null default false,
  has_checkpoint      boolean     not null default false,
  checkpoint_question text,
  created_at          timestamptz not null default timezone('utc', now())
);

-- Enrollments
create table if not exists public.enrollments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  course_id   uuid        not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default timezone('utc', now()),
  unique(user_id, course_id)
);

-- Lesson progress
create table if not exists public.lesson_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  lesson_id     uuid        not null references public.lessons(id) on delete cascade,
  course_id     uuid        not null references public.courses(id) on delete cascade,
  completed     boolean     not null default false,
  completed_at  timestamptz,
  watch_seconds int         not null default 0,
  updated_at    timestamptz not null default timezone('utc', now()),
  unique(user_id, lesson_id)
);

-- Assessments (one per course)
create table if not exists public.assessments (
  id            uuid    primary key default gen_random_uuid(),
  course_id     uuid    not null references public.courses(id) on delete cascade,
  title         text    not null default 'Course Assessment',
  passing_score int     not null default 70,
  is_required   boolean not null default false,
  created_at    timestamptz not null default timezone('utc', now()),
  unique(course_id)
);

-- Assessment questions
create table if not exists public.assessment_questions (
  id            uuid  primary key default gen_random_uuid(),
  assessment_id uuid  not null references public.assessments(id) on delete cascade,
  question      text  not null,
  options       jsonb not null default '[]'::jsonb,
  correct_option int  not null default 0,
  explanation   text,
  order_index   int   not null default 0
);

-- Assessment attempts
create table if not exists public.assessment_attempts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  assessment_id uuid        not null references public.assessments(id) on delete cascade,
  course_id     uuid        not null references public.courses(id) on delete cascade,
  score         int         not null default 0,
  passed        boolean     not null default false,
  answers       jsonb       not null default '{}'::jsonb,
  attempted_at  timestamptz not null default timezone('utc', now())
);

-- Certificates
create table if not exists public.certificates (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  course_id          uuid        not null references public.courses(id) on delete cascade,
  issued_at          timestamptz not null default timezone('utc', now()),
  certificate_number text        not null,
  unique(user_id, course_id),
  unique(certificate_number)
);

-- Lesson notes
create table if not exists public.lesson_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Indexes
-- ============================================================
-- Existing installations may have received the LMS tables before tenant
-- support. Upgrade the live table before creating tenant-aware indexes.
alter table public.courses
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists description text,
  add column if not exists thumbnail_url text,
  add column if not exists category text not null default 'General',
  add column if not exists level text not null default 'All leaders',
  add column if not exists instructor_name text not null default 'Academy Instructor',
  add column if not exists instructor_title text,
  add column if not exists duration_minutes integer not null default 0,
  add column if not exists is_published boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.course_modules
  add column if not exists description text,
  add column if not exists order_index integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.lessons
  add column if not exists module_id uuid references public.course_modules(id) on delete set null,
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists transcript text,
  add column if not exists resources jsonb not null default '[]'::jsonb,
  add column if not exists order_index integer not null default 0,
  add column if not exists is_preview boolean not null default false,
  add column if not exists has_checkpoint boolean not null default false,
  add column if not exists checkpoint_question text,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.assessments
  add column if not exists is_required boolean not null default false,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.assessment_questions
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists correct_option integer not null default 0,
  add column if not exists explanation text,
  add column if not exists order_index integer not null default 0;

create index if not exists courses_slug_idx              on public.courses(slug);
create index if not exists courses_org_idx               on public.courses(organization_id);
create index if not exists courses_published_idx         on public.courses(is_published);
create index if not exists lessons_course_id_idx         on public.lessons(course_id);
create index if not exists lessons_order_idx             on public.lessons(course_id, order_index);
create index if not exists enrollments_user_id_idx       on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx     on public.enrollments(course_id);
create index if not exists lesson_progress_user_idx      on public.lesson_progress(user_id, course_id);
create index if not exists assessment_attempts_user_idx  on public.assessment_attempts(user_id, course_id);
create index if not exists certificates_user_idx         on public.certificates(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.courses              enable row level security;
alter table public.course_modules       enable row level security;
alter table public.lessons              enable row level security;
alter table public.enrollments          enable row level security;
alter table public.lesson_progress      enable row level security;
alter table public.assessments          enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_attempts  enable row level security;
alter table public.certificates         enable row level security;
alter table public.lesson_notes         enable row level security;

-- Courses: published courses readable by any authenticated user; admins can manage
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='courses' and policyname='Courses: authenticated read') then
    create policy "Courses: authenticated read"
      on public.courses for select
      using (
        auth.uid() is not null
        and (
          is_published = true
          or created_by = auth.uid()
          or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin')
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='courses' and policyname='Courses: admin manage') then
    create policy "Courses: admin manage"
      on public.courses for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Modules
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='course_modules' and policyname='Modules: authenticated read') then
    create policy "Modules: authenticated read"
      on public.course_modules for select
      using (
        auth.uid() is not null
        and exists (
          select 1 from public.courses c
          where c.id = course_modules.course_id
          and (c.is_published = true or c.created_by = auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='course_modules' and policyname='Modules: admin manage') then
    create policy "Modules: admin manage"
      on public.course_modules for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Lessons
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lessons' and policyname='Lessons: authenticated read') then
    create policy "Lessons: authenticated read"
      on public.lessons for select
      using (
        auth.uid() is not null
        and exists (
          select 1 from public.courses c
          where c.id = lessons.course_id
          and (c.is_published = true or c.created_by = auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lessons' and policyname='Lessons: admin manage') then
    create policy "Lessons: admin manage"
      on public.lessons for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Enrollments
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enrollments' and policyname='Enrollments: own read') then
    create policy "Enrollments: own read"   on public.enrollments for select   using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enrollments' and policyname='Enrollments: own insert') then
    create policy "Enrollments: own insert" on public.enrollments for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enrollments' and policyname='Enrollments: admin manage') then
    create policy "Enrollments: admin manage"
      on public.enrollments for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Lesson progress
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_progress' and policyname='Progress: own manage') then
    create policy "Progress: own manage"
      on public.lesson_progress for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end; $$;

-- Assessments
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Assessments: authenticated read') then
    create policy "Assessments: authenticated read" on public.assessments for select using (auth.uid() is not null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Assessments: admin manage') then
    create policy "Assessments: admin manage"
      on public.assessments for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessment_questions' and policyname='Questions: authenticated read') then
    create policy "Questions: authenticated read" on public.assessment_questions for select using (auth.uid() is not null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessment_questions' and policyname='Questions: admin manage') then
    create policy "Questions: admin manage"
      on public.assessment_questions for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Assessment attempts
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessment_attempts' and policyname='Attempts: own read') then
    create policy "Attempts: own read"   on public.assessment_attempts for select   using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessment_attempts' and policyname='Attempts: own insert') then
    create policy "Attempts: own insert" on public.assessment_attempts for insert with check (auth.uid() = user_id);
  end if;
end; $$;

-- Certificates
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='certificates' and policyname='Certificates: own read') then
    create policy "Certificates: own read"   on public.certificates for select   using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='certificates' and policyname='Certificates: own insert') then
    create policy "Certificates: own insert" on public.certificates for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='certificates' and policyname='Certificates: admin manage') then
    create policy "Certificates: admin manage"
      on public.certificates for all
      using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'))
      with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'Platform Super Admin'));
  end if;
end; $$;

-- Notes
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_notes' and policyname='Notes: own manage') then
    create policy "Notes: own manage"
      on public.lesson_notes for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end; $$;

-- ============================================================
-- Seed: 6 platform courses (matching course-data.ts slugs)
-- ============================================================
insert into public.courses (id, slug, title, description, thumbnail_url, category, level, instructor_name, duration_minutes, is_published, is_featured)
values
  ('a1000000-0000-0000-0000-000000000001', 'executive-ministry-leadership',    'Executive Ministry Leadership',    'A strategic leadership track for senior ministry leaders building clarity, culture, and execution across campuses.', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80', 'Leadership',      'Senior leaders',  'Pastor Bolaji Idowu',   400, true, true ),
  ('a1000000-0000-0000-0000-000000000002', 'culture-teams-stewardship',        'Culture, Teams and Stewardship',   'Build operating rhythms that help leaders steward people, systems, and ministry momentum with maturity.',          'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80', 'Operations',      'Directors',       'Pastor Mayowa',         495, true, false),
  ('a1000000-0000-0000-0000-000000000003', 'discipleship-systems-masterclass', 'Discipleship Systems Masterclass', 'A practical framework for designing repeatable discipleship journeys that scale without losing pastoral care.',    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', 'Discipleship',    'Campus teams',    'Pastor Funke Adeyemi',  325, true, true ),
  ('a1000000-0000-0000-0000-000000000004', 'pastoral-care-intelligence',       'Pastoral Care Intelligence',       'Equip care leaders with structured listening, escalation, and follow-up practices for healthier communities.',    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80', 'Care',            'Team leads',      'Pastor Tola Martins',   290, true, false),
  ('a1000000-0000-0000-0000-000000000005', 'volunteer-excellence-framework',   'Volunteer Excellence Framework',   'Create a premium volunteer experience with onboarding, coaching, accountability, and meaningful service pathways.','https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80', 'Volunteer Growth','Coordinators',    'Kemi Johnson',          425, true, false),
  ('a1000000-0000-0000-0000-000000000006', 'assessment-design-for-leaders',    'Assessment Design for Leaders',    'Design assessments that measure ministry readiness, leadership growth, and practical execution.',                  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', 'Assessment',      'Academy admins',  'Dr. Niyi Adebayo',      225, true, false)
on conflict (id) do update
  set title           = excluded.title,
      description     = excluded.description,
      thumbnail_url   = excluded.thumbnail_url,
      category        = excluded.category,
      level           = excluded.level,
      instructor_name = excluded.instructor_name,
      duration_minutes= excluded.duration_minutes,
      is_published    = excluded.is_published,
      is_featured     = excluded.is_featured;

-- ============================================================
-- Seed: Lessons for Executive Ministry Leadership (course 1)
-- ============================================================
insert into public.lessons (id, course_id, title, description, video_url, duration_seconds, order_index, has_checkpoint, checkpoint_question, transcript)
values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'The leader as a steward of spiritual culture',
   'Establishing the foundation of ministry leadership as sacred stewardship.',
   null, 1122, 1, true,
   'What is the primary responsibility of a ministry leader as a steward of spiritual culture?',
   'In this opening session, we establish the foundational premise of ministry leadership: that every leader is first and foremost a steward, not an owner. The culture you protect is not yours — it belongs to God and to the people in your care. We explore how this posture changes decision-making, team dynamics, and long-term ministry health.'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Decision clarity under ministry pressure',
   'Tools and frameworks for making clear decisions when the stakes are high.',
   null, 1456, 2, true,
   'What decision-making framework helps leaders maintain clarity under ministry pressure?',
   'Ministry leaders face constant pressure to decide — and decide fast. This lesson introduces the Clarity-Courage-Commitment framework for leadership decisions. We examine how to distinguish between urgent and important, how to communicate decisions with pastoral sensitivity, and how to create accountability without fear.'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',
   'Leading teams through measurable rhythms',
   'Creating consistent operating rhythms that multiply leadership capacity.',
   null, 1268, 3, false, null,
   'Great teams are built on great rhythms. This session covers weekly standups, monthly reviews, and quarterly recalibrations that keep ministry teams aligned without micromanagement. We look at how the best campus teams use rhythm as a leadership language.'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001',
   'Coaching leaders with pastoral intelligence',
   'Developing the people around you through intentional pastoral coaching.',
   null, 1713, 4, true,
   'How does pastoral intelligence differ from standard management coaching?',
   'Coaching in a ministry context requires a unique blend of spiritual discernment and practical leadership skills. We call this pastoral intelligence: the ability to see a leader''s full person — their calling, their wounds, their potential — and meet them there. This lesson provides coaching frameworks designed for ministry contexts.'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001',
   'Assessment readiness and certificate review',
   'Preparing for the course assessment and understanding certification requirements.',
   null, 980, 5, false, null,
   'This final lesson reviews the key principles covered throughout the course and prepares you for the final assessment. We revisit stewardship, decision clarity, team rhythms, and coaching frameworks through the lens of practical application in your specific ministry context.')
on conflict do nothing;

-- ============================================================
-- Seed: Assessment for Executive Ministry Leadership
-- ============================================================
insert into public.assessments (id, course_id, title, passing_score, is_required)
values ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Executive Ministry Leadership Assessment', 70, true)
on conflict (course_id) do nothing;

insert into public.assessment_questions (assessment_id, question, options, correct_option, explanation, order_index)
values
  ('c1000000-0000-0000-0000-000000000001',
   'A ministry leader''s primary identity should be that of:',
   '["An owner who builds their vision", "A steward who protects God''s culture", "A manager who optimizes performance", "A visionary who inspires change"]'::jsonb,
   1, 'Ministry leaders are stewards, not owners. The culture belongs to God and the people in your care.', 0),
  ('c1000000-0000-0000-0000-000000000001',
   'The Clarity-Courage-Commitment framework is used for:',
   '["Financial planning", "Decision-making under pressure", "Team building", "Performance reviews"]'::jsonb,
   1, 'The framework helps leaders make clear, courageous decisions when the stakes are high and time is short.', 1),
  ('c1000000-0000-0000-0000-000000000001',
   'What distinguishes pastoral coaching from standard management coaching?',
   '["It focuses only on spiritual disciplines", "It ignores practical leadership skills", "It integrates spiritual discernment with practical leadership", "It is only for senior pastors"]'::jsonb,
   2, 'Pastoral intelligence combines spiritual discernment with practical leadership to see and develop the whole person.', 2),
  ('c1000000-0000-0000-0000-000000000001',
   'Healthy ministry team rhythms are best described as:',
   '["Rigid schedules that restrict creativity", "Leadership language that keeps teams aligned without micromanagement", "Management tools imported from corporate culture", "Occasional check-ins when problems arise"]'::jsonb,
   1, 'Team rhythms function as a leadership language — a shared cadence that creates alignment and momentum.', 3),
  ('c1000000-0000-0000-0000-000000000001',
   'A certificate is awarded after completing:',
   '["Watching the first lesson", "50% of lessons", "90% or more of lessons and passing the assessment", "Paying a certification fee"]'::jsonb,
   2, 'Certificates are earned by completing 90%+ of lessons and achieving the minimum passing score on the assessment.', 4)
on conflict do nothing;

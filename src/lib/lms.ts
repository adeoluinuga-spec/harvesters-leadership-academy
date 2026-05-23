import { createClient } from "@/lib/client";
import type {
  CourseWithLessons,
  CourseWithProgress,
  LMSAssessment,
  LMSAttempt,
  LMSCertificate,
  LMSCourse,
  LMSLesson,
  LMSModule,
  LMSNote,
} from "@/lib/lms-types";

// ============================================================
// Leadership hierarchy for course visibility filtering
// ============================================================

const LEADERSHIP_LEVEL: Record<string, number> = {
  "Cell Leader": 0,
  "Assistant HOD": 0,
  "Cell Leader / Assistant HOD": 0,
  "Zonal Leader": 1,
  "HOD": 1,
  "Zonal Leader / HOD": 1,
  "Community Leader": 2,
  "Area Leader": 3,
  "District Pastor": 3,
  "Pastoral Leader": 3,
  "District Pastor / Pastoral Leader": 3,
  "Directional Leader": 4,
  "Campus Pastor": 5,
  "Campus Admin": 5,
  "Sub-Group Pastor": 6,
  "Subgroup Pastor": 6,
  "Sub-group Pastor": 6,
  "Group Pastor": 7,
  "Super Admin": 8,
  "Admin": 8,
  "Platform Super Admin": 8,
};

export function getLeadershipLevel(role: string): number {
  return LEADERSHIP_LEVEL[role] ?? 0;
}

// Sentinel values that mean "visible to all authenticated leaders"
const ALL_LEADERS_TARGETS = new Set([
  "All Leaders",
  "All leaders",
  "all leaders",
  "All",
]);

// Normalise any spelling variant of a role to a single canonical form so that
// target matching works regardless of how the role was stored.
function normalizeRoleForCourse(role: string): string {
  // Sub-Group Pastor variants
  if (role === "Sub-Group Pastor" || role === "Subgroup Pastor" || role === "Sub-group Pastor") {
    return "Sub-Group Pastor";
  }
  // Cell Leader variants
  if (role === "Cell Leader" || role === "Assistant HOD" || role === "Cell Leader / Assistant HOD") {
    return "Cell Leader / Assistant HOD";
  }
  // Zonal Leader variants
  if (role === "Zonal Leader" || role === "HOD" || role === "Zonal Leader / HOD") {
    return "Zonal Leader / HOD";
  }
  // District Pastor variants
  if (
    role === "District Pastor" ||
    role === "Pastoral Leader" ||
    role === "District Pastor / Pastoral Leader"
  ) {
    return "District Pastor / Pastoral Leader";
  }
  return role;
}

export function canUserSeeCourse(userRole: string, targets: string[]): boolean {
  if (!targets || targets.length === 0) return true;
  // Admin-level roles always see every published course
  if (["Platform Super Admin", "Super Admin", "Admin"].includes(userRole)) return true;
  // "All Leaders" wildcard in targets — visible to every leader
  if (targets.some((t) => ALL_LEADERS_TARGETS.has(t))) return true;
  // Role match with full variant normalisation on both sides
  const normalized = normalizeRoleForCourse(userRole);
  return targets.some((t) => normalizeRoleForCourse(t) === normalized);
}

export async function getCurrentUserRole(): Promise<{ role: string; level: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: "", level: 0 };

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = data?.role ?? "";
  return { role, level: getLeadershipLevel(role) };
}

export type CatalogCourses = {
  required: CourseWithProgress[];
  pathway: CourseWithProgress[];
  all: CourseWithProgress[];
  userRole: string;
};

// ============================================================
// Course catalog
// ============================================================

async function fetchAllCoursesWithProgress(userId: string | null): Promise<CourseWithProgress[]> {
  const supabase = createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .or("status.eq.published,is_published.eq.true")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !courses?.length) return [];

  const lessonCounts = await fetchLessonCounts(courses.map((c) => c.id));

  if (!userId) {
    return courses.map((course) => ({
      ...course,
      leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
      lesson_count: lessonCounts.get(course.id) ?? 0,
      enrolled: false,
      progress_percent: 0,
      completed_lessons: 0,
      total_lessons: lessonCounts.get(course.id) ?? 0,
      certificate: null,
      best_attempt: null,
    }));
  }

  const [enrollments, progressRows, certificates, attempts] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("user_id", userId),
    supabase.from("lesson_progress").select("course_id, completed").eq("user_id", userId).eq("completed", true),
    supabase.from("certificates").select("*").eq("user_id", userId),
    supabase.from("assessment_attempts").select("*").eq("user_id", userId).order("attempted_at", { ascending: false }),
  ]);

  const enrolledSet = new Set((enrollments.data ?? []).map((e) => e.course_id));
  const completedByCourse = new Map<string, number>();
  for (const row of progressRows.data ?? []) {
    completedByCourse.set(row.course_id, (completedByCourse.get(row.course_id) ?? 0) + 1);
  }
  const certsByCourse = new Map<string, LMSCertificate>(
    (certificates.data ?? []).map((c) => [c.course_id, c as LMSCertificate])
  );
  const bestAttemptByCourse = new Map<string, LMSAttempt>();
  for (const attempt of attempts.data ?? []) {
    const existing = bestAttemptByCourse.get(attempt.course_id);
    if (!existing || attempt.score > existing.score) {
      bestAttemptByCourse.set(attempt.course_id, attempt as LMSAttempt);
    }
  }

  return courses.map((course) => {
    const total = lessonCounts.get(course.id) ?? 0;
    const completed = completedByCourse.get(course.id) ?? 0;
    return {
      ...course,
      leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
      lesson_count: total,
      enrolled: enrolledSet.has(course.id),
      progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed_lessons: completed,
      total_lessons: total,
      certificate: certsByCourse.get(course.id) ?? null,
      best_attempt: bestAttemptByCourse.get(course.id) ?? null,
    };
  });
}

export async function fetchCoursesWithProgress(): Promise<CourseWithProgress[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return fetchAllCoursesWithProgress(user?.id ?? null);
}

export async function fetchCourseCatalog(): Promise<CatalogCourses> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, userInfo] = await Promise.all([
    fetchAllCoursesWithProgress(user?.id ?? null),
    user
      ? supabase.from("users").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const userRole = (userInfo as { data: { role?: string } | null })?.data?.role ?? "";
  const userLevel = getLeadershipLevel(userRole);

  const visible = all.filter((c) =>
    canUserSeeCourse(userRole, c.leadership_targets ?? [])
  );

  const required = visible.filter((c) => c.is_required);
  const normalizedUserRole = normalizeRoleForCourse(userRole);
  const pathway = visible.filter(
    (c) => !c.is_required && (c.leadership_targets ?? []).some(
      (t) => normalizeRoleForCourse(t) === normalizedUserRole
    )
  );

  return { required, pathway, all: visible, userRole };
}

// ============================================================
// Simple course detail (MVP — no lessons/modules/assessments)
// ============================================================

export type SimpleCourseDetail = LMSCourse & { enrolled: boolean };

export async function fetchSimpleCourseDetail(slug: string): Promise<SimpleCourseDetail | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !course) return null;

  let enrolled = false;
  if (user) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();
    enrolled = Boolean(enr);
  }

  return {
    ...(course as LMSCourse),
    video_url: (course as Record<string, unknown>).video_url as string | null ?? null,
    leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
    enrolled,
  };
}

// ============================================================
// Course detail with lessons
// ============================================================

export async function fetchCourseWithLessons(slug: string): Promise<CourseWithLessons | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !course) return null;

  const [lessonsRes, modulesRes, assessmentRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("*")
      .eq("course_id", course.id)
      .order("order_index"),
    supabase
      .from("course_modules")
      .select("*")
      .eq("course_id", course.id)
      .order("order_index"),
    supabase
      .from("assessments")
      .select("*, assessment_questions(*)")
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  const lessons: LMSLesson[] = (lessonsRes.data ?? []).map((l) => ({
    ...l,
    resources: Array.isArray(l.resources) ? l.resources : [],
  }));

  const modules: LMSModule[] = (modulesRes.data ?? []).map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }));

  let assessment: LMSAssessment | null = null;
  if (assessmentRes.data) {
    const raw = assessmentRes.data as Record<string, unknown>;
    const questions = Array.isArray(raw.assessment_questions) ? raw.assessment_questions : [];
    assessment = {
      id: raw.id as string,
      course_id: raw.course_id as string,
      title: raw.title as string,
      passing_score: raw.passing_score as number,
      is_required: raw.is_required as boolean,
      questions: questions
        .map((q: Record<string, unknown>) => ({
          id: q.id as string,
          assessment_id: q.assessment_id as string,
          question: q.question as string,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          correct_option: q.correct_option as number,
          explanation: (q.explanation as string | null) ?? null,
          order_index: q.order_index as number,
        }))
        .sort((a, b) => a.order_index - b.order_index),
    };
  }

  let enrolled = false;
  const completedIds = new Set<string>();
  let certificate: LMSCertificate | null = null;
  let best_attempt: LMSAttempt | null = null;

  if (user) {
    const [enrollRes, progressRes, certRes, attemptRes] = await Promise.all([
      supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
      supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id).eq("course_id", course.id),
      supabase.from("certificates").select("*").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
      supabase.from("assessment_attempts").select("*").eq("user_id", user.id).eq("course_id", course.id).order("score", { ascending: false }).limit(1).maybeSingle(),
    ]);

    enrolled = Boolean(enrollRes.data);
    for (const row of progressRes.data ?? []) {
      if (row.completed) completedIds.add(row.lesson_id);
    }
    certificate = (certRes.data as LMSCertificate | null) ?? null;
    best_attempt = (attemptRes.data as LMSAttempt | null) ?? null;
  }

  const progressPercent =
    lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0;

  const lessonsWithProgress = lessons.map((l) => ({
    ...l,
    completed: completedIds.has(l.id),
  }));

  return {
    ...course,
    lessons: lessonsWithProgress,
    modules,
    assessment,
    enrolled,
    progress_percent: progressPercent,
    completed_lesson_ids: completedIds,
    certificate,
    best_attempt,
  };
}

// ============================================================
// Certificates
// ============================================================

export async function fetchUserCertificates(): Promise<LMSCertificate[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("certificates")
    .select("*, courses(slug, title, category, level, instructor_name, thumbnail_url)")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      id: raw.id as string,
      user_id: raw.user_id as string,
      course_id: raw.course_id as string,
      issued_at: raw.issued_at as string,
      certificate_number: raw.certificate_number as string,
      course: raw.courses as LMSCertificate["course"],
    };
  });
}

export async function fetchCertificate(courseSlug: string): Promise<LMSCertificate | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const courseRes = await supabase
    .from("courses")
    .select("id, slug, title, category, level, instructor_name, thumbnail_url")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!courseRes.data) return null;

  const { data } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseRes.data.id)
    .maybeSingle();

  if (!data) return null;
  return { ...(data as LMSCertificate), course: courseRes.data };
}

// ============================================================
// Assessment attempts
// ============================================================

export async function fetchUserAttempts(): Promise<
  Array<LMSAttempt & { course: { slug: string; title: string } | null }>
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("assessment_attempts")
    .select("*, courses(slug, title)")
    .eq("user_id", user.id)
    .order("attempted_at", { ascending: false });

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      ...(raw as unknown as LMSAttempt),
      course: raw.courses as { slug: string; title: string } | null,
    };
  });
}

// ============================================================
// Lesson notes
// ============================================================

export async function fetchLessonNotes(lessonId: string): Promise<LMSNote[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("lesson_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  return (data ?? []) as LMSNote[];
}

export async function saveNote(lessonId: string, content: string): Promise<LMSNote | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("lesson_notes")
    .insert({ user_id: user.id, lesson_id: lessonId, content })
    .select("*")
    .single();

  return (data as LMSNote | null) ?? null;
}

// ============================================================
// Helpers
// ============================================================

async function fetchLessonCounts(courseIds: string[]): Promise<Map<string, number>> {
  if (!courseIds.length) return new Map();
  const supabase = createClient();
  const { data } = await supabase
    .from("lessons")
    .select("course_id")
    .in("course_id", courseIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }
  return counts;
}

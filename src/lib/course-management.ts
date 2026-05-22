import { createClient } from "@/lib/client";
import type { AdminCourse, LMSCourse, LMSModule, LMSLesson, CourseStatus, CourseDifficulty } from "@/lib/lms-types";

export type CourseFormData = {
  title: string;
  description: string;
  overview: string;
  thumbnail_url: string;
  instructor_name: string;
  instructor_role: string;
  category: string;
  level: string;
  leadership_targets: string[];
  difficulty_level: CourseDifficulty;
  duration_minutes: number;
  is_required: boolean;
  is_featured: boolean;
  status: CourseStatus;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(title: string): Promise<string> {
  const supabase = createClient();
  const base = slugify(title);
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

export async function fetchAdminCourses(): Promise<AdminCourse[]> {
  const supabase = createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !courses) return [];

  const courseIds = courses.map((c) => c.id);

  const [lessonsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, course_id")
      .in("course_id", courseIds),
    supabase
      .from("enrollments")
      .select("id, course_id")
      .in("course_id", courseIds),
  ]);

  const lessonCounts: Record<string, number> = {};
  const enrollmentCounts: Record<string, number> = {};

  for (const l of lessonsRes.data ?? []) {
    lessonCounts[l.course_id] = (lessonCounts[l.course_id] ?? 0) + 1;
  }
  for (const e of enrollmentsRes.data ?? []) {
    enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] ?? 0) + 1;
  }

  return courses.map((c) => ({
    ...(c as LMSCourse),
    leadership_targets: Array.isArray(c.leadership_targets) ? c.leadership_targets : [],
    lesson_count: lessonCounts[c.id] ?? 0,
    enrollment_count: enrollmentCounts[c.id] ?? 0,
  }));
}

export async function fetchAdminCourseById(id: string): Promise<AdminCourse | null> {
  const supabase = createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!course) return null;

  const [lessonsRes, enrollmentsRes] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", id),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", id),
  ]);

  return {
    ...(course as LMSCourse),
    leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
    lesson_count: lessonsRes.count ?? 0,
    enrollment_count: enrollmentsRes.count ?? 0,
  };
}

export async function createCourse(data: CourseFormData): Promise<{ course: LMSCourse | null; error: string | null }> {
  const supabase = createClient();
  const slug = await generateUniqueSlug(data.title);

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      slug,
      title: data.title.trim(),
      description: data.description.trim() || null,
      overview: data.overview.trim() || null,
      thumbnail_url: data.thumbnail_url.trim() || null,
      category: data.category,
      level: data.level,
      instructor_name: data.instructor_name.trim(),
      instructor_title: data.instructor_role.trim() || null,
      instructor_role: data.instructor_role.trim() || null,
      duration_minutes: data.duration_minutes || 0,
      leadership_targets: data.leadership_targets,
      difficulty_level: data.difficulty_level,
      is_required: data.is_required,
      is_featured: data.is_featured,
      status: data.status,
    })
    .select("*")
    .single();

  if (error) return { course: null, error: error.message };
  return { course: course as LMSCourse, error: null };
}

export async function updateCourse(id: string, data: Partial<CourseFormData>): Promise<{ error: string | null }> {
  const supabase = createClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description.trim() || null;
  if (data.overview !== undefined) payload.overview = data.overview.trim() || null;
  if (data.thumbnail_url !== undefined) payload.thumbnail_url = data.thumbnail_url.trim() || null;
  if (data.category !== undefined) payload.category = data.category;
  if (data.level !== undefined) payload.level = data.level;
  if (data.instructor_name !== undefined) payload.instructor_name = data.instructor_name.trim();
  if (data.instructor_role !== undefined) {
    payload.instructor_title = data.instructor_role.trim() || null;
    payload.instructor_role = data.instructor_role.trim() || null;
  }
  if (data.duration_minutes !== undefined) payload.duration_minutes = data.duration_minutes;
  if (data.leadership_targets !== undefined) payload.leadership_targets = data.leadership_targets;
  if (data.difficulty_level !== undefined) payload.difficulty_level = data.difficulty_level;
  if (data.is_required !== undefined) payload.is_required = data.is_required;
  if (data.is_featured !== undefined) payload.is_featured = data.is_featured;
  if (data.status !== undefined) payload.status = data.status;

  const { error } = await supabase.from("courses").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteCourse(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function changeCourseStatus(id: string, status: CourseStatus): Promise<{ error: string | null }> {
  return updateCourse(id, { status });
}

// ============================================================
// Module management
// ============================================================

export type ModuleFormData = {
  title: string;
  description: string;
};

export type ModuleWithLessons = LMSModule & {
  lessons: LMSLesson[];
};

export async function fetchModulesAndLessons(
  courseId: string
): Promise<{ modules: ModuleWithLessons[]; orphanLessons: LMSLesson[] }> {
  const supabase = createClient();

  const [modulesRes, lessonsRes] = await Promise.all([
    supabase.from("course_modules").select("*").eq("course_id", courseId).order("order_index"),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("order_index"),
  ]);

  const allLessons: LMSLesson[] = (lessonsRes.data ?? []).map((l) => ({
    ...l,
    resources: Array.isArray(l.resources) ? l.resources : [],
  }));

  const modules: ModuleWithLessons[] = (modulesRes.data ?? []).map((m) => ({
    ...m,
    lessons: allLessons.filter((l) => l.module_id === m.id),
  }));

  const orphanLessons = allLessons.filter((l) => !l.module_id);

  return { modules, orphanLessons };
}

export async function createModule(
  courseId: string,
  data: ModuleFormData,
  orderIndex: number
): Promise<{ module: LMSModule | null; error: string | null }> {
  const supabase = createClient();
  const { data: module, error } = await supabase
    .from("course_modules")
    .insert({
      course_id: courseId,
      title: data.title.trim(),
      description: data.description.trim() || null,
      order_index: orderIndex,
    })
    .select("*")
    .single();

  if (error) return { module: null, error: error.message };
  return { module: module as LMSModule, error: null };
}

export async function updateModule(
  id: string,
  data: Partial<ModuleFormData>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description.trim() || null;

  const { error } = await supabase.from("course_modules").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteModule(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("course_modules").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function reorderModules(
  updates: { id: string; order_index: number }[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  for (const u of updates) {
    const { error } = await supabase
      .from("course_modules")
      .update({ order_index: u.order_index })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }
  return { error: null };
}

// ============================================================
// Lesson management
// ============================================================

export type LessonFormData = {
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  transcript: string;
  module_id: string | null;
  is_preview: boolean;
  has_checkpoint: boolean;
  checkpoint_question: string;
  resources: { title: string; url: string; type: "pdf" | "link" | "video" }[];
};

export async function createLesson(
  courseId: string,
  data: LessonFormData,
  orderIndex: number
): Promise<{ lesson: LMSLesson | null; error: string | null }> {
  const supabase = createClient();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      module_id: data.module_id || null,
      title: data.title.trim(),
      description: data.description.trim() || null,
      video_url: data.video_url.trim() || null,
      duration_seconds: data.duration_seconds || 0,
      transcript: data.transcript.trim() || null,
      resources: data.resources,
      order_index: orderIndex,
      is_preview: data.is_preview,
      has_checkpoint: data.has_checkpoint,
      checkpoint_question: data.has_checkpoint ? (data.checkpoint_question.trim() || null) : null,
    })
    .select("*")
    .single();

  if (error) return { lesson: null, error: error.message };
  return {
    lesson: { ...(lesson as LMSLesson), resources: Array.isArray(lesson.resources) ? lesson.resources : [] },
    error: null,
  };
}

export async function updateLesson(
  id: string,
  data: Partial<LessonFormData>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description.trim() || null;
  if (data.video_url !== undefined) payload.video_url = data.video_url.trim() || null;
  if (data.duration_seconds !== undefined) payload.duration_seconds = data.duration_seconds;
  if (data.transcript !== undefined) payload.transcript = data.transcript.trim() || null;
  if (data.module_id !== undefined) payload.module_id = data.module_id || null;
  if (data.is_preview !== undefined) payload.is_preview = data.is_preview;
  if (data.has_checkpoint !== undefined) payload.has_checkpoint = data.has_checkpoint;
  if (data.checkpoint_question !== undefined)
    payload.checkpoint_question = data.checkpoint_question.trim() || null;
  if (data.resources !== undefined) payload.resources = data.resources;

  const { error } = await supabase.from("lessons").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteLesson(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function reorderLessons(
  updates: { id: string; order_index: number }[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  for (const u of updates) {
    const { error } = await supabase
      .from("lessons")
      .update({ order_index: u.order_index })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }
  return { error: null };
}

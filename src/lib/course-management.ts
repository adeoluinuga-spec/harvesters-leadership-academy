import { createClient } from "@/lib/client";
import type { AdminCourse, LMSCourse, LMSModule, LMSLesson, CourseStatus } from "@/lib/lms-types";

export type CourseFormData = {
  title: string;
  description: string;
  overview: string;
  thumbnail_url: string;
  video_url: string;
  instructor_name: string;
  instructor_title: string;
  instructor_role: string;
  category: string;
  difficulty_level: string;
  leadership_targets: string[];
  duration_minutes: number;
  is_required: boolean;
  is_featured: boolean;
  status: CourseStatus;
  management_scope?: "platform" | "group" | "campus";
  group_id?: string | null;
  campus_id?: string | null;
};

export async function fetchAdminCourses(): Promise<AdminCourse[]> {
  const response = await fetch("/api/lms/admin-course-actions");
  if (!response.ok) return [];
  const json = (await response.json()) as { courses?: AdminCourse[] };
  return json.courses ?? [];
}

export async function fetchAdminCourseById(id: string): Promise<AdminCourse | null> {
  const response = await fetch(`/api/lms/admin-course-actions?course_id=${encodeURIComponent(id)}`);
  if (!response.ok) return null;
  const json = (await response.json()) as { course?: AdminCourse };
  return json.course ?? null;
}

export async function createCourse(data: CourseFormData): Promise<{ course: LMSCourse | null; error: string | null }> {
  const response = await fetch("/api/lms/admin-course-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = (await response.json().catch(() => ({}))) as { course?: LMSCourse; error?: string };
  if (!response.ok) return { course: null, error: json.error ?? "Failed to create course." };
  return { course: json.course ?? null, error: null };
}

export async function updateCourse(id: string, data: Partial<CourseFormData>): Promise<{ error: string | null }> {
  const response = await fetch("/api/lms/admin-course-actions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id: id, ...data }),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  return { error: response.ok ? null : json.error ?? "Failed to update course." };
}

export async function deleteCourse(id: string): Promise<{ error: string | null; archived?: boolean; deleted?: boolean }> {
  const response = await fetch(`/api/lms/admin-course-actions?course_id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; archived?: boolean; deleted?: boolean };
  if (!response.ok) return { error: json.error ?? "Failed to delete course." };
  return { error: null, archived: json.archived, deleted: json.deleted };
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

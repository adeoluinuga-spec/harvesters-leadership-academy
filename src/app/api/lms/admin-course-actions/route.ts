import { badRequest, requireScopedAdmin, scopedCampusIds, scopeForbidden, unauthorized } from "@/app/api/admin/_lib";
import { logAuditEvent } from "@/lib/activity";
import type { CourseStatus } from "@/lib/lms-types";
import { normalizeVimeoUrl } from "@/lib/vimeo";
import type { SupabaseClient } from "@supabase/supabase-js";

type CourseScope = "platform" | "group" | "campus";

type CoursePayload = {
  title?: string;
  description?: string;
  overview?: string;
  thumbnail_url?: string;
  video_url?: string;
  instructor_name?: string;
  instructor_title?: string;
  instructor_role?: string;
  category?: string;
  difficulty_level?: string;
  leadership_targets?: string[];
  duration_minutes?: number;
  is_required?: boolean;
  is_featured?: boolean;
  status?: CourseStatus;
  management_scope?: CourseScope;
  group_id?: string | null;
  campus_id?: string | null;
};

type CourseRow = {
  id: string;
  title: string;
  status: CourseStatus | null;
  is_published: boolean | null;
  management_scope: CourseScope | null;
  group_id: string | null;
  campus_id: string | null;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(title: string, db: SupabaseClient) {
  const base = slugify(title);
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await db.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

async function canUseCourseScope(
  ctx: NonNullable<Awaited<ReturnType<typeof requireScopedAdmin>>>,
  scope: CourseScope,
  groupId: string | null,
  campusId: string | null
) {
  if (ctx.scope === "platform") return true;
  if (ctx.scope === "group") {
    if (scope === "group") return Boolean(groupId && groupId === ctx.groupId);
    if (scope === "campus" && campusId) {
      const campusIds = await scopedCampusIds(ctx);
      return campusIds === "all" || campusIds.includes(campusId);
    }
    return false;
  }
  return scope === "campus" && Boolean(campusId && campusId === ctx.campusId);
}

async function canManageCourse(
  ctx: NonNullable<Awaited<ReturnType<typeof requireScopedAdmin>>>,
  course: CourseRow
) {
  const scope = course.management_scope ?? "platform";
  if (ctx.scope === "platform") return true;
  return canUseCourseScope(ctx, scope, course.group_id, course.campus_id);
}

async function scopedCourseQuery(ctx: NonNullable<Awaited<ReturnType<typeof requireScopedAdmin>>>) {
  let query = ctx.adminDb.from("courses").select("*").order("created_at", { ascending: false });

  if (ctx.scope === "group") {
    const campusIds = await scopedCampusIds(ctx);
    const filters = [`and(management_scope.eq.group,group_id.eq.${ctx.groupId})`];
    if (campusIds !== "all" && campusIds.length > 0) {
      filters.push(`and(management_scope.eq.campus,campus_id.in.(${campusIds.join(",")}))`);
    }
    query = query.or(filters.join(","));
  }

  if (ctx.scope === "campus") {
    query = query.eq("management_scope", "campus").eq("campus_id", ctx.campusId);
  }

  return query;
}

function coursePayload(body: CoursePayload) {
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title.trim();
  if (body.description !== undefined) payload.description = body.description.trim() || null;
  if (body.overview !== undefined) payload.overview = body.overview.trim() || null;
  if (body.thumbnail_url !== undefined) payload.thumbnail_url = body.thumbnail_url.trim() || null;
  if (body.video_url !== undefined) payload.video_url = body.video_url.trim() ? normalizeVimeoUrl(body.video_url.trim()) : null;
  if (body.category !== undefined) payload.category = body.category;
  if (body.instructor_name !== undefined) payload.instructor_name = body.instructor_name.trim();
  if (body.instructor_title !== undefined) payload.instructor_title = body.instructor_title.trim() || null;
  if (body.instructor_role !== undefined) payload.instructor_role = body.instructor_role.trim() || null;
  if (body.difficulty_level !== undefined) payload.difficulty_level = body.difficulty_level || null;
  if (body.duration_minutes !== undefined) payload.duration_minutes = body.duration_minutes || 0;
  if (body.leadership_targets !== undefined) payload.leadership_targets = body.leadership_targets;
  if (body.is_required !== undefined) payload.is_required = body.is_required;
  if (body.is_featured !== undefined) payload.is_featured = body.is_featured;
  if (body.status !== undefined) {
    payload.status = body.status;
    payload.is_published = body.status === "published";
  }
  return payload;
}

export async function GET(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();
  const courseId = new URL(request.url).searchParams.get("course_id");

  if (courseId) {
    const { data: course, error } = await ctx.adminDb.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
    if (!(await canManageCourse(ctx, course as CourseRow))) return scopeForbidden();

    const [lessonsRes, enrollmentsRes] = await Promise.all([
      ctx.adminDb.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
      ctx.adminDb.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ]);

    return Response.json({
      course: {
        ...course,
        leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
        lesson_count: lessonsRes.count ?? 0,
        enrollment_count: enrollmentsRes.count ?? 0,
      },
    });
  }

  const { data: courses, error } = await scopedCourseQuery(ctx);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const courseIds = (courses ?? []).map((course: { id: string }) => course.id);
  const lessonCounts: Record<string, number> = {};
  const enrollmentCounts: Record<string, number> = {};

  if (courseIds.length > 0) {
    const [lessonsRes, enrollmentsRes] = await Promise.all([
      ctx.adminDb.from("lessons").select("course_id").in("course_id", courseIds),
      ctx.adminDb.from("enrollments").select("course_id").in("course_id", courseIds),
    ]);

    for (const lesson of lessonsRes.data ?? []) {
      lessonCounts[lesson.course_id] = (lessonCounts[lesson.course_id] ?? 0) + 1;
    }
    for (const enrollment of enrollmentsRes.data ?? []) {
      enrollmentCounts[enrollment.course_id] = (enrollmentCounts[enrollment.course_id] ?? 0) + 1;
    }
  }

  return Response.json({
    courses: (courses ?? []).map((course: Record<string, unknown>) => ({
      ...course,
      leadership_targets: Array.isArray(course.leadership_targets) ? course.leadership_targets : [],
      lesson_count: lessonCounts[course.id as string] ?? 0,
      enrollment_count: enrollmentCounts[course.id as string] ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();

  let body: CoursePayload;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  if (!body.title?.trim()) return badRequest("Course title is required.");
  if (!body.instructor_name?.trim()) return badRequest("Instructor name is required.");

  const managementScope: CourseScope =
    ctx.scope === "platform" ? body.management_scope ?? "platform" : ctx.scope;
  const groupId = ctx.scope === "group" ? ctx.groupId : managementScope === "group" ? body.group_id ?? null : null;
  const campusId = ctx.scope === "campus" ? ctx.campusId : managementScope === "campus" ? body.campus_id ?? null : null;

  if (!(await canUseCourseScope(ctx, managementScope, groupId, campusId))) {
    return scopeForbidden("You cannot create a course outside your assigned scope.");
  }

  const slug = await generateUniqueSlug(body.title, ctx.adminDb);
  const payload = {
    ...coursePayload(body),
    slug,
    title: body.title.trim(),
    instructor_name: body.instructor_name.trim(),
    status: body.status ?? "draft",
    is_published: body.status === "published",
    management_scope: managementScope,
    group_id: groupId,
    campus_id: campusId,
    created_by: ctx.userId,
  };

  const { data, error } = await ctx.adminDb.from("courses").insert(payload).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "course_created",
    entityType: "course",
    entityId: data.id,
    metadata: { title: data.title, status: data.status, management_scope: managementScope, group_id: groupId, campus_id: campusId },
  });

  return Response.json({ course: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();

  let body: CoursePayload & { course_id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  if (!body.course_id) return badRequest("course_id is required.");

  const { data: course } = await ctx.adminDb
    .from("courses")
    .select("id, title, status, is_published, management_scope, group_id, campus_id")
    .eq("id", body.course_id)
    .maybeSingle<CourseRow>();

  if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
  if (!(await canManageCourse(ctx, course))) return scopeForbidden();

  const updates = coursePayload(body);
  if (body.action === "toggle-visibility") {
    const nextStatus: CourseStatus = course.status === "published" ? "draft" : "published";
    updates.status = nextStatus;
    updates.is_published = nextStatus === "published";
  }
  if (body.action === "restrict") {
    if (!Array.isArray(body.leadership_targets)) return badRequest("leadership_targets must be an array.");
    updates.leadership_targets = body.leadership_targets;
  }

  if (body.management_scope !== undefined || body.group_id !== undefined || body.campus_id !== undefined) {
    if (ctx.scope !== "platform") return scopeForbidden("Scoped admins cannot move course ownership.");
    updates.management_scope = body.management_scope ?? course.management_scope;
    updates.group_id = body.group_id ?? null;
    updates.campus_id = body.campus_id ?? null;
  }

  if (Object.keys(updates).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await ctx.adminDb
    .from("courses")
    .update(updates)
    .eq("id", body.course_id)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "course_updated",
    entityType: "course",
    entityId: body.course_id,
    metadata: { previous: course, updated: updates },
  });

  return Response.json({ course: data, status: data.status });
}

export async function DELETE(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return badRequest("course_id is required.");

  const { data: course } = await ctx.adminDb
    .from("courses")
    .select("id, title, status, is_published, management_scope, group_id, campus_id")
    .eq("id", courseId)
    .maybeSingle<CourseRow>();

  if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
  if (!(await canManageCourse(ctx, course))) return scopeForbidden();

  const [enrollments, progress, certificates, attempts] = await Promise.all([
    ctx.adminDb.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ctx.adminDb.from("lesson_progress").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ctx.adminDb.from("certificates").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ctx.adminDb.from("assessment_attempts").select("id", { count: "exact", head: true }).eq("course_id", courseId),
  ]);
  const dependentRecords =
    (enrollments.count ?? 0) + (progress.count ?? 0) + (certificates.count ?? 0) + (attempts.count ?? 0);

  if (dependentRecords > 0) {
    const { error } = await ctx.adminDb
      .from("courses")
      .update({ status: "archived", is_published: false })
      .eq("id", courseId);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      supabase: ctx.adminDb,
      actorId: ctx.userId,
      actorRole: ctx.userRole,
      eventType: "course_updated",
      entityType: "course",
      entityId: courseId,
      metadata: { archivedInsteadOfDeleted: true, dependentRecords, previous: course },
    });

    return Response.json({ ok: true, archived: true, status: "archived" });
  }

  const { error } = await ctx.adminDb.from("courses").delete().eq("id", courseId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "course_deleted",
    entityType: "course",
    entityId: courseId,
    metadata: { title: course.title },
  });

  return Response.json({ ok: true, deleted: true });
}

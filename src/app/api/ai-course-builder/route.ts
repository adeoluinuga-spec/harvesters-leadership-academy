import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized, badRequest } from "@/app/api/admin/_lib";
import { analyzeContent } from "@/lib/ai-course-ingestion";
import type { AISourceType, AIGeneratedCourse } from "@/lib/lms-types";

// ============================================================
// POST /api/ai-course-builder
// body: { action: "analyze" | "publish", ...payload }
// ============================================================

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const action = body.action as string | undefined;

  if (action === "analyze") {
    return handleAnalyze(body, ctx.userId, ctx.adminDb);
  }
  if (action === "publish") {
    return handlePublish(body, ctx.userId, ctx.adminDb);
  }

  return badRequest("Unknown action. Use 'analyze' or 'publish'.");
}

// ============================================================
// Analyze — generate course structure from transcript
// ============================================================

async function handleAnalyze(
  body: Record<string, unknown>,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminDb: any
) {
  const sourceType = body.source_type as AISourceType | undefined;
  const sourceUrl = body.source_url as string | undefined;
  const transcript = body.transcript as string | undefined;

  if (!sourceType) return badRequest("source_type is required.");
  if (!transcript || transcript.trim().length < 50) {
    return badRequest("transcript is required and must be at least 50 characters.");
  }

  let result;
  try {
    result = await analyzeContent({ sourceType, sourceUrl, transcript });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI analysis failed.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Persist the generation record for audit/replay
  const { data: generation, error: insertError } = await adminDb
    .from("ai_course_generations")
    .insert({
      source_type: sourceType,
      source_url: sourceUrl ?? null,
      transcript: transcript.slice(0, 50000), // cap storage
      generated_payload: result.course,
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertError) {
    // Non-fatal: still return the result, just without a persisted ID
    return NextResponse.json({ course: result.course, generation_id: null, provider: result.provider });
  }

  return NextResponse.json({
    course: result.course,
    generation_id: generation.id as string,
    provider: result.provider,
  });
}

// ============================================================
// Publish — create course + modules + lessons + assessment
// ============================================================

async function handlePublish(
  body: Record<string, unknown>,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminDb: any
) {
  const course = body.course as AIGeneratedCourse | undefined;
  const videoUrl = (body.video_url as string | undefined) ?? null;
  const generationId = (body.generation_id as string | undefined) ?? null;

  if (!course) return badRequest("course payload is required.");
  if (!course.course_title?.trim()) return badRequest("course_title is required.");

  // 1. Slug
  const slug = await generateUniqueSlug(course.course_title, adminDb);

  // 2. Parse total duration
  const durationMinutes = parseDurationToMinutes(course.total_estimated_duration);

  // 3. Insert course
  const { data: newCourse, error: courseError } = await adminDb
    .from("courses")
    .insert({
      slug,
      title: course.course_title.trim(),
      description: course.course_description?.trim() || null,
      overview: course.course_description?.trim() || null,
      video_url: videoUrl,
      category: course.course_category || "General",
      level: course.difficulty_level || "Foundational",
      difficulty_level: course.difficulty_level || "Foundational",
      instructor_name: "Harvesters Academy",
      duration_minutes: durationMinutes,
      leadership_targets: [],
      is_required: false,
      is_featured: false,
      status: "draft",
      is_published: false,
      created_by: userId,
    })
    .select("id")
    .single();

  if (courseError || !newCourse) {
    return NextResponse.json({ error: courseError?.message ?? "Failed to create course." }, { status: 500 });
  }

  const courseId = newCourse.id as string;

  // 4. Insert modules and lessons (each module becomes one lesson sharing the main video)
  for (let i = 0; i < course.modules.length; i++) {
    const m = course.modules[i];

    const { data: mod, error: modErr } = await adminDb
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: m.module_title,
        description: m.module_summary?.slice(0, 500) || null,
        order_index: i,
      })
      .select("id")
      .single();

    if (modErr || !mod) continue;

    // One lesson per module that references the same course video
    const durationSec = parseTimestampToSeconds(m.timestamp_end) - parseTimestampToSeconds(m.timestamp_start);

    await adminDb.from("lessons").insert({
      course_id: courseId,
      module_id: mod.id,
      title: m.module_title,
      description: [
        m.module_summary,
        m.learning_objectives?.length ? `\nObjectives:\n• ${m.learning_objectives.join("\n• ")}` : "",
        m.key_takeaways?.length ? `\nKey Takeaways:\n• ${m.key_takeaways.join("\n• ")}` : "",
      ]
        .filter(Boolean)
        .join("")
        .slice(0, 2000),
      video_url: videoUrl,
      duration_seconds: Math.max(0, durationSec),
      transcript: null,
      resources: [],
      order_index: i,
      is_preview: i === 0,
      has_checkpoint: m.reflection_questions?.length > 0,
      checkpoint_question: m.reflection_questions?.[0] ?? null,
    });
  }

  // 5. Insert assessment + questions
  const assessmentQuestions = course.assessments ?? [];
  if (assessmentQuestions.length > 0) {
    const { data: assessment, error: assessErr } = await adminDb
      .from("assessments")
      .insert({
        course_id: courseId,
        title: `${course.course_title} — Assessment`,
        passing_score: 70,
        is_required: true,
      })
      .select("id")
      .single();

    if (!assessErr && assessment) {
      const questionRows = assessmentQuestions
        .filter((q) => q.question_type !== "reflection")
        .map((q, idx) => ({
          assessment_id: assessment.id,
          question: q.question,
          question_type: q.question_type === "true_false" ? "true_false" : "mcq",
          options: q.options?.length ? q.options : ["True", "False"],
          correct_option: q.options?.indexOf(q.correct_answer) ?? 0,
          explanation: q.explanation || null,
          order_index: idx,
        }));

      if (questionRows.length > 0) {
        await adminDb.from("assessment_questions").insert(questionRows);
      }
    }
  }

  // 6. Mark generation as published
  if (generationId) {
    await adminDb
      .from("ai_course_generations")
      .update({ generated_payload: { ...(course as Record<string, unknown>), _published_course_id: courseId } })
      .eq("id", generationId);
  }

  return NextResponse.json({ course_id: courseId, slug });
}

// ============================================================
// Helpers
// ============================================================

async function generateUniqueSlug(
  title: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await db.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

function parseDurationToMinutes(duration: string): number {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)\s*h/);
  const minutesMatch = duration.match(/(\d+)\s*m/i);
  const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const m = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  if (h === 0 && m === 0) {
    // Try plain number
    const plain = parseInt(duration, 10);
    return isNaN(plain) ? 0 : plain;
  }
  return h * 60 + m;
}

function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

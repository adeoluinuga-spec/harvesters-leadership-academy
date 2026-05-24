import { createClient } from "@/lib/server";

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: "Authentication required." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
    return { user: null, error: "Admin access required." };
  }
  return { user, error: null };
}

// ── GET: fetch assessment + questions for a course ─────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return Response.json({ error: "course_id required." }, { status: 400 });

  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return Response.json({ error: authError }, { status: 401 });

  const { data, error } = await supabase
    .from("assessments")
    .select("*, assessment_questions(*)")
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ assessment: null });

  const questions = ((data as Record<string, unknown>).assessment_questions as Array<Record<string, unknown>> ?? [])
    .sort((a, b) => (a.order_index as number) - (b.order_index as number));

  return Response.json({ assessment: { ...data, assessment_questions: undefined, questions } });
}

// ── POST: create or update assessment + save all questions ─────────────────
export async function POST(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return Response.json({ error: authError }, { status: 401 });

  let body: {
    course_id: string;
    title: string;
    passing_score: number;
    duration_minutes: number | null;
    max_attempts: number | null;
    instructions: string | null;
    is_required: boolean;
    questions: Array<{
      id?: string;
      question: string;
      question_type: "mcq" | "true_false" | "short_answer";
      options: string[];
      correct_option: number;
      explanation: string | null;
      order_index: number;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.course_id || !body.title?.trim()) {
    return Response.json({ error: "course_id and title are required." }, { status: 400 });
  }

  // Upsert assessment by course_id
  const { data: assessment, error: upsertError } = await supabase
    .from("assessments")
    .upsert(
      {
        course_id: body.course_id,
        title: body.title.trim(),
        passing_score: body.passing_score ?? 70,
        duration_minutes: body.duration_minutes ?? null,
        max_attempts: body.max_attempts ?? null,
        instructions: body.instructions?.trim() || null,
        is_required: body.is_required ?? true,
      },
      { onConflict: "course_id" }
    )
    .select("id")
    .single<{ id: string }>();

  if (upsertError || !assessment) {
    return Response.json({ error: upsertError?.message ?? "Failed to save assessment." }, { status: 500 });
  }

  const assessmentId = assessment.id;

  // Delete questions not in the incoming list (ones that were removed)
  const incomingIds = body.questions.filter((q) => q.id).map((q) => q.id as string);
  if (incomingIds.length > 0) {
    await supabase
      .from("assessment_questions")
      .delete()
      .eq("assessment_id", assessmentId)
      .not("id", "in", `(${incomingIds.map((id) => `"${id}"`).join(",")})`);
  } else {
    // No existing questions kept — delete all
    await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);
  }

  // Upsert all questions
  if (body.questions.length > 0) {
    const questionRows = body.questions.map((q, i) => ({
      ...(q.id ? { id: q.id } : {}),
      assessment_id: assessmentId,
      question: q.question.trim(),
      question_type: q.question_type ?? "mcq",
      options: q.question_type === "short_answer" ? [] : q.options,
      correct_option: q.question_type === "short_answer" ? 0 : (q.correct_option ?? 0),
      explanation: q.explanation?.trim() || null,
      order_index: q.order_index ?? i,
    }));

    const { error: qError } = await supabase
      .from("assessment_questions")
      .upsert(questionRows, { onConflict: "id" });

    if (qError) {
      return Response.json({ error: qError.message }, { status: 500 });
    }
  }

  // Return full assessment with questions
  const { data: full } = await supabase
    .from("assessments")
    .select("*, assessment_questions(*)")
    .eq("id", assessmentId)
    .single();

  return Response.json({ assessment: full, ok: true });
}

// ── DELETE: remove entire assessment (and cascade questions) ───────────────
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessment_id");
  if (!assessmentId) return Response.json({ error: "assessment_id required." }, { status: 400 });

  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return Response.json({ error: authError }, { status: 401 });

  // Delete questions first (in case no cascade)
  await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);
  const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

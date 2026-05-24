import { createClient } from "@/lib/server";

type SubmitBody = {
  assessment_id: string;
  course_id: string;
  answers: Record<string, number | string>;
  started_at?: string | null;
  time_taken_seconds?: number | null;
  auto_submitted?: boolean;
};

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.assessment_id || !body.course_id || !body.answers) {
    return Response.json({ error: "assessment_id, course_id, and answers are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  // Fetch assessment (including new fields)
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, passing_score, course_id, max_attempts, duration_minutes")
    .eq("id", body.assessment_id)
    .maybeSingle<{
      id: string;
      passing_score: number;
      course_id: string;
      max_attempts: number | null;
      duration_minutes: number | null;
    }>();

  if (!assessment) {
    return Response.json({ error: "Assessment not found." }, { status: 404 });
  }

  // ── Attempt limit check ────────────────────────────────────────────────
  if (assessment.max_attempts !== null) {
    const { count } = await supabase
      .from("assessment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("assessment_id", body.assessment_id);

    if ((count ?? 0) >= assessment.max_attempts) {
      return Response.json(
        { error: `You have reached the maximum of ${assessment.max_attempts} attempt${assessment.max_attempts !== 1 ? "s" : ""} for this assessment.` },
        { status: 429 }
      );
    }
  }

  // ── Fetch questions ────────────────────────────────────────────────────
  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, correct_option, question_type")
    .eq("assessment_id", body.assessment_id)
    .returns<Array<{ id: string; correct_option: number; question_type: string }>>();

  if (!questions?.length) {
    return Response.json({ error: "No questions found for this assessment." }, { status: 400 });
  }

  // ── Grade (MCQ + True/False only; short_answer = not counted) ─────────
  const gradable = questions.filter((q) => q.question_type !== "short_answer");
  let correct = 0;
  for (const q of gradable) {
    const answer = body.answers[q.id];
    if (typeof answer === "number" && answer === q.correct_option) {
      correct++;
    }
  }

  const score = gradable.length > 0 ? Math.round((correct / gradable.length) * 100) : 100;
  const passed = score >= assessment.passing_score;

  // ── Record attempt ─────────────────────────────────────────────────────
  const { data: attempt, error: attemptError } = await supabase
    .from("assessment_attempts")
    .insert({
      user_id: user.id,
      assessment_id: body.assessment_id,
      course_id: body.course_id,
      score,
      passed,
      answers: body.answers,
      started_at: body.started_at ?? null,
      time_taken_seconds: body.time_taken_seconds ?? null,
    })
    .select("*")
    .single();

  if (attemptError) {
    return Response.json({ error: attemptError.message }, { status: 500 });
  }

  // Fire analytics event for the attempt (non-blocking)
  void supabase.from("activity_events").insert({
    user_id: user.id,
    event_type: passed ? "assessment_pass" : "assessment_fail",
    event_payload: { assessment_id: body.assessment_id, course_id: body.course_id, score, passed },
  });

  if (!passed) {
    return Response.json({
      attempt,
      score,
      passed,
      message: "Keep studying and try again.",
    });
  }

  // ── Check 90%+ lesson completion ───────────────────────────────────────
  const [totalRes, completedRes] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", body.course_id),
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("course_id", body.course_id)
      .eq("completed", true),
  ]);

  const total = totalRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const readyForCert = total > 0 && completed / total >= 0.9;

  if (!readyForCert) {
    return Response.json({
      attempt,
      score,
      passed,
      message: "Assessment passed. Complete 90% of lessons to earn your certificate.",
    });
  }

  // ── Issue certificate ──────────────────────────────────────────────────
  const { data: existingCert } = await supabase
    .from("certificates")
    .select("id, certificate_number")
    .eq("user_id", user.id)
    .eq("course_id", body.course_id)
    .maybeSingle();

  if (existingCert) {
    return Response.json({ attempt, score, passed, certificate: existingCert, certificate_issued: false });
  }

  const certNumber = await generateCertNumber(supabase);
  const { data: cert } = await supabase
    .from("certificates")
    .insert({ user_id: user.id, course_id: body.course_id, certificate_number: certNumber })
    .select("*")
    .single();

  // Fire certificate_issued event (non-blocking)
  void supabase.from("activity_events").insert({
    user_id: user.id,
    event_type: "certificate_issued",
    event_payload: { course_id: body.course_id, certificate_number: certNumber },
  });

  return Response.json({ attempt, score, passed, certificate: cert, certificate_issued: true });
}

// ── GET: return attempt count for the current user + assessment ────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessment_id");
  if (!assessmentId) return Response.json({ count: 0 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ count: 0 });

  const { count } = await supabase
    .from("assessment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("assessment_id", assessmentId);

  return Response.json({ count: count ?? 0 });
}

async function generateCertNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const year = new Date().getFullYear();

  // Try RPC function first (sequential, atomic)
  const { data: rpcResult, error: rpcError } = await supabase.rpc("generate_certificate_number");
  if (!rpcError && rpcResult) return rpcResult as string;

  // Fallback: count-based (good enough for most ministry LMS volumes)
  const { count } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(6, "0");
  return `HLA-${year}-${seq}`;
}

import { createClient } from "@/lib/server";

export async function POST(request: Request) {
  let body: { lesson_id?: string; course_id?: string; completed?: boolean; watch_seconds?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.lesson_id || !body.course_id) {
    return Response.json({ error: "lesson_id and course_id are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: user.id,
    lesson_id: body.lesson_id,
    course_id: body.course_id,
    watch_seconds: body.watch_seconds ?? 0,
    updated_at: now,
  };

  if (body.completed) {
    payload.completed = true;
    payload.completed_at = now;
  }

  const { data: progressRow, error } = await supabase
    .from("lesson_progress")
    .upsert(payload, { onConflict: "user_id,lesson_id" })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!body.completed) {
    return Response.json({ progress: progressRow });
  }

  // Check if course is now complete enough for a certificate (90%+ lessons done)
  const [totalRes, completedRes] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", body.course_id),
    supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", body.course_id).eq("completed", true),
  ]);

  const total = totalRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const readyForCert = total > 0 && completed / total >= 0.9;

  // Check if there's a required assessment
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, is_required, passing_score")
    .eq("course_id", body.course_id)
    .maybeSingle();

  const assessmentRequired = assessment?.is_required ?? false;

  if (!readyForCert) {
    return Response.json({ progress: progressRow, progress_percent: Math.round((completed / total) * 100) });
  }

  if (assessmentRequired) {
    const { data: passingAttempt } = await supabase
      .from("assessment_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", body.course_id)
      .eq("passed", true)
      .limit(1)
      .maybeSingle();

    if (!passingAttempt) {
      return Response.json({
        progress: progressRow,
        progress_percent: Math.round((completed / total) * 100),
        assessment_required: true,
        assessment_id: assessment?.id,
      });
    }
  }

  // Issue certificate if not already issued
  const { data: existingCert } = await supabase
    .from("certificates")
    .select("id, certificate_number")
    .eq("user_id", user.id)
    .eq("course_id", body.course_id)
    .maybeSingle();

  if (existingCert) {
    return Response.json({
      progress: progressRow,
      progress_percent: 100,
      certificate: existingCert,
    });
  }

  const certNumber = await generateCertNumber(supabase);
  const { data: cert } = await supabase
    .from("certificates")
    .insert({ user_id: user.id, course_id: body.course_id, certificate_number: certNumber })
    .select("*")
    .single();

  return Response.json({
    progress: progressRow,
    progress_percent: Math.round((completed / total) * 100),
    certificate_issued: true,
    certificate: cert,
  });
}

async function generateCertNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const year = new Date().getFullYear();
  const { data: rpcResult, error: rpcError } = await supabase.rpc("generate_certificate_number");
  if (!rpcError && rpcResult) return rpcResult as string;
  const { count } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(6, "0");
  return `HLA-${year}-${seq}`;
}

import { createClient } from "@/lib/server";

type SubmitBody = {
  assessment_id: string;
  course_id: string;
  answers: Record<string, number>; // question_id → selected option index
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

  // Fetch assessment and questions
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, passing_score, course_id")
    .eq("id", body.assessment_id)
    .maybeSingle();

  if (!assessment) {
    return Response.json({ error: "Assessment not found." }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, correct_option")
    .eq("assessment_id", body.assessment_id);

  if (!questions?.length) {
    return Response.json({ error: "No questions found for this assessment." }, { status: 400 });
  }

  // Grade the submission
  let correct = 0;
  for (const q of questions) {
    if (body.answers[q.id] === q.correct_option) {
      correct++;
    }
  }

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= assessment.passing_score;

  const { data: attempt, error: attemptError } = await supabase
    .from("assessment_attempts")
    .insert({
      user_id: user.id,
      assessment_id: body.assessment_id,
      course_id: body.course_id,
      score,
      passed,
      answers: body.answers,
    })
    .select("*")
    .single();

  if (attemptError) {
    return Response.json({ error: attemptError.message }, { status: 500 });
  }

  if (!passed) {
    return Response.json({ attempt, score, passed, message: "Assessment submitted. Keep studying and try again." });
  }

  // Passed: check if lesson progress is also 90%+, issue certificate
  const [totalRes, completedRes] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", body.course_id),
    supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", body.course_id).eq("completed", true),
  ]);

  const total = totalRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const readyForCert = total > 0 && completed / total >= 0.9;

  if (!readyForCert) {
    return Response.json({ attempt, score, passed, message: "Assessment passed. Complete 90% of lessons to earn your certificate." });
  }

  // Issue certificate
  const { data: existingCert } = await supabase
    .from("certificates")
    .select("id, certificate_number")
    .eq("user_id", user.id)
    .eq("course_id", body.course_id)
    .maybeSingle();

  if (existingCert) {
    return Response.json({ attempt, score, passed, certificate: existingCert, certificate_issued: false });
  }

  const certNumber = generateCertNumber(user.id, body.course_id);
  const { data: cert } = await supabase
    .from("certificates")
    .insert({ user_id: user.id, course_id: body.course_id, certificate_number: certNumber })
    .select("*")
    .single();

  return Response.json({ attempt, score, passed, certificate: cert, certificate_issued: true });
}

function generateCertNumber(userId: string, courseId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const u = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  const c = courseId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `HLA-${u}-${c}-${ts}`;
}

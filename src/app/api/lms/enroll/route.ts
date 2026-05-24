import { createClient } from "@/lib/server";

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

export async function POST(request: Request) {
  let body: { course_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.course_id) {
    return Response.json({ error: "course_id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (ADMIN_ROLES.includes(profile?.role ?? "")) {
    return Response.json({ error: "Administrators do not enrol in courses." }, { status: 403 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, status, is_published")
    .eq("id", body.course_id)
    .or("status.eq.published,is_published.eq.true")
    .maybeSingle();

  if (!course) {
    return Response.json({ error: "Course not found or not published." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: user.id, course_id: body.course_id },
      { onConflict: "user_id,course_id" }
    )
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ enrollment: data });
}

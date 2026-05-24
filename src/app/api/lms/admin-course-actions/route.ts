import { createClient } from "@/lib/server";

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, error: "Authentication required." };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!ADMIN_ROLES.includes(profile?.role ?? ""))
    return { user: null, error: "Insufficient permissions." };
  return { user, error: null };
}

// PATCH — toggle visibility or restrict leadership targets
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return Response.json({ error: authError }, { status: 403 });

  let body: { course_id?: string; action?: string; leadership_targets?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.course_id || !body.action) {
    return Response.json({ error: "course_id and action are required." }, { status: 400 });
  }

  if (body.action === "toggle-visibility") {
    const { data: course } = await supabase
      .from("courses")
      .select("status")
      .eq("id", body.course_id)
      .maybeSingle();
    if (!course) return Response.json({ error: "Course not found." }, { status: 404 });

    const newStatus = course.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("courses")
      .update({ status: newStatus, is_published: newStatus === "published" })
      .eq("id", body.course_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ status: newStatus });
  }

  if (body.action === "restrict") {
    if (!Array.isArray(body.leadership_targets)) {
      return Response.json({ error: "leadership_targets must be an array." }, { status: 400 });
    }
    const { error } = await supabase
      .from("courses")
      .update({ leadership_targets: body.leadership_targets })
      .eq("id", body.course_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}

// DELETE — delete a course
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return Response.json({ error: authError }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return Response.json({ error: "course_id is required." }, { status: 400 });

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

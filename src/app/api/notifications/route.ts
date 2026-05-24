import { createClient } from "@/lib/server";

// GET — fetch current user's notifications
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Unauthenticated." }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) return Response.json({ notifications: [] });
    return Response.json({ notifications: data ?? [] });
  } catch {
    return Response.json({ notifications: [] });
  }
}

// PATCH — mark one or all as read
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Unauthenticated." }, { status: 401 });

  let body: { id?: string; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  try {
    if (body.all) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    } else if (body.id) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", body.id)
        .eq("user_id", user.id);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}

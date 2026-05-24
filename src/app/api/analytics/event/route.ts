import { createClient } from "@/lib/server";

export async function POST(request: Request) {
  let body: { event_type?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!body.event_type) {
    return Response.json({ error: "event_type required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ ok: true }); // silently skip unauthenticated

  // Fetch user context for scoped hierarchy fields
  const { data: profile } = await supabase
    .from("users")
    .select("role, campus_id, subgroup_id, group_id")
    .eq("id", user.id)
    .maybeSingle();

  try {
    await supabase.from("activity_events").insert({
      user_id: user.id,
      role: profile?.role ?? null,
      campus_id: profile?.campus_id ?? null,
      subgroup_id: profile?.subgroup_id ?? null,
      group_id: profile?.group_id ?? null,
      event_type: body.event_type,
      event_payload: body.payload ?? {},
    });
  } catch {
    // Table may not exist yet — never block the caller
  }

  return Response.json({ ok: true });
}

import { requireAdmin, unauthorized, badRequest } from "../../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Group ID required.");

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body.name?.trim()) return badRequest("Group name is required.");

  const { data: current } = await ctx.db
    .from("groups")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await ctx.adminDb
    .from("groups")
    .update({ name: body.name.trim() })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "group_updated",
    entityType: "group",
    entityId: id,
    metadata: { previous: current, updated: { name: body.name.trim() } },
  });

  return Response.json({ group: data });
}

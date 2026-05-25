import { requireAdmin, unauthorized, badRequest } from "../../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Subgroup ID required.");

  let body: { name?: string; groupId?: string | null };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const { data: current } = await ctx.adminDb
    .from("subgroups")
    .select("name, group_id")
    .eq("id", id)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.groupId !== undefined) updates.group_id = body.groupId;

  if (Object.keys(updates).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await ctx.adminDb
    .from("subgroups")
    .update(updates)
    .eq("id", id)
    .select("id, name, group_id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "subgroup_updated",
    entityType: "subgroup",
    entityId: id,
    metadata: { previous: current, updated: updates },
  });

  return Response.json({ subgroup: data });
}

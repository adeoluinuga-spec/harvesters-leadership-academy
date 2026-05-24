import { requireAdmin, unauthorized, badRequest } from "../../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Campus ID required.");

  let body: {
    name?: string;
    subgroupId?: string | null;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  // Fetch current state for audit diff
  const { data: current } = await ctx.db
    .from("campuses")
    .select("name, subgroup_id, is_active")
    .eq("id", id)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.subgroupId !== undefined) updates.subgroup_id = body.subgroupId;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  if (Object.keys(updates).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await ctx.adminDb
    .from("campuses")
    .update(updates)
    .eq("id", id)
    .select("id, name, subgroup_id, is_active")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const eventType =
    body.isActive === false
      ? "campus_archived"
      : "campus_updated";

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType,
    entityType: "campus",
    entityId: id,
    metadata: {
      previous: current,
      updated: updates,
    },
  });

  return Response.json({ campus: data });
}

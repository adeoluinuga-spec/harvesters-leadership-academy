import { requireAdmin, unauthorized, badRequest } from "../../_lib";
import { logAuditEvent, type AuditEventType } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("User ID required.");

  let body: {
    role?: string;
    campusId?: string | null;
    subgroupId?: string | null;
    groupId?: string | null;
    isActive?: boolean;
    onboardingCompleted?: boolean;
    fullName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  // Fetch current state for audit diff
  const { data: current } = await ctx.db
    .from("users")
    .select("role, campus_id, subgroup_id, group_id, is_active, full_name, onboarding_completed")
    .eq("id", id)
    .maybeSingle();

  if (!current) return Response.json({ error: "User not found." }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.role !== undefined) updates.role = body.role;
  if (body.campusId !== undefined) updates.campus_id = body.campusId;
  if (body.subgroupId !== undefined) updates.subgroup_id = body.subgroupId;
  if (body.groupId !== undefined) updates.group_id = body.groupId;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.onboardingCompleted !== undefined)
    updates.onboarding_completed = body.onboardingCompleted;
  if (body.fullName !== undefined) updates.full_name = body.fullName.trim();

  if (Object.keys(updates).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await ctx.adminDb
    .from("users")
    .update(updates)
    .eq("id", id)
    .select("id, full_name, role, campus_id, subgroup_id, group_id, is_active")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Determine the most specific audit event type
  let eventType: AuditEventType = "user_updated";
  if (body.role !== undefined && body.role !== current.role) {
    eventType = "user_role_changed";
  } else if (body.campusId !== undefined && body.campusId !== current.campus_id) {
    eventType = "user_transferred";
  } else if (body.isActive === false) {
    eventType = "user_deactivated";
  } else if (body.isActive === true) {
    eventType = "user_reactivated";
  }

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType,
    entityType: "user",
    entityId: id,
    campusId: (body.campusId as string | undefined) ?? (current.campus_id ?? undefined),
    metadata: {
      previous: {
        role: current.role,
        campus_id: current.campus_id,
        subgroup_id: current.subgroup_id,
        group_id: current.group_id,
        is_active: current.is_active,
      },
      updated: updates,
    },
  });

  return Response.json({ user: data });
}

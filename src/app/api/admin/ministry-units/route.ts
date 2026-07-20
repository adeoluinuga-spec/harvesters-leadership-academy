import { badRequest, requireScopedAdmin, scopedCampusIds, unauthorized } from "../_lib";
import { logAuditEvent } from "@/lib/activity";

const UNIT_TYPES = ["direction", "team_district", "subteam_community", "department_zone", "unit_area", "cell"] as const;

export async function GET(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();
  const campusId = new URL(request.url).searchParams.get("campusId");
  let query = ctx.adminDb
    .from("ministry_units")
    .select("id, name, unit_type, campus_id, parent_id, leader_id, created_at")
    .order("unit_type")
    .order("name");
  if (ctx.scope === "campus") query = query.eq("campus_id", ctx.campusId);
  else if (ctx.scope === "group") {
    const campusIds = await scopedCampusIds(ctx);
    query = campusIds === "all" ? query : campusIds.length ? query.in("campus_id", campusIds) : query.eq("campus_id", "__none__");
  } else if (campusId) query = query.eq("campus_id", campusId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ units: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();
  let body: { name?: string; campusId?: string; organizationId?: string; unitType?: string; parentId?: string | null; leaderId?: string | null };
  try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!body.name?.trim() || !body.campusId || !body.unitType) return badRequest("Name, campus, and structure type are required.");
  if (!UNIT_TYPES.includes(body.unitType as typeof UNIT_TYPES[number])) return badRequest("Invalid structure type.");
  if (ctx.scope === "campus" && body.campusId !== ctx.campusId) return unauthorized();
  if (ctx.scope === "group") {
    const campusIds = await scopedCampusIds(ctx);
    if (campusIds !== "all" && !campusIds.includes(body.campusId)) return unauthorized();
  }
  const { data: campus } = await ctx.adminDb.from("campuses").select("organization_id").eq("id", body.campusId).maybeSingle<{ organization_id: string | null }>();
  const organizationId = body.organizationId ?? campus?.organization_id;
  if (!organizationId) return badRequest("This campus does not have an organisation assignment.");
  const { data, error } = await ctx.adminDb.from("ministry_units").insert({
    name: body.name.trim(), campus_id: body.campusId, organization_id: organizationId,
    unit_type: body.unitType, parent_id: body.parentId ?? null, leader_id: body.leaderId ?? null,
  }).select("id, name, unit_type, campus_id, parent_id, leader_id").single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAuditEvent({ supabase: ctx.adminDb, actorId: ctx.userId, actorRole: ctx.userRole, eventType: "ministry_unit_created", entityType: "ministry_unit", entityId: data.id, metadata: data });
  return Response.json({ unit: data }, { status: 201 });
}

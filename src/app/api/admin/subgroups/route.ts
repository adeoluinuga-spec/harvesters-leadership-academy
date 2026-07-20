import { badRequest, requireScopedAdmin, scopedGroupIds, scopedSubgroupIds, scopeForbidden, unauthorized } from "../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function GET() {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();
  const allowedSubgroupIds = await scopedSubgroupIds(ctx);

  let query = ctx.adminDb
    .from("subgroups")
    .select(`
      id, name, group_id,
      groups(id, name),
      campuses(id, name)
    `)
    .order("name");
  if (allowedSubgroupIds !== "all") {
    if (allowedSubgroupIds.length === 0) return Response.json({ subgroups: [] });
    query = query.in("id", allowedSubgroupIds);
  }

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with leader counts
  const subgroupIds = (data ?? []).map((s) => s.id);
  const leaderCounts: Record<string, number> = {};

  if (subgroupIds.length > 0) {
    const { data: campuses } = await ctx.adminDb
      .from("campuses")
      .select("id, subgroup_id")
      .in("subgroup_id", subgroupIds);

    const campusIds = (campuses ?? []).map((c) => c.id);
    if (campusIds.length > 0) {
      const { data: users } = await ctx.adminDb
        .from("users")
        .select("campus_id")
        .in("campus_id", campusIds);

      const campusToSubgroup = new Map(
        (campuses ?? []).map((c) => [c.id, c.subgroup_id])
      );
      for (const u of users ?? []) {
        if (!u.campus_id) continue;
        const sgId = campusToSubgroup.get(u.campus_id);
        if (sgId) leaderCounts[sgId] = (leaderCounts[sgId] ?? 0) + 1;
      }
    }
  }

  const subgroups = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    groupId: s.group_id,
    groupName: (s.groups as { name?: string } | null)?.name ?? null,
    campusCount: Array.isArray(s.campuses) ? s.campuses.length : 0,
    leaderCount: leaderCounts[s.id] ?? 0,
  }));

  return Response.json({ subgroups });
}

export async function POST(request: Request) {
  const ctx = await requireScopedAdmin();
  if (!ctx) return unauthorized();
  if (ctx.scope === "campus") return scopeForbidden("Campus admins cannot create subgroups.");

  let body: { name?: string; groupId?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body.name?.trim()) return badRequest("Subgroup name is required.");
  const allowedGroupIds = await scopedGroupIds(ctx);
  const groupId = ctx.scope === "group" ? ctx.groupId : body.groupId ?? null;
  if (allowedGroupIds !== "all" && (!groupId || !allowedGroupIds.includes(groupId))) {
    return scopeForbidden();
  }

  const { data, error } = await ctx.adminDb
    .from("subgroups")
    .insert({ name: body.name.trim(), group_id: groupId })
    .select("id, name")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "subgroup_created",
    entityType: "subgroup",
    entityId: data.id,
    metadata: { name: data.name, groupId },
  });

  return Response.json({ subgroup: data }, { status: 201 });
}

import { requireAdmin, unauthorized, badRequest } from "../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { data, error } = await ctx.db
    .from("campuses")
    .select(`
      id, name, is_active,
      subgroup_id, subgroups(id, name, group_id, groups(id, name)),
      campus_pastor, pastor
    `)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with leader counts
  const campusIds = (data ?? []).map((c) => c.id);
  const leaderCounts: Record<string, number> = {};

  if (campusIds.length > 0) {
    const { data: users } = await ctx.db
      .from("users")
      .select("campus_id")
      .in("campus_id", campusIds);

    for (const u of users ?? []) {
      if (u.campus_id) {
        leaderCounts[u.campus_id] = (leaderCounts[u.campus_id] ?? 0) + 1;
      }
    }
  }

  const campuses = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.is_active ?? true,
    subgroupId: c.subgroup_id,
    subgroupName: (c.subgroups as { name?: string } | null)?.name ?? null,
    groupId: (c.subgroups as { group_id?: string } | null)?.group_id ?? null,
    groupName:
      ((c.subgroups as { groups?: { name?: string } | null } | null)?.groups as { name?: string } | null)?.name ?? null,
    pastorName: c.campus_pastor ?? c.pastor ?? null,
    leaderCount: leaderCounts[c.id] ?? 0,
  }));

  return Response.json({ campuses });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  let body: { name?: string; subgroupId?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body.name?.trim()) return badRequest("Campus name is required.");

  const { data, error } = await ctx.adminDb
    .from("campuses")
    .insert({
      name: body.name.trim(),
      subgroup_id: body.subgroupId ?? null,
    })
    .select("id, name")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "campus_created",
    entityType: "campus",
    entityId: data.id,
    metadata: { name: data.name, subgroupId: body.subgroupId ?? null },
  });

  return Response.json({ campus: data }, { status: 201 });
}

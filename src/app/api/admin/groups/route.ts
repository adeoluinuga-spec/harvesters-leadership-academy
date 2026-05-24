import { requireAdmin, unauthorized, badRequest } from "../_lib";
import { logAuditEvent } from "@/lib/activity";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { data, error } = await ctx.db
    .from("groups")
    .select(`
      id, name,
      subgroups(id, name, campuses(id))
    `)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Collect all campus IDs across all groups for leader counts
  const allCampusIds: string[] = [];
  const campusToGroup = new Map<string, string>();

  for (const g of data ?? []) {
    for (const sg of (g.subgroups as { id: string; campuses: { id: string }[] }[]) ?? []) {
      for (const c of sg.campuses ?? []) {
        allCampusIds.push(c.id);
        campusToGroup.set(c.id, g.id);
      }
    }
  }

  const leadersByGroup: Record<string, number> = {};
  if (allCampusIds.length > 0) {
    const { data: users } = await ctx.db
      .from("users")
      .select("campus_id")
      .in("campus_id", allCampusIds);
    for (const u of users ?? []) {
      if (!u.campus_id) continue;
      const gId = campusToGroup.get(u.campus_id);
      if (gId) leadersByGroup[gId] = (leadersByGroup[gId] ?? 0) + 1;
    }
  }

  // Resolve group pastor (user with role Group Pastor + group_id)
  const groupIds = (data ?? []).map((g) => g.id);
  const pastorsByGroup: Record<string, string> = {};
  if (groupIds.length > 0) {
    const { data: pastors } = await ctx.db
      .from("users")
      .select("full_name, group_id")
      .in("group_id", groupIds)
      .eq("role", "Group Pastor");
    for (const p of pastors ?? []) {
      if (p.group_id && !pastorsByGroup[p.group_id]) {
        pastorsByGroup[p.group_id] = p.full_name ?? "";
      }
    }
  }

  const groups = (data ?? []).map((g) => {
    const sgs = (g.subgroups as { id: string; campuses: { id: string }[] }[]) ?? [];
    const campusCount = sgs.reduce((acc, sg) => acc + (sg.campuses?.length ?? 0), 0);
    return {
      id: g.id,
      name: g.name,
      subgroupCount: sgs.length,
      campusCount,
      leaderCount: leadersByGroup[g.id] ?? 0,
      pastorName: pastorsByGroup[g.id] ?? null,
    };
  });

  return Response.json({ groups });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body.name?.trim()) return badRequest("Group name is required.");

  // Resolve default organization
  const { data: org } = await ctx.db
    .from("organizations")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data, error } = await ctx.adminDb
    .from("groups")
    .insert({
      name: body.name.trim(),
      organization_id: org?.id ?? null,
    })
    .select("id, name")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    supabase: ctx.adminDb,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    eventType: "group_created",
    entityType: "group",
    entityId: data.id,
    metadata: { name: data.name },
  });

  return Response.json({ group: data }, { status: 201 });
}

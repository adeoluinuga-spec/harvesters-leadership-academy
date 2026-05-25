import { requireAdmin, unauthorized } from "../_lib";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const eventType = url.searchParams.get("event_type") ?? "";
  const campusId = url.searchParams.get("campus_id") ?? "";
  const subgroupId = url.searchParams.get("subgroup_id") ?? "";
  const groupId = url.searchParams.get("group_id") ?? "";
  const dateFrom = url.searchParams.get("date_from") ?? "";
  const dateTo = url.searchParams.get("date_to") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = (page - 1) * limit;

  let query = ctx.adminDb
    .from("activity_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) query = query.eq("event_type", eventType);
  if (campusId) query = query.eq("campus_id", campusId);
  if (subgroupId) query = query.eq("subgroup_id", subgroupId);
  if (groupId) query = query.eq("group_id", groupId);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59Z");

  const { data, error, count } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Resolve actor names
  const actorIds = [
    ...new Set(
      (data ?? [])
        .map((e) => e.actor_id ?? e.user_id)
        .filter(Boolean) as string[]
    ),
  ];

  const actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await ctx.adminDb
      .from("users")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const a of actors ?? []) {
      actorNames[a.id] = a.full_name ?? a.email ?? a.id;
    }
  }

  const events = (data ?? [])
    .filter((e) => {
      if (!search) return true;
      const actorName = actorNames[e.actor_id ?? e.user_id ?? ""] ?? "";
      return (
        e.event_type?.includes(search.toLowerCase()) ||
        actorName.toLowerCase().includes(search.toLowerCase()) ||
        e.entity_type?.includes(search.toLowerCase())
      );
    })
    .map((e) => ({
      id: e.id,
      eventType: e.event_type,
      entityType: e.entity_type ?? null,
      entityId: e.entity_id ?? null,
      actorId: e.actor_id ?? e.user_id,
      actorName: actorNames[e.actor_id ?? e.user_id ?? ""] ?? "System",
      actorRole: e.actor_role ?? e.role ?? null,
      campusId: e.campus_id,
      subgroupId: e.subgroup_id,
      groupId: e.group_id,
      metadata: e.metadata ?? e.event_payload ?? {},
      createdAt: e.created_at,
    }));

  return Response.json({ events, total: count ?? 0, page, limit });
}

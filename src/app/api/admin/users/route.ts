import { requireAdmin, unauthorized } from "../_lib";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const roleFilter = url.searchParams.get("role") ?? "";
  const campusFilter = url.searchParams.get("campus_id") ?? "";
  const subgroupFilter = url.searchParams.get("subgroup_id") ?? "";
  const groupFilter = url.searchParams.get("group_id") ?? "";
  const onboardingFilter = url.searchParams.get("onboarding") ?? "";
  const activeFilter = url.searchParams.get("active") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = (page - 1) * limit;

  let query = ctx.db
    .from("users")
    .select(
      `id, full_name, email, role, designation,
       campus_id, subgroup_id, group_id,
       onboarding_completed, is_active, created_at,
       current_leadership_role,
       campuses(id, name),
       subgroups(id, name),
       groups(id, name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (roleFilter) query = query.eq("role", roleFilter);
  if (campusFilter) query = query.eq("campus_id", campusFilter);
  if (subgroupFilter) query = query.eq("subgroup_id", subgroupFilter);
  if (groupFilter) query = query.eq("group_id", groupFilter);
  if (onboardingFilter === "true") query = query.eq("onboarding_completed", true);
  if (onboardingFilter === "false") query = query.eq("onboarding_completed", false);
  if (activeFilter === "true") query = query.eq("is_active", true);
  if (activeFilter === "false") query = query.eq("is_active", false);

  const { data, error, count } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const users = (data ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    designation: u.designation,
    campusId: u.campus_id,
    campusName: (u.campuses as { name?: string } | null)?.name ?? null,
    subgroupId: u.subgroup_id,
    subgroupName: (u.subgroups as { name?: string } | null)?.name ?? null,
    groupId: u.group_id,
    groupName: (u.groups as { name?: string } | null)?.name ?? null,
    onboardingCompleted: u.onboarding_completed,
    isActive: u.is_active ?? true,
    currentLeadershipRole: u.current_leadership_role,
    createdAt: u.created_at,
  }));

  return Response.json({ users, total: count ?? 0, page, limit });
}

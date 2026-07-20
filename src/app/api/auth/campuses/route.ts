import { createClient } from "@supabase/supabase-js";

type CampusRow = {
  id?: string | null;
  name?: string | null;
  group_id?: string | null;
  subgroup_id?: string | null;
};

type SubgroupRow = {
  id?: string | null;
  name?: string | null;
  group_id?: string | null;
};

type GroupRow = {
  id?: string | null;
  name?: string | null;
};

type PastorRow = {
  full_name?: string | null;
  role?: string | null;
  campus_id?: string | null;
  subgroup_id?: string | null;
  group_id?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Service role key is required for this route (RLS bypass). Do not substitute
    // invented campuses when configuration is incomplete.
    if (!supabaseServiceRoleKey) {
      console.warn("[api/auth/campuses] SUPABASE_SERVICE_ROLE_KEY not set — returning empty campus list.");
    } else {
      console.error("[api/auth/campuses] NEXT_PUBLIC_SUPABASE_URL not set.");
    }
    return Response.json({ error: "Campus directory is unavailable." }, { status: 503 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: verifyError } = await adminClient.auth.getUser(token);
  if (verifyError || !authData.user) {
    return Response.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const { data: campusRows, error: campusError } = await adminClient
    .from("campuses")
    .select("id, name, group_id, subgroup_id")
    .order("name")
    .returns<CampusRow[]>();

  if (campusError || !campusRows?.length) {
    console.error("[api/auth/campuses] Failed to fetch campuses.", campusError?.message);
    return Response.json({ error: "No campuses have been configured yet." }, { status: 404 });
  }

  const subgroupIds = [
    ...new Set(campusRows.map((c) => c.subgroup_id).filter((id): id is string => Boolean(id))),
  ];
  const directGroupIds = [
    ...new Set(campusRows.map((c) => c.group_id).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: subgroupRows }, { data: groupRows }] = await Promise.all([
    subgroupIds.length
      ? adminClient
          .from("subgroups")
          .select("id, name, group_id")
          .in("id", subgroupIds)
          .returns<SubgroupRow[]>()
      : Promise.resolve({ data: [] as SubgroupRow[] }),
    directGroupIds.length
      ? adminClient
          .from("groups")
          .select("id, name")
          .in("id", directGroupIds)
          .returns<GroupRow[]>()
      : Promise.resolve({ data: [] as GroupRow[] }),
  ]);

  const subgroupsById = new Map((subgroupRows ?? []).map((s) => [s.id!, s]));
  const groupsById = new Map((groupRows ?? []).map((g) => [g.id!, g]));

  const { data: pastorRows } = await adminClient
    .from("users")
    .select("full_name, role, campus_id, subgroup_id, group_id")
    .in("role", ["Campus Pastor", "Sub-group Pastor", "Subgroup Pastor", "Group Pastor"])
    .returns<PastorRow[]>();

  const campusPastorByCampus = new Map<string, string>();
  const subgroupPastorBySubgroup = new Map<string, string>();
  const groupPastorByGroup = new Map<string, string>();

  for (const pastor of pastorRows ?? []) {
    if (pastor.role === "Campus Pastor" && pastor.campus_id && !campusPastorByCampus.has(pastor.campus_id)) {
      campusPastorByCampus.set(pastor.campus_id, pastor.full_name ?? "");
    }
    if (
      ["Sub-group Pastor", "Subgroup Pastor"].includes(pastor.role ?? "") &&
      pastor.subgroup_id &&
      !subgroupPastorBySubgroup.has(pastor.subgroup_id)
    ) {
      subgroupPastorBySubgroup.set(pastor.subgroup_id, pastor.full_name ?? "");
    }
    if (pastor.role === "Group Pastor" && pastor.group_id && !groupPastorByGroup.has(pastor.group_id)) {
      groupPastorByGroup.set(pastor.group_id, pastor.full_name ?? "");
    }
  }

  const campuses = campusRows.map((campus) => {
    const subgroupId = campus.subgroup_id ?? null;
    const subgroup = subgroupId ? subgroupsById.get(subgroupId) : null;
    const groupId = campus.group_id ?? subgroup?.group_id ?? null;
    const group = groupId ? groupsById.get(groupId) : null;

    return {
      id: campus.id ?? "",
      name: campus.name ?? "Unnamed campus",
      subgroupId,
      subgroupName: subgroup?.name ?? "Unassigned subgroup",
      groupId,
      groupName: group?.name ?? "Unassigned group",
      groupPastor: groupId ? groupPastorByGroup.get(groupId) ?? "" : "",
      campusPastor: campus.id ? campusPastorByCampus.get(campus.id) ?? "" : "",
      subgroupPastor: subgroupId ? subgroupPastorBySubgroup.get(subgroupId) ?? "" : "",
    };
  });

  return Response.json({ campuses });
}

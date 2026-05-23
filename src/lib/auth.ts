export async function fetchMinistryCampuses(): Promise<MinistryCampusOption[]> {
  const supabase = createClient();

  const { data: campusRows, error: campusError } = await supabase
    .from("campuses")
    .select("id, name, subgroup_id")
    .order("name", { ascending: true });

  if (campusError) {
    console.error("[fetchMinistryCampuses] campus fetch failed", campusError);
    throw new Error("Your campus list could not be loaded from the server. Please refresh the page and try again.");
  }

  if (!campusRows || campusRows.length === 0) {
    console.error("[fetchMinistryCampuses] no campuses returned");
    throw new Error("No campuses are available yet. Please contact academy support.");
  }

  const subgroupIds = Array.from(
    new Set(
      campusRows
        .map((campus) => campus.subgroup_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: subgroupRows, error: subgroupError } = subgroupIds.length
    ? await supabase
        .from("subgroups")
        .select("id, name, group_id")
        .in("id", subgroupIds)
    : { data: [], error: null };

  if (subgroupError) {
    console.error("[fetchMinistryCampuses] subgroup fetch failed", subgroupError);
  }

  const groupIds = Array.from(
    new Set(
      (subgroupRows ?? [])
        .map((subgroup) => subgroup.group_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: groupRows, error: groupError } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds)
    : { data: [], error: null };

  if (groupError) {
    console.error("[fetchMinistryCampuses] group fetch failed", groupError);
  }

  const subgroupMap = new Map(
    (subgroupRows ?? []).map((subgroup) => [subgroup.id, subgroup])
  );

  const groupMap = new Map(
    (groupRows ?? []).map((group) => [group.id, group])
  );

  return campusRows.map((campus) => {
    const subgroup = campus.subgroup_id ? subgroupMap.get(campus.subgroup_id) : null;
    const group = subgroup?.group_id ? groupMap.get(subgroup.group_id) : null;

    return {
      id: campus.id,
      name: campus.name ?? "Unnamed Campus",
      subgroupId: campus.subgroup_id ?? null,
      subgroupName: subgroup?.name ?? "Unassigned subgroup",
      groupId: subgroup?.group_id ?? null,
      groupName: group?.name ?? "Group Alpha",
      groupPastor: "",
      campusPastor: "",
      subgroupPastor: "",
      source: "supabase",
    };
  });
}
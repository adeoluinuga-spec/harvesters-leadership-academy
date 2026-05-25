import { NextResponse } from "next/server";
import { getHierarchyDb, unauthorized, NOT_PLATFORM_ADMIN } from "../_lib";

type GroupRow = { id: string; name: string | null };
type SubgroupRow = { id: string; name: string | null; group_id: string | null };
type CampusRow = {
  id: string;
  name: string | null;
  subgroup_id: string | null;
  campus_pastor: string | null;
  pastor: string | null;
};
type UserRow = { id: string; campus_id: string | null; role: string | null };

export async function GET() {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { db } = ctx;

  const [groupsRes, subgroupsRes, campusesRes, usersRes] = await Promise.all([
    db.from("groups").select("id, name").order("name"),
    db.from("subgroups").select("id, name, group_id").order("name"),
    db.from("campuses").select("id, name, subgroup_id, campus_pastor, pastor").order("name"),
    db
      .from("users")
      .select("id, campus_id, role")
      .not("role", "is", null)
      .not("role", "in", NOT_PLATFORM_ADMIN),
  ]);

  const groups = (groupsRes.data ?? []) as GroupRow[];
  const subgroups = (subgroupsRes.data ?? []) as SubgroupRow[];
  const campuses = (campusesRes.data ?? []) as CampusRow[];
  const users = (usersRes.data ?? []) as UserRow[];

  // Build lookup maps
  const usersByCampus = new Map<string, UserRow[]>();
  for (const u of users) {
    if (!u.campus_id) continue;
    const arr = usersByCampus.get(u.campus_id) ?? [];
    arr.push(u);
    usersByCampus.set(u.campus_id, arr);
  }

  const campusesBySubgroup = new Map<string, CampusRow[]>();
  for (const c of campuses) {
    if (!c.subgroup_id) continue;
    const arr = campusesBySubgroup.get(c.subgroup_id) ?? [];
    arr.push(c);
    campusesBySubgroup.set(c.subgroup_id, arr);
  }

  const subgroupsByGroup = new Map<string, SubgroupRow[]>();
  for (const sg of subgroups) {
    if (!sg.group_id) continue;
    const arr = subgroupsByGroup.get(sg.group_id) ?? [];
    arr.push(sg);
    subgroupsByGroup.set(sg.group_id, arr);
  }

  // Build tree
  const result = groups.map((group) => {
    const groupSubgroups = subgroupsByGroup.get(group.id) ?? [];
    let groupTotal = 0;
    let groupCampusCount = 0;

    const subgroupsData = groupSubgroups.map((sg) => {
      const sgCampuses = campusesBySubgroup.get(sg.id) ?? [];
      groupCampusCount += sgCampuses.length;
      let sgTotal = 0;

      const campusesData = sgCampuses.map((campus) => {
        const campusUsers = usersByCampus.get(campus.id) ?? [];
        sgTotal += campusUsers.length;

        const cadreCounts = new Map<string, number>();
        for (const u of campusUsers) {
          if (u.role) cadreCounts.set(u.role, (cadreCounts.get(u.role) ?? 0) + 1);
        }

        const cadres = [...cadreCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([role, count]) => ({ role, count }));

        return {
          id: campus.id,
          name: campus.name ?? "Unknown Campus",
          pastorName: campus.campus_pastor ?? campus.pastor ?? null,
          totalLeaders: campusUsers.length,
          cadres,
        };
      }).sort((a, b) => b.totalLeaders - a.totalLeaders);

      groupTotal += sgTotal;

      return {
        id: sg.id,
        name: sg.name ?? "Unknown Subgroup",
        totalLeaders: sgTotal,
        campusCount: sgCampuses.length,
        campuses: campusesData,
      };
    }).sort((a, b) => b.totalLeaders - a.totalLeaders);

    return {
      id: group.id,
      name: group.name ?? "Unknown Group",
      totalLeaders: groupTotal,
      subgroupCount: groupSubgroups.length,
      campusCount: groupCampusCount,
      subgroups: subgroupsData,
    };
  });

  return NextResponse.json({ groups: result, totalLeaders: users.length });
}

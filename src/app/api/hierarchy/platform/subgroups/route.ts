import { NextResponse } from "next/server";
import { getHierarchyDb, unauthorized, NOT_PLATFORM_ADMIN } from "../../_lib";

type SubgroupRow = { id: string; name: string | null };
type CampusRow = { id: string; name: string | null; subgroup_id: string | null };
type UserRow = {
  id: string;
  campus_id: string | null;
  subgroup_id: string | null;
  full_name: string | null;
  role: string | null;
};
type CertRow = { user_id: string; issued_at: string };

const SUBGROUP_PASTOR_ROLES = ["Sub-Group Pastor", "Subgroup Pastor", "Sub-group Pastor"];

export async function GET() {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();
  const { db } = ctx;

  const [subgroupsRes, campusesRes, usersRes, enrollRes, certRes] = await Promise.all([
    db.from("subgroups").select("id, name").order("name"),
    db.from("campuses").select("id, name, subgroup_id").order("name"),
    db
      .from("users")
      .select("id, campus_id, subgroup_id, full_name, role")
      .not("role", "is", null)
      .not("role", "in", NOT_PLATFORM_ADMIN),
    db.from("enrollments").select("user_id"),
    db.from("certificates").select("user_id, issued_at"),
  ]);

  const subgroups = (subgroupsRes.data ?? []) as SubgroupRow[];
  const campuses = (campusesRes.data ?? []) as CampusRow[];
  const allUsers = (usersRes.data ?? []) as UserRow[];
  const enrolledSet = new Set((enrollRes.data ?? []).map((e: { user_id: string }) => e.user_id));
  const certs = (certRes.data ?? []) as CertRow[];
  const certSet = new Set(certs.map((c) => c.user_id));

  const campusNameById = new Map(campuses.map((c) => [c.id, c.name ?? "Unknown Campus"]));

  const campusesBySubgroup = new Map<string, CampusRow[]>();
  for (const c of campuses) {
    if (!c.subgroup_id) continue;
    const arr = campusesBySubgroup.get(c.subgroup_id) ?? [];
    arr.push(c);
    campusesBySubgroup.set(c.subgroup_id, arr);
  }

  const usersByCampus = new Map<string, string[]>();
  for (const u of allUsers) {
    if (!u.campus_id) continue;
    const arr = usersByCampus.get(u.campus_id) ?? [];
    arr.push(u.id);
    usersByCampus.set(u.campus_id, arr);
  }

  const pastorBySubgroup = new Map<string, string>();
  for (const u of allUsers) {
    if (u.subgroup_id && SUBGROUP_PASTOR_ROLES.includes(u.role ?? "") && !pastorBySubgroup.has(u.subgroup_id)) {
      pastorBySubgroup.set(u.subgroup_id, u.full_name ?? "");
    }
  }

  const result = subgroups
    .map((sg) => {
      const sgCampuses = campusesBySubgroup.get(sg.id) ?? [];

      const campusSummaries = sgCampuses
        .map((campus) => {
          const leaderIds = usersByCampus.get(campus.id) ?? [];
          const leaderSet = new Set(leaderIds);
          const enr = leaderIds.filter((id) => enrolledSet.has(id)).length;
          const comp = leaderIds.filter((id) => certSet.has(id)).length;
          const certCount = certs.filter((c) => leaderSet.has(c.user_id)).length;
          return {
            campusId: campus.id,
            campusName: campusNameById.get(campus.id) ?? "Unknown Campus",
            totalLeaders: leaderIds.length,
            enrolledLeaders: enr,
            completedLeaders: comp,
            certificates: certCount,
            completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
            assessmentPassRate: 0,
          };
        })
        .sort((a, b) => b.totalLeaders - a.totalLeaders);

      const campusUserIds = new Set(sgCampuses.flatMap((c) => usersByCampus.get(c.id) ?? []));
      const directUsers = allUsers.filter((u) => u.subgroup_id === sg.id && !campusUserIds.has(u.id));
      const allSgUserIds = [...campusUserIds, ...directUsers.map((u) => u.id)];

      const totalLeaders = allSgUserIds.length;
      const enrolledLeaders = allSgUserIds.filter((id) => enrolledSet.has(id)).length;
      const completedLeaders = allSgUserIds.filter((id) => certSet.has(id)).length;
      const certificates = certs.filter((c) => campusUserIds.has(c.user_id) || directUsers.some((u) => u.id === c.user_id)).length;
      const completionRate = enrolledLeaders > 0 ? Math.round((completedLeaders / enrolledLeaders) * 100) : 0;

      return {
        subgroupId: sg.id,
        subgroupName: sg.name ?? "Unknown Subgroup",
        pastorName: pastorBySubgroup.get(sg.id) ?? "",
        totalLeaders,
        enrolledLeaders,
        completedLeaders,
        certificates,
        completionRate,
        campusSummaries,
      };
    })
    .sort((a, b) => b.totalLeaders - a.totalLeaders);

  return NextResponse.json({ subgroups: result });
}

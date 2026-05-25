import { NextResponse } from "next/server";
import { getHierarchyDb, buildWeeklyTrend, unauthorized, NOT_PLATFORM_ADMIN } from "../../_lib";

type SubgroupRow = { id: string; name: string | null };
type CampusRow = { id: string; name: string | null; subgroup_id: string | null };
type UserRow = {
  id: string;
  campus_id: string | null;
  subgroup_id: string | null;
  full_name: string | null;
  role: string | null;
};
type EnrollRow = { user_id: string; course_id: string; created_at: string };
type CertRow = { user_id: string; course_id: string; issued_at: string };

const SUBGROUP_PASTOR_ROLES = ["Sub-Group Pastor", "Subgroup Pastor"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { groupId } = await params;
  const { db } = ctx;

  // 1. Resolve subgroups via the subgroups table (group_id → subgroup rows)
  const { data: subgroupRows } = await db
    .from("subgroups")
    .select("id, name")
    .eq("group_id", groupId) as { data: SubgroupRow[] | null };

  const subgroupList = subgroupRows ?? [];
  if (subgroupList.length === 0) {
    return NextResponse.json({
      totalLeaders: 0,
      enrolledLeaders: 0,
      completedLeaders: 0,
      certificates: 0,
      overallCompletionRate: 0,
      totalCampuses: 0,
      totalSubgroups: 0,
      subgroups: [],
      weeklyTrend: [],
    });
  }

  const subgroupIds = subgroupList.map((s) => s.id);
  const subgroupNameById = new Map(subgroupList.map((s) => [s.id, s.name ?? ""]));

  // 2. All campuses in those subgroups
  const { data: campusRows } = await db
    .from("campuses")
    .select("id, name, subgroup_id")
    .in("subgroup_id", subgroupIds) as { data: CampusRow[] | null };

  const campusList = campusRows ?? [];
  const campusIds = campusList.map((c) => c.id);
  const campusNameById = new Map(campusList.map((c) => [c.id, c.name ?? "Unknown Campus"]));
  const campusSubgroupById = new Map(campusList.map((c) => [c.id, c.subgroup_id ?? ""]));

  // 3. All users via campus traversal + direct group_id fallback
  const [campusUsersRes, directGroupUsersRes] = await Promise.all([
    campusIds.length > 0
      ? db
          .from("users")
          .select("id, campus_id, subgroup_id, full_name, role")
          .in("campus_id", campusIds)
          .not("role", "in", NOT_PLATFORM_ADMIN)
      : Promise.resolve({ data: [] as UserRow[] }),
    db
      .from("users")
      .select("id, campus_id, subgroup_id, full_name, role")
      .eq("group_id", groupId)
      .not("role", "in", NOT_PLATFORM_ADMIN),
  ]);

  const seenIds = new Set<string>();
  const allUsers = [
    ...((campusUsersRes.data ?? []) as UserRow[]),
    ...((directGroupUsersRes.data ?? []) as UserRow[]),
  ].filter((u) => {
    if (seenIds.has(u.id)) return false;
    seenIds.add(u.id);
    return true;
  });

  const userIds = allUsers.map((u) => u.id);

  if (userIds.length === 0) {
    return NextResponse.json({
      totalLeaders: 0,
      enrolledLeaders: 0,
      completedLeaders: 0,
      certificates: 0,
      overallCompletionRate: 0,
      totalCampuses: campusIds.length,
      totalSubgroups: subgroupIds.length,
      subgroups: subgroupList.map((s) => ({
        subgroupId: s.id,
        subgroupName: s.name ?? "",
        pastorName: "",
        totalLeaders: 0,
        enrolledLeaders: 0,
        completedLeaders: 0,
        certificates: 0,
        completionRate: 0,
        campusSummaries: [],
      })),
      weeklyTrend: [],
    });
  }

  // 4. LMS data for all resolved users
  const [enrollRes, certRes] = await Promise.all([
    db.from("enrollments").select("user_id, course_id, created_at").in("user_id", userIds),
    db.from("certificates").select("user_id, course_id, issued_at").in("user_id", userIds),
  ]);

  const enrollments = (enrollRes.data ?? []) as EnrollRow[];
  const certs = (certRes.data ?? []) as CertRow[];
  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));

  // 5. Identify subgroup pastors
  const pastorBySubgroup = new Map<string, string>();
  for (const u of allUsers) {
    if (u.subgroup_id && SUBGROUP_PASTOR_ROLES.includes(u.role ?? "")) {
      if (!pastorBySubgroup.has(u.subgroup_id)) {
        pastorBySubgroup.set(u.subgroup_id, u.full_name ?? "");
      }
    }
  }

  // 6. Build campus → user index
  const usersByCampus = new Map<string, string[]>();
  for (const u of allUsers) {
    if (u.campus_id) {
      const arr = usersByCampus.get(u.campus_id) ?? [];
      arr.push(u.id);
      usersByCampus.set(u.campus_id, arr);
    }
  }

  // Campuses grouped by subgroup (from the campuses table, not users)
  const campusesBySubgroup = new Map<string, string[]>();
  for (const campus of campusList) {
    if (campus.subgroup_id) {
      const arr = campusesBySubgroup.get(campus.subgroup_id) ?? [];
      arr.push(campus.id);
      campusesBySubgroup.set(campus.subgroup_id, arr);
    }
  }

  // 7. Build subgroup summaries
  const subgroups = subgroupList
    .map((sg) => {
      const sgCampusIds = campusesBySubgroup.get(sg.id) ?? [];

      const sgUserIdSet = new Set<string>();
      for (const campusId of sgCampusIds) {
        for (const uid of usersByCampus.get(campusId) ?? []) sgUserIdSet.add(uid);
      }
      for (const u of allUsers) {
        if (u.subgroup_id === sg.id) sgUserIdSet.add(u.id);
      }
      const sgUserIds = [...sgUserIdSet];

      const sgEnrolled = sgUserIds.filter((id) => enrolledSet.has(id)).length;
      const sgCompleted = sgUserIds.filter((id) => certSet.has(id)).length;
      const sgCerts = certs.filter((c) => sgUserIdSet.has(c.user_id)).length;
      const sgRate = sgEnrolled > 0 ? Math.round((sgCompleted / sgEnrolled) * 100) : 0;

      const campusSummaries = sgCampusIds
        .map((campusId) => {
          const campusUserIds = usersByCampus.get(campusId) ?? [];
          const campusUserIdSet = new Set(campusUserIds);
          const enr = campusUserIds.filter((id) => enrolledSet.has(id)).length;
          const comp = campusUserIds.filter((id) => certSet.has(id)).length;
          const certCount = certs.filter((c) => campusUserIdSet.has(c.user_id)).length;
          return {
            campusId,
            campusName: campusNameById.get(campusId) ?? "Unknown Campus",
            totalLeaders: campusUserIds.length,
            enrolledLeaders: enr,
            completedLeaders: comp,
            certificates: certCount,
            completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
            assessmentPassRate: 0,
          };
        })
        .sort((a, b) => b.totalLeaders - a.totalLeaders);

      return {
        subgroupId: sg.id,
        subgroupName: subgroupNameById.get(sg.id) ?? (sg.name ?? ""),
        pastorName: pastorBySubgroup.get(sg.id) ?? "",
        totalLeaders: sgUserIds.length,
        enrolledLeaders: sgEnrolled,
        completedLeaders: sgCompleted,
        certificates: sgCerts,
        completionRate: sgRate,
        campusSummaries,
      };
    })
    .sort((a, b) => b.totalLeaders - a.totalLeaders);

  const totalEnrolled = userIds.filter((id) => enrolledSet.has(id)).length;
  const totalCompleted = userIds.filter((id) => certSet.has(id)).length;
  const overallRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

  return NextResponse.json({
    totalLeaders: userIds.length,
    enrolledLeaders: totalEnrolled,
    completedLeaders: totalCompleted,
    certificates: certs.length,
    overallCompletionRate: overallRate,
    totalCampuses: campusIds.length,
    totalSubgroups: subgroupIds.length,
    subgroups,
    weeklyTrend: buildWeeklyTrend(enrollments, certs),
  });
}

import { NextResponse } from "next/server";
import { getHierarchyDb, buildWeeklyTrend, unauthorized, NOT_PLATFORM_ADMIN } from "../../_lib";

type CampusRow = { id: string; name: string | null };
type UserRow = { id: string; campus_id: string | null };
type EnrollRow = { user_id: string; course_id: string; created_at: string };
type CertRow = { user_id: string; course_id: string; issued_at: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subgroupId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { subgroupId } = await params;
  const { db } = ctx;

  // 1. Campuses authoritative list for this subgroup
  const { data: campusRows } = await db
    .from("campuses")
    .select("id, name")
    .eq("subgroup_id", subgroupId) as { data: CampusRow[] | null };

  const campusList = campusRows ?? [];
  const campusIds = campusList.map((c) => c.id);
  const campusNameById = new Map(campusList.map((c) => [c.id, c.name ?? "Unknown Campus"]));

  // 2. Users via campus traversal + direct subgroup_id fallback
  const [campusUsersRes, directSubgroupUsersRes] = await Promise.all([
    campusIds.length > 0
      ? db
          .from("users")
          .select("id, campus_id")
          .in("campus_id", campusIds)
          .not("role", "in", NOT_PLATFORM_ADMIN)
      : Promise.resolve({ data: [] as UserRow[] }),
    db
      .from("users")
      .select("id, campus_id")
      .eq("subgroup_id", subgroupId)
      .not("role", "in", NOT_PLATFORM_ADMIN),
  ]);

  const seenIds = new Set<string>();
  const allUsers = [
    ...((campusUsersRes.data ?? []) as UserRow[]),
    ...((directSubgroupUsersRes.data ?? []) as UserRow[]),
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
      campusSummaries: campusList.map((c) => ({
        campusId: c.id,
        campusName: c.name ?? "Unknown Campus",
        totalLeaders: 0,
        enrolledLeaders: 0,
        completedLeaders: 0,
        certificates: 0,
        completionRate: 0,
        assessmentPassRate: 0,
      })),
      weeklyTrend: [],
    });
  }

  // 3. LMS data for all resolved users
  const [enrollRes, certRes] = await Promise.all([
    db.from("enrollments").select("user_id, course_id, created_at").in("user_id", userIds),
    db.from("certificates").select("user_id, course_id, issued_at").in("user_id", userIds),
  ]);

  const enrollments = (enrollRes.data ?? []) as EnrollRow[];
  const certs = (certRes.data ?? []) as CertRow[];
  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));

  const enrolledCount = userIds.filter((id) => enrolledSet.has(id)).length;
  const completedCount = userIds.filter((id) => certSet.has(id)).length;
  const rate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  // 4. Per-campus summaries
  const usersByCampus = new Map<string, string[]>();
  for (const u of allUsers) {
    if (u.campus_id) {
      const arr = usersByCampus.get(u.campus_id) ?? [];
      arr.push(u.id);
      usersByCampus.set(u.campus_id, arr);
    }
  }

  const campusSummaries = campusList
    .map((campus) => {
      const ids = usersByCampus.get(campus.id) ?? [];
      const enr = ids.filter((id) => enrolledSet.has(id)).length;
      const comp = ids.filter((id) => certSet.has(id)).length;
      const campusIdSet = new Set(ids);
      const certCount = certs.filter((c) => campusIdSet.has(c.user_id)).length;
      return {
        campusId: campus.id,
        campusName: campusNameById.get(campus.id) ?? campus.name ?? "Unknown Campus",
        totalLeaders: ids.length,
        enrolledLeaders: enr,
        completedLeaders: comp,
        certificates: certCount,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
        assessmentPassRate: 0,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  return NextResponse.json({
    totalLeaders: userIds.length,
    enrolledLeaders: enrolledCount,
    completedLeaders: completedCount,
    certificates: certs.length,
    overallCompletionRate: rate,
    campusSummaries,
    weeklyTrend: buildWeeklyTrend(enrollments, certs),
  });
}

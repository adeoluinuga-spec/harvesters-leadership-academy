import { NextResponse } from "next/server";
import { getHierarchyDb, buildWeeklyTrend, unauthorized } from "../../../_lib";

type UserRow = { id: string; role: string | null; onboarding_completed: boolean | null };
type EnrollRow = { user_id: string; created_at: string };
type CertRow = { user_id: string; issued_at: string };
type AttemptRow = { user_id: string; passed: boolean | null };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campusId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { campusId } = await params;
  const { db } = ctx;
  const url = new URL(req.url);
  const rolesParam = url.searchParams.get("roles") ?? "";
  const childRoles = rolesParam.split(",").map((r) => r.trim()).filter(Boolean);

  if (childRoles.length === 0) {
    return NextResponse.json({
      totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
      inactiveLeaders: 0, assessmentPassRate: 0, needsFollowUp: 0, completionRate: 0,
      roleBreakdown: [], weeklyTrend: [],
    });
  }

  const { data: usersData } = await db
    .from("users")
    .select("id, role, onboarding_completed")
    .eq("campus_id", campusId)
    .in("role", childRoles) as { data: UserRow[] | null };

  const users = usersData ?? [];
  const userIds = users.map((u) => u.id);

  const emptyBreakdown = childRoles.map((r) => ({
    role: r, count: 0, enrolled: 0, completed: 0, certificates: 0, completionRate: 0,
  }));

  if (userIds.length === 0) {
    return NextResponse.json({
      totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
      inactiveLeaders: 0, assessmentPassRate: 0, needsFollowUp: 0, completionRate: 0,
      roleBreakdown: emptyBreakdown, weeklyTrend: [],
    });
  }

  const [enrollRes, certRes, attemptsRes] = await Promise.all([
    db.from("enrollments").select("user_id, created_at").in("user_id", userIds),
    db.from("certificates").select("user_id, issued_at").in("user_id", userIds),
    db.from("assessment_attempts").select("user_id, passed").in("user_id", userIds),
  ]);

  const enrollments = (enrollRes.data ?? []) as EnrollRow[];
  const certs = (certRes.data ?? []) as CertRow[];
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];

  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));

  const enrolledCount = userIds.filter((id) => enrolledSet.has(id)).length;
  const completedCount = userIds.filter((id) => certSet.has(id)).length;
  const inactiveCount = users.filter((u) => !u.onboarding_completed).length;
  const needsFollowUp = userIds.filter((id) => enrolledSet.has(id) && !certSet.has(id)).length;

  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 0;
  const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  const roleBreakdown = childRoles
    .map((role) => {
      const roleUsers = users.filter((u) => u.role === role);
      const roleUserIds = new Set(roleUsers.map((u) => u.id));
      const roleEnrolled = [...roleUserIds].filter((id) => enrolledSet.has(id)).length;
      const roleCompleted = [...roleUserIds].filter((id) => certSet.has(id)).length;
      const roleCerts = certs.filter((c) => roleUserIds.has(c.user_id)).length;
      return {
        role,
        count: roleUsers.length,
        enrolled: roleEnrolled,
        completed: roleCompleted,
        certificates: roleCerts,
        completionRate: roleEnrolled > 0 ? Math.round((roleCompleted / roleEnrolled) * 100) : 0,
      };
    })
    .filter((r) => r.count > 0);

  return NextResponse.json({
    totalLeaders: users.length,
    enrolledLeaders: enrolledCount,
    completedLeaders: completedCount,
    certificates: certs.length,
    inactiveLeaders: inactiveCount,
    assessmentPassRate: passRate,
    needsFollowUp,
    completionRate,
    roleBreakdown,
    weeklyTrend: buildWeeklyTrend(enrollments, certs),
  });
}

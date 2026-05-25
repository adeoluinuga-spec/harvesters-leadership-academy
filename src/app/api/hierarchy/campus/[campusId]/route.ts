import { NextResponse } from "next/server";
import { getHierarchyDb, buildWeeklyTrend, unauthorized, NOT_PLATFORM_ADMIN } from "../../_lib";

type UserRow = { id: string; onboarding_completed: boolean | null };
type EnrollRow = { user_id: string; course_id: string; created_at: string };
type CertRow = { user_id: string; course_id: string; issued_at: string };
type AttemptRow = { user_id: string; passed: boolean | null };
type CourseRow = { id: string; title: string; is_required: boolean | null };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campusId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { campusId } = await params;
  const { db } = ctx;

  // All registered leaders in this campus (role check: exclude platform admins)
  const { data: campusUsers } = await db
    .from("users")
    .select("id, onboarding_completed")
    .eq("campus_id", campusId)
    .not("role", "in", NOT_PLATFORM_ADMIN) as { data: UserRow[] | null };

  const users = campusUsers ?? [];
  const userIds = users.map((u) => u.id);
  const total = userIds.length;
  const inactive = users.filter((u) => !u.onboarding_completed).length;

  const empty = {
    totalLeaders: 0,
    enrolledLeaders: 0,
    completedLeaders: 0,
    certificates: 0,
    assessmentAttempts: 0,
    assessmentPassRate: 0,
    avgProgressPercent: 0,
    inactiveLeaders: 0,
    needsFollowUp: 0,
    courseBreakdown: [] as unknown[],
    weeklyTrend: [] as unknown[],
  };

  if (total === 0) return NextResponse.json({ ...empty, inactiveLeaders: inactive });

  const [enrollRes, certRes, attemptsRes, coursesRes] = await Promise.all([
    db.from("enrollments").select("user_id, course_id, created_at").in("user_id", userIds),
    db.from("certificates").select("user_id, course_id, issued_at").in("user_id", userIds),
    db.from("assessment_attempts").select("user_id, passed").in("user_id", userIds),
    db.from("courses").select("id, title, is_required").or("status.eq.published,is_published.eq.true"),
  ]);

  const enrollments = (enrollRes.data ?? []) as EnrollRow[];
  const certs = (certRes.data ?? []) as CertRow[];
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];
  const courses = (coursesRes.data ?? []) as CourseRow[];

  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));

  const enrolledCount = userIds.filter((id) => enrolledSet.has(id)).length;
  const completedCount = userIds.filter((id) => certSet.has(id)).length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 0;
  const needsFollowUp = userIds.filter((id) => enrolledSet.has(id) && !certSet.has(id)).length;
  const avgProgress = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  const enrollByCourse = new Map<string, number>();
  const certByCourse = new Map<string, number>();
  for (const e of enrollments) enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1);
  for (const c of certs) certByCourse.set(c.course_id, (certByCourse.get(c.course_id) ?? 0) + 1);

  const courseBreakdown = courses
    .map((c) => {
      const enr = enrollByCourse.get(c.id) ?? 0;
      const comp = certByCourse.get(c.id) ?? 0;
      return {
        courseId: c.id,
        title: c.title,
        isRequired: c.is_required ?? false,
        enrolledInCampus: enr,
        certificatesInCampus: comp,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
      };
    })
    .filter((c) => c.enrolledInCampus > 0)
    .sort((a, b) => b.enrolledInCampus - a.enrolledInCampus);

  return NextResponse.json({
    totalLeaders: total,
    enrolledLeaders: enrolledCount,
    completedLeaders: completedCount,
    certificates: certs.length,
    assessmentAttempts: attempts.length,
    assessmentPassRate: passRate,
    avgProgressPercent: avgProgress,
    inactiveLeaders: inactive,
    needsFollowUp,
    courseBreakdown,
    weeklyTrend: buildWeeklyTrend(enrollments, certs),
  });
}

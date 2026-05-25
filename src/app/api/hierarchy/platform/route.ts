import { NextResponse } from "next/server";
import { getHierarchyDb, buildWeeklyTrend, unauthorized, PLATFORM_ADMIN_ROLES } from "../_lib";

type UserRow = { id: string; role: string | null; campus_id: string | null; onboarding_completed: boolean | null };
type CourseRow = { id: string; title: string; category: string | null; is_required: boolean | null };
type EnrollRow = { user_id: string; course_id: string; created_at: string };
type CertRow = { user_id: string; course_id: string; issued_at: string };
type CampusRow = { id: string; name: string | null };
type AttemptRow = { user_id: string; passed: boolean | null };
type EventRow = { id: string; event_type: string; event_payload: Record<string, unknown> | null; created_at: string };

export async function GET() {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { db } = ctx;

  const [usersRes, coursesRes, enrollmentsRes, certsRes, campusesRes, attemptsRes] =
    await Promise.all([
      db.from("users").select("id, role, campus_id, onboarding_completed"),
      db.from("courses").select("id, title, category, is_required").or("status.eq.published,is_published.eq.true"),
      db.from("enrollments").select("user_id, course_id, created_at"),
      db.from("certificates").select("user_id, course_id, issued_at"),
      db.from("campuses").select("id, name"),
      db.from("assessment_attempts").select("user_id, passed"),
    ]);

  const allUsers = (usersRes.data ?? []) as UserRow[];
  const leaders = allUsers.filter((u) => !PLATFORM_ADMIN_ROLES.includes((u.role ?? "") as typeof PLATFORM_ADMIN_ROLES[number]));
  const activated = leaders.filter((u) => u.onboarding_completed);
  const courses = (coursesRes.data ?? []) as CourseRow[];
  const enrollments = (enrollmentsRes.data ?? []) as EnrollRow[];
  const certs = (certsRes.data ?? []) as CertRow[];
  const campuses = (campusesRes.data ?? []) as CampusRow[];
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];

  // Per-course aggregates
  const enrollByCourse = new Map<string, number>();
  const certByCourse = new Map<string, number>();
  for (const e of enrollments) enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1);
  for (const c of certs) certByCourse.set(c.course_id, (certByCourse.get(c.course_id) ?? 0) + 1);

  const topCourses = courses
    .map((c) => {
      const enr = enrollByCourse.get(c.id) ?? 0;
      const comp = certByCourse.get(c.id) ?? 0;
      return {
        courseId: c.id,
        title: c.title,
        category: c.category ?? "",
        enrollments: enr,
        completions: comp,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
        isRequired: c.is_required ?? false,
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 6);

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
  const certUserIds = new Set(certs.map((c) => c.user_id));
  const passedSet = new Set(attempts.filter((a) => a.passed).map((a) => a.user_id));
  const attemptedSet = new Set(attempts.map((a) => a.user_id));

  const campusSummaries = campuses
    .map((campus) => {
      const campusLeaders = leaders.filter((u) => u.campus_id === campus.id);
      const total = campusLeaders.length;
      const enrolled = campusLeaders.filter((u) => enrolledUserIds.has(u.id)).length;
      const completed = campusLeaders.filter((u) => certUserIds.has(u.id)).length;
      const certCount = certs.filter((c) => campusLeaders.some((u) => u.id === c.user_id)).length;
      const campusAttempts = campusLeaders.filter((u) => attemptedSet.has(u.id)).length;
      const campusPassed = campusLeaders.filter((u) => passedSet.has(u.id)).length;
      return {
        campusId: campus.id,
        campusName: campus.name ?? "Unknown Campus",
        totalLeaders: total,
        enrolledLeaders: enrolled,
        completedLeaders: completed,
        certificates: certCount,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        assessmentPassRate: campusAttempts > 0 ? Math.round((campusPassed / campusAttempts) * 100) : 0,
      };
    })
    .sort((a, b) => b.totalLeaders - a.totalLeaders);

  // Recent events
  let recentEvents: { id: string; eventType: string; payload: Record<string, unknown>; createdAt: string }[] = [];
  try {
    const { data: eventsData } = await db
      .from("activity_events")
      .select("id, event_type, event_payload, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    recentEvents = ((eventsData ?? []) as EventRow[]).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      payload: (e.event_payload as Record<string, unknown>) ?? {},
      createdAt: e.created_at,
    }));
  } catch {
    // activity_events table may not exist yet
  }

  const overallCompletionRate =
    enrollments.length > 0 ? Math.round((certs.length / enrollments.length) * 100) : 0;
  const enrollmentRate =
    leaders.length > 0 ? Math.round((enrolledUserIds.size / leaders.length) * 100) : 0;

  return NextResponse.json({
    totalLeaders: leaders.length,
    activatedLeaders: activated.length,
    totalCourses: courses.length,
    totalEnrollments: enrollments.length,
    totalCertificates: certs.length,
    overallCompletionRate,
    enrollmentRate,
    topCourses,
    campusSummaries,
    recentEvents,
    weeklyTrend: buildWeeklyTrend(enrollments, certs),
  });
}

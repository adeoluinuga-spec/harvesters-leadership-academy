import { NextResponse } from "next/server";
import { getHierarchyDb, unauthorized } from "../../_lib";

type EnrollRow = { course_id: string };
type CertRow = { course_id: string };
type AttemptRow = { passed: boolean | null };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { userId } = await params;
  const { db } = ctx;

  const [enrollRes, certRes, attemptsRes] = await Promise.all([
    db.from("enrollments").select("course_id").eq("user_id", userId),
    db.from("certificates").select("course_id").eq("user_id", userId),
    db.from("assessment_attempts").select("passed").eq("user_id", userId),
  ]);

  const enrollments = (enrollRes.data ?? []) as EnrollRow[];
  const certs = (certRes.data ?? []) as CertRow[];
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];

  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 0;
  const completionRate =
    enrollments.length > 0 ? Math.round((certs.length / enrollments.length) * 100) : 0;

  return NextResponse.json({
    enrolledCourses: enrollments.length,
    completedCourses: certs.length,
    certificates: certs.length,
    assessmentAttempts: attempts.length,
    assessmentPassRate: passRate,
    completionRate,
  });
}

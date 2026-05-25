import { NextResponse } from "next/server";
import { getHierarchyDb, unauthorized, NOT_PLATFORM_ADMIN } from "../../../_lib";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  designation: string | null;
  onboarding_completed: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};
type EnrollRow = { user_id: string };
type CertRow = { user_id: string };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campusId: string }> }
) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { campusId } = await params;
  const { db } = ctx;
  const url = new URL(req.url);
  const roleFilter = url.searchParams.get("role");

  let query = db
    .from("users")
    .select("id, full_name, email, role, designation, onboarding_completed, is_active, created_at")
    .eq("campus_id", campusId)
    .not("role", "is", null)
    .not("role", "in", NOT_PLATFORM_ADMIN)
    .order("full_name");

  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }

  const { data: usersData } = await query as { data: UserRow[] | null };
  const users = usersData ?? [];
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) return NextResponse.json({ leaders: [] });

  const [enrollRes, certRes] = await Promise.all([
    db.from("enrollments").select("user_id").in("user_id", userIds),
    db.from("certificates").select("user_id").in("user_id", userIds),
  ]);

  const enrollCountByUser = new Map<string, number>();
  const certCountByUser = new Map<string, number>();

  for (const e of (enrollRes.data ?? []) as EnrollRow[]) {
    enrollCountByUser.set(e.user_id, (enrollCountByUser.get(e.user_id) ?? 0) + 1);
  }
  for (const c of (certRes.data ?? []) as CertRow[]) {
    certCountByUser.set(c.user_id, (certCountByUser.get(c.user_id) ?? 0) + 1);
  }

  const leaders = users.map((u) => ({
    id: u.id,
    fullName: u.full_name ?? "—",
    email: u.email ?? "—",
    role: u.role ?? "—",
    designation: u.designation ?? null,
    enrolledCourses: enrollCountByUser.get(u.id) ?? 0,
    certificates: certCountByUser.get(u.id) ?? 0,
    onboardingCompleted: u.onboarding_completed ?? false,
    isActive: u.is_active ?? true,
    joinedAt: u.created_at ?? "",
  }));

  return NextResponse.json({ leaders });
}

import { NextResponse } from "next/server";
import { getHierarchyDb, unauthorized } from "../_lib";

type CallerProfile = {
  role: string | null;
  campus_id: string | null;
  subgroup_id: string | null;
  group_id: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  campus_id: string | null;
  subgroup_id: string | null;
  group_id: string | null;
  onboarding_completed: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};

type EnrollRow = { user_id: string };
type CertRow = { user_id: string };
type AttemptRow = { user_id: string };

type CampusLookup = { id: string; name: string | null };
type SubgroupLookup = { id: string; name: string | null };
type GroupLookup = { id: string; name: string | null };

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];
const GROUP_PASTOR_ROLES = ["Group Pastor"];
const SUBGROUP_PASTOR_ROLES = ["Sub-Group Pastor", "Subgroup Pastor", "Sub-group Pastor"];

export async function GET(req: Request) {
  const ctx = await getHierarchyDb();
  if (!ctx) return unauthorized();

  const { db, userId } = ctx;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10));
  const search = url.searchParams.get("search") ?? "";
  const roleFilter = url.searchParams.get("role") ?? "";
  const offset = (page - 1) * limit;

  // Fetch caller's own profile
  const { data: callerData } = await db
    .from("users")
    .select("role, campus_id, subgroup_id, group_id")
    .eq("id", userId)
    .maybeSingle() as { data: CallerProfile | null };

  if (!callerData) return unauthorized();

  const callerRole = callerData.role ?? "";

  // Resolve the set of campus IDs this caller can see
  let allowedCampusIds: string[] | "all" = [];

  if (ADMIN_ROLES.includes(callerRole)) {
    allowedCampusIds = "all";

  } else if (GROUP_PASTOR_ROLES.includes(callerRole) && callerData.group_id) {
    // group → subgroups → campuses
    const { data: subgroupRows } = await db
      .from("subgroups")
      .select("id")
      .eq("group_id", callerData.group_id);
    const subgroupIds = (subgroupRows ?? []).map((s: { id: string }) => s.id);

    if (subgroupIds.length > 0) {
      const { data: campusRows } = await db
        .from("campuses")
        .select("id")
        .in("subgroup_id", subgroupIds);
      allowedCampusIds = (campusRows ?? []).map((c: { id: string }) => c.id);
    }

  } else if (SUBGROUP_PASTOR_ROLES.includes(callerRole) && callerData.subgroup_id) {
    // subgroup → campuses
    const { data: campusRows } = await db
      .from("campuses")
      .select("id")
      .eq("subgroup_id", callerData.subgroup_id);
    allowedCampusIds = (campusRows ?? []).map((c: { id: string }) => c.id);

  } else if (callerData.campus_id) {
    // Campus Pastor and all lower oversight roles
    allowedCampusIds = [callerData.campus_id];

  } else {
    // No scope determined — return empty
    return NextResponse.json({ users: [], total: 0, page, limit });
  }

  // Build the base user query
  let countQ: ReturnType<typeof db.from>;
  let dataQ: ReturnType<typeof db.from>;

  if (allowedCampusIds === "all") {
    countQ = db.from("users").select("*", { count: "exact", head: true });
    dataQ = db
      .from("users")
      .select(`id, full_name, email, role, campus_id, subgroup_id, group_id,
               onboarding_completed, is_active, created_at,
               campuses(id, name), subgroups(id, name), groups(id, name)`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
  } else if (allowedCampusIds.length === 0) {
    return NextResponse.json({ users: [], total: 0, page, limit });
  } else {
    countQ = db.from("users").select("*", { count: "exact", head: true })
      .in("campus_id", allowedCampusIds);
    dataQ = db
      .from("users")
      .select(`id, full_name, email, role, campus_id, subgroup_id, group_id,
               onboarding_completed, is_active, created_at,
               campuses(id, name), subgroups(id, name), groups(id, name)`)
      .in("campus_id", allowedCampusIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
  }

  // Apply search and role filters
  if (search) {
    const sq = `full_name.ilike.%${search}%,email.ilike.%${search}%`;
    countQ = countQ.or(sq);
    dataQ = dataQ.or(sq);
  }
  if (roleFilter) {
    countQ = countQ.eq("role", roleFilter);
    dataQ = dataQ.eq("role", roleFilter);
  }

  const [countResult, dataResult] = await Promise.all([countQ, dataQ]);
  const total = (countResult as { count: number | null }).count ?? 0;
  const rows = (dataResult.data ?? []) as (UserRow & {
    campuses: CampusLookup | null;
    subgroups: SubgroupLookup | null;
    groups: GroupLookup | null;
  })[];

  const userIds = rows.map((u) => u.id);

  if (userIds.length === 0) {
    return NextResponse.json({ users: [], total, page, limit });
  }

  // Fetch LMS counts for this batch
  const [enrollRes, certRes, attemptRes] = await Promise.all([
    db.from("enrollments").select("user_id").in("user_id", userIds),
    db.from("certificates").select("user_id").in("user_id", userIds),
    db.from("assessment_attempts").select("user_id").in("user_id", userIds),
  ]);

  const enrollCount = new Map<string, number>();
  const certCount = new Map<string, number>();
  const attemptCount = new Map<string, number>();

  for (const e of (enrollRes.data ?? []) as EnrollRow[]) {
    enrollCount.set(e.user_id, (enrollCount.get(e.user_id) ?? 0) + 1);
  }
  for (const c of (certRes.data ?? []) as CertRow[]) {
    certCount.set(c.user_id, (certCount.get(c.user_id) ?? 0) + 1);
  }
  for (const a of (attemptRes.data ?? []) as AttemptRow[]) {
    attemptCount.set(a.user_id, (attemptCount.get(a.user_id) ?? 0) + 1);
  }

  const users = rows.map((u) => ({
    id: u.id,
    fullName: u.full_name ?? "—",
    email: u.email ?? "—",
    role: u.role ?? "—",
    campusId: u.campus_id,
    campusName: u.campuses?.name ?? null,
    subgroupId: u.subgroup_id,
    subgroupName: u.subgroups?.name ?? null,
    groupId: u.group_id,
    groupName: u.groups?.name ?? null,
    onboardingCompleted: u.onboarding_completed ?? false,
    isActive: u.is_active ?? true,
    enrolledCourses: enrollCount.get(u.id) ?? 0,
    certificates: certCount.get(u.id) ?? 0,
    assessmentAttempts: attemptCount.get(u.id) ?? 0,
    joinedAt: u.created_at ?? "",
  }));

  return NextResponse.json({ users, total, page, limit });
}

import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/app/api/admin/_lib";

const ADMIN_EVENT_TYPES = [
  "user_role_changed",
  "user_transferred",
  "user_deactivated",
  "user_reactivated",
  "user_updated",
  "campus_created",
  "campus_updated",
  "campus_archived",
  "subgroup_created",
  "subgroup_updated",
  "group_created",
  "group_updated",
];

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { adminDb } = ctx;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersRes,
    pendingOnboardingRes,
    inactiveUsersRes,
    newUsersRes,
    activityThisWeekRes,
    adminChangesRes,
    enrollmentsRes,
    certificatesRes,
    leadersRes,
    workersRes,
    membersRes,
    attendeesRes,
  ] = await Promise.all([
    adminDb.from("users").select("*", { count: "exact", head: true }),
    adminDb.from("users").select("*", { count: "exact", head: true })
      .eq("onboarding_completed", false)
      .neq("is_active", false),
    adminDb.from("users").select("*", { count: "exact", head: true })
      .eq("is_active", false),
    adminDb.from("users").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    adminDb.from("activity_events").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    adminDb.from("activity_events").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .in("event_type", ADMIN_EVENT_TYPES),
    adminDb.from("activity_events").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("event_type", "course_enrolled"),
    adminDb.from("activity_events").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("event_type", "certificate_issued"),
    adminDb.from("users").select("*", { count: "exact", head: true }).eq("account_type", "leader"),
    adminDb.from("users").select("*", { count: "exact", head: true }).eq("account_type", "worker"),
    adminDb.from("users").select("*", { count: "exact", head: true }).eq("account_type", "member"),
    adminDb.from("users").select("*", { count: "exact", head: true }).eq("account_type", "attendee"),
  ]);

  return NextResponse.json({
    totalUsers: totalUsersRes.count ?? 0,
    pendingOnboarding: pendingOnboardingRes.count ?? 0,
    inactiveUsers: inactiveUsersRes.count ?? 0,
    newUsersThisWeek: newUsersRes.count ?? 0,
    activityThisWeek: activityThisWeekRes.count ?? 0,
    adminChangesThisWeek: adminChangesRes.count ?? 0,
    enrollmentsThisWeek: enrollmentsRes.count ?? 0,
    certificatesThisWeek: certificatesRes.count ?? 0,
    leaders: leadersRes.count ?? 0,
    workers: workersRes.count ?? 0,
    members: membersRes.count ?? 0,
    attendees: attendeesRes.count ?? 0,
  });
}

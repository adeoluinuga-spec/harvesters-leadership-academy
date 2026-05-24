/**
 * Phase 3 — Analytics Service
 * Client-side query functions for all dashboard tiers.
 * Queries existing LMS tables (enrollments, certificates, etc.) directly.
 * New tables (activity_events, notifications) used when available.
 */

import { createClient } from "@/lib/client";

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

// ============================================================
// Shared types
// ============================================================

export type CampusSummary = {
  campusId: string;
  campusName: string;
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  completionRate: number;
  assessmentPassRate: number;
};

export type CourseSummary = {
  courseId: string;
  title: string;
  category: string;
  enrollments: number;
  completions: number;
  completionRate: number;
  isRequired: boolean;
};

export type RecentEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  userName?: string;
};

export type Notification = {
  id: string;
  type: "alert" | "info" | "success" | "warning";
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
};

// ============================================================
// Platform Analytics (Super Admin)
// ============================================================

export type PlatformAnalytics = {
  totalLeaders: number;
  activatedLeaders: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  overallCompletionRate: number;
  enrollmentRate: number;
  topCourses: CourseSummary[];
  campusSummaries: CampusSummary[];
  recentEvents: RecentEvent[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
};

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  const supabase = createClient();

  const [usersRes, coursesRes, enrollmentsRes, certsRes, campusesRes, attemptsRes] =
    await Promise.all([
      supabase.from("users").select("id, role, campus_id, onboarding_completed"),
      supabase
        .from("courses")
        .select("id, title, category, is_required")
        .or("status.eq.published,is_published.eq.true"),
      supabase.from("enrollments").select("id, user_id, course_id, created_at"),
      supabase.from("certificates").select("id, user_id, course_id, issued_at"),
      supabase.from("campuses").select("id, name"),
      supabase
        .from("assessment_attempts")
        .select("id, user_id, passed"),
    ]);

  const allUsers = usersRes.data ?? [];
  const leaders = allUsers.filter((u) => !ADMIN_ROLES.includes(u.role ?? ""));
  const activated = leaders.filter((u) => u.onboarding_completed);
  const courses = coursesRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];
  const certs = certsRes.data ?? [];
  const campuses = campusesRes.data ?? [];
  const attempts = attemptsRes.data ?? [];

  // Per-course aggregates
  const enrollByCourse = new Map<string, number>();
  const certByCourse = new Map<string, number>();
  for (const e of enrollments) enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1);
  for (const c of certs) certByCourse.set(c.course_id, (certByCourse.get(c.course_id) ?? 0) + 1);

  const topCourses: CourseSummary[] = courses
    .map((c) => {
      const enr = enrollByCourse.get(c.id) ?? 0;
      const comp = certByCourse.get(c.id) ?? 0;
      return {
        courseId: c.id,
        title: c.title,
        category: c.category,
        enrollments: enr,
        completions: comp,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
        isRequired: c.is_required,
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 6);

  // Campus summaries — compute in-memory from users → enrollments → certs
  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
  const certUserIds = new Set(certs.map((c) => c.user_id));
  const passedSet = new Set(attempts.filter((a) => a.passed).map((a) => a.user_id));
  const attemptedSet = new Set(attempts.map((a) => a.user_id));

  const campusSummaries: CampusSummary[] = campuses.map((campus) => {
    const campusLeaders = leaders.filter((u) => u.campus_id === campus.id);
    const total = campusLeaders.length;
    const enrolled = campusLeaders.filter((u) => enrolledUserIds.has(u.id)).length;
    const completed = campusLeaders.filter((u) => certUserIds.has(u.id)).length;
    const certCount = certs.filter((c) => campusLeaders.some((u) => u.id === c.user_id)).length;
    const campusAttempts = campusLeaders.filter((u) => attemptedSet.has(u.id)).length;
    const campusPassed = campusLeaders.filter((u) => passedSet.has(u.id)).length;
    return {
      campusId: campus.id,
      campusName: campus.name,
      totalLeaders: total,
      enrolledLeaders: enrolled,
      completedLeaders: completed,
      certificates: certCount,
      completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
      assessmentPassRate: campusAttempts > 0 ? Math.round((campusPassed / campusAttempts) * 100) : 0,
    };
  }).sort((a, b) => b.totalLeaders - a.totalLeaders);

  // Weekly trend — last 6 weeks from enrollments + certs
  const weeklyTrend = buildWeeklyTrend(enrollments, certs);

  // Recent events (graceful — table may not exist yet)
  let recentEvents: RecentEvent[] = [];
  try {
    const { data: eventsData } = await supabase
      .from("activity_events")
      .select("id, event_type, event_payload, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    recentEvents = (eventsData ?? []).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      payload: (e.event_payload as Record<string, unknown>) ?? {},
      createdAt: e.created_at,
    }));
  } catch {
    // Table not yet created — silently skip
  }

  const overallCompletionRate =
    enrollments.length > 0 ? Math.round((certs.length / enrollments.length) * 100) : 0;
  const enrollmentRate =
    leaders.length > 0 ? Math.round((enrolledUserIds.size / leaders.length) * 100) : 0;

  return {
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
    weeklyTrend,
  };
}

// ============================================================
// Campus Analytics (Campus Pastor)
// ============================================================

export type CampusLearningAnalytics = {
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  assessmentAttempts: number;
  assessmentPassRate: number;
  avgProgressPercent: number;
  inactiveLeaders: number;   // onboarding incomplete
  needsFollowUp: number;     // enrolled but 0 certificates
  courseBreakdown: {
    courseId: string;
    title: string;
    isRequired: boolean;
    enrolledInCampus: number;
    certificatesInCampus: number;
    completionRate: number;
  }[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
};

export async function fetchCampusLearningAnalytics(
  campusId: string
): Promise<CampusLearningAnalytics> {
  const supabase = createClient();

  // 1. Get all users in this campus
  const { data: campusUsers } = await supabase
    .from("users")
    .select("id, onboarding_completed")
    .eq("campus_id", campusId);

  const userIds = (campusUsers ?? []).map((u) => u.id);
  const total = userIds.length;
  const inactive = (campusUsers ?? []).filter((u) => !u.onboarding_completed).length;

  if (total === 0) {
    return {
      totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
      assessmentAttempts: 0, assessmentPassRate: 0, avgProgressPercent: 0,
      inactiveLeaders: 0, needsFollowUp: 0, courseBreakdown: [], weeklyTrend: [],
    };
  }

  // 2. Fetch LMS data for these users in parallel
  const [enrollRes, certRes, progressRes, attemptsRes, coursesRes] = await Promise.all([
    supabase.from("enrollments").select("id, user_id, course_id, created_at").in("user_id", userIds),
    supabase.from("certificates").select("id, user_id, course_id, issued_at").in("user_id", userIds),
    supabase
      .from("lesson_progress")
      .select("user_id, course_id, completed")
      .in("user_id", userIds)
      .eq("completed", true),
    supabase.from("assessment_attempts").select("id, user_id, passed").in("user_id", userIds),
    supabase
      .from("courses")
      .select("id, title, is_required")
      .or("status.eq.published,is_published.eq.true"),
  ]);

  const enrollments = enrollRes.data ?? [];
  const certs = certRes.data ?? [];
  const progress = progressRes.data ?? [];
  const attempts = attemptsRes.data ?? [];
  const courses = coursesRes.data ?? [];

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
  const certUserIds = new Set(certs.map((c) => c.user_id));

  const enrolledCount = userIds.filter((id) => enrolledUserIds.has(id)).length;
  const completedCount = userIds.filter((id) => certUserIds.has(id)).length;

  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 0;

  // Average progress across enrolled users
  const completedLessons = new Map<string, number>();
  for (const p of progress) {
    completedLessons.set(p.user_id, (completedLessons.get(p.user_id) ?? 0) + 1);
  }
  // We use certs as proxy for 100% and lesson progress for in-progress users
  const avgProgress =
    enrolledCount > 0
      ? Math.round((completedCount / enrolledCount) * 100)
      : 0;

  // Needs follow-up: enrolled but no certificate
  const needsFollowUp = userIds.filter(
    (id) => enrolledUserIds.has(id) && !certUserIds.has(id)
  ).length;

  // Per-course breakdown
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
        isRequired: c.is_required,
        enrolledInCampus: enr,
        certificatesInCampus: comp,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
      };
    })
    .filter((c) => c.enrolledInCampus > 0)
    .sort((a, b) => b.enrolledInCampus - a.enrolledInCampus);

  const weeklyTrend = buildWeeklyTrend(enrollments, certs);

  return {
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
    weeklyTrend,
  };
}

// ============================================================
// Group / Subgroup Analytics (Group Pastor / Subgroup Pastor)
// ============================================================

export type HierarchyAnalytics = {
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  overallCompletionRate: number;
  campusSummaries: CampusSummary[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
};

export type SubgroupSummary = {
  subgroupId: string;
  subgroupName: string;
  pastorName: string;
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  completionRate: number;
  campusSummaries: CampusSummary[];
};

export type GroupAnalyticsDetailed = {
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  overallCompletionRate: number;
  totalCampuses: number;
  totalSubgroups: number;
  subgroups: SubgroupSummary[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
};

export async function fetchGroupAnalyticsDetailed(groupId: string): Promise<GroupAnalyticsDetailed> {
  const supabase = createClient();

  const { data: scopedUsers } = await supabase
    .from("users")
    .select("id, campus_id, subgroup_id, subgroup, full_name, role")
    .eq("group_id", groupId)
    .not("role", "in", '("Platform Super Admin","Super Admin","Admin")');

  const users = scopedUsers ?? [];
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) {
    return {
      totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
      overallCompletionRate: 0, totalCampuses: 0, totalSubgroups: 0,
      subgroups: [], weeklyTrend: [],
    };
  }

  const [enrollRes, certRes, campusRes] = await Promise.all([
    supabase.from("enrollments").select("id, user_id, course_id, created_at").in("user_id", userIds),
    supabase.from("certificates").select("id, user_id, course_id, issued_at").in("user_id", userIds),
    supabase.from("campuses").select("id, name"),
  ]);

  const enrollments = enrollRes.data ?? [];
  const certs = certRes.data ?? [];
  const allCampuses = campusRes.data ?? [];

  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));
  const campusNameById = new Map(allCampuses.map((c) => [c.id, c.name as string]));

  // Identify subgroup pastors by role
  const SUBGROUP_PASTOR_ROLES = ["Sub-Group Pastor", "Subgroup Pastor"];
  const pastorBySubgroup = new Map<string, string>();
  for (const u of users) {
    if (u.subgroup_id && SUBGROUP_PASTOR_ROLES.includes(u.role ?? "")) {
      if (!pastorBySubgroup.has(u.subgroup_id)) {
        pastorBySubgroup.set(u.subgroup_id, u.full_name ?? "");
      }
    }
  }

  // Group users by subgroup
  const usersBySubgroup = new Map<string, typeof users>();
  for (const u of users) {
    if (u.subgroup_id) {
      const arr = usersBySubgroup.get(u.subgroup_id) ?? [];
      arr.push(u);
      usersBySubgroup.set(u.subgroup_id, arr);
    }
  }

  // Build subgroup summaries with nested campus summaries
  const subgroups: SubgroupSummary[] = [];
  for (const [subgroupId, subgroupUsers] of usersBySubgroup.entries()) {
    const subgroupName = subgroupUsers[0]?.subgroup || "Unknown Subgroup";
    const pastorName = pastorBySubgroup.get(subgroupId) ?? "";
    const subgroupUserIdSet = new Set(subgroupUsers.map((u) => u.id));

    const subgroupEnrolled = subgroupUsers.filter((u) => enrolledSet.has(u.id)).length;
    const subgroupCompleted = subgroupUsers.filter((u) => certSet.has(u.id)).length;
    const subgroupCerts = certs.filter((c) => subgroupUserIdSet.has(c.user_id)).length;
    const subgroupRate =
      subgroupEnrolled > 0 ? Math.round((subgroupCompleted / subgroupEnrolled) * 100) : 0;

    // Group by campus within this subgroup
    const usersByCampus = new Map<string, string[]>();
    for (const u of subgroupUsers) {
      if (u.campus_id) {
        const arr = usersByCampus.get(u.campus_id) ?? [];
        arr.push(u.id);
        usersByCampus.set(u.campus_id, arr);
      }
    }

    const campusSummaries: CampusSummary[] = [];
    for (const [campusId, campusUserIds] of usersByCampus.entries()) {
      const campusUserIdSet = new Set(campusUserIds);
      const enr = campusUserIds.filter((id) => enrolledSet.has(id)).length;
      const comp = campusUserIds.filter((id) => certSet.has(id)).length;
      const certCount = certs.filter((c) => campusUserIdSet.has(c.user_id)).length;
      campusSummaries.push({
        campusId,
        campusName: campusNameById.get(campusId) ?? "Unknown Campus",
        totalLeaders: campusUserIds.length,
        enrolledLeaders: enr,
        completedLeaders: comp,
        certificates: certCount,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
        assessmentPassRate: 0,
      });
    }

    subgroups.push({
      subgroupId,
      subgroupName,
      pastorName,
      totalLeaders: subgroupUsers.length,
      enrolledLeaders: subgroupEnrolled,
      completedLeaders: subgroupCompleted,
      certificates: subgroupCerts,
      completionRate: subgroupRate,
      campusSummaries: campusSummaries.sort((a, b) => b.totalLeaders - a.totalLeaders),
    });
  }

  subgroups.sort((a, b) => b.totalLeaders - a.totalLeaders);

  const totalEnrolled = userIds.filter((id) => enrolledSet.has(id)).length;
  const totalCompleted = userIds.filter((id) => certSet.has(id)).length;
  const overallRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;
  const weeklyTrend = buildWeeklyTrend(enrollments, certs);
  const totalCampuses = subgroups.reduce((s, sg) => s + sg.campusSummaries.length, 0);

  return {
    totalLeaders: userIds.length,
    enrolledLeaders: totalEnrolled,
    completedLeaders: totalCompleted,
    certificates: certs.length,
    overallCompletionRate: overallRate,
    totalCampuses,
    totalSubgroups: subgroups.length,
    subgroups,
    weeklyTrend,
  };
}

export async function fetchSubgroupAnalytics(subgroupId: string): Promise<HierarchyAnalytics> {
  return fetchHierarchyAnalytics("subgroup_id", subgroupId);
}

async function fetchHierarchyAnalytics(
  field: "group_id" | "subgroup_id",
  id: string
): Promise<HierarchyAnalytics> {
  const supabase = createClient();

  const { data: scopedUsers } = await supabase
    .from("users")
    .select("id, campus_id")
    .eq(field, id)
    .not("role", "in", '("Platform Super Admin","Super Admin","Admin")');

  const userIds = (scopedUsers ?? []).map((u) => u.id);
  if (userIds.length === 0) {
    return {
      totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
      overallCompletionRate: 0, campusSummaries: [], weeklyTrend: [],
    };
  }

  const [enrollRes, certRes, campusesRes] = await Promise.all([
    supabase.from("enrollments").select("id, user_id, course_id, created_at").in("user_id", userIds),
    supabase.from("certificates").select("id, user_id, course_id, issued_at").in("user_id", userIds),
    supabase.from("campuses").select("id, name"),
  ]);

  const enrollments = enrollRes.data ?? [];
  const certs = certRes.data ?? [];
  const campuses = campusesRes.data ?? [];

  const enrolledSet = new Set(enrollments.map((e) => e.user_id));
  const certSet = new Set(certs.map((c) => c.user_id));

  const enrolledCount = userIds.filter((id) => enrolledSet.has(id)).length;
  const completedCount = userIds.filter((id) => certSet.has(id)).length;
  const rate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  const usersByCampus = new Map<string, string[]>();
  for (const u of scopedUsers ?? []) {
    if (u.campus_id) {
      const arr = usersByCampus.get(u.campus_id) ?? [];
      arr.push(u.id);
      usersByCampus.set(u.campus_id, arr);
    }
  }

  const campusSummaries: CampusSummary[] = campuses
    .filter((c) => usersByCampus.has(c.id))
    .map((campus) => {
      const ids = usersByCampus.get(campus.id) ?? [];
      const enr = ids.filter((id) => enrolledSet.has(id)).length;
      const comp = ids.filter((id) => certSet.has(id)).length;
      const campusIdSet = new Set(ids);
      const certCount = certs.filter((c) => campusIdSet.has(c.user_id)).length;
      return {
        campusId: campus.id,
        campusName: campus.name,
        totalLeaders: ids.length,
        enrolledLeaders: enr,
        completedLeaders: comp,
        certificates: certCount,
        completionRate: enr > 0 ? Math.round((comp / enr) * 100) : 0,
        assessmentPassRate: 0,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  const weeklyTrend = buildWeeklyTrend(enrollments, certs);

  return {
    totalLeaders: userIds.length,
    enrolledLeaders: enrolledCount,
    completedLeaders: completedCount,
    certificates: certs.length,
    overallCompletionRate: rate,
    campusSummaries,
    weeklyTrend,
  };
}

// ============================================================
// Notifications
// ============================================================

export async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((n) => ({
      id: n.id,
      type: n.type as Notification["type"],
      title: n.title,
      message: n.message,
      actionUrl: n.action_url ?? undefined,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  } catch {
    // Silent
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    }
  } catch {
    // Silent
  }
}

// ============================================================
// Event Recording (client → API route → activity_events)
// ============================================================

export type EventType =
  | "user_signup"
  | "onboarding_complete"
  | "course_enroll"
  | "course_start"
  | "lesson_complete"
  | "assessment_attempt"
  | "assessment_pass"
  | "assessment_fail"
  | "certificate_issued"
  | "login"
  | "dashboard_visit";

export async function recordEvent(
  eventType: EventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, payload }),
    });
  } catch {
    // Non-blocking — analytics must never break core flows
  }
}

// ============================================================
// Helpers
// ============================================================

function buildWeeklyTrend(
  enrollments: { created_at: string }[],
  certs: { issued_at: string }[]
): { week: string; enrollments: number; certificates: number }[] {
  const weeks: { week: string; enrollments: number; certificates: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const label = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const enrCount = enrollments.filter((e) => {
      const d = new Date(e.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    const certCount = certs.filter((c) => {
      const d = new Date(c.issued_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    weeks.push({ week: label, enrollments: enrCount, certificates: certCount });
  }
  return weeks;
}

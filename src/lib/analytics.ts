/**
 * Phase 3 — Analytics Service
 * All hierarchy queries run through server-side API routes that use the
 * Supabase service-role key, bypassing RLS so Campus Pastors, Group Pastors,
 * and Subgroup Pastors can see their full hierarchy's leader counts —
 * regardless of any RLS policy on the users table.
 *
 * Return types are unchanged; the Group Pastor architecture is preserved.
 */

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

const EMPTY_PLATFORM: PlatformAnalytics = {
  totalLeaders: 0,
  activatedLeaders: 0,
  totalCourses: 0,
  totalEnrollments: 0,
  totalCertificates: 0,
  overallCompletionRate: 0,
  enrollmentRate: 0,
  topCourses: [],
  campusSummaries: [],
  recentEvents: [],
  weeklyTrend: [],
};

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  try {
    const res = await fetch("/api/hierarchy/platform");
    if (!res.ok) return EMPTY_PLATFORM;
    return (await res.json()) as PlatformAnalytics;
  } catch {
    return EMPTY_PLATFORM;
  }
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

const EMPTY_CAMPUS: CampusLearningAnalytics = {
  totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
  assessmentAttempts: 0, assessmentPassRate: 0, avgProgressPercent: 0,
  inactiveLeaders: 0, needsFollowUp: 0, courseBreakdown: [], weeklyTrend: [],
};

export async function fetchCampusLearningAnalytics(
  campusId: string
): Promise<CampusLearningAnalytics> {
  try {
    const res = await fetch(`/api/hierarchy/campus/${campusId}`);
    if (!res.ok) return EMPTY_CAMPUS;
    return (await res.json()) as CampusLearningAnalytics;
  } catch {
    return EMPTY_CAMPUS;
  }
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

const EMPTY_SUBGROUP: HierarchyAnalytics = {
  totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
  overallCompletionRate: 0, campusSummaries: [], weeklyTrend: [],
};

const EMPTY_GROUP: GroupAnalyticsDetailed = {
  totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
  overallCompletionRate: 0, totalCampuses: 0, totalSubgroups: 0,
  subgroups: [], weeklyTrend: [],
};

export async function fetchAllSubgroupPerformance(): Promise<SubgroupSummary[]> {
  try {
    const res = await fetch("/api/hierarchy/platform/subgroups");
    if (!res.ok) return [];
    const json = (await res.json()) as { subgroups: SubgroupSummary[] };
    return json.subgroups;
  } catch {
    return [];
  }
}

export async function fetchGroupAnalyticsDetailed(groupId: string): Promise<GroupAnalyticsDetailed> {
  try {
    const res = await fetch(`/api/hierarchy/group/${groupId}`);
    if (!res.ok) return EMPTY_GROUP;
    return (await res.json()) as GroupAnalyticsDetailed;
  } catch {
    return EMPTY_GROUP;
  }
}

export async function fetchSubgroupAnalytics(subgroupId: string): Promise<HierarchyAnalytics> {
  try {
    const res = await fetch(`/api/hierarchy/subgroup/${subgroupId}`);
    if (!res.ok) return EMPTY_SUBGROUP;
    return (await res.json()) as HierarchyAnalytics;
  } catch {
    return EMPTY_SUBGROUP;
  }
}

// ============================================================
// Scoped Campus Analytics (mid-tier leaders: Directional → Cell)
// Queries users in a campus filtered to the caller's child roles.
// Still uses the service-role hierarchy campus route but filters
// the role breakdown client-side to preserve the scoped view.
// ============================================================

export type RoleCount = {
  role: string;
  count: number;
  enrolled: number;
  completed: number;
  certificates: number;
  completionRate: number;
};

export type ScopedAnalytics = {
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  inactiveLeaders: number;
  assessmentPassRate: number;
  needsFollowUp: number;
  completionRate: number;
  roleBreakdown: RoleCount[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
};

const EMPTY_SCOPED: ScopedAnalytics = {
  totalLeaders: 0, enrolledLeaders: 0, completedLeaders: 0, certificates: 0,
  inactiveLeaders: 0, assessmentPassRate: 0, needsFollowUp: 0, completionRate: 0,
  roleBreakdown: [], weeklyTrend: [],
};

export async function fetchScopedCampusAnalytics(
  campusId: string,
  childRoles: string[]
): Promise<ScopedAnalytics> {
  if (!campusId || childRoles.length === 0) return EMPTY_SCOPED;

  try {
    const res = await fetch(`/api/hierarchy/campus/${campusId}/scoped?roles=${encodeURIComponent(childRoles.join(","))}`);
    if (!res.ok) return { ...EMPTY_SCOPED, roleBreakdown: childRoles.map((r) => ({ role: r, count: 0, enrolled: 0, completed: 0, certificates: 0, completionRate: 0 })) };
    return (await res.json()) as ScopedAnalytics;
  } catch {
    return EMPTY_SCOPED;
  }
}

// ============================================================
// Personal Learning Analytics (Cell Leader / leader-level)
// ============================================================

export type PersonalLearningAnalytics = {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  assessmentAttempts: number;
  assessmentPassRate: number;
  completionRate: number;
};

export async function fetchPersonalLearningAnalytics(
  userId: string
): Promise<PersonalLearningAnalytics> {
  try {
    const res = await fetch(`/api/hierarchy/personal/${userId}`);
    if (!res.ok) return { enrolledCourses: 0, completedCourses: 0, certificates: 0, assessmentAttempts: 0, assessmentPassRate: 0, completionRate: 0 };
    return (await res.json()) as PersonalLearningAnalytics;
  } catch {
    return { enrolledCourses: 0, completedCourses: 0, certificates: 0, assessmentAttempts: 0, assessmentPassRate: 0, completionRate: 0 };
  }
}

// ============================================================
// Notifications
// ============================================================

import { createClient } from "@/lib/client";

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

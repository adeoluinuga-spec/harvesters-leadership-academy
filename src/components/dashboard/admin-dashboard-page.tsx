"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Award,
  BookOpenCheck,
  Building2,
  CircleCheck,
  GraduationCap,
  Network,
  Plus,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";

import {
  DashboardShell,
  shellContainer,
  shellItem,
} from "@/components/layout/dashboard-shell";
import { HierarchyExplorer } from "@/components/dashboard/hierarchy-explorer";
import { SubgroupPerformance } from "@/components/dashboard/subgroup-performance";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { fetchPlatformAnalytics, fetchAllSubgroupPerformance } from "@/lib/analytics";
import type { PlatformAnalytics, SubgroupSummary } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  WeeklyTrendChart,
  CampusCompletionChart,
  CourseEnrollmentChart,
} from "@/components/charts/metric-charts";

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 34 - (value / max) * 28;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 36" className="h-9 w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        className="text-emerald-600"
      />
    </svg>
  );
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    course_enroll: "New enrollment",
    certificate_issued: "Certificate earned",
    assessment_pass: "Assessment passed",
    assessment_fail: "Assessment attempt",
    lesson_complete: "Lesson completed",
    onboarding_complete: "Leader onboarded",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function eventIcon(type: string) {
  if (type === "certificate_issued") return Award;
  if (type === "assessment_pass" || type === "assessment_fail") return CircleCheck;
  if (type === "course_enroll") return GraduationCap;
  if (type === "onboarding_complete") return Users;
  return TrendingUp;
}

function DashboardHero({ firstName }: { firstName: string }) {
  const router = useRouter();
  return (
    <motion.section
      variants={shellItem}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Super Admin
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Ministry Intelligence Command
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Welcome back, {firstName}. Live analytics, enrollment trends, campus performance, and leadership metrics across Harvesters Leadership Academy.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/courses/new")}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            New course
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/courses")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <GraduationCap className="size-4" />
            Manage courses
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function KpiCards({ data }: { data: PlatformAnalytics }) {
  const kpis = [
    {
      label: "Total Leaders",
      value: data.totalLeaders.toLocaleString(),
      delta: `${data.activatedLeaders.toLocaleString()} onboarded`,
      detail: "Registered across all campuses",
      icon: Users,
      sparkline: [40, 52, 58, 65, 72, 78, data.totalLeaders > 0 ? 85 : 80],
    },
    {
      label: "Published Courses",
      value: String(data.totalCourses),
      delta: `${data.enrollmentRate}% enrolment rate`,
      detail: "Active learning tracks",
      icon: BookOpenCheck,
      sparkline: [20, 24, 28, 30, data.totalCourses - 4, data.totalCourses - 2, data.totalCourses],
    },
    {
      label: "Total Enrolments",
      value: data.totalEnrollments.toLocaleString(),
      delta: `↑ active`,
      detail: "Leaders in at least 1 course",
      icon: GraduationCap,
      sparkline: [30, 40, 48, 55, 60, 68, data.totalEnrollments > 0 ? 75 : 70],
    },
    {
      label: "Certificates Issued",
      value: data.totalCertificates.toLocaleString(),
      delta: `${data.overallCompletionRate}% completion`,
      detail: "Verified completions",
      icon: Award,
      sparkline: [10, 18, 24, 30, 38, 45, data.totalCertificates > 0 ? 52 : 48],
    },
  ];

  return (
    <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <motion.div key={kpi.label} variants={shellItem} whileHover={{ y: -3 }}>
          <Card className="h-full rounded-xl border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-zinc-200/60">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                  {kpi.label}
                </p>
                <CardTitle className="font-heading mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                  {kpi.value}
                </CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <kpi.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-500">{kpi.detail}</p>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {kpi.delta}
                </span>
              </div>
              <Sparkline values={kpi.sparkline} />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

function AnalyticsSection({ data }: { data: PlatformAnalytics }) {
  const topCampuses = data.campusSummaries.filter((c) => c.totalLeaders > 0).slice(0, 5);
  const engagementMetrics = [
    { label: "Platform enrolment rate", value: `${data.enrollmentRate}%`, desc: "Leaders in at least 1 course" },
    { label: "Overall completion rate", value: `${data.overallCompletionRate}%`, desc: "Enrolled leaders with certificate" },
    { label: "Certificates issued", value: data.totalCertificates.toLocaleString(), desc: "Verified completions" },
  ];

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Campus performance
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Enrolment and completion rates across all campuses
              </p>
            </div>
            <Building2 className="size-5 text-zinc-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {topCampuses.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No campus data yet</p>
          ) : (
            topCampuses.map((campus) => (
              <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">{campus.campusName}</p>
                    <p className="text-sm text-zinc-500">
                      {campus.totalLeaders} leaders · {campus.enrolledLeaders} enrolled
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-xl font-semibold tracking-tight text-zinc-950">
                      {campus.completionRate}%
                    </p>
                    <p className="text-xs text-zinc-500">{campus.certificates} certificates</p>
                  </div>
                </div>
                <Progress
                  value={campus.completionRate}
                  className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Platform intelligence</CardTitle>
          <p className="text-sm text-zinc-400">Live ministry metrics</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {engagementMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div>
                <p className="text-sm text-zinc-400">{metric.label}</p>
                <p className="font-heading mt-1 text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{metric.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function TrendSection({ data }: { data: PlatformAnalytics }) {
  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            6-week enrolment trend
          </CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Enrolments vs certificates over time</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-zinc-950 inline-block" />
              Enrolments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-emerald-500 inline-block" />
              Certificates
            </span>
          </div>
          <WeeklyTrendChart data={data.weeklyTrend} />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Top courses by enrolment
          </CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Most enrolled courses on the platform</p>
        </CardHeader>
        <CardContent className="pt-4">
          <CourseEnrollmentChart data={data.topCourses} />
        </CardContent>
      </Card>
    </motion.section>
  );
}

function CampusChartSection({ data }: { data: PlatformAnalytics }) {
  const campusData = data.campusSummaries
    .filter((c) => c.enrolledLeaders > 0)
    .map((c) => ({
      campusName: c.campusName,
      completionRate: c.completionRate,
      enrolledLeaders: c.enrolledLeaders,
    }));

  if (campusData.length === 0) return null;

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Campus completion comparison
          </CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Completion rate (%) for campuses with active enrolments
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <CampusCompletionChart data={campusData} />
        </CardContent>
      </Card>
    </motion.section>
  );
}

function ActivityFeed({ data }: { data: PlatformAnalytics }) {
  const feed = data.recentEvents.slice(0, 4);

  if (feed.length === 0) {
    // Fallback static items if no events yet
    const staticFeed = [
      { title: "Platform live", body: "Analytics engine active — events will appear here as leaders engage", time: "Now" },
    ];
    return (
      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Recent activity
            </CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Ministry platform events</p>
          </CardHeader>
          <CardContent className="pt-4">
            {staticFeed.map((item) => (
              <div key={item.title} className="rounded-lg border border-zinc-100 p-4">
                <p className="font-medium text-zinc-950">{item.title}</p>
                <p className="mt-2 text-sm text-zinc-500">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Recent activity
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Live platform events</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-4">
          {feed.map((event) => {
            const Icon = eventIcon(event.eventType);
            return (
              <div key={event.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(event.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="font-medium text-zinc-950">{eventLabel(event.eventType)}</p>
                {typeof event.payload?.course_title === "string" && (
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {event.payload.course_title}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function AlertsSection({ data }: { data: PlatformAnalytics }) {
  const weakCampuses = data.campusSummaries.filter(
    (c) => c.totalLeaders > 0 && c.completionRate < 30 && c.enrolledLeaders > 0
  );
  const inactiveCampuses = data.campusSummaries.filter(
    (c) => c.totalLeaders > 0 && c.enrolledLeaders === 0
  );

  if (weakCampuses.length === 0 && inactiveCampuses.length === 0) return null;

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border border-amber-100 bg-amber-50 shadow-sm">
        <CardHeader className="border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-600" />
            <CardTitle className="font-heading text-base font-semibold text-amber-900">
              Ministry attention needed
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          {weakCampuses.slice(0, 3).map((c) => (
            <div key={c.campusId} className="rounded-lg border border-amber-200 bg-white p-4">
              <p className="font-medium text-zinc-950">{c.campusName}</p>
              <p className="mt-1 text-sm text-amber-700">
                Only {c.completionRate}% completion rate — {c.enrolledLeaders} enrolled
              </p>
            </div>
          ))}
          {inactiveCampuses.slice(0, 3).map((c) => (
            <div key={c.campusId} className="rounded-lg border border-amber-200 bg-white p-4">
              <p className="font-medium text-zinc-950">{c.campusName}</p>
              <p className="mt-1 text-sm text-amber-700">
                {c.totalLeaders} leaders — no enrolments yet
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

type OperationalStats = {
  totalUsers: number;
  pendingOnboarding: number;
  inactiveUsers: number;
  newUsersThisWeek: number;
  activityThisWeek: number;
  adminChangesThisWeek: number;
  enrollmentsThisWeek: number;
  certificatesThisWeek: number;
};

function OperationalCards({ stats, loading }: { stats: OperationalStats | null; loading: boolean }) {
  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      desc: "Registered leaders",
      highlight: false,
    },
    {
      label: "Pending Onboarding",
      value: stats?.pendingOnboarding ?? 0,
      icon: UserCheck,
      desc: "Haven't completed onboarding",
      highlight: (stats?.pendingOnboarding ?? 0) > 0,
      highlightClass: "border-amber-100 bg-amber-50",
      valueClass: "text-amber-700",
    },
    {
      label: "Inactive Users",
      value: stats?.inactiveUsers ?? 0,
      icon: UserX,
      desc: "Deactivated accounts",
      highlight: (stats?.inactiveUsers ?? 0) > 0,
      highlightClass: "border-rose-100 bg-rose-50",
      valueClass: "text-rose-700",
    },
    {
      label: "New This Week",
      value: stats?.newUsersThisWeek ?? 0,
      icon: UserMinus,
      desc: "Leaders registered (7d)",
      highlight: false,
    },
    {
      label: "Platform Activity",
      value: stats?.activityThisWeek ?? 0,
      icon: Activity,
      desc: "Events this week",
      highlight: false,
    },
    {
      label: "Admin Changes",
      value: stats?.adminChangesThisWeek ?? 0,
      icon: ShieldAlert,
      desc: "Admin actions (7d)",
      highlight: false,
    },
    {
      label: "Enrollments (7d)",
      value: stats?.enrollmentsThisWeek ?? 0,
      icon: GraduationCap,
      desc: "New course enrolments",
      highlight: false,
    },
    {
      label: "Certificates (7d)",
      value: stats?.certificatesThisWeek ?? 0,
      icon: Award,
      desc: "Issued this week",
      highlight: (stats?.certificatesThisWeek ?? 0) > 0,
      highlightClass: "border-emerald-100 bg-emerald-50",
      valueClass: "text-emerald-700",
    },
  ];

  return (
    <motion.section variants={shellItem}>
      <div className="mb-3 flex items-center gap-2">
        <Network className="size-4 text-zinc-400" />
        <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Operational overview
        </h2>
      </div>
      <motion.div variants={shellContainer} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <motion.div key={card.label} variants={shellItem}>
            <Card className={cn(
              "rounded-xl border shadow-sm",
              card.highlight && card.highlightClass ? card.highlightClass : "border-zinc-200 bg-white"
            )}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
                  {card.label}
                </p>
                <card.icon className="size-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "font-heading text-3xl font-semibold",
                  card.highlight && card.valueClass ? card.valueClass : "text-zinc-950"
                )}>
                  {loading ? "…" : card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{card.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function LoadingSkeleton() {
  return (
    <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div key={i} variants={shellItem}>
          <Card className="animate-pulse rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <div className="h-3 w-28 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-20 rounded bg-zinc-200" />
            </CardHeader>
            <CardContent>
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="mt-3 h-9 rounded bg-zinc-50" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [subgroupData, setSubgroupData] = useState<SubgroupSummary[]>([]);
  const [operationalStats, setOperationalStats] = useState<OperationalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const [profileResult, analyticsData, subgroups] = await Promise.all([
        getCurrentUserProfile(),
        fetchPlatformAnalytics(),
        fetchAllSubgroupPerformance(),
      ]);
      if (!active) return;
      if (profileResult.profile) setProfile(profileResult.profile);
      setAnalytics(analyticsData);
      setSubgroupData(subgroups);
      setLoading(false);
    }

    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const json = await res.json() as OperationalStats;
          if (active) setOperationalStats(json);
        }
      } catch {
        // best-effort
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    load();
    loadStats();
    return () => { active = false; };
  }, []);

  const firstName = profile?.fullName?.split(" ").filter(Boolean)[0] ?? "Leader";

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell>
        <DashboardHero firstName={firstName} />
        <HierarchyExplorer />
        <OperationalCards stats={operationalStats} loading={statsLoading} />
        {loading || !analytics ? (
          <LoadingSkeleton />
        ) : (
          <>
            <AlertsSection data={analytics} />
            <KpiCards data={analytics} />
            <AnalyticsSection data={analytics} />
            <SubgroupPerformance subgroups={subgroupData} />
            <TrendSection data={analytics} />
            <CampusChartSection data={analytics} />
            <ActivityFeed data={analytics} />
          </>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/hooks/use-hierarchy";
import {
  fetchPlatformAnalytics,
  fetchScopedCampusAnalytics,
  type PlatformAnalytics,
  type CampusSummary,
  type RoleCount,
} from "@/lib/analytics";
import { getLeadershipScope, roleDisplayLabel } from "@/lib/scope-resolver";
import type { MockRole } from "@/lib/mock-auth";

function healthLabel(rate: number) {
  if (rate >= 80) return "Thriving";
  if (rate >= 60) return "Stable";
  return "Needs Attention";
}

function healthClasses(rate: number) {
  if (rate >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (rate >= 60) return "bg-zinc-100 text-zinc-700 border-zinc-200";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function fmt(n: number) {
  return n.toLocaleString();
}

function Hero({ firstName, analytics }: { firstName: string; analytics: PlatformAnalytics | null }) {
  const thriving = analytics?.campusSummaries.filter((c) => c.completionRate >= 60).length ?? 0;
  const heroStats = [
    { label: "Total campuses", value: analytics ? String(analytics.campusSummaries.length) : "…" },
    { label: "Total leaders", value: analytics ? fmt(analytics.totalLeaders) : "…" },
    { label: "Active campuses", value: analytics ? String(thriving) : "…" },
    { label: "Enrollment rate", value: analytics ? `${analytics.enrollmentRate}%` : "…" },
  ];

  return (
    <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Directional leadership intelligence
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            District Leadership Intelligence
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Welcome back, {firstName}. Your personal growth continues alongside strategic oversight across all groups
            and campuses in your district.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {heroStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
              <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function KpiGrid({ analytics }: { analytics: PlatformAnalytics | null }) {
  const thriving = analytics?.campusSummaries.filter((c) => c.completionRate >= 60).length ?? 0;
  const needsAttention = analytics
    ? Math.max(0, analytics.totalEnrollments - analytics.totalCertificates)
    : 0;

  const kpis = [
    {
      label: "Total Leaders",
      value: analytics ? fmt(analytics.totalLeaders) : "…",
      detail: "Across district",
      icon: Users,
    },
    {
      label: "Active Campuses",
      value: analytics ? String(analytics.campusSummaries.length) : "…",
      detail: analytics ? `${thriving} thriving or stable` : "Loading…",
      icon: Building2,
    },
    {
      label: "Enrolled Leaders",
      value: analytics ? fmt(analytics.activatedLeaders) : "…",
      detail: "Completed onboarding",
      icon: GraduationCap,
    },
    {
      label: "Completion Rate",
      value: analytics ? `${analytics.overallCompletionRate}%` : "…",
      detail: "District average",
      icon: CheckCircle2,
    },
    {
      label: "Certificates Issued",
      value: analytics ? fmt(analytics.totalCertificates) : "…",
      detail: "Verified completions",
      icon: Award,
    },
    {
      label: "Needs Attention",
      value: analytics ? fmt(needsAttention) : "…",
      detail: "Enrolled but not yet certified",
      icon: AlertCircle,
    },
  ];

  return (
    <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {kpis.map((kpi) => (
        <motion.div key={kpi.label} variants={shellItem} whileHover={{ y: -3 }}>
          <Card className="h-full rounded-xl border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-zinc-200/60">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{kpi.label}</p>
                <CardTitle className="font-heading mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                  {kpi.value}
                </CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <kpi.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">{kpi.detail}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

function CampusPerformance({ campusSummaries }: { campusSummaries: CampusSummary[] }) {
  const sorted = [...campusSummaries].sort((a, b) => b.totalLeaders - a.totalLeaders);

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Campus performance</CardTitle>
          <p className="text-sm text-zinc-500">Ministry health across all campuses in your district</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {sorted.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-400">No campus data available</p>
          )}
          {sorted.map((campus) => (
            <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-zinc-950">{campus.campusName}</p>
                    <p className="text-sm text-zinc-500">{campus.totalLeaders} leaders</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 lg:min-w-[560px]">
                  {[
                    ["Leaders", fmt(campus.totalLeaders)],
                    ["Enrolled", fmt(campus.enrolledLeaders)],
                    ["Completion", `${campus.completionRate}%`],
                    ["Certificates", fmt(campus.certificates)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                    </div>
                  ))}
                </div>
                <Badge className={cn("rounded-md border hover:bg-inherit shrink-0", healthClasses(campus.completionRate))}>
                  {healthLabel(campus.completionRate)}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>Completion progress</span>
                  <span className="font-semibold text-zinc-950">{campus.completionRate}%</span>
                </div>
                <Progress
                  value={campus.completionRate}
                  className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function InsightsAndActivity({ analytics }: { analytics: PlatformAnalytics | null }) {
  const campusSummaries = analytics?.campusSummaries ?? [];
  const sorted = [...campusSummaries].sort((a, b) => b.completionRate - a.completionRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const needAttention = campusSummaries.filter((c) => c.completionRate < 60).length;

  const districtInsights = analytics
    ? [
        best && best.completionRate >= 70
          ? {
              title: `${best.campusName} leads with ${best.completionRate}% completion — sustained performance.`,
              icon: TrendingUp,
            }
          : {
              title: `District average stands at ${analytics.overallCompletionRate}% — keep driving engagement.`,
              icon: TrendingUp,
            },
        worst && worst.completionRate < 60
          ? {
              title: `${worst.campusName} is at ${worst.completionRate}% — pastoral review recommended.`,
              icon: TrendingDown,
            }
          : {
              title: "All campuses are above 60% — district is on a stable trajectory.",
              icon: UserCheck,
            },
        {
          title: `${fmt(analytics.totalCertificates)} certificates issued across the district.`,
          icon: Award,
        },
        needAttention > 0
          ? {
              title: `${needAttention} campus${needAttention !== 1 ? "es" : ""} require urgent follow-up.`,
              icon: AlertCircle,
            }
          : {
              title: "No campuses currently below critical thresholds.",
              icon: UserCheck,
            },
      ]
    : [];

  const recentFeed = (analytics?.recentEvents ?? []).slice(0, 4).map((e) => ({
    id: e.id,
    title:
      e.eventType === "certificate_issued"
        ? "Certificate issued"
        : e.eventType === "course_enroll"
        ? "New enrollment"
        : e.eventType === "assessment_pass"
        ? "Assessment passed"
        : e.eventType === "assessment_fail"
        ? "Assessment attempt"
        : "Activity",
    body:
      typeof e.payload?.course_title === "string"
        ? e.payload.course_title
        : e.eventType.replace(/_/g, " "),
    time: new Date(e.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  }));

  const fallbackFeed = analytics
    ? [
        {
          id: "enrollments",
          title: "Academy progress",
          body: `${fmt(analytics.totalEnrollments)} total enrollments across all campuses`,
          time: "All time",
        },
        {
          id: "certificates",
          title: "Certificates milestone",
          body: `${fmt(analytics.totalCertificates)} certificates issued district-wide`,
          time: "All time",
        },
        {
          id: "activation",
          title: "Leader activation",
          body: `${fmt(analytics.activatedLeaders)} leaders completed onboarding`,
          time: "All time",
        },
        {
          id: "courses",
          title: "Course catalogue",
          body: `${analytics.totalCourses} published courses available in the academy`,
          time: "Current",
        },
      ]
    : [];

  const feedToShow = recentFeed.length > 0 ? recentFeed : fallbackFeed;

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">District insights</CardTitle>
          <p className="text-sm text-zinc-400">Strategic signals across your groups and campuses</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {districtInsights.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading insights…</p>
          ) : (
            districtInsights.map((insight) => (
              <div key={insight.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <insight.icon className="size-4" />
                </div>
                <p className="font-heading text-sm font-semibold leading-6">{insight.title}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Activity feed</CardTitle>
          <p className="text-sm text-zinc-500">Recent district leadership moments</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {feedToShow.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading activity…</p>
          ) : (
            feedToShow.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-950">{item.title}</p>
                  <span className="text-xs text-zinc-400">{item.time}</span>
                </div>
                <p className="text-sm leading-6 text-zinc-500">{item.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function RolePipeline({ breakdown }: { breakdown: RoleCount[] }) {
  if (breakdown.length === 0) return null;

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Leadership pipeline
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Enrolment and completion by leadership tier within your oversight scope
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {breakdown.map((row) => (
            <div key={row.role} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-zinc-950">
                      {roleDisplayLabel(row.role as MockRole)}
                    </p>
                    <p className="text-sm text-zinc-500">{fmt(row.count)} leaders</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                  {[
                    ["Leaders", fmt(row.count)],
                    ["Enrolled", fmt(row.enrolled)],
                    ["Completion", `${row.completionRate}%`],
                    ["Certificates", fmt(row.certificates)],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                    </div>
                  ))}
                </div>
                <Badge
                  className={cn(
                    "rounded-md border hover:bg-inherit shrink-0",
                    healthClasses(row.completionRate)
                  )}
                >
                  {healthLabel(row.completionRate)}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>Completion progress</span>
                  <span className="font-semibold text-zinc-950">{row.completionRate}%</span>
                </div>
                <Progress
                  value={row.completionRate}
                  className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function CampusesNeedingAttention({ campusSummaries }: { campusSummaries: CampusSummary[] }) {
  const lowCampuses = campusSummaries
    .filter((c) => c.completionRate < 70)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 4);

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Campuses needing attention
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Below 70% completion threshold — follow-up and pastoral action needed
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
          {lowCampuses.length === 0 ? (
            <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
              All campuses are above the 70% completion threshold — district is on track
            </div>
          ) : (
            lowCampuses.map((campus) => (
              <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">{campus.campusName}</p>
                    <p className="text-sm text-zinc-500">
                      {campus.totalLeaders} leaders · {campus.certificates} certified
                    </p>
                  </div>
                  <Badge className={cn("rounded-md border hover:bg-inherit", healthClasses(campus.completionRate))}>
                    {campus.completionRate}%
                  </Badge>
                </div>
                <Progress
                  value={campus.completionRate}
                  className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  {Math.max(0, campus.enrolledLeaders - campus.completedLeaders)} enrolled but not yet certified
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function DirectionalDashboardPage() {
  const hierarchy = useHierarchy();
  const firstName = hierarchy.firstName || "Leader";
  const { campusId, role } = hierarchy;

  const scope = getLeadershipScope(
    (role || "Directional Leader") as MockRole,
    campusId
  );

  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [roleBreakdown, setRoleBreakdown] = useState<RoleCount[]>([]);

  useEffect(() => {
    fetchPlatformAnalytics().then(setAnalytics);
  }, []);

  useEffect(() => {
    if (hierarchy.loading || !campusId || scope.childRoles.length === 0) return;
    fetchScopedCampusAnalytics(campusId, scope.childRoles as string[]).then((data) => {
      setRoleBreakdown(data.roleBreakdown);
    });
  }, [campusId, scope.childRoles, hierarchy.loading]);

  return (
    <ProtectedRoute
      allowedRoles={["Directional Leader", "District Pastor / Pastoral Leader", "Super Admin", "Admin"]}
    >
      <DashboardShell searchPlaceholder="Search campuses, leaders..." showDate>
        <Hero firstName={firstName} analytics={analytics} />
        <PersonalLearningLayer
          role={(role || "Directional Leader") as MockRole}
        />
        <OversightLayerIntro
          title="District oversight intelligence"
          description="Role-aware intelligence across all campuses, groups, and leadership pipelines in your district."
          modules={[
            "District ministry intelligence",
            "Campus analytics",
            "Leadership pipeline visibility",
            "Campus health signals",
          ]}
        />
        <KpiGrid analytics={analytics} />
        <CampusPerformance campusSummaries={analytics?.campusSummaries ?? []} />
        {roleBreakdown.length > 0 && <RolePipeline breakdown={roleBreakdown} />}
        <InsightsAndActivity analytics={analytics} />
        <CampusesNeedingAttention campusSummaries={analytics?.campusSummaries ?? []} />
      </DashboardShell>
    </ProtectedRoute>
  );
}

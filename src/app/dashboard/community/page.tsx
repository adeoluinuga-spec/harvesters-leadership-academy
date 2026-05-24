"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
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
import { getLeadershipScope, roleDisplayLabel } from "@/lib/scope-resolver";
import {
  fetchScopedCampusAnalytics,
  type ScopedAnalytics,
  type RoleCount,
} from "@/lib/analytics";
import type { MockRole } from "@/lib/mock-auth";

function healthLabel(rate: number) {
  if (rate >= 80) return "Thriving";
  if (rate >= 60) return "Stable";
  if (rate >= 40) return "Needs Attention";
  return "Declining";
}

function healthClasses(rate: number) {
  if (rate >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (rate >= 60) return "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (rate >= 40) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
}

function fmt(n: number) {
  return n.toLocaleString();
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({
  scope,
  campusName,
  analytics,
}: {
  scope: ReturnType<typeof getLeadershipScope>;
  campusName: string;
  analytics: ScopedAnalytics | null;
}) {
  const heroStats = [
    {
      label: "Leaders in scope",
      value: analytics ? fmt(analytics.totalLeaders) : "…",
    },
    {
      label: "Enrolled",
      value: analytics ? fmt(analytics.enrolledLeaders) : "…",
    },
    {
      label: "Completion",
      value: analytics ? `${analytics.completionRate}%` : "…",
    },
    {
      label: "Certificates",
      value: analytics ? fmt(analytics.certificates) : "…",
    },
  ];

  return (
    <motion.section
      variants={shellItem}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            {scope.dashboardTitle}
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {campusName} — {scope.dashboardTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Live intelligence across {scope.insightContext} in {campusName}.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                {stat.label}
              </p>
              <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────

function KpiGrid({ analytics }: { analytics: ScopedAnalytics | null }) {
  const kpis = [
    {
      label: "Total Leaders",
      value: analytics ? fmt(analytics.totalLeaders) : "…",
      detail: "Within your oversight scope",
      icon: Users,
    },
    {
      label: "Enrolled Leaders",
      value: analytics ? fmt(analytics.enrolledLeaders) : "…",
      detail: "In at least one course",
      icon: GraduationCap,
    },
    {
      label: "Completed",
      value: analytics ? fmt(analytics.completedLeaders) : "…",
      detail: "At least one certificate",
      icon: CheckCircle2,
    },
    {
      label: "Certificates Issued",
      value: analytics ? fmt(analytics.certificates) : "…",
      detail: "Verified completions",
      icon: Award,
    },
    {
      label: "Inactive Leaders",
      value: analytics ? fmt(analytics.inactiveLeaders) : "…",
      detail: "Onboarding incomplete",
      icon: AlertCircle,
    },
    {
      label: "Needs Follow-Up",
      value: analytics ? fmt(analytics.needsFollowUp) : "…",
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
              <p className="text-sm text-zinc-500">{kpi.detail}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

// ── Role Breakdown ─────────────────────────────────────────────────────────────

function RoleBreakdown({ breakdown }: { breakdown: RoleCount[] }) {
  if (breakdown.length === 0) return null;

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Leadership pipeline breakdown
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Enrolment and completion by tier within your oversight scope
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
                    <p className="text-sm text-zinc-500">{row.count} leaders</p>
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

// ── Ministry Insights ─────────────────────────────────────────────────────────

function MinistryInsights({
  analytics,
  scope,
}: {
  analytics: ScopedAnalytics;
  scope: ReturnType<typeof getLeadershipScope>;
}) {
  const sorted = [...analytics.roleBreakdown].sort(
    (a, b) => b.completionRate - a.completionRate
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const needAttention = analytics.roleBreakdown.filter(
    (r) => r.completionRate < 60
  ).length;

  const insights = [
    best && best.completionRate >= 70
      ? {
          title: `${roleDisplayLabel(best.role as MockRole)} leads with ${best.completionRate}% completion — strong tier performance.`,
          icon: TrendingUp,
        }
      : {
          title: `Scope average stands at ${analytics.completionRate}% — keep driving academy engagement.`,
          icon: TrendingUp,
        },
    worst && worst.completionRate < 60
      ? {
          title: `${roleDisplayLabel(worst.role as MockRole)} at ${worst.completionRate}% — pastoral follow-up recommended.`,
          icon: TrendingDown,
        }
      : {
          title: "All leadership tiers are above 60% — scope is on a stable trajectory.",
          icon: UserCheck,
        },
    {
      title: `${fmt(analytics.certificates)} certificates issued across your ${scope.insightContext}.`,
      icon: Award,
    },
    needAttention > 0
      ? {
          title: `${needAttention} leadership tier${needAttention !== 1 ? "s" : ""} below 60% completion — focus your pastoral attention here.`,
          icon: AlertCircle,
        }
      : {
          title: `${fmt(analytics.needsFollowUp)} leaders enrolled but not yet certified — follow-up will accelerate completions.`,
          icon: AlertCircle,
        },
  ];

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-2">
      {/* Follow-up list */}
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Scope summary
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Live pipeline metrics for {scope.insightContext}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
          {[
            {
              label: "Total in scope",
              value: fmt(analytics.totalLeaders),
              sub: "leaders under your oversight",
            },
            {
              label: "Not yet enrolled",
              value: fmt(Math.max(0, analytics.totalLeaders - analytics.enrolledLeaders)),
              sub: "have not started a course",
            },
            {
              label: "Enrolled, no cert",
              value: fmt(analytics.needsFollowUp),
              sub: "in-progress, follow-up needed",
            },
            {
              label: "Assessment pass rate",
              value: analytics.assessmentPassRate > 0
                ? `${analytics.assessmentPassRate}%`
                : "—",
              sub: "across all assessment attempts",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-zinc-100 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                {item.label}
              </p>
              <p className="font-heading mt-2 text-2xl font-semibold text-zinc-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{item.sub}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dark insights panel */}
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">
            Ministry insights
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Strategic signals for {scope.insightContext}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/10">
                <insight.icon className="size-4" />
              </div>
              <p className="font-heading text-sm font-semibold leading-6">
                {insight.title}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityDashboardPage() {
  const hierarchy = useHierarchy();
  const { campusName, campusId, role } = hierarchy;

  const scope = useMemo(
    () => getLeadershipScope((role || "Community Leader") as MockRole, campusId),
    [role, campusId]
  );

  const [analytics, setAnalytics] = useState<ScopedAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (hierarchy.loading) return;
    if (!campusId || scope.childRoles.length === 0) {
      setAnalyticsLoading(false);
      return;
    }
    fetchScopedCampusAnalytics(campusId, scope.childRoles as string[]).then((data) => {
      setAnalytics(data);
      setAnalyticsLoading(false);
    });
  }, [campusId, scope.childRoles, hierarchy.loading]);

  return (
    <ProtectedRoute
      allowedRoles={[
        "Community Leader",
        "Area Leader",
        "Zonal Leader / HOD",
        "Super Admin",
        "Admin",
      ]}
    >
      <DashboardShell
        searchPlaceholder="Search leaders, roles, follow-ups..."
        showDate
      >
        <Hero
          scope={scope}
          campusName={campusName || "Campus"}
          analytics={analytics}
        />

        <PersonalLearningLayer
          role={(role || "Community Leader") as MockRole}
        />

        <OversightLayerIntro
          title={scope.dashboardTitle}
          description={`Live intelligence for ${scope.insightContext} within ${campusName}. Track enrolment, completion, role-tier performance, and leaders who need your follow-up.`}
          modules={[
            "Role-tier breakdown",
            "Enrolment tracking",
            "Completion pipeline",
            "Follow-up intelligence",
          ]}
        />

        <KpiGrid analytics={analytics} />

        {!analyticsLoading && analytics && analytics.totalLeaders === 0 && (
          <motion.section variants={shellItem}>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-14 text-center">
              <Users className="mx-auto size-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-500">
                No leaders found within your oversight scope
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Leaders in {campusName} with roles below yours will appear here once they have
                completed their onboarding profile.
              </p>
            </div>
          </motion.section>
        )}

        {!analyticsLoading && analytics && analytics.totalLeaders > 0 && (
          <>
            <RoleBreakdown breakdown={analytics.roleBreakdown} />
            <MinistryInsights analytics={analytics} scope={scope} />
          </>
        )}

        {!campusId && !hierarchy.loading && (
          <motion.section variants={shellItem}>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-amber-800">
                No campus assignment found. Complete your ministry profile to see oversight intelligence.
              </p>
            </div>
          </motion.section>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

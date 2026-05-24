"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AfricanMinistryVisual, IntelligencePanel } from "@/components/hierarchy/hierarchy-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WeeklyTrendChart, EnrollmentDonut } from "@/components/charts/metric-charts";
import { createClient } from "@/lib/client";
import {
  fetchCampusLearningAnalytics,
  fetchScopedCampusAnalytics,
  type CampusLearningAnalytics,
  type ScopedAnalytics,
  type RoleCount,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getLeadershipScope, roleDisplayLabel } from "@/lib/scope-resolver";
import { useHierarchy } from "@/hooks/use-hierarchy";
import type { MockRole } from "@/lib/mock-auth";

type CampusUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  current_leadership_role: string | null;
  onboarding_completed: boolean | null;
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

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

function RoleBreakdown({ breakdown }: { breakdown: RoleCount[] }) {
  if (breakdown.length === 0) return null;
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Leadership pipeline by tier
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Enrolment and completion breakdown across all leadership tiers in campus
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

function CampusMinistryInsights({
  scopedAnalytics,
  campusName,
}: {
  scopedAnalytics: ScopedAnalytics;
  campusName: string;
}) {
  const sorted = [...scopedAnalytics.roleBreakdown].sort(
    (a, b) => b.completionRate - a.completionRate
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const needAttention = scopedAnalytics.roleBreakdown.filter(
    (r) => r.completionRate < 60
  ).length;

  const insights = [
    best && best.completionRate >= 70
      ? {
          title: `${roleDisplayLabel(best.role as MockRole)} leads with ${best.completionRate}% completion — strong tier performance.`,
          icon: TrendingUp,
        }
      : {
          title: `Campus average stands at ${scopedAnalytics.completionRate}% — keep driving academy engagement.`,
          icon: TrendingUp,
        },
    worst && worst.completionRate < 60
      ? {
          title: `${roleDisplayLabel(worst.role as MockRole)} at ${worst.completionRate}% — pastoral follow-up recommended.`,
          icon: TrendingDown,
        }
      : {
          title: "All leadership tiers are above 60% — campus is on a stable trajectory.",
          icon: UserCheck,
        },
    {
      title: `${fmt(scopedAnalytics.certificates)} certificates issued across ${campusName}.`,
      icon: Award,
    },
    needAttention > 0
      ? {
          title: `${needAttention} leadership tier${needAttention !== 1 ? "s" : ""} below 60% — schedule pastoral review.`,
          icon: AlertCircle,
        }
      : {
          title: `${fmt(scopedAnalytics.needsFollowUp)} leaders enrolled but not yet certified — follow-up will accelerate completions.`,
          icon: AlertCircle,
        },
  ];

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">
            Campus pipeline insights
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Strategic signals across all leadership tiers in {campusName}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/10">
                <insight.icon className="size-4" />
              </div>
              <p className="font-heading text-sm font-semibold leading-6">{insight.title}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function CampusDashboardPage() {
  const hierarchy = useHierarchy();
  const { campusName, campusId, subgroupName, role } = hierarchy;

  const scope = useMemo(
    () => getLeadershipScope((role || "Campus Pastor") as MockRole, campusId),
    [role, campusId]
  );

  const [campusUsers, setCampusUsers] = useState<CampusUser[]>([]);
  const [analytics, setAnalytics] = useState<CampusLearningAnalytics | null>(null);
  const [scopedAnalytics, setScopedAnalytics] = useState<ScopedAnalytics | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (hierarchy.loading) return;
    if (!campusId) { setDataLoading(false); return; }

    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("users")
        .select("id, full_name, role, current_leadership_role, onboarding_completed")
        .eq("campus_id", campusId),
      fetchCampusLearningAnalytics(campusId),
    ]).then(([usersRes, lmsData]) => {
      if (!active) return;
      setCampusUsers(usersRes.data ?? []);
      setAnalytics(lmsData);
      setDataLoading(false);
    });

    return () => { active = false; };
  }, [campusId, hierarchy.loading]);

  useEffect(() => {
    if (hierarchy.loading || !campusId || scope.childRoles.length === 0) return;
    fetchScopedCampusAnalytics(campusId, scope.childRoles as string[]).then(setScopedAnalytics);
  }, [campusId, scope.childRoles, hierarchy.loading]);

  const totalLeaders = campusUsers.length;
  const inactiveLeaders = useMemo(
    () => campusUsers.filter((u) => !u.onboarding_completed),
    [campusUsers]
  );

  const stats = analytics
    ? [
        { label: "Total leaders", value: String(totalLeaders || "—"), icon: Users, sub: "Registered" },
        { label: "Enrolled", value: String(analytics.enrolledLeaders || "—"), icon: GraduationCap, sub: "In at least 1 course" },
        { label: "Certificates", value: String(analytics.certificates || "—"), icon: Award, sub: "Issued" },
        { label: "Inactive alerts", value: String(inactiveLeaders.length || "—"), icon: AlertCircle, sub: "Onboarding incomplete" },
      ]
    : [
        { label: "Total leaders", value: dataLoading ? "…" : String(totalLeaders || "—"), icon: Users, sub: "" },
        { label: "Enrolled", value: "…", icon: GraduationCap, sub: "" },
        { label: "Certificates", value: "…", icon: Award, sub: "" },
        { label: "Inactive alerts", value: "…", icon: AlertCircle, sub: "" },
      ];

  const hasCampusId = !hierarchy.loading && campusId !== null;

  return (
    <ProtectedRoute allowedRoles={["Campus Pastor", "Campus Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search campus leaders, teams, assessments...">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Campus pastor dashboard
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              {campusName} Learning & Ministry Intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-500">
              Live learning analytics for {campusName}
              {subgroupName && subgroupName !== "Subgroup not assigned" ? ` · ${subgroupName}` : ""}.
              Track leader engagement, enrolment, completion, and ministry health.
            </p>
            {!hasCampusId && !hierarchy.loading && (
              <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Complete your profile to select your campus. Analytics will appear once your campus is claimed.
              </div>
            )}
          </div>
          <AfricanMinistryVisual label="Campus ministry leadership in motion" />
        </motion.section>

        {/* ── Personal Learning ─────────────────────────────────── */}
        <PersonalLearningLayer role={(hierarchy.role || "Campus Pastor") as import("@/lib/mock-auth").MockRole} />

        {/* ── Oversight Intro ───────────────────────────────────── */}
        <OversightLayerIntro
          title="Campus oversight intelligence"
          description={`Live LMS analytics for ${campusName}: enrolment, completion, assessment performance, certificates, and inactive leader alerts.`}
          modules={[
            "Enrolment analytics",
            "Completion tracking",
            "Assessment performance",
            "Certificate milestones",
            "Inactive leader follow-up",
          ]}
        />

        {/* ── KPI Stats ─────────────────────────────────────────── */}
        <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={shellItem} whileHover={{ y: -3 }}>
              <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                    <CardTitle className="font-heading mt-3 text-3xl font-semibold text-zinc-950">
                      {stat.value}
                    </CardTitle>
                    {stat.sub && <p className="mt-1 text-xs text-zinc-500">{stat.sub}</p>}
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                    <stat.icon className="size-5" />
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Enrolment Donut + Assessment Stats ────────────────── */}
        {analytics && (
          <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[0.6fr_1fr_1fr]">
            {/* Donut */}
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="font-heading text-base font-semibold">Leader status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-4">
                <EnrollmentDonut
                  total={analytics.totalLeaders}
                  enrolled={analytics.enrolledLeaders}
                  completed={analytics.completedLeaders}
                />
                <div className="w-full space-y-2 text-xs">
                  {[
                    { label: "Completed", value: analytics.completedLeaders, color: "bg-emerald-500" },
                    { label: "In progress", value: analytics.enrolledLeaders - analytics.completedLeaders, color: "bg-zinc-950" },
                    { label: "Not enrolled", value: analytics.totalLeaders - analytics.enrolledLeaders, color: "bg-zinc-200" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <span className={`inline-block size-2 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="font-semibold text-zinc-950">{Math.max(0, item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Assessment stats */}
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="font-heading text-base font-semibold">Assessment performance</CardTitle>
                <p className="text-sm text-zinc-500">{analytics.assessmentAttempts} attempts in this campus</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-lg border border-zinc-100 p-4">
                  <p className="text-xs text-zinc-400">Pass rate</p>
                  <p className="font-heading mt-1 text-3xl font-semibold text-zinc-950">
                    {analytics.assessmentPassRate}%
                  </p>
                  <Progress
                    value={analytics.assessmentPassRate}
                    className="mt-3 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-100 p-3 text-center">
                    <p className="text-xs text-zinc-400">Needs follow-up</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-amber-600">
                      {analytics.needsFollowUp}
                    </p>
                    <p className="text-xs text-zinc-500">enrolled, no cert</p>
                  </div>
                  <div className="rounded-lg border border-zinc-100 p-3 text-center">
                    <p className="text-xs text-zinc-400">Avg progress</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-zinc-950">
                      {analytics.avgProgressPercent}%
                    </p>
                    <p className="text-xs text-zinc-500">enrolled leaders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly trend */}
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="font-heading text-base font-semibold">6-week trend</CardTitle>
                <p className="text-sm text-zinc-500">Enrolments vs certificates</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-3 flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-5 rounded-full bg-zinc-950 inline-block" />
                    Enrolments
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-5 rounded-full bg-emerald-500 inline-block" />
                    Certificates
                  </span>
                </div>
                <WeeklyTrendChart data={analytics.weeklyTrend} />
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* ── Course Breakdown ───────────────────────────────────── */}
        {analytics && analytics.courseBreakdown.length > 0 && (
          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-lg font-semibold">Course enrolment breakdown</CardTitle>
                <p className="text-sm text-zinc-500">Courses with active enrolments in {campusName}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {analytics.courseBreakdown.slice(0, 8).map((course) => (
                  <div key={course.courseId} className="rounded-lg border border-zinc-100 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-950">{course.title}</p>
                        {course.isRequired && (
                          <Badge className="rounded-md bg-rose-50 text-rose-700 hover:bg-rose-50">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-zinc-500">
                          <BookOpen className="size-3.5" />
                          {course.enrolledInCampus} enrolled
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Award className="size-3.5" />
                          {course.certificatesInCampus} certs
                        </span>
                        <span className="font-semibold text-zinc-950">{course.completionRate}%</span>
                      </div>
                    </div>
                    <Progress
                      value={course.completionRate}
                      className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* ── Leader Engagement ─────────────────────────────────── */}
        <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold">{campusName} leader roster</CardTitle>
              <p className="text-sm text-zinc-500">
                {dataLoading
                  ? "Loading campus leaders…"
                  : totalLeaders === 0
                  ? "No leaders found — ensure campus_id is assigned"
                  : `${totalLeaders} leaders`}
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
              {campusUsers.slice(0, 6).map((user) => (
                <div key={user.id} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-4">
                  <Avatar>
                    <AvatarFallback className="bg-zinc-950 text-xs font-semibold text-white">
                      {initials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-950">{user.full_name || "Unnamed Leader"}</p>
                    <p className="text-sm text-zinc-500">{user.current_leadership_role || user.role || "Leader"}</p>
                    <Badge
                      className={`mt-2 rounded-md border text-xs hover:bg-inherit ${
                        user.onboarding_completed
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {user.onboarding_completed ? "Active" : "Needs follow-up"}
                    </Badge>
                  </div>
                </div>
              ))}
              {!dataLoading && totalLeaders === 0 && (
                <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                  <p className="text-sm text-zinc-400">No campus leaders loaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <IntelligencePanel
            title="Mentorship & follow-up"
            subtitle={`Accountability signals for ${campusName}`}
            insights={[
              analytics && analytics.needsFollowUp > 0
                ? `${analytics.needsFollowUp} leader${analytics.needsFollowUp !== 1 ? "s" : ""} enrolled but not yet certified — priority follow-up.`
                : "All enrolled leaders are on track.",
              analytics && analytics.assessmentPassRate < 60 && analytics.assessmentAttempts > 0
                ? `Assessment pass rate is ${analytics.assessmentPassRate}% — consider targeted study support.`
                : "Assessment performance is healthy.",
              inactiveLeaders.length > 0
                ? `${inactiveLeaders.length} leader${inactiveLeaders.length !== 1 ? "s" : ""} need reactivation follow-up.`
                : "All registered leaders have active academy profiles.",
              "Weekly check-ins with leaders improve completion rates significantly.",
            ]}
            dark
          />
        </motion.section>

        {/* ── Leadership Pipeline by Tier ───────────────────────── */}
        {scopedAnalytics && scopedAnalytics.roleBreakdown.length > 0 && (
          <RoleBreakdown breakdown={scopedAnalytics.roleBreakdown} />
        )}

        {/* ── Campus Pipeline Insights ──────────────────────────── */}
        {scopedAnalytics && scopedAnalytics.roleBreakdown.length > 0 && (
          <CampusMinistryInsights
            scopedAnalytics={scopedAnalytics}
            campusName={campusName || "Campus"}
          />
        )}

        {/* ── Inactive Alerts ────────────────────────────────────── */}
        {inactiveLeaders.length > 0 && (
          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-lg font-semibold">Inactive leader alerts</CardTitle>
                <p className="text-sm text-zinc-500">
                  {inactiveLeaders.length} leader{inactiveLeaders.length !== 1 ? "s" : ""} without an active academy profile
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 pt-1 md:grid-cols-3">
                {inactiveLeaders.slice(0, 9).map((user) => (
                  <div key={user.id} className="rounded-lg border border-zinc-100 p-4">
                    <HeartHandshake className="mb-4 size-5 text-zinc-400" />
                    <p className="font-medium text-zinc-950">{user.full_name || "Unnamed Leader"}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {user.current_leadership_role || user.role || "Leader"} · Onboarding incomplete
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>
        )}

      </DashboardShell>
    </ProtectedRoute>
  );
}

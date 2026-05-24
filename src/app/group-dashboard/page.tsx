"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
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
  fetchGroupAnalyticsDetailed,
  type GroupAnalyticsDetailed,
  type SubgroupSummary,
  type CampusSummary,
} from "@/lib/analytics";

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

function Hero({ groupName, analytics }: { groupName: string; analytics: GroupAnalyticsDetailed | null }) {
  const heroStats = [
    { label: "Subgroups", value: analytics ? String(analytics.totalSubgroups) : "…" },
    { label: "Total campuses", value: analytics ? String(analytics.totalCampuses) : "…" },
    { label: "Total leaders", value: analytics ? fmt(analytics.totalLeaders) : "…" },
    { label: "Completion rate", value: analytics ? `${analytics.overallCompletionRate}%` : "…" },
  ];

  return (
    <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Group pastor intelligence
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {groupName} Leadership Intelligence
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Full oversight across all subgroups, campuses, and leaders within {groupName}.
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

// ── KPI Grid ──────────────────────────────────────────────────────────────────

function KpiGrid({ groupName, analytics }: { groupName: string; analytics: GroupAnalyticsDetailed | null }) {
  const followUp = analytics ? Math.max(0, analytics.enrolledLeaders - analytics.completedLeaders) : 0;

  const kpis = [
    {
      label: "Total Leaders",
      value: analytics ? fmt(analytics.totalLeaders) : "…",
      detail: `Across ${groupName}`,
      icon: Users,
    },
    {
      label: "Subgroups",
      value: analytics ? String(analytics.totalSubgroups) : "…",
      detail: "Under your oversight",
      icon: Users,
    },
    {
      label: "Active Campuses",
      value: analytics ? String(analytics.totalCampuses) : "…",
      detail: "Across all subgroups",
      icon: Building2,
    },
    {
      label: "Enrolled Leaders",
      value: analytics ? fmt(analytics.enrolledLeaders) : "…",
      detail: "Current academy cohort",
      icon: GraduationCap,
    },
    {
      label: "Certificates Issued",
      value: analytics ? fmt(analytics.certificates) : "…",
      detail: "Verified completions",
      icon: Award,
    },
    {
      label: "Needs Follow-Up",
      value: analytics ? fmt(followUp) : "…",
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

// ── Campus card (inside expanded subgroup) ─────────────────────────────────

function CampusCard({ campus }: { campus: CampusSummary }) {
  const enrollmentPct =
    campus.totalLeaders > 0 ? Math.round((campus.enrolledLeaders / campus.totalLeaders) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-100 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-950">{campus.campusName}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{campus.totalLeaders} leaders</p>
        </div>
        <Badge className={cn("rounded-md border hover:bg-inherit text-xs", healthClasses(campus.completionRate))}>
          {healthLabel(campus.completionRate)}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Leaders</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.totalLeaders)}</p>
        </div>
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Enrolled</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.enrolledLeaders)}</p>
        </div>
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Certified</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.certificates)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>Completion</span>
          <span className="font-medium text-zinc-700">{campus.completionRate}%</span>
        </div>
        <Progress value={campus.completionRate} className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
      </div>
      {campus.enrolledLeaders - campus.completedLeaders > 0 && (
        <p className="mt-2 text-xs text-zinc-400">
          {Math.max(0, campus.enrolledLeaders - campus.completedLeaders)} enrolled — not yet certified
        </p>
      )}
    </div>
  );
}

// ── Subgroup Performance Accordion ────────────────────────────────────────────

function SubgroupPerformance({ subgroups }: { subgroups: SubgroupSummary[] }) {
  const [expanded, setExpanded] = useState(subgroups[0]?.subgroupId ?? "");

  if (subgroups.length === 0) {
    return (
      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Subgroup performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-zinc-400">
              No subgroup data found for this group. Ensure users have the correct group_id assigned.
            </p>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Subgroup performance</CardTitle>
          <p className="text-sm text-zinc-500">
            Multi-campus leadership health by subgroup — click a subgroup to see its campuses
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {subgroups.map((subgroup) => {
            const isOpen = expanded === subgroup.subgroupId;
            return (
              <div key={subgroup.subgroupId} className="rounded-lg border border-zinc-100 bg-white">
                {/* Subgroup header row */}
                <button
                  onClick={() => setExpanded(isOpen ? "" : subgroup.subgroupId)}
                  className="flex w-full flex-col gap-4 p-4 text-left lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-zinc-950">{subgroup.subgroupName}</p>
                      <p className="text-sm text-zinc-500">
                        {subgroup.pastorName
                          ? subgroup.pastorName
                          : `${subgroup.campusSummaries.length} campus${subgroup.campusSummaries.length !== 1 ? "es" : ""}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid gap-3 sm:grid-cols-5 lg:min-w-[720px]">
                    {[
                      ["Campuses", subgroup.campusSummaries.length],
                      ["Leaders", fmt(subgroup.totalLeaders)],
                      ["Enrolled", fmt(subgroup.enrolledLeaders)],
                      ["Completion", `${subgroup.completionRate}%`],
                      ["Certificates", fmt(subgroup.certificates)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "rounded-md border hover:bg-inherit shrink-0",
                        healthClasses(subgroup.completionRate)
                      )}
                    >
                      {healthLabel(subgroup.completionRate)}
                    </Badge>
                    <ChevronDown
                      className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")}
                    />
                  </div>
                </button>

                {/* Campus breakdown (expanded) */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-100 p-4">
                        {/* Subgroup summary bar */}
                        <div className="mb-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Subgroup completion progress</span>
                            <span className="font-semibold text-zinc-950">{subgroup.completionRate}%</span>
                          </div>
                          <Progress
                            value={subgroup.completionRate}
                            className="h-2 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black"
                          />
                          <p className="mt-2 text-xs text-zinc-400">
                            {Math.max(0, subgroup.enrolledLeaders - subgroup.completedLeaders)} enrolled leaders still
                            working toward their certificate
                          </p>
                        </div>

                        {/* Campus cards grid */}
                        {subgroup.campusSummaries.length === 0 ? (
                          <p className="py-4 text-center text-sm text-zinc-400">No campus data for this subgroup</p>
                        ) : (
                          <div className="grid gap-3 lg:grid-cols-3 md:grid-cols-2">
                            {subgroup.campusSummaries.map((campus) => (
                              <CampusCard key={campus.campusId} campus={campus} />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.section>
  );
}

// ── Health Intelligence + Insights ───────────────────────────────────────────

function HealthAndInsights({ groupName, analytics }: { groupName: string; analytics: GroupAnalyticsDetailed }) {
  // Flatten all campuses across subgroups for health signals
  const allCampuses = analytics.subgroups.flatMap((sg) => sg.campusSummaries);
  const sorted = [...allCampuses].sort((a, b) => b.completionRate - a.completionRate);
  const spotlight = [...sorted.slice(0, 2), ...sorted.slice(-2).reverse()].slice(0, 4);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const needAttention = allCampuses.filter((c) => c.completionRate < 60).length;
  const avgRate =
    allCampuses.length > 0
      ? Math.round(allCampuses.reduce((s, c) => s + c.completionRate, 0) / allCampuses.length)
      : 0;

  const insights = [
    best && best.completionRate >= 70
      ? {
          title: `${best.campusName} leads with ${best.completionRate}% completion — a strong ministry benchmark.`,
          icon: TrendingUp,
        }
      : { title: `Group average stands at ${avgRate}% completion — keep driving momentum.`, icon: TrendingUp },
    worst && worst.completionRate < 60
      ? {
          title: `${worst.campusName} is at ${worst.completionRate}% — pastoral follow-up recommended.`,
          icon: TrendingDown,
        }
      : { title: "All campuses are above the 60% completion threshold — group is stable.", icon: UserCheck },
    {
      title: `${fmt(analytics.certificates)} certificates issued across ${groupName}.`,
      icon: Award,
    },
    needAttention > 0
      ? {
          title: `${needAttention} campus${needAttention !== 1 ? "es" : ""} require follow-up attention.`,
          icon: AlertCircle,
        }
      : { title: "No campuses currently below critical thresholds — group is on track.", icon: UserCheck },
  ];

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Campus health intelligence
          </CardTitle>
          <p className="text-sm text-zinc-500">Top and bottom performing campuses across all subgroups</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {spotlight.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No campus data available</p>
          ) : (
            spotlight.map((campus) => (
              <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">{campus.campusName}</p>
                    <p className="text-sm text-zinc-500">
                      {campus.totalLeaders} leaders · {campus.certificates} certificates
                    </p>
                  </div>
                  <Badge className={cn("rounded-md border hover:bg-inherit", healthClasses(campus.completionRate))}>
                    {healthLabel(campus.completionRate)}
                  </Badge>
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
          <CardTitle className="font-heading text-lg font-semibold">Ministry insights</CardTitle>
          <p className="text-sm text-zinc-400">Strategic signals for {groupName} oversight</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
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

// ── Campuses Needing Attention ─────────────────────────────────────────────

function AttentionSection({ analytics }: { analytics: GroupAnalyticsDetailed }) {
  const allCampuses = analytics.subgroups.flatMap((sg) =>
    sg.campusSummaries.map((c) => ({ ...c, subgroupName: sg.subgroupName }))
  );
  const lowCampuses = allCampuses
    .filter((c) => c.completionRate < 70)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 4);

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Campuses needing attention
          </CardTitle>
          <p className="text-sm text-zinc-500">Below 70% completion — pastoral follow-up recommended</p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
          {lowCampuses.length === 0 ? (
            <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
              All campuses are above the 70% completion threshold
            </div>
          ) : (
            lowCampuses.map((campus) => (
              <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">{campus.campusName}</p>
                    <p className="text-xs text-zinc-400">{campus.subgroupName}</p>
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

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Subgroup summary</CardTitle>
          <p className="text-sm text-zinc-500">Completion at a glance</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {analytics.subgroups.map((sg) => (
            <div key={sg.subgroupId} className="rounded-lg border border-zinc-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-950">
                  {sg.subgroupName.replace(/\s+Subgroup$/i, "")}
                </p>
                <span className="text-xs text-zinc-400">{fmt(sg.certificates)} certs</span>
              </div>
              <Progress
                value={sg.completionRate}
                className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                {sg.completionRate}% · {sg.campusSummaries.length} campuses · {fmt(sg.totalLeaders)} leaders
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GroupDashboardPage() {
  const hierarchy = useHierarchy();
  const groupName = hierarchy.groupName || "…";
  const groupId = hierarchy.groupId;

  const [analytics, setAnalytics] = useState<GroupAnalyticsDetailed | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (hierarchy.loading) return;
    if (!groupId) {
      setAnalyticsLoading(false);
      return;
    }
    fetchGroupAnalyticsDetailed(groupId).then((data) => {
      setAnalytics(data);
      setAnalyticsLoading(false);
    });
  }, [groupId, hierarchy.loading]);

  return (
    <ProtectedRoute allowedRoles={["Group Pastor", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search subgroups, campuses, leaders..." showDate>
        <Hero groupName={groupName} analytics={analytics} />
        <PersonalLearningLayer
          role={(hierarchy.role || "Group Pastor") as import("@/lib/mock-auth").MockRole}
        />
        <OversightLayerIntro
          title="Group oversight intelligence"
          description={`Full hierarchy visibility for ${groupName} — subgroups, campuses, enrollment, certificates, and leadership health signals.`}
          modules={[
            "Subgroup analytics",
            "Campus performance",
            "Leadership pipeline visibility",
            "Campus health signals",
          ]}
        />
        <KpiGrid groupName={groupName} analytics={analytics} />

        {!analyticsLoading && !groupId && (
          <motion.section variants={shellItem}>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-14 text-center">
              <Building2 className="mx-auto size-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-500">No group assignment found</p>
              <p className="mt-1 text-xs text-zinc-400">
                Ensure your profile has the correct group_id assigned in the database
              </p>
            </div>
          </motion.section>
        )}

        {!analyticsLoading && analytics && (
          <>
            <SubgroupPerformance subgroups={analytics.subgroups} />
            <HealthAndInsights groupName={groupName} analytics={analytics} />
            <AttentionSection analytics={analytics} />
          </>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

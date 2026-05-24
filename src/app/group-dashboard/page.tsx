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
import { fetchGroupAnalytics, type HierarchyAnalytics, type CampusSummary } from "@/lib/analytics";

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

function Hero({ groupName, analytics }: { groupName: string; analytics: HierarchyAnalytics | null }) {
  const heroStats = [
    { label: "Total campuses", value: analytics ? String(analytics.campusSummaries.length) : "…" },
    { label: "Total leaders", value: analytics ? fmt(analytics.totalLeaders) : "…" },
    { label: "Enrolled leaders", value: analytics ? fmt(analytics.enrolledLeaders) : "…" },
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
            Your personal leadership growth continues alongside strategic ministry intelligence across {groupName}.
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

function KpiGrid({ groupName, analytics }: { groupName: string; analytics: HierarchyAnalytics | null }) {
  const followUp = analytics ? Math.max(0, analytics.enrolledLeaders - analytics.completedLeaders) : 0;

  const kpis = [
    { label: "Total Leaders", value: analytics ? fmt(analytics.totalLeaders) : "…", detail: `Across ${groupName}`, icon: Users },
    { label: "Active Campuses", value: analytics ? String(analytics.campusSummaries.length) : "…", detail: "In your group", icon: Building2 },
    { label: "Enrolled Leaders", value: analytics ? fmt(analytics.enrolledLeaders) : "…", detail: "Current academy cohort", icon: GraduationCap },
    { label: "Completion Rate", value: analytics ? `${analytics.overallCompletionRate}%` : "…", detail: "Group average", icon: CheckCircle2 },
    { label: "Certificates Issued", value: analytics ? fmt(analytics.certificates) : "…", detail: "Verified completions", icon: Award },
    { label: "Needs Follow-Up", value: analytics ? fmt(followUp) : "…", detail: "Enrolled but not yet certified", icon: AlertCircle },
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
  const [expanded, setExpanded] = useState("");

  if (campusSummaries.length === 0) {
    return (
      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Campus performance</CardTitle>
            <p className="text-sm text-zinc-500">Leadership academy health across campuses in your group</p>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-zinc-400">No campus data available for this group</p>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Campus performance</CardTitle>
          <p className="text-sm text-zinc-500">Leadership academy health across campuses in your group</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {campusSummaries.map((campus) => {
            const isOpen = expanded === campus.campusId;
            return (
              <div key={campus.campusId} className="rounded-lg border border-zinc-100 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? "" : campus.campusId)}
                  className="flex w-full flex-col gap-4 p-4 text-left lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                      <Building2 className="size-4" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-zinc-950">{campus.campusName}</p>
                      <p className="text-sm text-zinc-500">{campus.totalLeaders} leaders</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[560px]">
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
                  <div className="flex items-center gap-3">
                    <Badge className={cn("rounded-md border hover:bg-inherit shrink-0", healthClasses(campus.completionRate))}>
                      {healthLabel(campus.completionRate)}
                    </Badge>
                    <ChevronDown className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 border-t border-zinc-100 p-4 md:grid-cols-3">
                        <div className="rounded-lg border border-zinc-100 p-4">
                          <p className="font-medium text-zinc-950">Enrollment coverage</p>
                          <p className="font-heading mt-2 text-2xl font-semibold text-zinc-950">
                            {campus.totalLeaders > 0
                              ? `${Math.round((campus.enrolledLeaders / campus.totalLeaders) * 100)}%`
                              : "—"}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {campus.enrolledLeaders} of {campus.totalLeaders} enrolled
                          </p>
                          <Progress
                            value={
                              campus.totalLeaders > 0
                                ? Math.round((campus.enrolledLeaders / campus.totalLeaders) * 100)
                                : 0
                            }
                            className="mt-3 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                          />
                        </div>
                        <div className="rounded-lg border border-zinc-100 p-4">
                          <p className="font-medium text-zinc-950">Completion rate</p>
                          <p className="font-heading mt-2 text-2xl font-semibold text-zinc-950">
                            {campus.completionRate}%
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">{campus.completedLeaders} certified</p>
                          <Progress
                            value={campus.completionRate}
                            className="mt-3 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                          />
                        </div>
                        <div className="rounded-lg border border-zinc-100 p-4">
                          <p className="font-medium text-zinc-950">Needs follow-up</p>
                          <p className="font-heading mt-2 text-2xl font-semibold text-zinc-950">
                            {Math.max(0, campus.enrolledLeaders - campus.completedLeaders)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">Enrolled but not yet certified</p>
                        </div>
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

function CampusHealthAndInsights({
  groupName,
  campusSummaries,
}: {
  groupName: string;
  campusSummaries: CampusSummary[];
}) {
  const sorted = [...campusSummaries].sort((a, b) => b.completionRate - a.completionRate);
  const spotlight = [...sorted.slice(0, 2), ...sorted.slice(-2).reverse()].slice(0, 4);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const needAttention = campusSummaries.filter((c) => c.completionRate < 60).length;
  const totalCerts = campusSummaries.reduce((s, c) => s + c.certificates, 0);
  const avgRate =
    campusSummaries.length > 0
      ? Math.round(campusSummaries.reduce((s, c) => s + c.completionRate, 0) / campusSummaries.length)
      : 0;

  const insights = [
    best && best.completionRate >= 70
      ? {
          title: `${best.campusName} leads with ${best.completionRate}% completion — a strong ministry benchmark.`,
          icon: TrendingUp,
        }
      : {
          title: `Group average stands at ${avgRate}% completion — keep driving momentum.`,
          icon: TrendingUp,
        },
    worst && worst.completionRate < 60
      ? {
          title: `${worst.campusName} is at ${worst.completionRate}% — pastoral follow-up recommended.`,
          icon: TrendingDown,
        }
      : {
          title: "All campuses are above the 60% completion threshold — group is stable.",
          icon: UserCheck,
        },
    {
      title: `${fmt(totalCerts)} certificates issued across ${groupName}.`,
      icon: Award,
    },
    needAttention > 0
      ? {
          title: `${needAttention} campus${needAttention !== 1 ? "es" : ""} require follow-up attention.`,
          icon: AlertCircle,
        }
      : {
          title: "No campuses currently below critical thresholds — group is on track.",
          icon: UserCheck,
        },
  ];

  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Campus health intelligence</CardTitle>
          <p className="text-sm text-zinc-500">Completion signals and follow-up priorities</p>
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

function CampusAttentionSummary({ campusSummaries }: { campusSummaries: CampusSummary[] }) {
  const lowCampuses = campusSummaries
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
                    <p className="text-sm text-zinc-500">{campus.totalLeaders} leaders</p>
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
                  {Math.max(0, campus.enrolledLeaders - campus.completedLeaders)} enrolled leaders yet to earn a
                  certificate
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Group summary</CardTitle>
          <p className="text-sm text-zinc-500">Completion progress at a glance</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {campusSummaries.slice(0, 5).map((campus) => (
            <div key={campus.campusId} className="rounded-lg border border-zinc-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-950">
                  {campus.campusName.replace(/^Harvesters\s+/i, "").replace(/\s+Campus$/i, "")}
                </p>
                <span className="text-xs text-zinc-400">{campus.certificates} certs</span>
              </div>
              <Progress
                value={campus.completionRate}
                className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function GroupDashboardPage() {
  const hierarchy = useHierarchy();
  const groupName = hierarchy.groupName || "…";
  const groupId = hierarchy.groupId;

  const [analytics, setAnalytics] = useState<HierarchyAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (hierarchy.loading) return;
    if (!groupId) {
      setAnalyticsLoading(false);
      return;
    }
    fetchGroupAnalytics(groupId).then((data) => {
      setAnalytics(data);
      setAnalyticsLoading(false);
    });
  }, [groupId, hierarchy.loading]);

  const campusSummaries = analytics?.campusSummaries ?? [];

  return (
    <ProtectedRoute allowedRoles={["Group Pastor", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search campuses, leaders..." showDate>
        <Hero groupName={groupName} analytics={analytics} />
        <PersonalLearningLayer
          role={(hierarchy.role || "Group Pastor") as import("@/lib/mock-auth").MockRole}
        />
        <OversightLayerIntro
          title="Group oversight intelligence"
          description={`Role-aware intelligence for ${groupName} ministry health, campus analytics, leadership pipeline visibility, and growth signals.`}
          modules={[
            "Strategic ministry intelligence",
            "Campus analytics",
            "Leadership pipeline visibility",
            "Campus growth intelligence",
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
        {!analyticsLoading && groupId && (
          <>
            <CampusPerformance campusSummaries={campusSummaries} />
            <CampusHealthAndInsights groupName={groupName} campusSummaries={campusSummaries} />
            <CampusAttentionSummary campusSummaries={campusSummaries} />
          </>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

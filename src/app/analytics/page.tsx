"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  CircleAlert,
  HeartHandshake,
  Lightbulb,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { courses } from "@/lib/course-data";
import { campuses, leaders } from "@/lib/hierarchy-data";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { AcademyRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type AnalyticsScope = "personal" | "campus" | "subgroup" | "organization" | "ecosystem";
type RecommendationTone = "growth" | "care" | "system" | "celebration";

type InsightRecommendation = {
  title: string;
  body: string;
  action: string;
  tone: RecommendationTone;
  icon: LucideIcon;
};

const engagementTrend = [
  { month: "Jan", active: 62, consistency: 56, participation: 58 },
  { month: "Feb", active: 66, consistency: 60, participation: 63 },
  { month: "Mar", active: 71, consistency: 65, participation: 67 },
  { month: "Apr", active: 69, consistency: 66, participation: 70 },
  { month: "May", active: 76, consistency: 72, participation: 74 },
  { month: "Jun", active: 81, consistency: 75, participation: 79 },
];

const leadershipGrowthTrend = [
  { level: "Cell", readiness: 78, maturity: 72, mentorship: 64 },
  { level: "Zonal", readiness: 68, maturity: 66, mentorship: 58 },
  { level: "Community", readiness: 61, maturity: 59, mentorship: 52 },
  { level: "Pastoral", readiness: 47, maturity: 51, mentorship: 43 },
  { level: "Directional", readiness: 35, maturity: 44, mentorship: 31 },
];

const certificationTrend = [
  { month: "Jan", certificates: 41, promotionReady: 18 },
  { month: "Feb", certificates: 46, promotionReady: 21 },
  { month: "Mar", certificates: 55, promotionReady: 27 },
  { month: "Apr", certificates: 61, promotionReady: 31 },
  { month: "May", certificates: 74, promotionReady: 39 },
  { month: "Jun", certificates: 82, promotionReady: 44 },
];

const pathwayImpact = [
  { name: "Conflict Resolution", completion: 84, reflection: 91 },
  { name: "Pastoral Care", completion: 79, reflection: 86 },
  { name: "Church Planting", completion: 72, reflection: 77 },
  { name: "Financial Management", completion: 58, reflection: 63 },
];

const subgroupComparison = [
  { name: "Magodo", readiness: 86, momentum: 91, certification: 78 },
  { name: "Jericho", readiness: 81, momentum: 84, certification: 74 },
  { name: "Yaba", readiness: 76, momentum: 79, certification: 70 },
  { name: "Gbagada", readiness: 63, momentum: 66, certification: 52 },
];

const recommendationStyles: Record<RecommendationTone, string> = {
  growth: "bg-sky-50 text-sky-700 ring-sky-100",
  care: "bg-rose-50 text-rose-700 ring-rose-100",
  system: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  celebration: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const chartGrid = "#e4e4e7";
const chartBlack = "#09090b";
const chartZinc = "#71717a";
const chartSoft = "#d4d4d8";

function scopeForRole(role: AcademyRole): AnalyticsScope {
  if (role === "Platform Super Admin" || role === "Super Admin" || role === "Admin") return "ecosystem";
  if (role === "Leader") return "personal";
  if (role === "Campus Pastor") return "campus";
  if (role === "Subgroup Pastor" || role === "Sub-Group Pastor") return "subgroup";
  if (role === "Group Pastor") return "organization";
  return "ecosystem";
}

export default function AnalyticsPage() {
  const [role, setRole] = useState<AcademyRole>("Platform Super Admin");
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function syncContext() {
      const result = await getCurrentUserProfile();
      if (active && result.profile) {
        setRole(result.profile.role);
        setProfile(result.profile);
      }
    }

    syncContext();

    return () => {
      active = false;
    };
  }, []);

  const scope = scopeForRole(role);
  const scopedCampuses = useMemo(() => {
    if (scope === "campus" || scope === "personal") {
      return campuses.filter((campus) => campus.name === profile?.campus);
    }

    if (scope === "subgroup") {
      return campuses.filter((campus) => campus.subgroup === profile?.subgroup);
    }

    return campuses;
  }, [profile?.campus, profile?.subgroup, scope]);

  const scopedLeaders = useMemo(() => {
    if (scope === "personal") {
      return leaders.filter((leader) => leader.name === profile?.fullName || leader.campus === profile?.campus).slice(0, 1);
    }

    if (scope === "campus") {
      return leaders.filter((leader) => leader.campus === profile?.campus);
    }

    if (scope === "subgroup") {
      return leaders.filter((leader) => leader.subgroup === profile?.subgroup);
    }

    return leaders;
  }, [profile?.campus, profile?.fullName, profile?.subgroup, scope]);

  const totals = useMemo(() => {
    const leaderTotal = scopedCampuses.reduce((sum, campus) => sum + campus.leaders, 0);
    const activeTotal = scopedCampuses.reduce((sum, campus) => sum + campus.active, 0);
    const inactiveTotal = scopedCampuses.reduce((sum, campus) => sum + campus.inactive, 0);
    const completionAverage = Math.round(
      scopedCampuses.reduce((sum, campus) => sum + campus.completion, 0) / Math.max(scopedCampuses.length, 1)
    );
    const engagementAverage = Math.round(
      scopedCampuses.reduce((sum, campus) => sum + campus.engagement, 0) / Math.max(scopedCampuses.length, 1)
    );

    return {
      leaderTotal: scope === "personal" ? 1 : leaderTotal,
      activeTotal: scope === "personal" ? 1 : activeTotal,
      inactiveTotal: scope === "personal" ? 0 : inactiveTotal,
      completionAverage: scope === "personal" ? 62 : completionAverage,
      engagementAverage: scope === "personal" ? 88 : engagementAverage,
    };
  }, [scope, scopedCampuses]);

  const campusHealthData = scopedCampuses.map((campus) => ({
    name: campus.name.replace(" Campus", ""),
    engagement: campus.engagement,
    completion: campus.completion,
    inactive: campus.inactive,
  }));
  const followUpQueue = Math.max(
    totals.inactiveTotal,
    scopedLeaders.filter((leader) => leader.status === "Needs Follow-up" || leader.status === "Inactive").length
  );

  const readinessData = [
    { name: "Ready", value: Math.max(18, Math.round(totals.leaderTotal * 0.16)) },
    { name: "Developing", value: Math.max(24, Math.round(totals.leaderTotal * 0.48)) },
    { name: "Needs care", value: Math.max(6, totals.inactiveTotal) },
  ];

  const aiRecommendations = buildRecommendations(role, scope, profile);

  return (
    <ProtectedRoute allowedRoles={["Cell Leader / Assistant HOD", "Zonal Leader / HOD", "Community Leader", "Area Leader", "District Pastor / Pastoral Leader", "Directional Leader", "Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Campus Admin", "Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search analytics, campuses, pathways, leaders..." showDate={false}>
        <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Analytics Intelligence Engine
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Ministry leadership analytics translated into clear next steps
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-500">
              Engagement, growth, campus health, learning impact, and organizational readiness
              are shaped into human-readable intelligence for {role.toLowerCase()} decisions.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#080808] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white text-black">
                <Brain className="size-5" />
              </div>
              <div>
                <p className="font-heading font-semibold">Current intelligence scope</p>
                <p className="text-sm capitalize text-zinc-400">{scope} analytics</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Leadership context", scopeLabel(scope, profile)],
                ["Primary signal", primarySignal(scope)],
                ["Recommended posture", "Encourage, focus, and follow up"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={shellContainer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active learners" value={totals.activeTotal.toLocaleString()} detail="Participation remains visible" icon={Users} trend="+14%" />
          <MetricCard label="Engagement" value={`${totals.engagementAverage}%`} detail="Consistency and activity" icon={Activity} trend="+8%" />
          <MetricCard label="Completion" value={`${totals.completionAverage}%`} detail="Pathway progress" icon={CheckCircle2} trend="+11%" />
          <MetricCard label="Follow-up queue" value={followUpQueue.toString()} detail="Leaders needing care" icon={HeartHandshake} trend="-6%" muted />
        </motion.section>

        <AnalyticsSection
          title="Engagement Intelligence"
          description="Active learning, consistency, participation trends, engagement growth, and drop-off detection."
          insight={`${scopeLabel(scope, profile)} engagement improved ${scope === "personal" ? "9" : "14"}% this month while consistency stayed healthy.`}
          action="Assign gentle reminders to inactive learners and reinforce weekly learning rhythms through leadership check-ins."
          icon={Activity}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
            <ChartCard title="Participation trend" subtitle="Active learners, consistency, and participation">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={engagementTrend}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="active" stroke={chartBlack} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="consistency" stroke={chartZinc} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="participation" stroke={chartSoft} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <InsightList
              items={[
                "Engagement in Ilupeju Campus improved 14% this month.",
                "Leadership participation remains strong across Magodo Subgroup.",
                "Drop-off risk is concentrated among leaders with no activity in 14 days.",
              ]}
            />
          </div>
        </AnalyticsSection>

        <AnalyticsSection
          title="Leadership Growth Analytics"
          description="Pathway progression, promotion readiness, certification completion, mentorship readiness, and maturity trends."
          insight="18 leaders may be ready for mentorship responsibilities based on completion, consistency, and assessment maturity."
          action="Schedule mentorship readiness conversations and recommend advanced pathways for leaders above 80% completion."
          icon={Target}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_0.75fr]">
            <ChartCard title="Readiness by leadership level" subtitle="Progression, maturity, and mentorship indicators">
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={leadershipGrowthTrend}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="level" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="readiness" fill={chartBlack} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="mentorship" fill={chartSoft} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Certification and promotion movement" subtitle="Quarterly leadership pipeline signal">
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={certificationTrend}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="certificates" stroke={chartBlack} fill="#e4e4e7" strokeWidth={2} />
                  <Area type="monotone" dataKey="promotionReady" stroke={chartZinc} fill="#f4f4f5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </AnalyticsSection>

        <AnalyticsSection
          title="Campus Health Intelligence"
          description="Thriving campuses, declining campuses, participation consistency, assessment completion, inactive leader ratios, and follow-up health."
          insight={`${strongestCampus(scopedCampuses)} continues to demonstrate strong consistency while ${weakestCampus(scopedCampuses)} requires follow-up attention.`}
          action="Prioritize pastoral follow-up for declining campuses and ask thriving campuses to share weekly learning rhythms."
          icon={ShieldCheck}
        >
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {scopedCampuses.slice(0, scope === "ecosystem" || scope === "organization" ? 6 : 4).map((campus) => (
                <CampusHealthCard key={campus.id} campus={campus} />
              ))}
            </div>
            <ChartCard title="Campus health comparison" subtitle="Engagement, completion, and inactive leaders">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={campusHealthData}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="engagement" fill={chartBlack} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completion" fill={chartSoft} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </AnalyticsSection>

        <AnalyticsSection
          title="Learning Intelligence"
          description="Top-performing courses, low completion courses, difficult assessments, reflection engagement, and impactful pathways."
          insight="Conflict Resolution generated the highest reflection engagement, while Church Financial Management completion dropped this month."
          action="Recommend the most impactful pathways to active leaders and trigger assessment support for low-completion courses."
          icon={BookOpenCheck}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
            <ChartCard title="Course impact map" subtitle="Completion and reflection engagement">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pathwayImpact}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} interval={0} />
                  <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="reflection" fill={chartBlack} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completion" fill={chartSoft} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-lg font-semibold">Learning signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                {courses.slice(0, 4).map((course) => (
                  <div key={course.id} className="rounded-lg border border-zinc-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-950">{course.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{course.category} - {course.level}</p>
                      </div>
                      <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                        {course.progress || 34}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </AnalyticsSection>

        {scope === "organization" || scope === "ecosystem" ? (
          <AnalyticsSection
            title="Organizational Intelligence"
            description="Subgroup comparisons, leadership pipeline health, promotion bottlenecks, certification trends, campus momentum, and organizational readiness."
            insight="Leadership readiness is strongest in Magodo Subgroup, while Gbagada has the clearest promotion bottleneck."
            action="Move certification-ready leaders into review and assign mentorship support where subgroup momentum is slowing."
            icon={Network}
          >
            <div className="grid gap-4 xl:grid-cols-[1fr_0.68fr]">
              <ChartCard title="Subgroup comparison" subtitle="Readiness, momentum, and certification strength">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subgroupComparison}>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="readiness" fill={chartBlack} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="certification" fill={chartSoft} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Leadership pipeline health" subtitle="Readiness distribution">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={readinessData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={4}>
                      {readinessData.map((entry, index) => (
                        <Cell key={entry.name} fill={[chartBlack, chartZinc, chartSoft][index]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </AnalyticsSection>
        ) : null}

        <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">AI insight recommendations</CardTitle>
                  <p className="text-sm text-zinc-500">Observations, recommendations, suggested actions, and leadership interventions.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
              {aiRecommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.title} recommendation={recommendation} />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-[#080808] text-white shadow-sm">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading text-lg font-semibold">What leadership should do next</CardTitle>
              <p className="text-sm text-zinc-400">A focused action queue generated from the current analytics scope.</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {[
                "Assign follow-up to leaders inactive for more than 14 days.",
                "Recommend pathway progression for leaders above 75% completion.",
                "Trigger assessment nudges for campuses below completion pace.",
                "Schedule mentorship conversations for promotion-ready leaders.",
                "Encourage certification completion before the next review cycle.",
              ].map((action, index) => (
                <div key={action} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-black">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-zinc-300">{action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </DashboardShell>
    </ProtectedRoute>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  muted = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  trend: string;
  muted?: boolean;
}) {
  const positive = trend.startsWith("+");

  return (
    <motion.div variants={shellItem} whileHover={{ y: -3 }}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
            <CardTitle className="font-heading mt-3 text-3xl font-semibold text-zinc-950">{value}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">{detail}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <Icon className="size-5" />
          </div>
        </CardHeader>
        <CardContent>
          <Badge
            className={cn(
              "rounded-md ring-1",
              positive && !muted ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-rose-50 text-rose-700 ring-rose-100"
            )}
          >
            {positive && !muted ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AnalyticsSection({
  title,
  description,
  insight,
  action,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  insight: string;
  action: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={shellItem} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
              <Icon className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
            </div>
          </div>
          <ActionPanel insight={insight} action={action} />
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function ActionPanel({ insight, action }: { insight: string; action: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-zinc-500" />
        <div>
          <p className="font-heading text-sm font-semibold text-zinc-950">What this means</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{insight}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-3">
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-zinc-500" />
        <div>
          <p className="font-heading text-sm font-semibold text-zinc-950">What leadership should do next</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{action}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100">
        <CardTitle className="font-heading text-lg font-semibold">{title}</CardTitle>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  );
}

function CampusHealthCard({ campus }: { campus: (typeof campuses)[number] }) {
  const needsAttention = campus.status === "Needs Attention" || campus.status === "Declining";

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-zinc-950">{campus.name}</p>
          <p className="mt-1 text-sm text-zinc-500">{campus.subgroup}</p>
        </div>
        <Badge
          className={cn(
            "rounded-md ring-1",
            needsAttention
              ? "bg-rose-50 text-rose-700 ring-rose-100"
              : "bg-emerald-50 text-emerald-700 ring-emerald-100"
          )}
        >
          {campus.status}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Eng.", `${campus.engagement}%`],
          ["Assess.", `${Math.max(52, campus.completion - 4)}%`],
          ["Inactive", campus.inactive.toString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-zinc-50 p-2">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function InsightList({ items }: { items: string[] }) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100">
        <CardTitle className="font-heading text-lg font-semibold">Human-readable insights</CardTitle>
        <p className="text-sm text-zinc-500">Plain leadership language from analytics signals.</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-zinc-100 p-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-zinc-500" />
            <p className="text-sm leading-6 text-zinc-600">{item}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: InsightRecommendation }) {
  const Icon = recommendation.icon;

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <Icon className="size-4" />
        </div>
        <Badge className={cn("rounded-md ring-1", recommendationStyles[recommendation.tone])}>
          {recommendation.tone}
        </Badge>
      </div>
      <h3 className="font-heading font-semibold text-zinc-950">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{recommendation.body}</p>
      <Button variant="outline" size="sm" className="mt-4 rounded-lg border-zinc-200 bg-white">
        {recommendation.action}
      </Button>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg">
      {label ? <p className="mb-2 font-heading font-semibold text-zinc-950">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex min-w-36 items-center justify-between gap-4">
            <span className="capitalize text-zinc-500">{item.name}</span>
            <span className="font-medium text-zinc-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function scopeLabel(scope: AnalyticsScope, profile: AuthProfile | null) {
  if (scope === "personal") return "Your personal leadership pathway";
  if (scope === "campus") return profile?.campus ?? "Campus";
  if (scope === "subgroup") return profile?.subgroup ?? "Subgroup";
  if (scope === "organization") return profile?.group ?? "Group";
  return "Harvesters Academy ecosystem";
}

function primarySignal(scope: AnalyticsScope) {
  if (scope === "personal") return "Course consistency and certificate readiness";
  if (scope === "campus") return "Campus participation and follow-up health";
  if (scope === "subgroup") return "Subgroup momentum and campus support needs";
  if (scope === "organization") return "Pipeline readiness and promotion bottlenecks";
  return "Full ecosystem growth, learning, and leadership readiness";
}

function strongestCampus(currentCampuses: typeof campuses) {
  return [...currentCampuses].sort((a, b) => b.engagement - a.engagement)[0]?.name ?? "Ilupeju Campus";
}

function weakestCampus(currentCampuses: typeof campuses) {
  return [...currentCampuses].sort((a, b) => a.engagement - b.engagement)[0]?.name ?? "Yaba Campus";
}

function buildRecommendations(
  role: AcademyRole,
  scope: AnalyticsScope,
  profile: AuthProfile | null
): InsightRecommendation[] {
  const context = scopeLabel(scope, profile);

  return [
    {
      title: "Assign mentorship support",
      body:
        role === "Leader"
          ? "Your learning rhythm suggests you are close to mentorship readiness."
          : "Assign mentorship support to inactive Cell Leaders before momentum drops further.",
      action: "Schedule mentorship",
      tone: "growth",
      icon: HeartHandshake,
    },
    {
      title: "Assessment participation is softening",
      body: `${context} needs a focused assessment nudge before the next review window closes.`,
      action: "Trigger assessment",
      tone: "care",
      icon: CircleAlert,
    },
    {
      title: "Readiness signal is strengthening",
      body: "Leadership readiness is strongest where learning completion and reflection engagement are reviewed weekly.",
      action: "Recommend pathway",
      tone: "celebration",
      icon: Award,
    },
    {
      title: "Certification completion can move faster",
      body: "Leaders above 75% completion should receive certificate encouragement and a clear final step.",
      action: "Encourage completion",
      tone: "system",
      icon: BookOpenCheck,
    },
  ];
}

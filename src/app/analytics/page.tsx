"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
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
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import {
  fetchCampusLearningAnalytics,
  fetchGroupAnalyticsDetailed,
  fetchPersonalLearningAnalytics,
  fetchPlatformAnalytics,
  fetchScopedCampusAnalytics,
  fetchSubgroupAnalytics,
  type CampusLearningAnalytics,
  type CampusSummary,
  type CourseSummary,
  type GroupAnalyticsDetailed,
  type HierarchyAnalytics,
  type PersonalLearningAnalytics,
  type PlatformAnalytics,
  type RoleCount,
  type ScopedAnalytics,
  type SubgroupSummary,
} from "@/lib/analytics";
import { getLeadershipScope } from "@/lib/scope-resolver";
import { AcademyRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type AnalyticsScope = "personal" | "campus" | "subgroup" | "organization" | "ecosystem";

type AnalyticsCourse = {
  courseId: string;
  title: string;
  category: string;
  enrollments: number;
  completions: number;
  completionRate: number;
  isRequired: boolean;
};

type AnalyticsCampus = {
  campusId: string;
  campusName: string;
  totalLeaders: number;
  enrolledLeaders: number;
  completedLeaders: number;
  certificates: number;
  completionRate: number;
  assessmentPassRate: number;
};

type AnalyticsSnapshot = {
  totalLeaders: number;
  activeLearners: number;
  totalCourses: number;
  totalEnrollments: number;
  certificates: number;
  completionRate: number;
  enrollmentRate: number;
  assessmentPassRate: number;
  followUpQueue: number;
  campuses: AnalyticsCampus[];
  courses: AnalyticsCourse[];
  roleBreakdown: RoleCount[];
  subgroups: SubgroupSummary[];
  weeklyTrend: { week: string; enrollments: number; certificates: number }[];
  sourceLabel: string;
};

const EMPTY_SNAPSHOT: AnalyticsSnapshot = {
  totalLeaders: 0,
  activeLearners: 0,
  totalCourses: 0,
  totalEnrollments: 0,
  certificates: 0,
  completionRate: 0,
  enrollmentRate: 0,
  assessmentPassRate: 0,
  followUpQueue: 0,
  campuses: [],
  courses: [],
  roleBreakdown: [],
  subgroups: [],
  weeklyTrend: [],
  sourceLabel: "No analytics source",
};

const chartGrid = "#e4e4e7";
const chartBlack = "#09090b";
const chartZinc = "#71717a";
const chartSoft = "#d4d4d8";

function scopeForRole(role: AcademyRole): AnalyticsScope {
  if (role === "Platform Super Admin" || role === "Super Admin" || role === "Admin") return "ecosystem";
  if (role === "Group Pastor" || role === "Group Admin") return "organization";
  if (role === "Subgroup Pastor" || role === "Sub-Group Pastor" || role === "Sub-group Pastor") return "subgroup";
  if (role === "Campus Pastor" || role === "Campus Admin") return "campus";
  if (
    role === "Directional Leader" ||
    role === "District Pastor / Pastoral Leader" ||
    role === "Area Leader" ||
    role === "Community Leader" ||
    role === "Zonal Leader / HOD"
  ) {
    return "campus";
  }
  return "personal";
}

function mapCourse(course: CourseSummary): AnalyticsCourse {
  return {
    courseId: course.courseId,
    title: course.title,
    category: course.category,
    enrollments: course.enrollments,
    completions: course.completions,
    completionRate: course.completionRate,
    isRequired: course.isRequired,
  };
}

function mapCampus(campus: CampusSummary): AnalyticsCampus {
  return {
    campusId: campus.campusId,
    campusName: campus.campusName,
    totalLeaders: campus.totalLeaders,
    enrolledLeaders: campus.enrolledLeaders,
    completedLeaders: campus.completedLeaders,
    certificates: campus.certificates,
    completionRate: campus.completionRate,
    assessmentPassRate: campus.assessmentPassRate,
  };
}

function fromPlatform(data: PlatformAnalytics): AnalyticsSnapshot {
  return {
    totalLeaders: data.totalLeaders,
    activeLearners: data.activatedLeaders,
    totalCourses: data.totalCourses,
    totalEnrollments: data.totalEnrollments,
    certificates: data.totalCertificates,
    completionRate: data.overallCompletionRate,
    enrollmentRate: data.enrollmentRate,
    assessmentPassRate: average(data.campusSummaries.map((campus) => campus.assessmentPassRate)),
    followUpQueue: data.campusSummaries.reduce(
      (sum, campus) => sum + Math.max(0, campus.enrolledLeaders - campus.completedLeaders),
      0
    ),
    campuses: data.campusSummaries.map(mapCampus),
    courses: data.topCourses.map(mapCourse),
    roleBreakdown: [],
    subgroups: [],
    weeklyTrend: data.weeklyTrend,
    sourceLabel: "Platform hierarchy analytics",
  };
}

function fromGroup(data: GroupAnalyticsDetailed): AnalyticsSnapshot {
  const campuses = data.subgroups.flatMap((subgroup) => subgroup.campusSummaries).map(mapCampus);
  return {
    totalLeaders: data.totalLeaders,
    activeLearners: data.enrolledLeaders,
    totalCourses: 0,
    totalEnrollments: data.enrolledLeaders,
    certificates: data.certificates,
    completionRate: data.overallCompletionRate,
    enrollmentRate: percent(data.enrolledLeaders, data.totalLeaders),
    assessmentPassRate: average(campuses.map((campus) => campus.assessmentPassRate)),
    followUpQueue: Math.max(0, data.enrolledLeaders - data.completedLeaders),
    campuses,
    courses: [],
    roleBreakdown: [],
    subgroups: data.subgroups,
    weeklyTrend: data.weeklyTrend,
    sourceLabel: "Group hierarchy analytics",
  };
}

function fromHierarchy(data: HierarchyAnalytics, label: string): AnalyticsSnapshot {
  const campuses = data.campusSummaries.map(mapCampus);
  return {
    totalLeaders: data.totalLeaders,
    activeLearners: data.enrolledLeaders,
    totalCourses: 0,
    totalEnrollments: data.enrolledLeaders,
    certificates: data.certificates,
    completionRate: data.overallCompletionRate,
    enrollmentRate: percent(data.enrolledLeaders, data.totalLeaders),
    assessmentPassRate: average(campuses.map((campus) => campus.assessmentPassRate)),
    followUpQueue: Math.max(0, data.enrolledLeaders - data.completedLeaders),
    campuses,
    courses: [],
    roleBreakdown: [],
    subgroups: [],
    weeklyTrend: data.weeklyTrend,
    sourceLabel: label,
  };
}

function fromCampus(data: CampusLearningAnalytics): AnalyticsSnapshot {
  return {
    totalLeaders: data.totalLeaders,
    activeLearners: data.enrolledLeaders,
    totalCourses: data.courseBreakdown.length,
    totalEnrollments: data.enrolledLeaders,
    certificates: data.certificates,
    completionRate: percent(data.completedLeaders, data.enrolledLeaders),
    enrollmentRate: percent(data.enrolledLeaders, data.totalLeaders),
    assessmentPassRate: data.assessmentPassRate,
    followUpQueue: data.needsFollowUp,
    campuses: [],
    courses: data.courseBreakdown.map((course) => ({
      courseId: course.courseId,
      title: course.title,
      category: course.isRequired ? "Required" : "Elective",
      enrollments: course.enrolledInCampus,
      completions: course.certificatesInCampus,
      completionRate: course.completionRate,
      isRequired: course.isRequired,
    })),
    roleBreakdown: [],
    subgroups: [],
    weeklyTrend: data.weeklyTrend,
    sourceLabel: "Campus learning analytics",
  };
}

function fromScoped(data: ScopedAnalytics): AnalyticsSnapshot {
  return {
    totalLeaders: data.totalLeaders,
    activeLearners: data.enrolledLeaders,
    totalCourses: 0,
    totalEnrollments: data.enrolledLeaders,
    certificates: data.certificates,
    completionRate: data.completionRate,
    enrollmentRate: percent(data.enrolledLeaders, data.totalLeaders),
    assessmentPassRate: data.assessmentPassRate,
    followUpQueue: data.needsFollowUp,
    campuses: [],
    courses: [],
    roleBreakdown: data.roleBreakdown,
    subgroups: [],
    weeklyTrend: data.weeklyTrend,
    sourceLabel: "Scoped campus analytics",
  };
}

function fromPersonal(data: PersonalLearningAnalytics): AnalyticsSnapshot {
  return {
    ...EMPTY_SNAPSHOT,
    totalLeaders: 1,
    activeLearners: data.enrolledCourses > 0 ? 1 : 0,
    totalCourses: data.enrolledCourses,
    totalEnrollments: data.enrolledCourses,
    certificates: data.certificates,
    completionRate: data.completionRate,
    enrollmentRate: data.enrolledCourses > 0 ? 100 : 0,
    assessmentPassRate: data.assessmentPassRate,
    followUpQueue: Math.max(0, data.enrolledCourses - data.completedCourses),
    sourceLabel: "Personal learning analytics",
  };
}

async function loadAnalyticsSnapshot(profile: AuthProfile, scope: AnalyticsScope): Promise<AnalyticsSnapshot> {
  if (scope === "ecosystem") return fromPlatform(await fetchPlatformAnalytics());
  if (scope === "organization" && profile.groupId) return fromGroup(await fetchGroupAnalyticsDetailed(profile.groupId));
  if (scope === "subgroup" && profile.subgroupId) {
    return fromHierarchy(await fetchSubgroupAnalytics(profile.subgroupId), "Subgroup hierarchy analytics");
  }
  if (scope === "campus" && profile.campusId) {
    const leadershipScope = getLeadershipScope(profile.role, profile.campusId);
    if (leadershipScope.scopeType === "campus_role_filtered") {
      return fromScoped(await fetchScopedCampusAnalytics(profile.campusId, leadershipScope.childRoles));
    }
    return fromCampus(await fetchCampusLearningAnalytics(profile.campusId));
  }
  return fromPersonal(await fetchPersonalLearningAnalytics(profile.id));
}

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function syncContext() {
      setLoading(true);
      setError(null);
      const result = await getCurrentUserProfile();
      if (!active) return;

      if (!result.profile) {
        setSnapshot(EMPTY_SNAPSHOT);
        setError("We could not find a complete profile for this analytics view.");
        setLoading(false);
        return;
      }

      const nextScope = scopeForRole(result.profile.role);
      setProfile(result.profile);

      try {
        const data = await loadAnalyticsSnapshot(result.profile, nextScope);
        if (active) setSnapshot(data);
      } catch (err) {
        if (active) {
          setSnapshot(EMPTY_SNAPSHOT);
          setError(err instanceof Error ? err.message : "We could not load analytics right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    syncContext();

    return () => {
      active = false;
    };
  }, []);

  const role = profile?.role ?? "Platform Super Admin";
  const scope = scopeForRole(role);
  const hasData =
    snapshot.totalLeaders > 0 ||
    snapshot.totalEnrollments > 0 ||
    snapshot.certificates > 0 ||
    snapshot.campuses.length > 0 ||
    snapshot.courses.length > 0 ||
    snapshot.roleBreakdown.length > 0 ||
    snapshot.subgroups.length > 0;

  const weeklyTrend = useMemo(() => normalizeWeeklyTrend(snapshot.weeklyTrend), [snapshot.weeklyTrend]);
  const campusHealthData = snapshot.campuses.map((campus) => ({
    name: shortName(campus.campusName),
    enrolled: campus.enrolledLeaders,
    completion: campus.completionRate,
    certificates: campus.certificates,
  }));
  const courseImpactData = snapshot.courses.slice(0, 6).map((course) => ({
    name: compactTitle(course.title),
    enrollments: course.enrollments,
    completion: course.completionRate,
  }));
  const roleReadinessData = snapshot.roleBreakdown.length
    ? snapshot.roleBreakdown.map((roleRow) => ({
        level: roleRow.role.replace(" / ", "/"),
        leaders: roleRow.count,
        completion: roleRow.completionRate,
      }))
    : snapshot.campuses.slice(0, 6).map((campus) => ({
        level: shortName(campus.campusName),
        leaders: campus.totalLeaders,
        completion: campus.completionRate,
      }));
  const readinessData = [
    { name: "Completed", value: snapshot.certificates },
    { name: "In progress", value: Math.max(0, snapshot.activeLearners - snapshot.certificates) },
    { name: "Not enrolled", value: Math.max(0, snapshot.totalLeaders - snapshot.activeLearners) },
  ].filter((entry) => entry.value > 0);

  return (
    <ProtectedRoute allowedRoles={["Cell Leader / Assistant HOD", "Zonal Leader / HOD", "Community Leader", "Area Leader", "District Pastor / Pastoral Leader", "Directional Leader", "Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Campus Admin", "Group Admin", "Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search analytics, campuses, pathways, leaders..." showDate={false}>
        <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Live Analytics
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Ministry leadership analytics from current academy activity
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-500">
              Enrolment, completion, certificates, hierarchy health, and communication-ready
              follow-up signals for {scopeLabel(scope, profile)}.
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
                ["Data source", snapshot.sourceLabel],
                ["Recommended posture", recommendedPosture(snapshot)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {error ? (
          <motion.div variants={shellItem} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </motion.div>
        ) : null}

        {loading ? <LoadingAnalytics /> : null}

        {!loading && !error ? (
          <>
            <motion.section variants={shellContainer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Leaders in scope" value={format(snapshot.totalLeaders)} detail="Profiles visible in this layer" icon={Users} />
              <MetricCard label="Enrolled learners" value={format(snapshot.activeLearners)} detail={`${snapshot.enrollmentRate}% enrolment rate`} icon={GraduationCap} />
              <MetricCard label="Completion" value={`${snapshot.completionRate}%`} detail={`${format(snapshot.certificates)} certificates issued`} icon={CheckCircle2} />
              <MetricCard label="Follow-up queue" value={format(snapshot.followUpQueue)} detail="Enrolled but not certified" icon={HeartHandshake} muted={snapshot.followUpQueue > 0} />
            </motion.section>

            {!hasData ? <EmptyAnalyticsState scope={scope} /> : null}

            <AnalyticsSection
              title="Engagement Intelligence"
              description="Live enrolments, certificates, participation momentum, and completion movement."
              insight={engagementInsight(snapshot)}
              action={engagementAction(snapshot)}
              icon={Activity}
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
                <ChartCard title="Weekly learning movement" subtitle="Enrolments and certificates over time">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={weeklyTrend}>
                      <CartesianGrid stroke={chartGrid} vertical={false} />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="enrollments" stroke={chartBlack} strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="certificates" stroke={chartZinc} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <InsightList
                  items={[
                    `${format(snapshot.activeLearners)} of ${format(snapshot.totalLeaders)} leaders are enrolled in learning.`,
                    `${format(snapshot.certificates)} certificate${snapshot.certificates === 1 ? "" : "s"} have been issued in this scope.`,
                    snapshot.followUpQueue > 0
                      ? `${format(snapshot.followUpQueue)} enrolled learner${snapshot.followUpQueue === 1 ? "" : "s"} still need completion follow-up.`
                      : "No completion follow-up queue is currently visible.",
                  ]}
                />
              </div>
            </AnalyticsSection>

            <AnalyticsSection
              title="Leadership Growth Analytics"
              description="Role, campus, or subgroup performance based on the data available to this leader."
              insight={growthInsight(snapshot)}
              action="Use the lowest-completion group as the next coaching focus and celebrate the strongest completion signal."
              icon={Target}
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
                <ChartCard title={snapshot.roleBreakdown.length ? "Completion by leadership tier" : "Completion by campus"} subtitle="Leaders and completion rate">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={roleReadinessData}>
                      <CartesianGrid stroke={chartGrid} vertical={false} />
                      <XAxis dataKey="level" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} interval={0} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="leaders" fill={chartSoft} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completion" fill={chartBlack} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Learning pipeline health" subtitle="Completed, in progress, and not enrolled">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={readinessData.length ? readinessData : [{ name: "No data", value: 1 }]} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={4}>
                        {(readinessData.length ? readinessData : [{ name: "No data", value: 1 }]).map((entry, index) => (
                          <Cell key={entry.name} fill={[chartBlack, chartZinc, chartSoft][index] ?? chartSoft} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </AnalyticsSection>

            <AnalyticsSection
              title="Campus Health Intelligence"
              description="Campus-level enrolment, completion, certificates, and assessment health where campus data exists."
              insight={campusInsight(snapshot)}
              action="Prioritize campuses with active enrolments but low certificate conversion."
              icon={ShieldCheck}
            >
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1fr]">
                <div className="grid gap-3 md:grid-cols-2">
                  {snapshot.campuses.slice(0, 6).map((campus) => (
                    <CampusHealthCard key={campus.campusId} campus={campus} />
                  ))}
                  {snapshot.campuses.length === 0 ? (
                    <EmptyPanel title="No campus breakdown yet" body="This scope is returning learning totals, but not campus-level rows." />
                  ) : null}
                </div>
                <ChartCard title="Campus comparison" subtitle="Enrolments, completion rate, and certificates">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={campusHealthData}>
                      <CartesianGrid stroke={chartGrid} vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="enrolled" fill={chartSoft} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completion" fill={chartBlack} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="certificates" fill={chartZinc} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </AnalyticsSection>

            <AnalyticsSection
              title="Learning Intelligence"
              description="Course enrolment and completion signals from the current analytics source."
              insight={courseInsight(snapshot)}
              action="Use low-completion courses for nudges and high-enrolment courses for leadership reinforcement."
              icon={BookOpenCheck}
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
                <ChartCard title="Course impact map" subtitle="Enrolments and completion rate">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={courseImpactData}>
                      <CartesianGrid stroke={chartGrid} vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} interval={0} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="enrollments" fill={chartSoft} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completion" fill={chartBlack} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-zinc-100">
                    <CardTitle className="font-heading text-lg font-semibold">Learning signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    {snapshot.courses.slice(0, 5).map((course) => (
                      <div key={course.courseId} className="rounded-lg border border-zinc-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-950">{course.title}</p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {format(course.enrollments)} enrolled - {format(course.completions)} completed
                            </p>
                          </div>
                          <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                            {course.completionRate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {snapshot.courses.length === 0 ? (
                      <EmptyPanel title="No course breakdown yet" body="Course-level analytics will appear once this scope has course data." />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </AnalyticsSection>

            {scope === "organization" || scope === "ecosystem" ? (
              <AnalyticsSection
                title="Organizational Intelligence"
                description="Subgroup and campus readiness for senior leadership review."
                insight={organizationInsight(snapshot)}
                action="Move attention toward subgroups with healthy enrolment but weaker completion."
                icon={Network}
              >
                <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-zinc-100">
                    <CardTitle className="font-heading text-lg font-semibold">Subgroup comparison</CardTitle>
                    <p className="text-sm text-zinc-500">Leaders, enrolled leaders, and completion rate</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={snapshot.subgroups.map((subgroup) => ({
                        name: shortName(subgroup.subgroupName),
                        leaders: subgroup.totalLeaders,
                        enrolled: subgroup.enrolledLeaders,
                        completion: subgroup.completionRate,
                      }))}>
                        <CartesianGrid stroke={chartGrid} vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke={chartZinc} fontSize={12} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="leaders" fill={chartSoft} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="enrolled" fill={chartZinc} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="completion" fill={chartBlack} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
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
                      <CardTitle className="font-heading text-lg font-semibold">Insight recommendations</CardTitle>
                      <p className="text-sm text-zinc-500">Generated from the current analytics snapshot.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
                  {buildRecommendations(snapshot).map((recommendation) => (
                    <RecommendationCard key={recommendation.title} recommendation={recommendation} />
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-zinc-200 bg-[#080808] text-white shadow-sm">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="font-heading text-lg font-semibold">What leadership should do next</CardTitle>
                  <p className="text-sm text-zinc-400">A focused action queue from real learning signals.</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  {nextActions(snapshot).map((action, index) => (
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
          </>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  muted = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  muted?: boolean;
}) {
  return (
    <motion.div variants={shellItem} whileHover={{ y: -3 }}>
      <Card className={cn("rounded-xl border-zinc-200 bg-white shadow-sm", muted && "border-amber-100 bg-amber-50")}>
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
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-zinc-500" />
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

function CampusHealthCard({ campus }: { campus: AnalyticsCampus }) {
  const needsAttention = campus.enrolledLeaders > 0 && campus.completionRate < 40;

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-zinc-950">{campus.campusName}</p>
          <p className="mt-1 text-sm text-zinc-500">{format(campus.totalLeaders)} leaders</p>
        </div>
        <Badge
          className={cn(
            "rounded-md ring-1",
            needsAttention
              ? "bg-rose-50 text-rose-700 ring-rose-100"
              : "bg-emerald-50 text-emerald-700 ring-emerald-100"
          )}
        >
          {needsAttention ? "Needs focus" : "Healthy"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Enrolled", format(campus.enrolledLeaders)],
          ["Complete", `${campus.completionRate}%`],
          ["Certs", format(campus.certificates)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-zinc-50 p-2">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
          </div>
        ))}
      </div>
      <Progress value={campus.completionRate} className="mt-4 h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
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

type Recommendation = {
  title: string;
  body: string;
  icon: LucideIcon;
};

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const Icon = recommendation.icon;

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-100 p-4">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
        <Icon className="size-4" />
      </div>
      <h3 className="font-heading font-semibold text-zinc-950">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{recommendation.body}</p>
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

function LoadingAnalytics() {
  return (
    <motion.section variants={shellContainer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <motion.div key={item} variants={shellItem}>
          <Card className="animate-pulse rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <div className="h-3 w-24 rounded bg-zinc-100" />
              <div className="mt-4 h-9 w-20 rounded bg-zinc-200" />
            </CardHeader>
            <CardContent>
              <div className="h-3 w-full rounded bg-zinc-100" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

function EmptyAnalyticsState({ scope }: { scope: AnalyticsScope }) {
  return (
    <motion.div variants={shellItem} className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-600">
      No {scope} analytics are available yet. Once leaders enroll, complete lessons, earn certificates, or generate hierarchy activity, this page will populate automatically.
    </motion.div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4">
      <p className="font-medium text-zinc-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{body}</p>
    </div>
  );
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function average(values: number[]) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return 0;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function format(value: number) {
  return value.toLocaleString();
}

function shortName(value: string) {
  return value.replace(/\s+Campus$/i, "").replace(/\s+Subgroup$/i, "");
}

function compactTitle(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length > 3 ? `${words.slice(0, 3).join(" ")}...` : value;
}

function normalizeWeeklyTrend(trend: AnalyticsSnapshot["weeklyTrend"]) {
  if (trend.length > 0) return trend;
  return [
    { week: "W-5", enrollments: 0, certificates: 0 },
    { week: "W-4", enrollments: 0, certificates: 0 },
    { week: "W-3", enrollments: 0, certificates: 0 },
    { week: "W-2", enrollments: 0, certificates: 0 },
    { week: "W-1", enrollments: 0, certificates: 0 },
    { week: "Now", enrollments: 0, certificates: 0 },
  ];
}

function scopeLabel(scope: AnalyticsScope, profile: AuthProfile | null) {
  if (scope === "personal") return "your personal learning pathway";
  if (scope === "campus") return profile?.campus || "your campus";
  if (scope === "subgroup") return profile?.subgroup || "your subgroup";
  if (scope === "organization") return profile?.group || "your group";
  return "the Harvesters Academy ecosystem";
}

function recommendedPosture(snapshot: AnalyticsSnapshot) {
  if (snapshot.followUpQueue > 0) return "Follow up with learners who started but have not certified";
  if (snapshot.enrollmentRate < 50) return "Drive enrolment into active learning pathways";
  if (snapshot.completionRate >= 70) return "Celebrate progress and prepare next-step development";
  return "Review learning momentum and remove completion blockers";
}

function engagementInsight(snapshot: AnalyticsSnapshot) {
  if (snapshot.totalLeaders === 0) return "No leaders are currently visible in this analytics scope.";
  return `${snapshot.enrollmentRate}% of leaders in this scope are enrolled, with ${snapshot.completionRate}% completion among the active learning base.`;
}

function engagementAction(snapshot: AnalyticsSnapshot) {
  if (snapshot.activeLearners === 0) return "Start with enrolment nudges so leaders enter at least one course.";
  if (snapshot.followUpQueue > 0) return "Send completion nudges to learners who are enrolled but not yet certified.";
  return "Maintain weekly encouragement and move certified leaders toward their next pathway.";
}

function growthInsight(snapshot: AnalyticsSnapshot) {
  const rows = snapshot.roleBreakdown.length
    ? snapshot.roleBreakdown.map((row) => ({ name: row.role, completion: row.completionRate }))
    : snapshot.campuses.map((campus) => ({ name: campus.campusName, completion: campus.completionRate }));
  if (rows.length === 0) return "No role or campus breakdown is currently available for this scope.";
  const best = [...rows].sort((a, b) => b.completion - a.completion)[0];
  const weakest = [...rows].sort((a, b) => a.completion - b.completion)[0];
  return `${best.name} is strongest at ${best.completion}% completion; ${weakest.name} needs the next coaching focus at ${weakest.completion}%.`;
}

function campusInsight(snapshot: AnalyticsSnapshot) {
  if (snapshot.campuses.length === 0) return "This scope does not currently expose campus rows.";
  const enrolledCampuses = snapshot.campuses.filter((campus) => campus.enrolledLeaders > 0);
  if (enrolledCampuses.length === 0) return "Campuses are visible, but enrolment has not started yet.";
  const weakest = [...enrolledCampuses].sort((a, b) => a.completionRate - b.completionRate)[0];
  return `${weakest.campusName} has ${weakest.enrolledLeaders} enrolled and ${weakest.completionRate}% completion, making it the clearest follow-up target.`;
}

function courseInsight(snapshot: AnalyticsSnapshot) {
  if (snapshot.courses.length === 0) return "No course-level analytics are available for this scope yet.";
  const top = [...snapshot.courses].sort((a, b) => b.enrollments - a.enrollments)[0];
  return `${top.title} has the strongest enrolment signal with ${format(top.enrollments)} learner${top.enrollments === 1 ? "" : "s"}.`;
}

function organizationInsight(snapshot: AnalyticsSnapshot) {
  if (snapshot.subgroups.length === 0) return "Subgroup analytics are not available for this scope yet.";
  const strongest = [...snapshot.subgroups].sort((a, b) => b.completionRate - a.completionRate)[0];
  return `${strongest.subgroupName} currently leads subgroup completion at ${strongest.completionRate}%.`;
}

function buildRecommendations(snapshot: AnalyticsSnapshot): Recommendation[] {
  return [
    {
      title: snapshot.followUpQueue > 0 ? "Completion follow-up is needed" : "Completion queue is clear",
      body:
        snapshot.followUpQueue > 0
          ? `${format(snapshot.followUpQueue)} enrolled learner${snapshot.followUpQueue === 1 ? "" : "s"} have not yet reached certification.`
          : "There is no visible learner completion backlog in this scope.",
      icon: HeartHandshake,
    },
    {
      title: "Enrolment coverage",
      body: `${snapshot.enrollmentRate}% of visible leaders are currently enrolled in at least one learning pathway.`,
      icon: GraduationCap,
    },
    {
      title: "Assessment signal",
      body:
        snapshot.assessmentPassRate > 0
          ? `Assessment pass rate is currently ${snapshot.assessmentPassRate}%.`
          : "Assessment pass-rate data will appear once attempts are recorded.",
      icon: Award,
    },
    {
      title: "Leadership readiness",
      body:
        snapshot.completionRate >= 70
          ? "Completion is strong enough to begin next-step development conversations."
          : "Completion is still developing; weekly encouragement should stay active.",
      icon: Target,
    },
  ];
}

function nextActions(snapshot: AnalyticsSnapshot) {
  return [
    snapshot.followUpQueue > 0
      ? `Send nudges to ${format(snapshot.followUpQueue)} enrolled learner${snapshot.followUpQueue === 1 ? "" : "s"} without certificates.`
      : "Keep certificate encouragement visible for newly enrolled learners.",
    snapshot.enrollmentRate < 50
      ? "Increase course enrolment reminders across the current scope."
      : "Protect the current enrolment rhythm with weekly leader check-ins.",
    snapshot.courses.length > 0
      ? "Review low-completion courses and add support where learners slow down."
      : "Publish or assign courses so course-level intelligence can populate.",
    snapshot.campuses.length > 0
      ? "Compare campuses by completion and prioritize the weakest active campus."
      : "Use role-level or personal learning signals until campus rows are available.",
  ];
}

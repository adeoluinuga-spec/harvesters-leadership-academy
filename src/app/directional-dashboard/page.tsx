"use client";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/hooks/use-hierarchy";

const heroStats = [
  { label: "Total groups", value: "6" },
  { label: "Total leaders", value: "5,240" },
  { label: "Active campuses", value: "31" },
  { label: "Engagement rate", value: "83%" },
];

const kpis = [
  { label: "Total Leaders", value: "5,240", detail: "Across district", delta: "+7.4%", icon: Users },
  { label: "Active Campuses", value: "31", detail: "24 thriving or stable", delta: "+3", icon: Building2 },
  { label: "Enrolled Leaders", value: "4,199", detail: "Current academy cohort", delta: "80.1%", icon: GraduationCap },
  { label: "Completion Rate", value: "76%", detail: "Quarterly average", delta: "+5.1%", icon: CheckCircle2 },
  { label: "Certificates Issued", value: "1,427", detail: "Verified completions", delta: "+183", icon: Award },
  { label: "Needs Attention", value: "284", detail: "Require follow-up", delta: "-9%", icon: AlertCircle },
];

const groups = [
  { name: "Group Alpha", pastor: "Pastor Femi Adeyemi", campuses: 13, leaders: 2497, completion: 80, engagement: 87, certificates: 684 },
  { name: "Group Bethel", pastor: "Pastor Kola Okonkwo", campuses: 8, leaders: 1504, completion: 72, engagement: 79, certificates: 412 },
  { name: "Group Covenant", pastor: "Pastor Ruth Nwosu", campuses: 6, leaders: 843, completion: 68, engagement: 74, certificates: 228 },
  { name: "Group Daystar", pastor: "Pastor Emeka Eze", campuses: 4, leaders: 396, completion: 65, engagement: 70, certificates: 103 },
];

const districtInsights = [
  { title: "Group Alpha leads district with 87% engagement — sustained for 3 consecutive quarters.", tone: "positive", icon: TrendingUp },
  { title: "Group Daystar participation is trending down — pastoral review recommended.", tone: "warning", icon: TrendingDown },
  { title: "31 leaders are eligible for a promotion review across the district.", tone: "positive", icon: UserCheck },
  { title: "Abeokuta and Oluyole campuses require urgent follow-up intervention.", tone: "attention", icon: AlertCircle },
];

const activityFeed = [
  { title: "Course completions", body: "214 leaders completed Culture, Teams and Stewardship this week", time: "18 min ago" },
  { title: "New enrollments", body: "Group Alpha onboarded 48 new leaders into Executive Ministry Leadership", time: "1 hr ago" },
  { title: "District milestone", body: "District crossed 1,400 certificates issued this quarter", time: "3 hrs ago" },
  { title: "Cohort review", body: "Group Bethel quarterly review submitted — 72% completion logged", time: "6 hrs ago" },
];

const leadersNeedingAttention = [
  { name: "Tomi Adebayo", location: "Group Alpha · Abeokuta Campus", issue: "Inactive for 21 days", action: "Assign pastoral follow-up" },
  { name: "Nkechi Eze", location: "Group Bethel · Port Harcourt", issue: "Low lesson completion", action: "Recommend coaching pathway" },
  { name: "David Okafor", location: "Group Covenant · Oluyole", issue: "Not enrolled", action: "Send cohort invitation" },
  { name: "Bisi Lawal", location: "Group Daystar · Apapa Campus", issue: "Low engagement score", action: "Review ministry workload" },
];

function statusClasses(completion: number) {
  if (completion >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (completion >= 70) return "bg-zinc-100 text-zinc-700 border-zinc-200";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function Hero({ firstName }: { firstName: string }) {
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
            Welcome back, {firstName}. Your personal growth continues alongside strategic oversight across all groups and campuses in your district.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {heroStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
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

function KpiGrid() {
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
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-500">{kpi.detail}</p>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                  {kpi.delta}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.section>
  );
}

function GroupsPerformance() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Group performance
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Ministry health across all groups in your district
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {groups.map((group) => (
            <div key={group.name} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-zinc-950">{group.name}</p>
                    <p className="text-sm text-zinc-500">{group.pastor}</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 lg:min-w-[680px]">
                  {[
                    ["Campuses", group.campuses],
                    ["Leaders", group.leaders.toLocaleString()],
                    ["Completion", `${group.completion}%`],
                    ["Engagement", `${group.engagement}%`],
                    ["Certificates", group.certificates.toLocaleString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                    </div>
                  ))}
                </div>
                <Badge className={cn("rounded-md border hover:bg-inherit shrink-0", statusClasses(group.completion))}>
                  {group.completion >= 80 ? "Thriving" : group.completion >= 70 ? "Stable" : "Needs Attention"}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>Completion progress</span>
                  <span className="font-semibold text-zinc-950">{group.completion}%</span>
                </div>
                <Progress
                  value={group.completion}
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

function InsightsAndActivity() {
  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">District insights</CardTitle>
          <p className="text-sm text-zinc-400">Strategic signals across your groups and campuses</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {districtInsights.map((insight) => (
            <div key={insight.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/10">
                <insight.icon className="size-4" />
              </div>
              <p className="font-heading text-sm font-semibold leading-6">{insight.title}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Activity feed
          </CardTitle>
          <p className="text-sm text-zinc-500">Recent district leadership moments</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {activityFeed.map((activity) => (
            <div key={activity.title} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-zinc-950">{activity.title}</p>
                <span className="text-xs text-zinc-400">{activity.time}</span>
              </div>
              <p className="text-sm leading-6 text-zinc-500">{activity.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function LeadersAttention() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Leaders needing attention
          </CardTitle>
          <p className="text-sm text-zinc-500">Intelligent monitoring and suggested next actions</p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
          {leadersNeedingAttention.map((leader) => (
            <div key={leader.name} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-zinc-950 text-xs font-semibold text-white">
                    {leader.name.split(" ").map((p) => p[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-950">{leader.name}</p>
                  <p className="text-sm text-zinc-500">{leader.location}</p>
                  <p className="mt-3 text-sm text-zinc-700">{leader.issue}</p>
                  <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    Suggested action: {leader.action}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function DirectionalDashboardPage() {
  const hierarchy = useHierarchy();
  const firstName = hierarchy.firstName || "Leader";

  return (
    <ProtectedRoute allowedRoles={["Directional Leader", "District Pastor / Pastoral Leader", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search groups, campuses, leaders..." showDate>
        <Hero firstName={firstName} />
        <PersonalLearningLayer role={(hierarchy.role || "Directional Leader") as import("@/lib/mock-auth").MockRole} />
        <OversightLayerIntro
          title="District oversight intelligence"
          description="Role-aware intelligence across all groups, campuses, and leadership pipelines in your district."
          modules={[
            "District ministry intelligence",
            "Group analytics",
            "Leadership pipeline visibility",
            "Campus health signals",
          ]}
        />
        <KpiGrid />
        <GroupsPerformance />
        <InsightsAndActivity />
        <LeadersAttention />
      </DashboardShell>
    </ProtectedRoute>
  );
}

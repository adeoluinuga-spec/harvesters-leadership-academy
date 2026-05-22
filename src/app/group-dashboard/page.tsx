"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
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
  { label: "Total campuses", value: "13" },
  { label: "Total leaders", value: "2,497" },
  { label: "Subgroups", value: "4" },
  { label: "Engagement rate", value: "87%" },
];

const kpis = [
  { label: "Total Leaders", value: "2,497", detail: "Across Group Alpha", delta: "+8.2%", icon: Users },
  { label: "Active Campuses", value: "13", detail: "10 thriving or stable", delta: "+2", icon: Building2 },
  { label: "Enrolled Leaders", value: "2,118", detail: "Current academy cohort", delta: "84.8%", icon: GraduationCap },
  { label: "Completion Rate", value: "79%", detail: "Quarterly average", delta: "+6.4%", icon: CheckCircle2 },
  { label: "Certificates Issued", value: "684", detail: "Verified completions", delta: "+92", icon: Award },
  { label: "Needs Attention", value: "126", detail: "Require follow-up", delta: "-14%", icon: AlertCircle },
];

const subgroups = [
  {
    name: "Gbagada Subgroup",
    pastor: "Pastor Smart",
    campuses: 1,
    leaders: 176,
    completion: 64,
    engagement: 69,
    certificates: 48,
    campusList: [
      { name: "Ikorodu Campus", health: "Needs Attention", progress: 64, participation: "Moderate", inactive: 28 },
    ],
  },
  {
    name: "Magodo Subgroup",
    pastor: "Pastor Gbenga Agboola",
    campuses: 4,
    leaders: 780,
    completion: 80,
    engagement: 84,
    certificates: 231,
    campusList: [
      { name: "Magodo Campus", health: "Thriving", progress: 88, participation: "Very high", inactive: 7 },
      { name: "Ilupeju Campus", health: "Thriving", progress: 84, participation: "High", inactive: 9 },
      { name: "New Lagos Campus", health: "Stable", progress: 76, participation: "Moderate", inactive: 14 },
      { name: "Ogba Campus", health: "Stable", progress: 72, participation: "Moderate", inactive: 16 },
    ],
  },
  {
    name: "Jericho Subgroup",
    pastor: "Pastor Lanre Ajala",
    campuses: 5,
    leaders: 901,
    completion: 75,
    engagement: 78,
    certificates: 260,
    campusList: [
      { name: "Jericho Campus", health: "Thriving", progress: 86, participation: "High", inactive: 8 },
      { name: "Akobo Campus", health: "Stable", progress: 75, participation: "Moderate", inactive: 13 },
      { name: "Port Harcourt Campus", health: "Thriving", progress: 89, participation: "Very high", inactive: 6 },
      { name: "Oluyole Campus", health: "Needs Attention", progress: 62, participation: "Low", inactive: 21 },
      { name: "Abeokuta Campus", health: "Needs Attention", progress: 59, participation: "Low", inactive: 24 },
    ],
  },
  {
    name: "Yaba Subgroup",
    pastor: "Pastor Olumide Aikulola",
    campuses: 3,
    leaders: 580,
    completion: 75,
    engagement: 78,
    certificates: 145,
    campusList: [
      { name: "Yaba Campus", health: "Thriving", progress: 87, participation: "High", inactive: 7 },
      { name: "Surulere Campus", health: "Needs Attention", progress: 68, participation: "Low", inactive: 25 },
      { name: "Apapa Campus", health: "Stable", progress: 70, participation: "Moderate", inactive: 18 },
    ],
  },
];

const campusHealth = [
  { campus: "Magodo Campus", status: "Thriving", signal: "+18% engagement growth", score: 88 },
  { campus: "Ilupeju Campus", status: "Thriving", signal: "Strong participation rhythm", score: 84 },
  { campus: "Oluyole Campus", status: "Needs Attention", signal: "21 inactive leaders", score: 62 },
  { campus: "Abeokuta Campus", status: "Declining Participation", signal: "-9% weekly activity", score: 59 },
];

const leadersNeedingAttention = [
  {
    name: "Tomi Adebayo",
    location: "Campus · Subgroup A",
    issue: "Inactive for 21 days",
    action: "Assign pastoral follow-up",
  },
  {
    name: "Nkechi Eze",
    location: "Campus · Subgroup B",
    issue: "Low lesson completion",
    action: "Recommend coaching pathway",
  },
  {
    name: "David Okafor",
    location: "Campus · Subgroup C",
    issue: "Not enrolled",
    action: "Send cohort invitation",
  },
  {
    name: "Bisi Lawal",
    location: "Campus · Subgroup A",
    issue: "Low engagement score",
    action: "Review ministry workload",
  },
];

const insights = [
  { title: "Top campus engagement growth is up 18% this period.", tone: "positive", icon: TrendingUp },
  { title: "One subgroup participation dropped 8% — review recommended.", tone: "warning", icon: TrendingDown },
  { title: "12 leaders are eligible for a promotion review.", tone: "positive", icon: UserCheck },
  { title: "Follow-up action required across two campuses.", tone: "attention", icon: AlertCircle },
];

const activityFeed = [
  { title: "Course completion", body: "36 leaders completed Culture, Teams and Stewardship", time: "12 min ago" },
  { title: "New enrollments", body: "48 leaders enrolled into Executive Ministry Leadership this week", time: "42 min ago" },
  { title: "Certificates issued", body: "Subgroup crossed 231 certificates this quarter", time: "2 hrs ago" },
  { title: "Milestone", body: "Campus reached 88% academy participation in the current cohort", time: "4 hrs ago" },
];

function statusClasses(status: string) {
  if (status === "Thriving") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "Stable") return "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (status === "Needs Attention") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
}

function Hero({ groupName }: { groupName: string }) {
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

function KpiGrid({ groupName }: { groupName: string }) {
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
                <p className="text-sm text-zinc-500">
                  {kpi.detail === "Across Group Alpha" ? `Across ${groupName}` : kpi.detail}
                </p>
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

function SubgroupPerformance() {
  const [expanded, setExpanded] = useState("Magodo Subgroup");

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Subgroup performance
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Multi-campus leadership health by subgroup pastor
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {subgroups.map((subgroup) => {
            const isOpen = expanded === subgroup.name;

            return (
              <div key={subgroup.name} className="rounded-lg border border-zinc-100 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? "" : subgroup.name)}
                  className="flex w-full flex-col gap-4 p-4 text-left lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <p className="font-heading font-semibold text-zinc-950">{subgroup.name}</p>
                        <p className="text-sm text-zinc-500">{subgroup.pastor}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-5 lg:min-w-[720px]">
                    {[
                      ["Campuses", subgroup.campuses],
                      ["Leaders", subgroup.leaders.toLocaleString()],
                      ["Completion", `${subgroup.completion}%`],
                      ["Engagement", `${subgroup.engagement}%`],
                      ["Certificates", subgroup.certificates],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <ChevronDown className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-3 border-t border-zinc-100 p-4 lg:grid-cols-3">
                        {subgroup.campusList.map((campus) => (
                          <div key={campus.name} className="rounded-lg border border-zinc-100 p-4">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-zinc-950">{campus.name}</p>
                                <p className="mt-1 text-sm text-zinc-500">
                                  {campus.participation} participation
                                </p>
                              </div>
                              <Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(campus.health))}>
                                {campus.health}
                              </Badge>
                            </div>
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-zinc-500">Campus progress</span>
                              <span className="font-semibold text-zinc-950">{campus.progress}%</span>
                            </div>
                            <Progress
                              value={campus.progress}
                              className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                            />
                            <p className="mt-3 text-xs text-zinc-500">
                              {campus.inactive} inactive leaders require attention
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function CampusHealthAndInsights({ groupName }: { groupName: string }) {
  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Campus health intelligence
          </CardTitle>
          <p className="text-sm text-zinc-500">Participation, completion, and follow-up signals</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {campusHealth.map((campus) => (
            <div key={campus.campus} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950">{campus.campus}</p>
                  <p className="text-sm text-zinc-500">{campus.signal}</p>
                </div>
                <Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(campus.status))}>
                  {campus.status}
                </Badge>
              </div>
              <Progress
                value={campus.score}
                className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
            </div>
          ))}
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

function LeadersAndActivity() {
  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
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
                    {leader.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-950">{leader.name}</p>
                      <p className="text-sm text-zinc-500">{leader.location}</p>
                    </div>
                    <CircleDot className="size-4 shrink-0 text-amber-500" />
                  </div>
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

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Activity feed
          </CardTitle>
          <p className="text-sm text-zinc-500">Recent leadership growth moments</p>
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

export default function GroupDashboardPage() {
  const hierarchy = useHierarchy();
  const groupName = hierarchy.groupName || "…";

  return (
    <ProtectedRoute allowedRoles={["Group Pastor", "Directional Leader", "District Pastor / Pastoral Leader", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search subgroups, campuses, leaders..." showDate>
        <Hero groupName={groupName} />
        <PersonalLearningLayer role={(hierarchy.role || "Group Pastor") as import("@/lib/mock-auth").MockRole} />
        <OversightLayerIntro
          title="Group oversight intelligence"
          description={`Role-aware intelligence for ${groupName} ministry health, subgroup analytics, leadership pipeline visibility, and campus growth signals.`}
          modules={[
            "Strategic ministry intelligence",
            "Subgroup analytics",
            "Leadership pipeline visibility",
            "Campus growth intelligence",
          ]}
        />
        <KpiGrid groupName={groupName} />
        <SubgroupPerformance />
        <CampusHealthAndInsights groupName={groupName} />
        <LeadersAndActivity />
      </DashboardShell>
    </ProtectedRoute>
  );
}

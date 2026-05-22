"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Award,
  BookOpenCheck,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  LineChart,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  DashboardShell,
  shellContainer,
  shellItem,
} from "@/components/layout/dashboard-shell";
import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";

const kpis = [
  {
    label: "Total Leaders",
    value: "12,840",
    delta: "+12.4%",
    detail: "Across 34 ministry centers",
    icon: Users,
    sparkline: [34, 45, 40, 58, 52, 66, 73],
  },
  {
    label: "Active Courses",
    value: "48",
    delta: "+6 new",
    detail: "Leadership tracks live",
    icon: BookOpenCheck,
    sparkline: [28, 34, 33, 42, 44, 47, 48],
  },
  {
    label: "Completion Rate",
    value: "84%",
    delta: "+9.1%",
    detail: "Quarterly cohort average",
    icon: CircleCheck,
    sparkline: [54, 58, 62, 61, 70, 79, 84],
  },
  {
    label: "Certificates Issued",
    value: "3,921",
    delta: "+318",
    detail: "Verified this quarter",
    icon: ShieldCheck,
    sparkline: [31, 38, 44, 43, 55, 61, 69],
  },
];

const ministryGroups = [
  { name: "Campus Pastors", leaders: 324, completion: 92, engagement: "Very high" },
  { name: "Service Directors", leaders: 812, completion: 86, engagement: "High" },
  { name: "Small Group Leads", leaders: 2104, completion: 78, engagement: "Rising" },
  { name: "Volunteer Coordinators", leaders: 679, completion: 81, engagement: "Strong" },
];

const activityFeed = [
  {
    title: "Certificate earned",
    description: "12 leaders completed Ministry Culture Essentials",
    time: "8 min ago",
    icon: Award,
  },
  {
    title: "Assessment submitted",
    description: "Campus Pastors cohort submitted Q2 leadership review",
    time: "24 min ago",
    icon: ClipboardCheck,
  },
  {
    title: "New enrollments",
    description: "86 leaders joined Discipleship Systems",
    time: "1 hr ago",
    icon: Users,
  },
  {
    title: "Course completion",
    description: "Prayer Team Leads reached 94% completion",
    time: "2 hrs ago",
    icon: CircleCheck,
  },
];

const engagementMetrics = [
  { label: "Weekly learning hours", value: "18,420", change: "+14%" },
  { label: "Assessment pass rate", value: "91%", change: "+5%" },
  { label: "Avg. lesson rating", value: "4.8", change: "+0.3" },
];

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
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

function DashboardHero() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const result = await getCurrentUserProfile();
      if (active && result.profile) {
        setProfile(result.profile);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const firstName = profile?.fullName?.split(" ").filter(Boolean)[0] ?? "Leader";

  return (
    <motion.section
      variants={shellItem}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Super admin learning and oversight
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Your own leadership learning stays connected to academy-wide stewardship, governance, and learning quality.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10 rounded-lg bg-black px-4 text-white hover:bg-zinc-800">
            <Plus className="size-4" />
            New course
          </Button>
          <Button variant="outline" className="h-10 rounded-lg border-zinc-200 bg-white px-4">
            View reports
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

function KpiCards() {
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

function AnalyticsSection() {
  return (
    <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Group performance
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Completion velocity by leadership segment
              </p>
            </div>
            <LineChart className="size-5 text-zinc-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          {ministryGroups.map((group) => (
            <div key={group.name} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950">{group.name}</p>
                  <p className="text-sm text-zinc-500">{group.leaders.toLocaleString()} leaders</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl font-semibold tracking-tight text-zinc-950">
                    {group.completion}%
                  </p>
                  <p className="text-xs text-zinc-500">{group.engagement} engagement</p>
                </div>
              </div>
              <Progress
                value={group.completion}
                className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Engagement metrics</CardTitle>
          <p className="text-sm text-zinc-400">Learning signals from the last 7 days</p>
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
              </div>
              <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                {metric.change}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function ActivityFeed() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Recent activity
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Live learning moments across the academy
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg border-zinc-200 bg-white">
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-4">
          {activityFeed.map((activity) => (
            <div key={activity.title} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <activity.icon className="size-4" />
                </div>
                <span className="text-xs text-zinc-400">{activity.time}</span>
              </div>
              <p className="font-medium text-zinc-950">{activity.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{activity.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
      <DashboardShell>
        <DashboardHero />
        <PersonalLearningLayer role="Super Admin" />
        <OversightLayerIntro
          title="Academy oversight intelligence"
          description="Role-aware intelligence for academy learning quality, user participation, certification velocity, and network engagement."
          modules={[
            "Academy learning quality",
            "Learner participation",
            "Course governance",
            "Certification velocity",
            "Network engagement",
          ]}
        />
        <KpiCards />
        <AnalyticsSection />
        <ActivityFeed />
      </DashboardShell>
    </ProtectedRoute>
  );
}

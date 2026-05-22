"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpenCheck,
  Building2,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Cpu,
  GraduationCap,
  LineChart,
  Plus,
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
    label: "Total Organizations",
    value: "12",
    delta: "+3 pilots",
    detail: "Tenant environments provisioned",
    icon: Building2,
    sparkline: [4, 5, 6, 7, 8, 10, 12],
  },
  {
    label: "Total Leaders",
    value: "12,840",
    delta: "+12.4%",
    detail: "Across active organizations",
    icon: Users,
    sparkline: [34, 45, 40, 58, 52, 66, 73],
  },
  {
    label: "Global Courses",
    value: "48",
    delta: "+6 new",
    detail: "Shared architecture tracks",
    icon: BookOpenCheck,
    sparkline: [28, 34, 33, 42, 44, 47, 48],
  },
  {
    label: "AI Systems",
    value: "7",
    delta: "healthy",
    detail: "Course, analytics, and insight engines",
    icon: Cpu,
    sparkline: [3, 3, 4, 5, 5, 6, 7],
  },
];

const tenantPortfolio = [
  { name: "Harvesters International Christian Centre", leaders: 12840, completion: 84, engagement: "Very high" },
  { name: "Pilot Ministry Network", leaders: 1480, completion: 72, engagement: "Rising" },
  { name: "Leadership Residency Cloud", leaders: 920, completion: 79, engagement: "Strong" },
  { name: "White-label Sandbox", leaders: 240, completion: 61, engagement: "Provisioning" },
];

const activityFeed = [
  {
    title: "Certificate earned",
    description: "12 leaders completed Ministry Culture Essentials across tenant environments",
    time: "8 min ago",
    icon: Award,
  },
  {
    title: "Assessment submitted",
    description: "Harvesters submitted Q2 leadership review",
    time: "24 min ago",
    icon: ClipboardCheck,
  },
  {
    title: "New enrollments",
    description: "86 leaders joined Discipleship Systems across active organizations",
    time: "1 hr ago",
    icon: Users,
  },
  {
    title: "Course completion",
    description: "Global Prayer Team Leads track reached 94% completion",
    time: "2 hrs ago",
    icon: CircleCheck,
  },
];

const engagementMetrics = [
  { label: "Tenant learning hours", value: "18,420", change: "+14%" },
  { label: "Platform pass rate", value: "91%", change: "+5%" },
  { label: "AI quality score", value: "4.8", change: "+0.3" },
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
  const router = useRouter();
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
            Platform Super Admin
          </Badge>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Platform Governance Command Center
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Welcome back, {firstName}. Oversee organizations, tenant provisioning, AI systems, white-label readiness, and global course architecture from one executive layer.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10 rounded-lg bg-black px-4 text-white hover:bg-zinc-800">
            <Plus className="size-4" />
            Provision tenant
          </Button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/courses/new")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <GraduationCap className="size-4" />
            New course
          </button>
          <Button variant="outline" className="h-10 rounded-lg border-zinc-200 bg-white px-4">
            Platform reports
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
                Organization portfolio
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Tenant health, leaders, and adoption across the LMS ecosystem
              </p>
            </div>
            <LineChart className="size-5 text-zinc-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          {tenantPortfolio.map((tenant) => (
            <div key={tenant.name} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950">{tenant.name}</p>
                  <p className="text-sm text-zinc-500">{tenant.leaders.toLocaleString()} leaders</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl font-semibold tracking-tight text-zinc-950">
                    {tenant.completion}%
                  </p>
                  <p className="text-xs text-zinc-500">{tenant.engagement} engagement</p>
                </div>
              </div>
              <Progress
                value={tenant.completion}
                className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Platform intelligence</CardTitle>
          <p className="text-sm text-zinc-400">System-wide signals from the last 7 days</p>
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
                Live platform governance moments across tenants
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

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin"]}>
      <DashboardShell>
        <DashboardHero />
        <PersonalLearningLayer role="Platform Super Admin" />
        <OversightLayerIntro
          title="Platform ecosystem intelligence"
          description="Platform-wide intelligence for organizations, tenant provisioning, white-label readiness, AI systems, global course architecture, and system health."
          modules={[
            "Organization management",
            "Tenant provisioning",
            "White-label readiness",
            "AI ecosystem oversight",
            "Global course architecture",
          ]}
        />
        <KpiCards />
        <AnalyticsSection />
        <ActivityFeed />
      </DashboardShell>
    </ProtectedRoute>
  );
}

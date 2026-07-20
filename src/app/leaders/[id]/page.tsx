"use client";

import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  LineChart,
  Mail,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { IntelligencePanel } from "@/components/hierarchy/hierarchy-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type LeaderProfilePageProps = {
  params: Promise<{ id: string }>;
};

type HierarchyUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  campusName: string | null;
  subgroupName: string | null;
  groupName: string | null;
  onboardingCompleted: boolean;
  isActive: boolean;
  enrolledCourses: number;
  certificates: number;
  assessmentAttempts: number;
  joinedAt: string;
};

const profileMetricIcons = {
  engagement: LineChart,
  completion: BookOpenCheck,
  certificates: Award,
  coursesDone: UserCheck,
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "L";
}

function formatDate(value: string) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function completionRate(leader: HierarchyUser) {
  return leader.enrolledCourses > 0
    ? Math.round((leader.certificates / leader.enrolledCourses) * 100)
    : 0;
}

export default function LeaderProfilePage({ params }: LeaderProfilePageProps) {
  const { id } = use(params);
  const [leader, setLeader] = useState<HierarchyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLeader() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/hierarchy/users?limit=100");
        if (!response.ok) throw new Error("Unable to load leader profile.");
        const json = (await response.json()) as { users?: HierarchyUser[] };
        const match = (json.users ?? []).find((user) => user.id === id) ?? null;
        if (!active) return;
        setLeader(match);
        if (!match) setError("This leader is not visible in your current hierarchy scope.");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load leader profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLeader();

    return () => {
      active = false;
    };
  }, [id]);

  const completion = leader ? completionRate(leader) : 0;
  const metrics = useMemo(() => {
    if (!leader) return [];
    return [
      { label: "Engagement", value: leader.isActive ? "Active" : "Inactive", icon: profileMetricIcons.engagement },
      { label: "Completion", value: `${completion}%`, icon: profileMetricIcons.completion },
      { label: "Certificates", value: leader.certificates.toLocaleString(), icon: profileMetricIcons.certificates },
      { label: "Courses", value: leader.enrolledCourses.toLocaleString(), icon: profileMetricIcons.coursesDone },
    ];
  }, [completion, leader]);

  return (
    <DashboardShell searchPlaceholder="Search leader history, courses, mentorship notes..." showDate={false}>
      {loading ? (
        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
          <div className="mt-5 h-10 w-72 animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-52 animate-pulse rounded bg-zinc-100" />
        </motion.section>
      ) : null}

      {!loading && error ? (
        <motion.section variants={shellItem} className="rounded-xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          {error}
        </motion.section>
      ) : null}

      {!loading && leader ? (
        <>
          <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                Ministry growth profile
              </Badge>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="font-heading text-4xl font-semibold tracking-tight text-zinc-950">
                    {leader.fullName}
                  </h1>
                  <p className="mt-3 text-base text-zinc-500">{leader.role}</p>
                </div>
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                  {initials(leader.fullName)}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {leader.campusName ? <Badge className="rounded-md bg-black text-white hover:bg-black">{leader.campusName}</Badge> : null}
                {leader.subgroupName ? <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">{leader.subgroupName}</Badge> : null}
                {leader.groupName ? <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">{leader.groupName}</Badge> : null}
                <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                  {leader.onboardingCompleted ? "Onboarded" : "Onboarding pending"}
                </Badge>
              </div>
            </div>

            <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">Profile source</CardTitle>
                <p className="text-sm text-zinc-400">Live hierarchy and learning records</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <Mail className="size-4 text-zinc-400" />
                  <p className="text-sm text-zinc-300">{leader.email}</p>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <CalendarDays className="size-4 text-zinc-400" />
                  <p className="text-sm text-zinc-300">Joined {formatDate(leader.joinedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section variants={shellItem} className="grid gap-4 md:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                    <CardTitle className="font-heading mt-3 text-3xl font-semibold">{value}</CardTitle>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100">
                    <Icon className="size-5" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </motion.section>

          <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">Learning progress</CardTitle>
                <p className="text-sm text-zinc-500">Course enrolment, certificates, and assessment activity</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-zinc-500">Certificate conversion</span>
                    <span className="font-semibold text-zinc-950">{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Courses enrolled", leader.enrolledCourses],
                    ["Certificates", leader.certificates],
                    ["Assessment attempts", leader.assessmentAttempts],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                      <p className="font-heading mt-2 text-2xl font-semibold text-zinc-950">{Number(value).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <IntelligencePanel
              title="AI growth signals"
              subtitle="Generated from live profile and learning status"
              insights={[
                leader.onboardingCompleted
                  ? "This leader has completed onboarding and is ready for normal academy engagement."
                  : "This leader has not completed onboarding, so profile follow-up should happen first.",
                leader.enrolledCourses > 0
                  ? "Learning activity is present; completion nudges can be based on enrolled course progress."
                  : "No course enrolment is visible yet; recommend assigning a first learning pathway.",
                leader.certificates > 0
                  ? "Certificates are already present, making this leader eligible for next-step development review."
                  : "No certificate has been issued yet; completion support should come before promotion review.",
              ]}
              dark
            />
          </motion.section>

          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">Hierarchy assignment</CardTitle>
                <p className="text-sm text-zinc-500">Live ministry structure for oversight and reporting</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {[
                  ["Campus", leader.campusName ?? "Not assigned"],
                  ["Subgroup", leader.subgroupName ?? "Not assigned"],
                  ["Group", leader.groupName ?? "Not assigned"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                    <p className="font-heading mt-2 font-semibold text-zinc-950">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">Recommended next step</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <Sparkles className="mb-4 size-5 text-zinc-400" />
                  <p className="font-heading font-semibold text-zinc-950">
                    {leader.enrolledCourses === 0
                      ? "Assign a first course"
                      : completion < 100
                      ? "Encourage course completion"
                      : "Review next leadership pathway"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {leader.enrolledCourses === 0
                      ? "This leader has no course enrolments yet."
                      : completion < 100
                      ? "This leader is enrolled but has not converted every course into certification."
                      : "This leader has completed the visible learning pathway and can be reviewed for next-step development."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </>
      ) : null}
    </DashboardShell>
  );
}

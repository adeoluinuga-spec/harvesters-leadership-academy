"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CalendarCheck, CheckCircle2, GraduationCap, HeartHandshake, Users } from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AfricanMinistryVisual, IntelligencePanel } from "@/components/hierarchy/hierarchy-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/client";
import { useHierarchy } from "@/hooks/use-hierarchy";

// Representative ministry team structure — replaced by real data when available
const REPRESENTATIVE_DEPARTMENTS = [
  { name: "Discipleship", performance: 82, leaders: 48 },
  { name: "Pastoral Care", performance: 74, leaders: 36 },
  { name: "Operations", performance: 79, leaders: 29 },
];

type CampusUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  current_leadership_role: string | null;
  onboarding_completed: boolean | null;
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CampusDashboardPage() {
  const hierarchy = useHierarchy();
  const { campusName, campusId, subgroupName } = hierarchy;

  const [campusUsers, setCampusUsers] = useState<CampusUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (hierarchy.loading) return;

    if (!campusId) {
      // Campus not assigned — nothing to query
      if (campusId === null) {
        console.warn("[campus-dashboard] campusId is null — user has no campus assignment");
      }
      setDataLoading(false);
      return;
    }

    let active = true;
    const supabase = createClient();

    supabase
      .from("users")
      .select("id, full_name, role, current_leadership_role, onboarding_completed")
      .eq("campus_id", campusId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("[campus-dashboard] failed to query campus users", {
            campusId,
            error: error.message,
          });
        }
        setCampusUsers(data ?? []);
        setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [campusId, hierarchy.loading]);

  // Derive real stats from Supabase users
  const totalLeaders = campusUsers.length;
  const activeLeaders = useMemo(
    () => campusUsers.filter((u) => u.onboarding_completed === true).length,
    [campusUsers]
  );
  const inactiveLeaders = totalLeaders - activeLeaders;
  const participationPct = totalLeaders > 0 ? Math.round((activeLeaders / totalLeaders) * 100) : 0;

  const leadersWithIssues = useMemo(
    () => campusUsers.filter((u) => !u.onboarding_completed),
    [campusUsers]
  );

  const stats = [
    { label: "Total leaders", value: dataLoading ? "…" : String(totalLeaders || "—"), icon: Users },
    { label: "Active leaders", value: dataLoading ? "…" : String(activeLeaders || "—"), icon: CheckCircle2 },
    { label: "Participation", value: dataLoading ? "…" : (totalLeaders ? `${participationPct}%` : "—"), icon: GraduationCap },
    { label: "Inactive alerts", value: dataLoading ? "…" : String(inactiveLeaders || "—"), icon: AlertCircle },
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
            {campusName} Learning and Campus Oversight
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Your personal leadership growth stays connected to {campusName} participation, leader care, and ministry-team health
            {subgroupName && subgroupName !== "Subgroup not assigned" ? ` within ${subgroupName}` : ""}.
          </p>

          {!hasCampusId && !hierarchy.loading && (
            <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No campus assignment found. Complete your ministry profile to see campus oversight data.
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
        description={`Role-aware intelligence for ${campusName} participation, inactive leaders, engagement analytics, mentorship follow-up, and ministry-team performance.`}
        modules={[
          "Campus participation",
          "Inactive leaders",
          "Engagement analytics",
          "Mentorship/follow-up",
          "Ministry-team performance",
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
                  <CardTitle className="font-heading mt-3 text-3xl font-semibold text-zinc-950">{stat.value}</CardTitle>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <stat.icon className="size-5" />
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Ministry Teams + Assessments ──────────────────────── */}
      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">Ministry-team performance</CardTitle>
            <p className="text-sm text-zinc-500">Participation levels across ministry teams</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {REPRESENTATIVE_DEPARTMENTS.map((department) => (
              <div key={department.name} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-2 flex justify-between">
                  <div>
                    <p className="font-medium text-zinc-950">{department.name}</p>
                    <p className="text-sm text-zinc-500">{department.leaders} leaders</p>
                  </div>
                  <p className="font-heading font-semibold">{department.performance}%</p>
                </div>
                <Progress value={department.performance} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">Upcoming assessments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {["Ministry Culture Review", "Volunteer Excellence Check", "Pastoral Care Readiness"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-zinc-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
                    <CalendarCheck className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950">{item}</p>
                    <p className="text-sm text-zinc-500">{index + 2} days remaining</p>
                  </div>
                </div>
                <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">Scheduled</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Leader Engagement (real Supabase users) ───────────── */}
      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">{campusName} leader engagement</CardTitle>
            <p className="text-sm text-zinc-500">
              {dataLoading
                ? "Loading campus leaders…"
                : totalLeaders === 0
                ? "No leaders found for this campus — ensure campus_id is assigned on each user row"
                : `${totalLeaders} leaders across this campus`}
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
                  <p className="font-medium text-zinc-950 truncate">{user.full_name || "Unnamed Leader"}</p>
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
                <p className="mt-1 text-xs text-zinc-400">
                  Leaders will appear here once their campus_id is set to match this campus
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <IntelligencePanel
          title="Mentorship and follow-up"
          subtitle={`Accountability indicators for ${campusName} leadership`}
          insights={[
            inactiveLeaders > 0
              ? `${inactiveLeaders} leader${inactiveLeaders !== 1 ? "s" : ""} require${inactiveLeaders === 1 ? "s" : ""} reactivation follow-up.`
              : "All registered leaders have active academy profiles.",
            "Pastoral Care team needs a focused mentorship circle.",
            "Two leaders are ready for coordinator-level review.",
            "Course participation improves when team leads host weekly debriefs.",
          ]}
          dark
        />
      </motion.section>

      {/* ── Inactive Alerts (real Supabase users) ─────────────── */}
      {leadersWithIssues.length > 0 && (
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold">Inactive leader alerts</CardTitle>
              <p className="text-sm text-zinc-500">
                {leadersWithIssues.length} leader{leadersWithIssues.length !== 1 ? "s" : ""} without an active academy profile
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 pt-1 md:grid-cols-3">
              {leadersWithIssues.slice(0, 9).map((user) => (
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

"use client";

import { motion } from "framer-motion";
import { AlertCircle, CalendarCheck, CheckCircle2, GraduationCap, HeartHandshake, Users } from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AfricanMinistryVisual, IntelligencePanel, LeaderCard } from "@/components/hierarchy/hierarchy-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { campuses, leaders } from "@/lib/hierarchy-data";
import { useHierarchy } from "@/hooks/use-hierarchy";

export default function CampusDashboardPage() {
  const hierarchy = useHierarchy();
  const { campusName, subgroupName } = hierarchy;

  const campusStats = campuses.find((c) => c.name === campusName) ?? campuses[0];
  const campusLeaders = leaders.filter((leader) => leader.campus === campusStats.name);
  const stats = [
    { label: "Total leaders", value: campusStats.leaders, icon: Users },
    { label: "Active leaders", value: campusStats.active, icon: CheckCircle2 },
    { label: "Participation", value: `${campusStats.engagement}%`, icon: GraduationCap },
    { label: "Inactive alerts", value: campusStats.inactive, icon: AlertCircle },
  ];

  return (
    <ProtectedRoute allowedRoles={["Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Campus Admin", "Super Admin", "Admin"]}>
    <DashboardShell searchPlaceholder="Search campus leaders, teams, assessments...">
      <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Campus pastor dashboard
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {campusName} Learning and Campus Oversight
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Your personal leadership growth stays connected to {campusName} participation, leader care, and ministry-team health within {subgroupName}.
          </p>
        </div>
        <AfricanMinistryVisual label="Campus ministry leadership in motion" />
      </motion.section>

      <PersonalLearningLayer role="Campus Pastor" />

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

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">Ministry-team performance</CardTitle>
            <p className="text-sm text-zinc-500">Participation levels across ministry teams</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {campusStats.departments.map((department) => (
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
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100"><CalendarCheck className="size-4" /></div>
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

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">{campusName} leader engagement</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {campusLeaders.map((leader) => <LeaderCard key={leader.id} leader={leader} />)}
          </CardContent>
        </Card>
        <IntelligencePanel
          title="Mentorship and follow-up"
          subtitle={`Accountability indicators for ${campusName} leadership`}
          insights={[
            "31 leaders require reactivation calls this week.",
            "Pastoral Care team needs a focused mentorship circle.",
            "Two leaders are ready for coordinator-level review.",
            "Course participation improves when team leads host weekly debriefs.",
          ]}
          dark
        />
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Inactive leader alerts</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {campusLeaders.filter((leader) => leader.issue).map((leader) => (
              <div key={leader.id} className="rounded-lg border border-zinc-100 p-4">
                <HeartHandshake className="mb-4 size-5 text-zinc-400" />
                <p className="font-medium text-zinc-950">{leader.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{leader.issue}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
    </ProtectedRoute>
  );
}

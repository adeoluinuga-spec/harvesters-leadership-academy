"use client";

import { motion } from "framer-motion";
import {
  Award,
  BookOpenCheck,
  LineChart,
  type LucideIcon,
} from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useHierarchy } from "@/hooks/use-hierarchy";

type LeaderMetric = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export default function LeaderDashboardPage() {
  const hierarchy = useHierarchy();
  const metrics: LeaderMetric[] = [
    { label: "Course progress", value: "62%", icon: BookOpenCheck },
    { label: "Certificates", value: "3", icon: Award },
    { label: "Engagement", value: "88%", icon: LineChart },
  ];

  const firstName = hierarchy.firstName || "Leader";

  return (
    <ProtectedRoute allowedRoles={["Cell Leader / Assistant HOD", "Zonal Leader / HOD", "Community Leader", "Area Leader", "Directional Leader", "District Pastor / Pastoral Leader", "Leader", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search courses, notes, certificates..." showDate={false}>
        <motion.section
          variants={shellItem}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8"
        >
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Leader dashboard
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500">
            Continue growing as a learner while strengthening the responsibility habits needed for {hierarchy.leadershipAspiration || "your next leadership step"}.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Current role", hierarchy.currentLeadershipRole || "–"],
              ["Preparing for", hierarchy.leadershipAspiration || "–"],
              ["Ministry context", hierarchy.campusName],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                  {label}
                </p>
                <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <PersonalLearningLayer role={(hierarchy.role || "Cell Leader / Assistant HOD") as import("@/lib/mock-auth").MockRole} />

        <OversightLayerIntro
          title="Personal ministry responsibility intelligence"
          description="A lightweight responsibility layer for the leaders you influence now, the follow-up habits you are building, and the readiness signals for future oversight."
          modules={[
            "Personal accountability",
            "Ministry contribution",
            "Follow-up habits",
            "Readiness signals",
          ]}
        />

        <motion.section variants={shellItem} className="grid gap-4 md:grid-cols-3">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                    {label}
                  </p>
                  <CardTitle className="font-heading mt-3 text-3xl font-semibold">
                    {value}
                  </CardTitle>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Icon className="size-5" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </motion.section>
      </DashboardShell>
    </ProtectedRoute>
  );
}

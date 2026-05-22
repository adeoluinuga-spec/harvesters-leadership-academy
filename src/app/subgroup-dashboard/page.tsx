"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Award, Building2, ChevronDown, GraduationCap, Users } from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CampusCard, IntelligencePanel, statusClasses } from "@/components/hierarchy/hierarchy-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { campuses, leaders, subgroupInsights, activityItems } from "@/lib/hierarchy-data";
import { cn } from "@/lib/utils";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";

export default function SubgroupDashboardPage() {
  const [expanded, setExpanded] = useState("ilupeju");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const subgroupName = profile?.subgroup ?? "Magodo Subgroup";
  const subgroupCampuses = useMemo(
    () => campuses.filter((campus) => campus.subgroup === subgroupName),
    [subgroupName]
  );
  const followUps = useMemo(
    () => leaders.filter((leader) => leader.subgroup === subgroupName && leader.issue),
    [subgroupName]
  );
  const totalLeaders = subgroupCampuses.reduce((sum, campus) => sum + campus.leaders, 0);
  const averageParticipation = subgroupCampuses.length
    ? Math.round(
        subgroupCampuses.reduce((sum, campus) => sum + campus.engagement, 0) /
          subgroupCampuses.length
      )
    : 0;
  const certificateEstimate = Math.max(0, Math.round(totalLeaders * 0.3));
  const kpis = [
    { label: "Campuses", value: String(subgroupCampuses.length), detail: `${subgroupName} network`, icon: Building2 },
    { label: "Total Leaders", value: totalLeaders.toLocaleString(), detail: "Across ministry teams", icon: Users },
    { label: "Course Participation", value: `${averageParticipation}%`, detail: "Active academy learners", icon: GraduationCap },
    { label: "Certificates", value: certificateEstimate.toLocaleString(), detail: "Issued this quarter", icon: Award },
    { label: "Follow-ups", value: String(followUps.length), detail: "Open leader actions", icon: AlertCircle },
  ];
  const expandedCampusId = subgroupCampuses.some((campus) => campus.id === expanded)
    ? expanded
    : subgroupCampuses[0]?.id ?? "";

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

  return (
    <ProtectedRoute allowedRoles={["Sub-Group Pastor", "Group Pastor", "Super Admin", "Admin"]}>
    <DashboardShell searchPlaceholder="Search campuses, leaders, follow-ups...">
      <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
          Subgroup dashboard
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {subgroupName} Oversight Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-500">
          Your personal learning continues while {subgroupName} health, campus comparison, and leader performance signals stay visible within {profile?.group ?? "your group"}.
        </p>
      </motion.section>

      <PersonalLearningLayer role="Sub-Group Pastor" />

      <OversightLayerIntro
        title="Subgroup oversight intelligence"
        description={`Role-aware intelligence for ${subgroupName} health, campus comparisons, leadership performance, and campus participation trends.`}
        modules={[
          "Subgroup health",
          "Campus comparisons",
          "Leadership performance",
          "Campus participation trends",
        ]}
      />

      <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={shellItem} whileHover={{ y: -3 }}>
            <Card className="h-full rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{kpi.label}</p>
                  <CardTitle className="font-heading mt-3 text-2xl font-semibold text-zinc-950">{kpi.value}</CardTitle>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <kpi.icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent><p className="text-sm text-zinc-500">{kpi.detail}</p></CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 lg:grid-cols-2">
        {subgroupCampuses.map((campus) => <CampusCard key={campus.id} campus={campus} />)}
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Expandable campus views</CardTitle>
            <p className="text-sm text-zinc-500">Ministry-team health, participation levels, and inactive leader counts</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {subgroupCampuses.map((campus) => {
              const isOpen = expandedCampusId === campus.id;
              return (
                <div key={campus.id} className="rounded-lg border border-zinc-100">
                  <button onClick={() => setExpanded(isOpen ? "" : campus.id)} className="flex w-full items-center justify-between p-4 text-left">
                    <div>
                      <p className="font-heading font-semibold text-zinc-950">{campus.name}</p>
                      <p className="text-sm text-zinc-500">{campus.pastor}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(campus.status))}>{campus.status}</Badge>
                      <ChevronDown className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid gap-3 border-t border-zinc-100 p-4 md:grid-cols-3">
                          {campus.departments.map((department) => (
                            <div key={department.name} className="rounded-lg border border-zinc-100 p-4">
                              <p className="font-medium text-zinc-950">{department.name}</p>
                              <p className="mt-1 text-sm text-zinc-500">{department.leaders} leaders</p>
                              <Progress value={department.performance} className="mt-4 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
                              <p className="mt-2 text-xs text-zinc-500">{department.performance}% participation health</p>
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

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Leader follow-up intelligence</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
            {followUps.map((leader) => (
              <div key={leader.id} className="rounded-lg border border-zinc-100 p-4">
                <p className="font-medium text-zinc-950">{leader.name}</p>
                <p className="text-sm text-zinc-500">{leader.campus} · {leader.role}</p>
                <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{leader.issue}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <IntelligencePanel title="Subgroup insights" subtitle="Learning and oversight signals for pastoral action" insights={subgroupInsights} dark />
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Recent activity feed</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {activityItems.map((item) => <div key={item} className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">{item}</div>)}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
    </ProtectedRoute>
  );
}

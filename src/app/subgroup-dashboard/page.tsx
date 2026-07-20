"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Award, Building2, ChevronDown, GraduationCap, Users } from "lucide-react";

import { PersonalLearningLayer, OversightLayerIntro } from "@/components/dashboard/learning-oversight-layers";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { IntelligencePanel } from "@/components/hierarchy/hierarchy-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/client";
import { fetchSubgroupAnalytics, type HierarchyAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/hooks/use-hierarchy";

type RealCampus = {
  id: string;
  name: string | null;
};

type SubgroupUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  current_leadership_role: string | null;
  onboarding_completed: boolean | null;
  campus_id: string | null;
};

function campusPastorName(campus: RealCampus, pastorsByCampus: Map<string, string>): string {
  return pastorsByCampus.get(campus.id) ?? "Campus Pastor";
}

function healthLabel(pct: number): string {
  if (pct >= 80) return "Thriving";
  if (pct >= 65) return "Stable";
  return "Needs Attention";
}

function healthClasses(pct: number): string {
  if (pct >= 80) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (pct >= 65) return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-amber-100 bg-amber-50 text-amber-700";
}

export default function SubgroupDashboardPage() {
  const hierarchy = useHierarchy();
  const { subgroupName, subgroupId, groupName } = hierarchy;

  const [realCampuses, setRealCampuses] = useState<RealCampus[]>([]);
  const [subgroupUsers, setSubgroupUsers] = useState<SubgroupUser[]>([]);
  const [pastorsByCampus, setPastorsByCampus] = useState<Map<string, string>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);
  const [expanded, setExpanded] = useState<string>("");
  const [lmsAnalytics, setLmsAnalytics] = useState<HierarchyAnalytics | null>(null);

  useEffect(() => {
    if (hierarchy.loading) return;

    let active = true;

    if (!subgroupId) {
      window.setTimeout(() => {
        if (active) setDataLoading(false);
      }, 0);
      return () => {
        active = false;
      };
    }

    const supabase = createClient();

    (async () => {
      // Step 1: campuses for this subgroup (authoritative list)
      const campusResult = await supabase
        .from("campuses")
        .select("id, name")
        .eq("subgroup_id", subgroupId);

      if (!active) return;

      if (campusResult.error) {
        console.error("[subgroup-dashboard] failed to load campuses", {
          subgroupId,
          error: campusResult.error.message,
        });
      }

      const campuses = (campusResult.data ?? []) as RealCampus[];
      setRealCampuses(campuses);
      if (campuses.length > 0) {
        setExpanded((prev) => prev || campuses[0].id);
      }

      // Step 2: users via campus_id traversal + direct subgroup_id fallback (merged)
      const campusIds = campuses.map((c) => c.id);
      const userSelect = "id, full_name, role, current_leadership_role, onboarding_completed, campus_id";

      const [campusUsersRes, directUsersRes] = await Promise.all([
        campusIds.length > 0
          ? supabase.from("users").select(userSelect).in("campus_id", campusIds)
          : Promise.resolve({ data: [] as SubgroupUser[], error: null }),
        supabase.from("users").select(userSelect).eq("subgroup_id", subgroupId),
      ]);

      if (!active) return;

      if (campusUsersRes.error) {
        console.error("[subgroup-dashboard] failed to load campus users", {
          subgroupId,
          error: campusUsersRes.error.message,
        });
      }
      if (directUsersRes.error) {
        console.error("[subgroup-dashboard] failed to load direct subgroup users", {
          subgroupId,
          error: directUsersRes.error.message,
        });
      }

      const seenIds = new Set<string>();
      const allUsers = [
        ...((campusUsersRes.data ?? []) as SubgroupUser[]),
        ...((directUsersRes.data ?? []) as SubgroupUser[]),
      ].filter((u) => {
        if (seenIds.has(u.id)) return false;
        seenIds.add(u.id);
        return true;
      });

      const pastorMap = new Map<string, string>();
      for (const user of allUsers) {
        if (user.role === "Campus Pastor" && user.campus_id && !pastorMap.has(user.campus_id)) {
          pastorMap.set(user.campus_id, user.full_name ?? "");
        }
      }

      setPastorsByCampus(pastorMap);
      setSubgroupUsers(allUsers);
      setDataLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [subgroupId, hierarchy.loading]);

  useEffect(() => {
    if (hierarchy.loading || !subgroupId) return;
    fetchSubgroupAnalytics(subgroupId).then(setLmsAnalytics);
  }, [subgroupId, hierarchy.loading]);

  // Per-campus user counts for real data
  const usersByCampus = useMemo(() => {
    const map = new Map<string, SubgroupUser[]>();
    for (const user of subgroupUsers) {
      if (!user.campus_id) continue;
      const list = map.get(user.campus_id) ?? [];
      list.push(user);
      map.set(user.campus_id, list);
    }
    return map;
  }, [subgroupUsers]);

  const totalLeaders = subgroupUsers.length;
  const followUps = useMemo(
    () => subgroupUsers.filter((u) => !u.onboarding_completed),
    [subgroupUsers]
  );

  const enrolledLeaders = lmsAnalytics?.enrolledLeaders ?? null;
  const certificates = lmsAnalytics?.certificates ?? null;
  const needsFollowUp =
    lmsAnalytics ? Math.max(0, lmsAnalytics.enrolledLeaders - lmsAnalytics.completedLeaders) : null;
  const subgroupInsights = useMemo(() => {
    if (!lmsAnalytics) {
      return ["Subgroup learning intelligence will appear once academy analytics finish loading."];
    }

    return [
      `${lmsAnalytics.enrolledLeaders.toLocaleString()} leader${lmsAnalytics.enrolledLeaders === 1 ? "" : "s"} enrolled across ${subgroupName}.`,
      `${lmsAnalytics.certificates.toLocaleString()} certificate${lmsAnalytics.certificates === 1 ? "" : "s"} issued in this subgroup.`,
      needsFollowUp && needsFollowUp > 0
        ? `${needsFollowUp.toLocaleString()} enrolled leader${needsFollowUp === 1 ? "" : "s"} need completion follow-up.`
        : "No enrolled leaders are currently waiting on certificate follow-up.",
      `${lmsAnalytics.campusSummaries.length.toLocaleString()} campus${lmsAnalytics.campusSummaries.length === 1 ? "" : "es"} reporting academy activity.`,
    ];
  }, [lmsAnalytics, needsFollowUp, subgroupName]);

  const kpis = [
    {
      label: "Campuses",
      value: dataLoading ? "…" : String(realCampuses.length || "–"),
      detail: `${subgroupName} network`,
      icon: Building2,
    },
    {
      label: "Total Leaders",
      value: dataLoading ? "…" : (totalLeaders > 0 ? totalLeaders.toLocaleString() : "–"),
      detail: "Across ministry teams",
      icon: Users,
    },
    {
      label: "Enrolled Leaders",
      value: enrolledLeaders === null ? "…" : enrolledLeaders > 0 ? enrolledLeaders.toLocaleString() : "–",
      detail: "Current academy cohort",
      icon: GraduationCap,
    },
    {
      label: "Certificates",
      value: certificates === null ? "…" : certificates > 0 ? certificates.toLocaleString() : "–",
      detail: "Issued to date",
      icon: Award,
    },
    {
      label: "Needs Follow-Up",
      value: needsFollowUp === null ? "…" : String(needsFollowUp),
      detail: "Enrolled but not yet certified",
      icon: AlertCircle,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["Sub-Group Pastor", "Super Admin", "Admin"]}>
    <DashboardShell searchPlaceholder="Search campuses, leaders, follow-ups...">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
          Subgroup dashboard
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {subgroupName} Oversight Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-500">
          Your personal learning continues while {subgroupName} health, campus comparison, and leader performance signals stay visible within {groupName}.
        </p>
        {!hierarchy.loading && !subgroupId && (
          <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No subgroup assignment found. Complete your ministry profile to see subgroup oversight data.
          </div>
        )}
      </motion.section>

      {/* ── Personal Learning ─────────────────────────────────── */}
      <PersonalLearningLayer role={hierarchy.role || "Sub-Group Pastor"} />

      {/* ── Oversight Intro ───────────────────────────────────── */}
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

      {/* ── KPIs ──────────────────────────────────────────────── */}
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

      {/* ── Campus Cards (real data) ───────────────────────────── */}
      {realCampuses.length > 0 && (
        <motion.section variants={shellItem} className="grid gap-4 lg:grid-cols-2">
          {realCampuses.map((campus) => {
            const campusUserList = usersByCampus.get(campus.id) ?? [];
            const campusTotal = campusUserList.length;
            const campusActive = campusUserList.filter((u) => u.onboarding_completed).length;
            const campusInactive = campusTotal - campusActive;
            const pct = campusTotal > 0 ? Math.round((campusActive / campusTotal) * 100) : 0;
            const health = healthLabel(pct);
            return (
              <Card key={campus.id} className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                      {campus.name ?? "Unnamed Campus"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">{campusPastorName(campus, pastorsByCampus)}</p>
                  </div>
                  <Badge className={cn("rounded-md border hover:bg-inherit", healthClasses(pct))}>
                    {health}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">Leaders</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{campusTotal || "—"}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">Active</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{campusActive || "—"}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">Inactive</p>
                      <p className="font-heading mt-1 font-semibold text-zinc-950">{campusInactive || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-zinc-500">Participation</span>
                      <span className="font-semibold text-zinc-950">{campusTotal ? `${pct}%` : "—"}</span>
                    </div>
                    <Progress value={pct} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.section>
      )}

      {/* ── Expandable Campus Views (real data) ───────────────── */}
      {realCampuses.length > 0 && (
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Expandable campus views</CardTitle>
              <p className="text-sm text-zinc-500">Ministry-team health, participation levels, and inactive leader counts</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {realCampuses.map((campus) => {
                const campusUserList = usersByCampus.get(campus.id) ?? [];
                const campusTotal = campusUserList.length;
                const campusActive = campusUserList.filter((u) => u.onboarding_completed).length;
                const pct = campusTotal > 0 ? Math.round((campusActive / campusTotal) * 100) : 0;
                const health = healthLabel(pct);
                const isOpen = expanded === campus.id;

                return (
                  <div key={campus.id} className="rounded-lg border border-zinc-100">
                    <button
                      onClick={() => setExpanded(isOpen ? "" : campus.id)}
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <div>
                        <p className="font-heading font-semibold text-zinc-950">{campus.name ?? "Unnamed Campus"}</p>
                        <p className="text-sm text-zinc-500">{campusPastorName(campus, pastorsByCampus)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn("rounded-md border hover:bg-inherit", healthClasses(pct))}>
                          {health}
                        </Badge>
                        <ChevronDown className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-3 border-t border-zinc-100 p-4 md:grid-cols-3">
                            <div className="rounded-lg border border-zinc-100 p-4">
                              <p className="font-medium text-zinc-950">Total leaders</p>
                              <p className="mt-1 text-sm text-zinc-500">{campusTotal || "No data"}</p>
                              <Progress value={pct} className="mt-4 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
                              <p className="mt-2 text-xs text-zinc-500">{campusTotal ? `${pct}% participation` : "Awaiting data"}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-100 p-4">
                              <p className="font-medium text-zinc-950">Active leaders</p>
                              <p className="font-heading mt-3 text-2xl font-semibold text-zinc-950">
                                {campusActive || "—"}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500">Completed onboarding</p>
                            </div>
                            <div className="rounded-lg border border-zinc-100 p-4">
                              <p className="font-medium text-zinc-950">Needs follow-up</p>
                              <p className="font-heading mt-3 text-2xl font-semibold text-zinc-950">
                                {campusTotal - campusActive || "—"}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500">Not yet active in academy</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ── Empty state (no subgroup data) ────────────────────── */}
      {!dataLoading && realCampuses.length === 0 && subgroupId && (
        <motion.section variants={shellItem}>
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-14 text-center">
            <Building2 className="mx-auto size-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No campuses found for this subgroup</p>
            <p className="mt-1 text-xs text-zinc-400">
              Ensure campuses have the correct subgroup_id assigned in the database
            </p>
          </div>
        </motion.section>
      )}

      {/* ── Follow-up Intelligence (real Supabase users) ──────── */}
      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Leader follow-up intelligence</CardTitle>
            <p className="text-sm text-zinc-500">
              {dataLoading
                ? "Loading leaders…"
                : followUps.length > 0
                ? `${followUps.length} leader${followUps.length !== 1 ? "s" : ""} require${followUps.length === 1 ? "s" : ""} follow-up`
                : "All registered leaders are active"}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
            {followUps.slice(0, 6).map((user) => (
              <div key={user.id} className="rounded-lg border border-zinc-100 p-4">
                <p className="font-medium text-zinc-950">{user.full_name || "Unnamed Leader"}</p>
                <p className="text-sm text-zinc-500">
                  {user.current_leadership_role || user.role || "Leader"}
                </p>
                <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  Academy profile not yet completed
                </div>
              </div>
            ))}
            {!dataLoading && followUps.length === 0 && (
              <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
                No follow-up actions required at this time
              </div>
            )}
          </CardContent>
        </Card>
        <IntelligencePanel
          title="Subgroup insights"
          subtitle="Learning and oversight signals for pastoral action"
          insights={subgroupInsights}
          dark
        />
      </motion.section>

      {/* ── Activity Summary ──────────────────────────────────── */}
      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">Subgroup summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {lmsAnalytics ? (
              <>
                <div className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">
                  {lmsAnalytics.enrolledLeaders.toLocaleString()} leaders enrolled in the academy across {subgroupName}.
                </div>
                <div className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">
                  {lmsAnalytics.certificates.toLocaleString()} certificates issued within this subgroup.
                </div>
                <div className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">
                  {Math.max(0, lmsAnalytics.enrolledLeaders - lmsAnalytics.completedLeaders)} leaders enrolled but not yet certified — follow-up recommended.
                </div>
                <div className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">
                  {lmsAnalytics.campusSummaries.length} campus{lmsAnalytics.campusSummaries.length !== 1 ? "es" : ""} reporting academy activity.
                </div>
              </>
            ) : (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
              ))
            )}
          </CardContent>
        </Card>
      </motion.section>

    </DashboardShell>
    </ProtectedRoute>
  );
}

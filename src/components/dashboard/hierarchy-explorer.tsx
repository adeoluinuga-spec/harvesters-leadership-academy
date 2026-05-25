"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronRight,
  Layers,
  Network,
  Users,
  UserCheck,
  GraduationCap,
  Award,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";

// ─── API types ───────────────────────────────────────────────

type ExplorerCadre = { role: string; count: number };

type ExplorerCampus = {
  id: string;
  name: string;
  pastorName: string | null;
  totalLeaders: number;
  cadres: ExplorerCadre[];
};

type ExplorerSubgroup = {
  id: string;
  name: string;
  totalLeaders: number;
  campusCount: number;
  campuses: ExplorerCampus[];
};

type ExplorerGroup = {
  id: string;
  name: string;
  totalLeaders: number;
  subgroupCount: number;
  campusCount: number;
  subgroups: ExplorerSubgroup[];
};

type ExplorerData = {
  groups: ExplorerGroup[];
  totalLeaders: number;
};

type LeaderRecord = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  designation: string | null;
  enrolledCourses: number;
  certificates: number;
  onboardingCompleted: boolean;
  isActive: boolean;
  joinedAt: string;
};

// ─── Sub-components ──────────────────────────────────────────

function SectionLabel({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-zinc-400" />
      <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {text}
      </h2>
    </div>
  );
}

function Breadcrumb({
  crumbs,
}: {
  crumbs: { label: string; onClick: () => void; active: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 text-zinc-300" />}
          <button
            onClick={crumb.onClick}
            disabled={crumb.active}
            className={cn(
              "transition-colors",
              crumb.active
                ? "cursor-default font-semibold text-zinc-950"
                : "text-zinc-400 hover:text-zinc-700"
            )}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-950"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  );
}

// ─── Groups view ─────────────────────────────────────────────

function GroupsView({
  groups,
  onSelect,
}: {
  groups: ExplorerGroup[];
  onSelect: (g: ExplorerGroup) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 py-14 text-center">
        <Network className="mx-auto size-8 text-zinc-200" />
        <p className="mt-3 text-sm text-zinc-400">No groups found. Add groups in Admin Tools → Groups.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelect(group)}
          className="group rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-zinc-950 group-hover:text-white">
              <Network className="size-4" />
            </div>
            <ChevronRight className="size-4 text-zinc-300 transition-colors group-hover:text-zinc-950" />
          </div>
          <p className="font-heading font-semibold text-zinc-950">{group.name}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {group.subgroupCount} subgroup{group.subgroupCount !== 1 ? "s" : ""} ·{" "}
            {group.campusCount} campus{group.campusCount !== 1 ? "es" : ""}
          </p>
          <div className="mt-4 flex items-baseline gap-1.5 border-t border-zinc-100 pt-4">
            <span className="font-heading text-2xl font-semibold text-zinc-950">
              {group.totalLeaders.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-500">leaders registered</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Subgroups view ──────────────────────────────────────────

function SubgroupsView({
  group,
  onSelect,
  onBack,
}: {
  group: ExplorerGroup;
  onSelect: (sg: ExplorerSubgroup) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton label="All Groups" onClick={onBack} />
        <p className="text-sm text-zinc-500">
          {group.totalLeaders.toLocaleString()} leaders · {group.campusCount} campuses
        </p>
      </div>

      {group.subgroups.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 py-14 text-center">
          <Layers className="mx-auto size-8 text-zinc-200" />
          <p className="mt-3 text-sm text-zinc-400">No subgroups under {group.name} yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {group.subgroups.map((sg) => (
            <button
              key={sg.id}
              onClick={() => onSelect(sg)}
              className="group rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-zinc-950 group-hover:text-white">
                  <Layers className="size-4" />
                </div>
                <ChevronRight className="size-4 text-zinc-300 transition-colors group-hover:text-zinc-950" />
              </div>
              <p className="font-heading font-semibold text-zinc-950">{sg.name}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {sg.campusCount} campus{sg.campusCount !== 1 ? "es" : ""}
              </p>
              <div className="mt-4 flex items-baseline gap-1.5 border-t border-zinc-100 pt-4">
                <span className="font-heading text-2xl font-semibold text-zinc-950">
                  {sg.totalLeaders.toLocaleString()}
                </span>
                <span className="text-sm text-zinc-500">leaders registered</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Campuses view ───────────────────────────────────────────

function CampusesView({
  subgroup,
  groupName,
  onSelectCampus,
  onSelectCadre,
  onBack,
}: {
  subgroup: ExplorerSubgroup;
  groupName: string;
  onSelectCampus: (c: ExplorerCampus) => void;
  onSelectCadre: (c: ExplorerCampus, role: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton label={groupName} onClick={onBack} />
        <p className="text-sm text-zinc-500">
          {subgroup.totalLeaders.toLocaleString()} leaders · {subgroup.campusCount} campuses
        </p>
      </div>

      {subgroup.campuses.length === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 py-14 text-center">
          <Building2 className="mx-auto size-8 text-zinc-200" />
          <p className="mt-3 text-sm text-zinc-400">No campuses linked to {subgroup.name} yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subgroup.campuses.map((campus) => (
            <div
              key={campus.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              {/* Campus header — click to see all leaders */}
              <button
                onClick={() => onSelectCampus(campus)}
                className="group w-full p-5 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-zinc-950 group-hover:text-white">
                    <Building2 className="size-4" />
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 transition-colors group-hover:text-zinc-950" />
                </div>
                <p className="mt-3 font-heading font-semibold text-zinc-950">{campus.name}</p>
                {campus.pastorName && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Campus Pastor: {campus.pastorName}
                  </p>
                )}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <Users className="size-3.5 text-zinc-400" />
                  <span className="font-heading text-xl font-semibold text-zinc-950">
                    {campus.totalLeaders}
                  </span>
                  <span className="text-sm text-zinc-500">leaders</span>
                </div>
              </button>

              {/* Cadre breakdown pills — each clickable to filter */}
              {campus.cadres.length > 0 && (
                <div className="border-t border-zinc-100 px-5 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    By cadre
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {campus.cadres.map((cadre) => (
                      <button
                        key={cadre.role}
                        onClick={() => onSelectCadre(campus, cadre.role)}
                        className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
                        title={`View ${cadre.role} leaders`}
                      >
                        {cadre.count} {cadre.role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Leaders view ─────────────────────────────────────────────

function LeadersView({
  campus,
  subgroupName,
  leaders,
  loading,
  activeRole,
  onFilterRole,
  onBack,
}: {
  campus: ExplorerCampus;
  subgroupName: string;
  leaders: LeaderRecord[];
  loading: boolean;
  activeRole: string | undefined;
  onFilterRole: (role: string | undefined) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Campus summary card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <BackButton label={subgroupName} onClick={onBack} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold text-zinc-950">{campus.name}</p>
            {campus.pastorName && (
              <p className="text-sm text-zinc-500">Campus Pastor: {campus.pastorName}</p>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-2xl font-semibold text-zinc-950">
              {campus.totalLeaders}
            </span>
            <span className="text-sm text-zinc-500">total leaders</span>
          </div>
        </div>

        {/* Role filter pills */}
        {campus.cadres.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onFilterRole(undefined)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                !activeRole
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              )}
            >
              All ({campus.totalLeaders})
            </button>
            {campus.cadres.map((cadre) => (
              <button
                key={cadre.role}
                onClick={() => onFilterRole(cadre.role)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeRole === cadre.role
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                )}
              >
                {cadre.role} ({cadre.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaders table */}
      <Card className="overflow-hidden rounded-xl border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="divide-y divide-zinc-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="size-8 rounded-full bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-zinc-100" />
                    <div className="h-3 w-56 rounded bg-zinc-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="mx-auto size-8 text-zinc-200" />
            <p className="mt-3 text-sm text-zinc-400">
              No leaders found{activeRole ? ` for "${activeRole}"` : ""}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/60">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Role
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Courses
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Certs
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leaders.map((leader) => (
                  <tr
                    key={leader.id}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                          {leader.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-950">{leader.fullName}</p>
                          {leader.designation && (
                            <p className="text-xs text-zinc-400">{leader.designation}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">{leader.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {leader.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="flex items-center justify-end gap-1 text-zinc-950">
                        <GraduationCap className="size-3.5 text-zinc-400" />
                        {leader.enrolledCourses}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="flex items-center justify-end gap-1 text-zinc-950">
                        <Award className="size-3.5 text-zinc-400" />
                        {leader.certificates}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {leader.onboardingCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <UserCheck className="size-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-zinc-100 px-5 py-3">
              <p className="text-xs text-zinc-400">
                {leaders.length} leader{leaders.length !== 1 ? "s" : ""}
                {activeRole ? ` · filtered to "${activeRole}"` : ""}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function HierarchyExplorer() {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);

  // Navigation state
  const [view, setView] = useState<"groups" | "subgroups" | "campuses" | "leaders">("groups");
  const [selectedGroup, setSelectedGroup] = useState<ExplorerGroup | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<ExplorerSubgroup | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<ExplorerCampus | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  // Leaders data
  const [leaders, setLeaders] = useState<LeaderRecord[]>([]);
  const [leadersLoading, setLeadersLoading] = useState(false);

  // Fetch full hierarchy tree once
  useEffect(() => {
    fetch("/api/hierarchy/explorer")
      .then((r) => r.json())
      .then((d) => setData(d as ExplorerData))
      .catch(() => {})
      .finally(() => setTreeLoading(false));
  }, []);

  // Fetch leaders when at campus level
  useEffect(() => {
    if (view !== "leaders" || !selectedCampus) {
      setLeaders([]);
      return;
    }
    let active = true;
    setLeadersLoading(true);
    const qs = roleFilter ? `?role=${encodeURIComponent(roleFilter)}` : "";
    fetch(`/api/hierarchy/campus/${selectedCampus.id}/leaders${qs}`)
      .then((r) => r.json())
      .then((d) => { if (active) setLeaders((d as { leaders: LeaderRecord[] }).leaders ?? []); })
      .catch(() => { if (active) setLeaders([]); })
      .finally(() => { if (active) setLeadersLoading(false); });
    return () => { active = false; };
  }, [view, selectedCampus?.id, roleFilter]);

  // Navigation helpers
  const goToGroups = () => {
    setView("groups");
    setSelectedGroup(null);
    setSelectedSubgroup(null);
    setSelectedCampus(null);
    setRoleFilter(undefined);
  };
  const goToSubgroups = (group: ExplorerGroup) => {
    setSelectedGroup(group);
    setSelectedSubgroup(null);
    setSelectedCampus(null);
    setRoleFilter(undefined);
    setView("subgroups");
  };
  const goToCampuses = (sg: ExplorerSubgroup) => {
    setSelectedSubgroup(sg);
    setSelectedCampus(null);
    setRoleFilter(undefined);
    setView("campuses");
  };
  const goToLeaders = (campus: ExplorerCampus, role?: string) => {
    setSelectedCampus(campus);
    setRoleFilter(role);
    setView("leaders");
  };
  const backFromSubgroups = () => goToGroups();
  const backFromCampuses = () => {
    setView("subgroups");
    setSelectedSubgroup(null);
    setSelectedCampus(null);
    setRoleFilter(undefined);
  };
  const backFromLeaders = () => {
    setView("campuses");
    setSelectedCampus(null);
    setRoleFilter(undefined);
  };

  // Breadcrumb
  const crumbs = [
    { label: "All Groups", active: view === "groups", onClick: goToGroups },
    ...(selectedGroup
      ? [{ label: selectedGroup.name, active: view === "subgroups", onClick: () => goToSubgroups(selectedGroup) }]
      : []),
    ...(selectedSubgroup
      ? [{ label: selectedSubgroup.name, active: view === "campuses", onClick: () => goToCampuses(selectedSubgroup) }]
      : []),
    ...(selectedCampus
      ? [{ label: selectedCampus.name, active: view === "leaders", onClick: () => {} }]
      : []),
  ];

  if (treeLoading) {
    return (
      <motion.section variants={shellItem} className="space-y-4">
        <SectionLabel icon={Network} text="Leadership hierarchy" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <div className="h-3 w-28 rounded bg-zinc-100" />
                <div className="mt-4 h-6 w-20 rounded bg-zinc-200" />
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full rounded bg-zinc-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionLabel icon={Network} text="Leadership hierarchy" />
        {data && (
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-950">{data.totalLeaders.toLocaleString()}</span>{" "}
            leaders registered platform-wide
          </p>
        )}
      </div>

      {crumbs.length > 1 && <Breadcrumb crumbs={crumbs} />}

      <AnimatePresence mode="wait">
        <motion.div
          key={view + (selectedGroup?.id ?? "") + (selectedSubgroup?.id ?? "") + (selectedCampus?.id ?? "")}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {view === "groups" && (
            <GroupsView groups={data?.groups ?? []} onSelect={goToSubgroups} />
          )}
          {view === "subgroups" && selectedGroup && (
            <SubgroupsView
              group={selectedGroup}
              onSelect={goToCampuses}
              onBack={backFromSubgroups}
            />
          )}
          {view === "campuses" && selectedSubgroup && (
            <CampusesView
              subgroup={selectedSubgroup}
              groupName={selectedGroup?.name ?? "Groups"}
              onSelectCampus={(c) => goToLeaders(c)}
              onSelectCadre={(c, role) => goToLeaders(c, role)}
              onBack={backFromCampuses}
            />
          )}
          {view === "leaders" && selectedCampus && (
            <LeadersView
              campus={selectedCampus}
              subgroupName={selectedSubgroup?.name ?? "Subgroup"}
              leaders={leaders}
              loading={leadersLoading}
              activeRole={roleFilter}
              onFilterRole={setRoleFilter}
              onBack={backFromLeaders}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

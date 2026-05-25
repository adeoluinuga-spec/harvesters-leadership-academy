"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Award,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  LayoutList,
  Network,
  Pencil,
  Search,
  ShieldOff,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";
import { fetchAllSubgroupPerformance, type SubgroupSummary } from "@/lib/analytics";

// ─── Role constants ───────────────────────────────────────────

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];
const OVERSIGHT_ROLES = [
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
  "Campus Admin",
  "Directional Leader",
  "District Pastor",
  "Pastoral Leader",
  "District Pastor / Pastoral Leader",
  "Area Leader",
  "Community Leader",
  "Zonal Leader",
  "Zonal Leader / HOD",
  "HOD",
  "Cell Leader",
  "Assistant HOD",
  "Cell Leader / Assistant HOD",
];
const ALL_OVERSIGHT = [...ADMIN_ROLES, ...OVERSIGHT_ROLES];

const ALL_ROLES = [
  "Cell Leader / Assistant HOD",
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "District Pastor / Pastoral Leader",
  "Directional Leader",
  "Campus Pastor",
  "Campus Admin",
  "Sub-Group Pastor",
  "Group Pastor",
  "Platform Super Admin",
];

// ─── Shared types ─────────────────────────────────────────────

type ScopedUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  campusId: string | null;
  campusName: string | null;
  subgroupId: string | null;
  subgroupName: string | null;
  groupId: string | null;
  groupName: string | null;
  onboardingCompleted: boolean;
  isActive: boolean;
  enrolledCourses: number;
  certificates: number;
  assessmentAttempts: number;
  joinedAt: string;
  // admin-only extras
  currentLeadershipRole?: string | null;
  designation?: string | null;
};

type SelectOption = { id: string; name: string };

// ─── Shared helpers ───────────────────────────────────────────

function statusColor(user: { isActive: boolean; onboardingCompleted: boolean }) {
  if (!user.isActive) return "border-rose-100 bg-rose-50 text-rose-700";
  if (!user.onboardingCompleted) return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function statusLabel(user: { isActive: boolean; onboardingCompleted: boolean }) {
  if (!user.isActive) return "Deactivated";
  if (!user.onboardingCompleted) return "Pending";
  return "Active";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? "Request failed");
  return j as T;
}

// ─── Edit Modal (admin only) ──────────────────────────────────

function EditModal({
  user,
  campuses,
  subgroups,
  groups,
  onClose,
  onSave,
}: {
  user: ScopedUser;
  campuses: SelectOption[];
  subgroups: SelectOption[];
  groups: SelectOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [campusId, setCampusId] = useState(user.campusId ?? "");
  const [subgroupId, setSubgroupId] = useState(user.subgroupId ?? "");
  const [groupId, setGroupId] = useState(user.groupId ?? "");
  const [isActive, setIsActive] = useState(user.isActive);
  const [resetOnboarding, setResetOnboarding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        role,
        campusId: campusId || null,
        subgroupId: subgroupId || null,
        groupId: groupId || null,
        isActive,
      };
      if (resetOnboarding) body.onboardingCompleted = false;
      await apiJson(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSave();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <p className="font-heading font-semibold text-zinc-950">Edit leader profile</p>
            <p className="text-sm text-zinc-500">{user.fullName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-zinc-100">
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Campus</label>
            <select value={campusId} onChange={(e) => setCampusId(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
              <option value="">— Not assigned —</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Subgroup</label>
            <select value={subgroupId} onChange={(e) => setSubgroupId(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
              <option value="">— Not assigned —</option>
              {subgroups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Group</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
              <option value="">— Not assigned —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3">
            <input type="checkbox" id="isActive" checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-zinc-300" />
            <label htmlFor="isActive" className="text-sm text-zinc-700">Account active</label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <input type="checkbox" id="resetOnboarding" checked={resetOnboarding}
              onChange={(e) => setResetOnboarding(e.target.checked)}
              className="size-4 rounded border-amber-300" />
            <label htmlFor="resetOnboarding" className="text-sm text-amber-800">
              Reset onboarding status
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="rounded-lg border-zinc-200">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-black text-white hover:bg-zinc-800">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── User row (shared between admin and oversight view) ───────

function UserRow({
  user,
  showEdit,
  onEdit,
  showLms = false,
}: {
  user: ScopedUser;
  showEdit: boolean;
  onEdit?: () => void;
  showLms?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 p-4 transition-colors hover:bg-zinc-50/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
            {initials(user.fullName)}
          </div>
          <div className="min-w-0">
            <p className="font-heading truncate font-semibold text-zinc-950">{user.fullName}</p>
            <p className="truncate text-sm text-zinc-500">
              {user.email} · <span className="text-zinc-700">{user.role}</span>
            </p>
            <p className="text-xs text-zinc-400">
              {[user.campusName, user.subgroupName, user.groupName].filter(Boolean).join(" · ") || "No hierarchy assignment"}
            </p>
            {showLms && (
              <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3 text-zinc-400" />
                  {user.enrolledCourses} enrolled
                </span>
                <span className="flex items-center gap-1">
                  <Award className="size-3 text-zinc-400" />
                  {user.certificates} certs
                </span>
                {user.assessmentAttempts > 0 && (
                  <span className="text-zinc-400">{user.assessmentAttempts} attempts</span>
                )}
                {user.joinedAt && (
                  <span className="text-zinc-400">
                    Joined {new Date(user.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Badge className={cn("rounded-md border text-xs hover:bg-inherit", statusColor(user))}>
            {statusLabel(user)}
          </Badge>
          {showEdit && onEdit && (
            <Button size="sm" variant="outline" className="rounded-lg border-zinc-200" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filters bar ──────────────────────────────────────────────

function FiltersBar({
  search,
  onSearch,
  roleFilter,
  onRoleFilter,
  campusFilter,
  onCampusFilter,
  campuses,
  showCampusFilter,
  onboardingFilter,
  onOnboardingFilter,
  activeFilter,
  onActiveFilter,
}: {
  search: string; onSearch: (v: string) => void;
  roleFilter: string; onRoleFilter: (v: string) => void;
  campusFilter: string; onCampusFilter: (v: string) => void;
  campuses: SelectOption[]; showCampusFilter: boolean;
  onboardingFilter: string; onOnboardingFilter: (v: string) => void;
  activeFilter: string; onActiveFilter: (v: string) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="rounded-lg border-zinc-200 pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}
            className="rounded-lg border-zinc-200">
            Filters <ChevronDown className={cn("ml-1 size-4 transition-transform", showFilters && "rotate-180")} />
          </Button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <select value={roleFilter} onChange={(e) => onRoleFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                  <option value="">All roles</option>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {showCampusFilter && (
                  <select value={campusFilter} onChange={(e) => onCampusFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                    <option value="">All campuses</option>
                    {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <select value={onboardingFilter} onChange={(e) => onOnboardingFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                  <option value="">All onboarding statuses</option>
                  <option value="true">Onboarding completed</option>
                  <option value="false">Onboarding pending</option>
                </select>
                <select value={activeFilter} onChange={(e) => onActiveFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                  <option value="">All statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Deactivated</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Hierarchy view (admin only) ──────────────────────────────

type LeaderShape = {
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

function HierarchyUsersView() {
  const [subgroups, setSubgroups] = useState<SubgroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubgroup, setExpandedSubgroup] = useState<string>("");
  const [expandedCampus, setExpandedCampus] = useState<string>("");
  const [campusLeaders, setCampusLeaders] = useState<Map<string, LeaderShape[]>>(new Map());
  const [loadingCampus, setLoadingCampus] = useState<string>("");

  useEffect(() => {
    fetchAllSubgroupPerformance().then((data) => {
      setSubgroups(data);
      setExpandedSubgroup(data[0]?.subgroupId ?? "");
      setLoading(false);
    });
  }, []);

  async function loadCampusLeaders(campusId: string) {
    if (campusLeaders.has(campusId)) return;
    setLoadingCampus(campusId);
    try {
      const res = await fetch(`/api/hierarchy/campus/${campusId}/leaders`);
      if (res.ok) {
        const json = await res.json() as { leaders: LeaderShape[] };
        setCampusLeaders((prev) => new Map(prev).set(campusId, json.leaders));
      }
    } catch { /* best-effort */ }
    finally { setLoadingCampus(""); }
  }

  function toggleSubgroup(id: string) {
    setExpandedSubgroup((prev) => (prev === id ? "" : id));
    setExpandedCampus("");
  }

  function toggleCampus(campusId: string) {
    const next = expandedCampus === campusId ? "" : campusId;
    setExpandedCampus(next);
    if (next) void loadCampusLeaders(next);
  }

  if (loading) {
    return (
      <motion.section variants={shellItem}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />)}
        </div>
      </motion.section>
    );
  }

  if (subgroups.length === 0) {
    return (
      <motion.section variants={shellItem}>
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-14 text-center">
          <Network className="mx-auto size-8 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">No subgroup data found</p>
          <p className="mt-1 text-xs text-zinc-400">Ensure leaders have subgroup_id assigned</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Leaders by subgroup</CardTitle>
          <p className="text-sm text-zinc-500">Expand a subgroup → campus → view leaders</p>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {subgroups.map((sg) => {
            const sgOpen = expandedSubgroup === sg.subgroupId;
            return (
              <div key={sg.subgroupId} className="rounded-lg border border-zinc-100">
                {/* Subgroup row */}
                <button
                  onClick={() => toggleSubgroup(sg.subgroupId)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-zinc-950">{sg.subgroupName}</p>
                      <p className="text-xs text-zinc-500">
                        {sg.campusSummaries.length} campus{sg.campusSummaries.length !== 1 ? "es" : ""} · {sg.totalLeaders} leaders
                        {sg.pastorName ? ` · ${sg.pastorName}` : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("size-4 text-zinc-400 transition-transform shrink-0", sgOpen && "rotate-180")} />
                </button>

                {/* Campuses */}
                <AnimatePresence initial={false}>
                  {sgOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-zinc-100 p-3">
                        {sg.campusSummaries.length === 0 && (
                          <p className="py-4 text-center text-sm text-zinc-400">No campuses in this subgroup</p>
                        )}
                        {sg.campusSummaries.map((campus) => {
                          const campusOpen = expandedCampus === campus.campusId;
                          const leaders = campusLeaders.get(campus.campusId) ?? [];
                          const isLoadingThis = loadingCampus === campus.campusId;

                          return (
                            <div key={campus.campusId} className="rounded-lg border border-zinc-100 bg-zinc-50/50">
                              {/* Campus row */}
                              <button
                                onClick={() => toggleCampus(campus.campusId)}
                                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Building2 className="size-4 shrink-0 text-zinc-400" />
                                  <div>
                                    <p className="text-sm font-medium text-zinc-950">{campus.campusName}</p>
                                    <p className="text-xs text-zinc-400">
                                      {campus.totalLeaders} leaders · {campus.enrolledLeaders} enrolled · {campus.completionRate}% completion
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight
                                  className={cn("size-4 text-zinc-400 transition-transform shrink-0", campusOpen && "rotate-90")}
                                />
                              </button>

                              {/* Leaders list */}
                              <AnimatePresence initial={false}>
                                {campusOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-1.5 border-t border-zinc-100 p-3">
                                      {isLoadingThis && (
                                        <div className="py-6 text-center text-xs text-zinc-400">Loading leaders…</div>
                                      )}
                                      {!isLoadingThis && leaders.length === 0 && (
                                        <div className="py-6 text-center text-xs text-zinc-400">No leaders found for this campus</div>
                                      )}
                                      {leaders.map((leader) => {
                                        const scopedUser: ScopedUser = {
                                          id: leader.id,
                                          fullName: leader.fullName,
                                          email: leader.email,
                                          role: leader.role,
                                          campusId: campus.campusId,
                                          campusName: campus.campusName,
                                          subgroupId: sg.subgroupId,
                                          subgroupName: sg.subgroupName,
                                          groupId: null,
                                          groupName: null,
                                          onboardingCompleted: leader.onboardingCompleted,
                                          isActive: leader.isActive,
                                          enrolledCourses: leader.enrolledCourses,
                                          certificates: leader.certificates,
                                          assessmentAttempts: 0,
                                          joinedAt: leader.joinedAt,
                                          designation: leader.designation,
                                        };
                                        return (
                                          <UserRow key={leader.id} user={scopedUser} showEdit={false} showLms />
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
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
  );
}

// ─── Admin users view ─────────────────────────────────────────

function AdminUsersView() {
  const [users, setUsers] = useState<ScopedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [campuses, setCampuses] = useState<SelectOption[]>([]);
  const [subgroups, setSubgroups] = useState<SelectOption[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<ScopedUser | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(campusFilter && { campus_id: campusFilter }),
        ...(onboardingFilter && { onboarding: onboardingFilter }),
        ...(activeFilter && { active: activeFilter }),
      });
      const { users: u, total: t } = await apiJson<{ users: ScopedUser[]; total: number }>(
        `/api/admin/users?${params}`
      );
      setUsers(u);
      setTotal(t);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, [page, search, roleFilter, campusFilter, onboardingFilter, activeFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    Promise.all([
      apiJson<{ campuses: SelectOption[] }>("/api/admin/campuses").catch(() => ({ campuses: [] })),
      apiJson<{ subgroups: SelectOption[] }>("/api/admin/subgroups").catch(() => ({ subgroups: [] })),
      apiJson<{ groups: SelectOption[] }>("/api/admin/groups").catch(() => ({ groups: [] })),
    ]).then(([c, s, g]) => {
      setCampuses(c.campuses);
      setSubgroups(s.subgroups);
      setGroups(g.groups);
    });
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <motion.section variants={shellItem}>
        <FiltersBar
          search={search} onSearch={(v) => { setSearch(v); setPage(1); }}
          roleFilter={roleFilter} onRoleFilter={(v) => { setRoleFilter(v); setPage(1); }}
          campusFilter={campusFilter} onCampusFilter={(v) => { setCampusFilter(v); setPage(1); }}
          campuses={campuses} showCampusFilter
          onboardingFilter={onboardingFilter} onOnboardingFilter={(v) => { setOnboardingFilter(v); setPage(1); }}
          activeFilter={activeFilter} onActiveFilter={(v) => { setActiveFilter(v); setPage(1); }}
        />
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">All leaders</CardTitle>
            <p className="text-sm text-zinc-500">
              {loading ? "Loading…" : `${total.toLocaleString()} total — page ${page} of ${Math.max(totalPages, 1)}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {loading && [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
            ))}
            {!loading && users.length === 0 && (
              <div className="py-14 text-center">
                <Users className="mx-auto size-8 text-zinc-300" />
                <p className="mt-3 text-sm text-zinc-400">No users match your search</p>
              </div>
            )}
            {users.map((user) => (
              <UserRow key={user.id} user={user} showEdit onEdit={() => setEditUser(user)} showLms={false} />
            ))}
            {!loading && users.length > 0 && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <AlertCircle className="size-3" />
                  Changes are audited and cannot be undone easily.
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                      onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                    <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
                    <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <AnimatePresence>
        {editUser && (
          <EditModal user={editUser} campuses={campuses} subgroups={subgroups} groups={groups}
            onClose={() => setEditUser(null)} onSave={() => void load()} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Scoped oversight view ─────────────────────────────────────

function ScopedUsersView({ myRole }: { myRole: string }) {
  const [users, setUsers] = useState<ScopedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(onboardingFilter && { onboarding: onboardingFilter }),
        ...(activeFilter && { active: activeFilter }),
      });
      const { users: u, total: t } = await apiJson<{ users: ScopedUser[]; total: number }>(
        `/api/hierarchy/users?${params}`
      );
      setUsers(u);
      setTotal(t);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, [page, search, roleFilter, onboardingFilter, activeFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <motion.section variants={shellItem}>
        <FiltersBar
          search={search} onSearch={(v) => { setSearch(v); setPage(1); }}
          roleFilter={roleFilter} onRoleFilter={(v) => { setRoleFilter(v); setPage(1); }}
          campusFilter="" onCampusFilter={() => {}}
          campuses={[]} showCampusFilter={false}
          onboardingFilter={onboardingFilter} onOnboardingFilter={(v) => { setOnboardingFilter(v); setPage(1); }}
          activeFilter={activeFilter} onActiveFilter={(v) => { setActiveFilter(v); setPage(1); }}
        />
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Leaders in your scope
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {loading ? "Loading…" : `${total.toLocaleString()} leader${total !== 1 ? "s" : ""} — scoped to your ${myRole} view · page ${page} of ${Math.max(totalPages, 1)}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {loading && [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100" />
            ))}
            {!loading && users.length === 0 && (
              <div className="py-14 text-center">
                <Users className="mx-auto size-8 text-zinc-300" />
                <p className="mt-3 text-sm text-zinc-400">No leaders found in your scope</p>
              </div>
            )}
            {users.map((user) => (
              <UserRow key={user.id} user={user} showEdit={false} showLms />
            ))}
            {!loading && users.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </>
  );
}

// ─── Access denied ────────────────────────────────────────────

function AccessDenied() {
  return (
    <motion.section variants={shellItem}>
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 py-20 text-center">
        <ShieldOff className="mx-auto size-10 text-zinc-300" />
        <p className="mt-4 font-heading text-lg font-semibold text-zinc-950">Access restricted</p>
        <p className="mt-2 text-sm text-zinc-500">
          Your role does not have oversight access to view other leaders.
        </p>
      </div>
    </motion.section>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function UsersPage() {
  const [myRole, setMyRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "hierarchy">("list");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setRoleLoading(false); return; }
      supabase.from("users").select("role").eq("id", user.id).maybeSingle()
        .then(({ data }) => {
          setMyRole(data?.role ?? null);
          setRoleLoading(false);
        });
    });
  }, []);

  const isAdmin = myRole ? ADMIN_ROLES.includes(myRole) : false;
  const isOversight = myRole ? OVERSIGHT_ROLES.includes(myRole) : false;
  const hasAccess = isAdmin || isOversight;

  const heroLabel = isAdmin ? "User Management" : "Leader Directory";
  const heroTitle = isAdmin ? "Leadership User Ecosystem" : "Leaders in Your Scope";
  const heroDesc = isAdmin
    ? "Search, filter, edit roles, assign campuses, and export."
    : `Your ${myRole ?? "oversight"} view — scoped to your hierarchy level.`;

  return (
    <DashboardShell searchPlaceholder="Search users…" showDate={false}>
      {/* Hero */}
      <motion.section variants={shellItem}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              {roleLoading ? "Loading…" : heroLabel}
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-500">{heroDesc}</p>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    viewMode === "list" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <LayoutList className="size-4" /> List
                </button>
                <button
                  onClick={() => setViewMode("hierarchy")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    viewMode === "hierarchy" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <Network className="size-4" /> Hierarchy
                </button>
              </div>
              <Button variant="outline" onClick={() => window.open("/api/admin/users/export", "_blank")}
                className="rounded-lg border-zinc-200">
                <Download className="size-4" /> Export CSV
              </Button>
              <Button className="rounded-lg bg-black text-white hover:bg-zinc-800">
                <UserPlus className="size-4" /> Add user
              </Button>
            </div>
          )}
          {isOversight && !isAdmin && (
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              <UserCheck className="size-4 text-zinc-400" />
              Read-only view
            </div>
          )}
        </div>
      </motion.section>

      {/* Body */}
      {roleLoading ? (
        <motion.section variants={shellItem}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        </motion.section>
      ) : !hasAccess ? (
        <AccessDenied />
      ) : isAdmin && viewMode === "hierarchy" ? (
        <HierarchyUsersView />
      ) : isAdmin ? (
        <AdminUsersView />
      ) : (
        <ScopedUsersView myRole={myRole!} />
      )}
    </DashboardShell>
  );
}

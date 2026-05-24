"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  Download,
  Pencil,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLES = [
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

type AdminUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  campusId: string | null;
  campusName: string | null;
  subgroupId: string | null;
  subgroupName: string | null;
  groupId: string | null;
  groupName: string | null;
  onboardingCompleted: boolean;
  isActive: boolean;
  currentLeadershipRole: string | null;
  createdAt: string;
};

type SelectOption = { id: string; name: string };

function statusColor(user: AdminUser) {
  if (!user.isActive) return "border-rose-100 bg-rose-50 text-rose-700";
  if (!user.onboardingCompleted) return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function statusLabel(user: AdminUser) {
  if (!user.isActive) return "Deactivated";
  if (!user.onboardingCompleted) return "Pending";
  return "Active";
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? "Request failed");
  return j as T;
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

function EditModal({
  user,
  campuses,
  subgroups,
  groups,
  onClose,
  onSave,
}: {
  user: AdminUser;
  campuses: SelectOption[];
  subgroups: SelectOption[];
  groups: SelectOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [role, setRole] = useState(user.role ?? "");
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
            <p className="text-sm text-zinc-500">{user.fullName ?? user.email}</p>
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
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-zinc-300"
            />
            <label htmlFor="isActive" className="text-sm text-zinc-700">Account active</label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <input
              type="checkbox"
              id="resetOnboarding"
              checked={resetOnboarding}
              onChange={(e) => setResetOnboarding(e.target.checked)}
              className="size-4 rounded border-amber-300"
            />
            <label htmlFor="resetOnboarding" className="text-sm text-amber-800">
              Reset onboarding status
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="rounded-lg border-zinc-200">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-black text-white hover:bg-zinc-800"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [campuses, setCampuses] = useState<SelectOption[]>([]);
  const [subgroups, setSubgroups] = useState<SelectOption[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [campusFilter, setCampusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(campusFilter && { campus_id: campusFilter }),
        ...(onboardingFilter && { onboarding: onboardingFilter }),
        ...(activeFilter && { active: activeFilter }),
      });
      const { users: u, total: t } = await apiJson<{ users: AdminUser[]; total: number }>(
        `/api/admin/users?${params}`
      );
      setUsers(u);
      setTotal(t);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, campusFilter, onboardingFilter, activeFilter]);

  useEffect(() => { void load(); }, [load]);

  // Load structure options once
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

  function exportCsv() {
    window.open("/api/admin/users/export", "_blank");
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search users..." showDate={false}>

        {/* Hero */}
        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                User Management
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Leadership User Ecosystem
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-500">
                {loading ? "Loading…" : `${total.toLocaleString()} leaders`} — search, filter, edit roles, assign campuses, and export.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={exportCsv} className="rounded-lg border-zinc-200">
                <Download className="size-4" /> Export CSV
              </Button>
              <Button className="rounded-lg bg-black text-white hover:bg-zinc-800">
                <UserPlus className="size-4" /> Add user
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Search + Filters */}
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name or email..."
                    className="rounded-lg border-zinc-200 pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters((v) => !v)}
                  className="rounded-lg border-zinc-200"
                >
                  Filters <ChevronDown className={cn("ml-1 size-4 transition-transform", showFilters && "rotate-180")} />
                </Button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                        <option value="">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select value={campusFilter} onChange={(e) => { setCampusFilter(e.target.value); setPage(1); }}
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                        <option value="">All campuses</option>
                        {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select value={onboardingFilter} onChange={(e) => { setOnboardingFilter(e.target.value); setPage(1); }}
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
                        <option value="">All onboarding statuses</option>
                        <option value="true">Onboarding completed</option>
                        <option value="false">Onboarding pending</option>
                      </select>
                      <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
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
        </motion.section>

        {/* User list */}
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                All leaders
              </CardTitle>
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
                <div key={user.id} className="rounded-lg border border-zinc-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                        {initials(user.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading truncate font-semibold text-zinc-950">
                          {user.fullName ?? "Unnamed"}
                        </p>
                        <p className="truncate text-sm text-zinc-500">
                          {user.email ?? "—"} · {user.role ?? "No role"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {user.campusName ?? "No campus"}
                          {user.subgroupName ? ` · ${user.subgroupName}` : ""}
                          {user.groupName ? ` · ${user.groupName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("rounded-md border text-xs hover:bg-inherit", statusColor(user))}>
                        {statusLabel(user)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-zinc-200"
                        onClick={() => setEditUser(user)}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    </div>
                  </div>
                </div>
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
                        onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        Prev
                      </Button>
                      <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
                      <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* Edit Modal */}
        <AnimatePresence>
          {editUser && (
            <EditModal
              user={editUser}
              campuses={campuses}
              subgroups={subgroups}
              groups={groups}
              onClose={() => setEditUser(null)}
              onSave={() => void load()}
            />
          )}
        </AnimatePresence>

      </DashboardShell>
    </ProtectedRoute>
  );
}

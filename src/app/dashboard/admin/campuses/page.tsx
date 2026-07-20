"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Check,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Campus = {
  id: string;
  name: string;
  isActive: boolean;
  subgroupId: string | null;
  subgroupName: string | null;
  groupName: string | null;
  pastorName: string | null;
  leaderCount: number;
};

type Subgroup = { id: string; name: string; groupName: string | null };

async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export default function CampusesAdminPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSubgroupId, setAddSubgroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubgroupId, setEditSubgroupId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [{ campuses: c }, { subgroups: s }] = await Promise.all([
        apiJson<{ campuses: Campus[] }>("/api/admin/campuses"),
        apiJson<{ subgroups: Subgroup[] }>("/api/admin/subgroups"),
      ]);
      setCampuses(c);
      setSubgroups(s);
    } catch {
      setError("Failed to load campuses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiJson("/api/admin/campuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), subgroupId: addSubgroupId || null }),
      });
      setAddName("");
      setAddSubgroupId("");
      setShowAdd(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/admin/campuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          subgroupId: editSubgroupId || null,
        }),
      });
      setEditId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(campus: Campus) {
    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/admin/campuses/${campus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !campus.isActive }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = campuses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.subgroupName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.groupName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin", "Group Admin", "Campus Admin"]}>
      <DashboardShell searchPlaceholder="Search campuses...">

        {/* Hero */}
        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                Admin · Campus Management
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Manage Campuses
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-500">
                View, create, edit, and archive campuses. Attach campuses to subgroups and track leader counts.
              </p>
            </div>
            <Button
              onClick={() => { setShowAdd(true); setError(""); }}
              className="rounded-lg bg-black text-white hover:bg-zinc-800 shrink-0"
            >
              <Plus className="size-4" /> New campus
            </Button>
          </div>
        </motion.section>

        {/* Add form */}
        {showAdd && (
          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-base font-semibold">Add new campus</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Campus name *</label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Harvesters Lagos Island"
                    className="rounded-lg border-zinc-200"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Subgroup (optional)</label>
                  <select
                    value={addSubgroupId}
                    onChange={(e) => setAddSubgroupId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                  >
                    <option value="">— None —</option>
                    {subgroups.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.groupName ? ` (${s.groupName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdd}
                    disabled={saving || !addName.trim()}
                    className="rounded-lg bg-black text-white hover:bg-zinc-800"
                  >
                    <Check className="size-4" /> Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowAdd(false); setAddName(""); setError(""); }}
                    className="rounded-lg border-zinc-200"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {error && (
          <motion.div variants={shellItem} className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </motion.div>
        )}

        {/* Search */}
        <motion.section variants={shellItem}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by campus, subgroup, or group..."
            className="rounded-lg border-zinc-200"
          />
        </motion.section>

        {/* Summary */}
        <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total campuses", value: campuses.length },
            { label: "Active", value: campuses.filter((c) => c.isActive).length },
            { label: "Total leaders", value: campuses.reduce((a, c) => a + c.leaderCount, 0) },
          ].map((stat) => (
            <motion.div key={stat.label} variants={shellItem}>
              <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                  <Building2 className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-semibold text-zinc-950">
                    {loading ? "…" : stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* Campus list */}
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">All campuses</CardTitle>
              <p className="text-sm text-zinc-500">{filtered.length} campus{filtered.length !== 1 ? "es" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {loading && (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
                  ))}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-zinc-400">No campuses found.</p>
              )}
              {filtered.map((campus) => (
                <div key={campus.id} className={cn(
                  "rounded-lg border border-zinc-100 p-4",
                  !campus.isActive && "opacity-60"
                )}>
                  {editId === campus.id ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border-zinc-200"
                          onKeyDown={(e) => e.key === "Enter" && handleEdit(campus.id)}
                          autoFocus
                        />
                      </div>
                      <div className="flex-1">
                        <select
                          value={editSubgroupId}
                          onChange={(e) => setEditSubgroupId(e.target.value)}
                          className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                        >
                          <option value="">— No subgroup —</option>
                          {subgroups.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.groupName ? ` (${s.groupName})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(campus.id)} disabled={saving}
                          className="rounded-lg bg-black text-white hover:bg-zinc-800">
                          <Check className="size-3.5" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}
                          className="rounded-lg border-zinc-200">
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-zinc-950">{campus.name}</p>
                          <p className="text-sm text-zinc-500">
                            {campus.subgroupName ? `${campus.subgroupName}` : "No subgroup"}
                            {campus.groupName ? ` · ${campus.groupName}` : ""}
                            {campus.pastorName ? ` · ${campus.pastorName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-950">{campus.leaderCount} leaders</p>
                          <Badge className={cn(
                            "mt-0.5 rounded-md border text-xs hover:bg-inherit",
                            campus.isActive
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-zinc-100 text-zinc-500"
                          )}>
                            {campus.isActive ? "Active" : "Archived"}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-zinc-200"
                            onClick={() => {
                              setEditId(campus.id);
                              setEditName(campus.name);
                              setEditSubgroupId(campus.subgroupId ?? "");
                              setError("");
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn("rounded-lg border-zinc-200 text-xs",
                              campus.isActive ? "text-amber-700 hover:bg-amber-50" : "text-emerald-700 hover:bg-emerald-50"
                            )}
                            onClick={() => handleToggleActive(campus)}
                            disabled={saving}
                          >
                            {campus.isActive ? "Archive" : "Restore"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>

      </DashboardShell>
    </ProtectedRoute>
  );
}

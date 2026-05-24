"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Layers, Pencil, Plus, X } from "lucide-react";

import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Subgroup = {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  campusCount: number;
  leaderCount: number;
};

type Group = { id: string; name: string };

async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export default function SubgroupsAdminPage() {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addGroupId, setAddGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroupId, setEditGroupId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [{ subgroups: s }, { groups: g }] = await Promise.all([
        apiJson<{ subgroups: Subgroup[] }>("/api/admin/subgroups"),
        apiJson<{ groups: Group[] }>("/api/admin/groups"),
      ]);
      setSubgroups(s);
      setGroups(g);
    } catch {
      setError("Failed to load subgroups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiJson("/api/admin/subgroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), groupId: addGroupId || null }),
      });
      setAddName(""); setAddGroupId(""); setShowAdd(false);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/admin/subgroups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), groupId: editGroupId || null }),
      });
      setEditId(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = subgroups.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.groupName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search subgroups...">

        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                Admin · Subgroup Management
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Manage Subgroups
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-500">
                View, create, and edit subgroups. Attach subgroups to groups and view their campus and leader counts.
              </p>
            </div>
            <Button
              onClick={() => { setShowAdd(true); setError(""); }}
              className="rounded-lg bg-black text-white hover:bg-zinc-800 shrink-0"
            >
              <Plus className="size-4" /> New subgroup
            </Button>
          </div>
        </motion.section>

        {showAdd && (
          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-base font-semibold">Add new subgroup</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Subgroup name *</label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Lagos Island Subgroup"
                    className="rounded-lg border-zinc-200"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Group (optional)</label>
                  <select value={addGroupId} onChange={(e) => setAddGroupId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm">
                    <option value="">— None —</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={saving || !addName.trim()}
                    className="rounded-lg bg-black text-white hover:bg-zinc-800">
                    <Check className="size-4" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAdd(false); setAddName(""); setError(""); }}
                    className="rounded-lg border-zinc-200">
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

        <motion.section variants={shellItem}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by subgroup or group name..."
            className="rounded-lg border-zinc-200" />
        </motion.section>

        <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total subgroups", value: subgroups.length },
            { label: "Total campuses", value: subgroups.reduce((a, s) => a + s.campusCount, 0) },
            { label: "Total leaders", value: subgroups.reduce((a, s) => a + s.leaderCount, 0) },
          ].map((stat) => (
            <motion.div key={stat.label} variants={shellItem}>
              <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                  <Layers className="size-4 text-zinc-400" />
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

        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">All subgroups</CardTitle>
              <p className="text-sm text-zinc-500">{filtered.length} subgroup{filtered.length !== 1 ? "s" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {loading && [1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
              ))}
              {!loading && filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-zinc-400">No subgroups found.</p>
              )}
              {filtered.map((sg) => (
                <div key={sg.id} className="rounded-lg border border-zinc-100 p-4">
                  {editId === sg.id ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border-zinc-200" autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleEdit(sg.id)} />
                      </div>
                      <div className="flex-1">
                        <select value={editGroupId} onChange={(e) => setEditGroupId(e.target.value)}
                          className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm">
                          <option value="">— No group —</option>
                          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(sg.id)} disabled={saving}
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
                          <Layers className="size-4" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-zinc-950">{sg.name}</p>
                          <p className="text-sm text-zinc-500">
                            {sg.groupName ?? "No group"} · {sg.campusCount} campus{sg.campusCount !== 1 ? "es" : ""} · {sg.leaderCount} leaders
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                        onClick={() => { setEditId(sg.id); setEditName(sg.name); setEditGroupId(sg.groupId ?? ""); setError(""); }}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
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

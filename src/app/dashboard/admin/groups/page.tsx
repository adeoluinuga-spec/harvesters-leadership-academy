"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Network, Pencil, Plus, X } from "lucide-react";

import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Group = {
  id: string;
  name: string;
  subgroupCount: number;
  campusCount: number;
  leaderCount: number;
  pastorName: string | null;
};

async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export default function GroupsAdminPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { groups: g } = await apiJson<{ groups: Group[] }>("/api/admin/groups");
      setGroups(g);
    } catch { setError("Failed to load groups."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true); setError("");
    try {
      await apiJson("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim() }),
      });
      setAddName(""); setShowAdd(false); await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true); setError("");
    try {
      await apiJson(`/api/admin/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditId(null); await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin", "Group Admin", "Campus Admin"]}>
      <DashboardShell searchPlaceholder="Search groups...">

        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                Admin · Group Management
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Manage Groups
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-500">
                View and edit ministry groups. See group pastor, subgroup count, campus count, and total leaders.
              </p>
            </div>
            <Button onClick={() => { setShowAdd(true); setError(""); }}
              className="rounded-lg bg-black text-white hover:bg-zinc-800 shrink-0">
              <Plus className="size-4" /> New group
            </Button>
          </div>
        </motion.section>

        {showAdd && (
          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-base font-semibold">Add new group</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Group name *</label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Lagos Group"
                    className="rounded-lg border-zinc-200"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
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
            placeholder="Filter by group name..." className="rounded-lg border-zinc-200" />
        </motion.section>

        <motion.section variants={shellContainer} className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Groups", value: groups.length },
            { label: "Subgroups", value: groups.reduce((a, g) => a + g.subgroupCount, 0) },
            { label: "Campuses", value: groups.reduce((a, g) => a + g.campusCount, 0) },
            { label: "Leaders", value: groups.reduce((a, g) => a + g.leaderCount, 0) },
          ].map((stat) => (
            <motion.div key={stat.label} variants={shellItem}>
              <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                  <Network className="size-4 text-zinc-400" />
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
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">All groups</CardTitle>
              <p className="text-sm text-zinc-500">{filtered.length} group{filtered.length !== 1 ? "s" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {loading && [1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
              ))}
              {!loading && filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-zinc-400">No groups found.</p>
              )}
              {filtered.map((group) => (
                <div key={group.id} className="rounded-lg border border-zinc-100 p-4">
                  {editId === group.id ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border-zinc-200" autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleEdit(group.id)} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(group.id)} disabled={saving}
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
                          <Network className="size-4" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-zinc-950">{group.name}</p>
                          <p className="text-sm text-zinc-500">
                            {group.subgroupCount} subgroup{group.subgroupCount !== 1 ? "s" : ""} · {group.campusCount} campus{group.campusCount !== 1 ? "es" : ""} · {group.leaderCount} leaders
                            {group.pastorName ? ` · ${group.pastorName}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-lg border-zinc-200"
                        onClick={() => { setEditId(group.id); setEditName(group.name); setError(""); }}>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMinistryCampuses, MinistryCampusOption } from "@/lib/auth";

type Unit = { id: string; name: string; unit_type: string; campus_id: string; parent_id: string | null };
const labels: Record<string, string> = { direction: "Direction", team_district: "Team / District", subteam_community: "Sub-Team / Community", department_zone: "Department / Zone", unit_area: "Unit / Area", cell: "Cell" };
const order = ["direction", "team_district", "subteam_community", "department_zone", "unit_area", "cell"];

function StructurePage() {
  const [campuses, setCampuses] = useState<MinistryCampusOption[]>([]);
  const [campusId, setCampusId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("direction");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadUnits(id = campusId) {
    const response = await fetch(`/api/admin/ministry-units${id ? `?campusId=${id}` : ""}`);
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not load campus structure.");
    setUnits(json.units ?? []);
  }

  useEffect(() => { fetchMinistryCampuses().then((data) => { setCampuses(data); if (data[0]) setCampusId(data[0].id); }).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (campusId) loadUnits().catch((e) => setError(e.message)); }, [campusId]);

  const eligibleParents = useMemo(() => {
    const index = order.indexOf(unitType);
    if (index < 1) return [];
    return units.filter((unit) => unit.unit_type === order[index - 1]);
  }, [unitType, units]);

  async function createUnit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/ministry-units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, campusId, unitType, parentId: parentId || null }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Could not create structure unit.");
      setName(""); setParentId(""); await loadUnits();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create structure unit."); } finally { setSaving(false); }
  }

  return <DashboardShell showDate={false} searchPlaceholder="Search campus structure…">
    <div className="mb-6"><p className="text-sm text-zinc-500">Campus operations</p><h1 className="font-heading text-3xl font-semibold text-zinc-950">Structure management</h1><p className="mt-2 text-sm text-zinc-500">Build the ministry pathway from Directions to Cells. Each layer must be created in order.</p></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card><CardHeader><CardTitle>Campus structure</CardTitle><select value={campusId} onChange={(e) => setCampusId(e.target.value)} className="mt-3 h-10 rounded-lg border border-zinc-200 px-3 text-sm">{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></CardHeader><CardContent className="space-y-4">
        {order.map((type) => <div key={type} className="rounded-lg border border-zinc-100 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{labels[type]}</p><div className="mt-2 space-y-1">{units.filter((unit) => unit.unit_type === type).map((unit) => <p key={unit.id} className="text-sm font-medium text-zinc-800">{unit.name}</p>)}{!units.some((unit) => unit.unit_type === type) ? <p className="text-sm text-zinc-400">None created yet</p> : null}</div></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Add structure layer</CardTitle></CardHeader><CardContent><form onSubmit={createUnit} className="space-y-4"><label className="block text-sm font-medium">Layer<select value={unitType} onChange={(e) => { setUnitType(e.target.value); setParentId(""); }} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3">{order.map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label><label className="block text-sm font-medium">Name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3" /></label>{unitType !== "direction" ? <label className="block text-sm font-medium">Parent<select required value={parentId} onChange={(e) => setParentId(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3"><option value="">Choose parent…</option>{eligibleParents.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label> : null}{error ? <p className="text-sm text-rose-600">{error}</p> : null}<Button disabled={saving || !campusId} className="w-full"><Plus className="size-4" />{saving ? "Saving…" : "Create layer"}</Button></form></CardContent></Card>
    </div>
  </DashboardShell>;
}

export default function Page() { return <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin", "Group Admin", "Campus Admin"]}><StructurePage /></ProtectedRoute>; }

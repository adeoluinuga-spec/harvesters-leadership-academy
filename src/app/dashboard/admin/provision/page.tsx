"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Network, Send } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ProvisionPage() {
  const params = useSearchParams(); const router = useRouter();
  const type = params.get("type") === "organization" ? "organization" : "group";
  const [name, setName] = useState(""); const [leaderName, setLeaderName] = useState(""); const [leaderEmail, setLeaderEmail] = useState("");
  const [role, setRole] = useState(type === "group" ? "Group Pastor" : "Platform Super Admin");
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => { setRole(type === "group" ? "Group Pastor" : "Platform Super Admin"); setDone(false); setError(""); }, [type]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const response = await fetch("/api/admin/provision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, leaderName, leaderEmail, leaderRole: role }) }); const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Provisioning failed."); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Provisioning failed."); } finally { setSaving(false); }
  }
  const label = type === "group" ? "Group" : "Organisation";
  return <DashboardShell showDate={false}>
    <div className="mb-6"><p className="text-sm text-zinc-500">Platform setup</p><h1 className="font-heading text-3xl font-semibold">Add {label}</h1><p className="mt-2 text-sm text-zinc-500">Create the operating scope and send its first leadership invitation.</p></div>
    {done ? <Card className="max-w-2xl border-emerald-200 bg-emerald-50"><CardContent className="p-8 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600"/><h2 className="mt-4 font-heading text-xl font-semibold">Invitation sent</h2><p className="mt-2 text-sm text-emerald-800">{leaderName} has been invited to complete onboarding as {role}.</p><Button className="mt-6" onClick={() => router.push(type === "group" ? "/dashboard/admin/groups" : "/dashboard/admin")}>Continue</Button></CardContent></Card> : <Card className="max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2">{type === "group" ? <Network className="size-5"/> : <Building2 className="size-5"/>} {label} setup</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">{label} name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3"/></label><label className="block text-sm font-medium">Lead name<input required value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3"/></label><label className="block text-sm font-medium">Lead email<input required type="email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3"/></label><label className="block text-sm font-medium">Initial role<select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3">{(type === "group" ? ["Group Pastor", "Group Admin"] : ["Platform Super Admin"]).map((value) => <option key={value}>{value}</option>)}</select></label>{error ? <p className="text-sm text-rose-600">{error}</p> : null}<Button disabled={saving} className="w-full"><Send className="size-4"/>{saving ? "Creating and sending…" : `Create ${label} and send invite`}</Button></form></CardContent></Card>}
  </DashboardShell>;
}
export default function Page(){return <ProtectedRoute allowedRoles={["Platform Super Admin","Super Admin","Admin"]}><ProvisionPage/></ProtectedRoute>}

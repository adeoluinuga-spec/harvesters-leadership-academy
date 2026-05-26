"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { CommsShell } from "@/components/comms/comms-shell";
import { shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  fetchCampaigns,
  createCampaign,
  SCOPE_LABELS,
  scopeColor,
  timeAgo,
  type CommCampaign,
  type AudienceScope,
  type CampaignStatus,
} from "@/lib/comms";

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    />
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    />
  );
}

function CampaignCard({ campaign }: { campaign: CommCampaign }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <Layers className="size-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-zinc-950">{campaign.name}</p>
            {campaign.description && (
              <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[campaign.status]}>{campaign.status}</Badge>
          <Badge className={scopeColor(campaign.audience_scope)}>{SCOPE_LABELS[campaign.audience_scope]}</Badge>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Messages", value: campaign.message_count },
          { label: "Recipients", value: campaign.recipient_count.toLocaleString() },
          { label: "Created", value: timeAgo(campaign.created_at) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-zinc-950">{s.value}</p>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateCampaignDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (c: CommCampaign) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<AudienceScope>("platform");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Campaign name is required."); return; }
    setSaving(true);
    const id = await createCampaign({ name: name.trim(), description: description.trim() || undefined, audience_scope: scope });
    if (!id) { setError("Failed to create campaign."); setSaving(false); return; }
    const campaigns = await fetchCampaigns();
    const created = campaigns.find((c) => c.id === id);
    if (created) onCreated(created);
    setSaving(false);
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-zinc-500" />
          <h3 className="font-heading text-sm font-semibold text-zinc-950">New Campaign</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />{error}
          </div>
        )}
        <Field label="Campaign name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Leadership Certification Drive" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this campaign about?" />
        </Field>
        <Field label="Audience scope">
          <Select value={scope} onChange={(e) => setScope(e.target.value as AudienceScope)}>
            {(Object.entries(SCOPE_LABELS) as [AudienceScope, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
          Create campaign
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CommCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCampaigns().then((data) => { if (active) { setCampaigns(data); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    totalMessages: campaigns.reduce((s, c) => s + c.message_count, 0),
    totalRecipients: campaigns.reduce((s, c) => s + c.recipient_count, 0),
  };

  return (
    <CommsShell>
      <motion.div variants={shellItem} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Campaigns", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Total messages", value: stats.totalMessages },
          { label: "Total recipients", value: stats.totalRecipients.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xl font-bold text-zinc-950">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {creating && (
        <motion.div variants={shellItem}>
          <CreateCampaignDrawer
            onClose={() => setCreating(false)}
            onCreated={(c) => { setCampaigns((prev) => [c, ...prev]); }}
          />
        </motion.div>
      )}

      <motion.div variants={shellItem} className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-zinc-950">
          All campaigns <span className="text-zinc-400">({campaigns.length})</span>
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            New campaign
          </button>
        )}
      </motion.div>

      <motion.div variants={shellItem} className="space-y-3">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-100 bg-white p-5">
              <div className="h-4 w-1/3 rounded bg-zinc-100" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => <div key={j} className="h-12 rounded-lg bg-zinc-100" />)}
              </div>
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center">
            <Layers className="size-10 text-zinc-200" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No campaigns yet</p>
            <p className="mt-1 text-xs text-zinc-400">Group related announcements into a named campaign.</p>
          </div>
        ) : (
          campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)
        )}
      </motion.div>
    </CommsShell>
  );
}

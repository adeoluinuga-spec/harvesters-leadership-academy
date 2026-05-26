"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { CommsShell } from "@/components/comms/comms-shell";
import { shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  fetchReminderRules,
  createReminderRule,
  updateReminderRule,
  triggerReminderRule,
  TRIGGER_LABELS,
  SCOPE_LABELS,
  scopeColor,
  timeAgo,
  type ReminderRule,
  type AudienceScope,
} from "@/lib/comms";

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

function RuleCard({
  rule,
  onToggle,
  onTrigger,
}: {
  rule: ReminderRule;
  onToggle: (id: string, active: boolean) => void;
  onTrigger: (id: string) => Promise<number>;
}) {
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<number | null>(null);

  async function handleTrigger() {
    setTriggering(true);
    setTriggerResult(null);
    const count = await onTrigger(rule.id);
    setTriggerResult(count);
    setTriggering(false);
  }

  return (
    <div className={cn("rounded-xl border bg-white p-5", rule.is_active ? "border-zinc-200" : "border-zinc-100 opacity-70")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", rule.is_active ? "bg-amber-50" : "bg-zinc-50")}>
            <BellRing className={cn("size-5", rule.is_active ? "text-amber-600" : "text-zinc-400")} />
          </div>
          <div>
            <p className="font-semibold text-zinc-950">{rule.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {TRIGGER_LABELS[rule.trigger_type]} — after {rule.trigger_days} day{rule.trigger_days !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={scopeColor(rule.audience_scope as AudienceScope)}>
            {SCOPE_LABELS[rule.audience_scope as AudienceScope]}
          </Badge>
          <button
            type="button"
            onClick={() => onToggle(rule.id, !rule.is_active)}
            className="text-zinc-400 transition-colors hover:text-zinc-700"
          >
            {rule.is_active ? (
              <ToggleRight className="size-5 text-emerald-500" />
            ) : (
              <ToggleLeft className="size-5" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
        <p className="text-xs font-semibold text-zinc-500">Message preview</p>
        <p className="mt-1 text-sm font-medium text-zinc-950">{rule.message_title}</p>
        <p className="mt-0.5 text-xs text-zinc-600 line-clamp-2">{rule.message_body}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {rule.last_triggered_at ? `Last run ${timeAgo(rule.last_triggered_at)}` : "Never triggered"}
          </span>
          <span>Triggered {rule.trigger_count}×</span>
        </div>
        <div className="flex items-center gap-2">
          {triggerResult !== null && (
            <span className="text-xs text-emerald-600 font-medium">
              ✓ {triggerResult} notified
            </span>
          )}
          <button
            type="button"
            onClick={handleTrigger}
            disabled={triggering || !rule.is_active}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            {triggering ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            Run now
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRuleDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (r: ReminderRule) => void }) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<ReminderRule["trigger_type"]>("enrolled_inactive");
  const [triggerDays, setTriggerDays] = useState(7);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [scope, setScope] = useState<AudienceScope>("platform");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    if (!messageTitle.trim()) { setError("Message title is required."); return; }
    if (!messageBody.trim()) { setError("Message body is required."); return; }
    setSaving(true);
    const id = await createReminderRule({
      name: name.trim(),
      trigger_type: triggerType,
      trigger_days: triggerDays,
      message_title: messageTitle.trim(),
      message_body: messageBody.trim(),
      audience_scope: scope,
      is_active: true,
    });
    if (!id) { setError("Failed to create rule."); setSaving(false); return; }
    const rules = await fetchReminderRules();
    const created = rules.find((r) => r.id === id);
    if (created) onCreated(created);
    setSaving(false);
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-zinc-500" />
          <h3 className="font-heading text-sm font-semibold text-zinc-950">New Reminder Rule</h3>
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
        <Field label="Rule name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 7-day inactivity nudge" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Trigger condition">
            <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value as ReminderRule["trigger_type"])}>
              {(Object.entries(TRIGGER_LABELS) as [ReminderRule["trigger_type"], string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="After how many days">
            <Input
              type="number"
              min={1}
              max={365}
              value={triggerDays}
              onChange={(e) => setTriggerDays(parseInt(e.target.value) || 7)}
            />
          </Field>
        </div>
        <Field label="Audience scope">
          <Select value={scope} onChange={(e) => setScope(e.target.value as AudienceScope)}>
            {(Object.entries(SCOPE_LABELS) as [AudienceScope, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notification title">
          <Input value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} placeholder="Reminder title sent to leaders…" />
        </Field>
        <Field label="Notification body">
          <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={3} placeholder="Message leaders will receive…" />
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
          Create rule
        </button>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchReminderRules().then((data) => { if (active) { setRules(data); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function handleToggle(id: string, active: boolean) {
    await updateReminderRule(id, { is_active: active });
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: active } : r));
  }

  async function handleTrigger(id: string): Promise<number> {
    const result = await triggerReminderRule(id);
    if (result) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, last_triggered_at: new Date().toISOString(), trigger_count: r.trigger_count + 1 }
            : r
        )
      );
      return result.recipients_notified;
    }
    return 0;
  }

  const activeCount = rules.filter((r) => r.is_active).length;

  return (
    <CommsShell>
      <motion.div variants={shellItem} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total rules", value: rules.length },
          { label: "Active", value: activeCount },
          { label: "Disabled", value: rules.length - activeCount },
          { label: "Total triggers", value: rules.reduce((s, r) => s + r.trigger_count, 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xl font-bold text-zinc-950">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Info bar */}
      <motion.div variants={shellItem} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Reminder rules match leaders based on their activity data and send in-app notifications. Use "Run now" to trigger a rule manually, or configure automatic scheduling in your infrastructure.
        </p>
      </motion.div>

      {creating && (
        <motion.div variants={shellItem}>
          <CreateRuleDrawer
            onClose={() => setCreating(false)}
            onCreated={(r) => setRules((prev) => [r, ...prev])}
          />
        </motion.div>
      )}

      <motion.div variants={shellItem} className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-zinc-950">
          Reminder rules <span className="text-zinc-400">({rules.length})</span>
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            New rule
          </button>
        )}
      </motion.div>

      <motion.div variants={shellItem} className="space-y-3">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-100 bg-white p-5">
              <div className="flex gap-3">
                <div className="size-10 rounded-xl bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 rounded bg-zinc-100" />
                  <div className="h-3 w-1/3 rounded bg-zinc-100" />
                </div>
              </div>
            </div>
          ))
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center">
            <BellRing className="size-10 text-zinc-200" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No reminder rules yet</p>
            <p className="mt-1 text-xs text-zinc-400">Automate follow-ups for inactive or uncertified leaders.</p>
          </div>
        ) : (
          rules.map((r) => (
            <RuleCard key={r.id} rule={r} onToggle={handleToggle} onTrigger={handleTrigger} />
          ))
        )}
      </motion.div>
    </CommsShell>
  );
}

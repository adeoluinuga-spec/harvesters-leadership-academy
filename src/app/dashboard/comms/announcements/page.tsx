"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Megaphone,
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
  fetchMessages,
  createMessage,
  sendMessage,
  deleteMessage,
  SCOPE_LABELS,
  PRIORITY_LABELS,
  priorityColor,
  statusColor,
  scopeColor,
  timeAgo,
  type CommMessage,
  type AudienceScope,
  type MessagePriority,
} from "@/lib/comms";
import { COURSE_CATEGORIES, LEADERSHIP_CADRES } from "@/lib/lms-types";

// ─── Compose form state ────────────────────────────────────────

type ComposeState = {
  title: string;
  body: string;
  priority: MessagePriority;
  audience_scope: AudienceScope;
  audience_group_id: string;
  audience_subgroup_id: string;
  audience_campus_id: string;
  audience_cadre: string;
  audience_course_id: string;
  cta_label: string;
  cta_url: string;
  scheduled_at: string;
};

const DEFAULT_COMPOSE: ComposeState = {
  title: "",
  body: "",
  priority: "normal",
  audience_scope: "platform",
  audience_group_id: "",
  audience_subgroup_id: "",
  audience_campus_id: "",
  audience_cadre: "",
  audience_course_id: "",
  cta_label: "",
  cta_url: "",
  scheduled_at: "",
};

// ─── Sub-components ───────────────────────────────────────────

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300",
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
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none",
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
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    />
  );
}

// ─── Message row ───────────────────────────────────────────────

function MessageRow({
  msg,
  onSend,
  onDelete,
}: {
  msg: CommMessage;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    await onSend(msg.id);
    setSending(false);
    setSent(true);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-start gap-4 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <Megaphone className="size-4 text-zinc-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-950">{msg.title}</p>
            <Badge className={statusColor(msg.status)}>{msg.status}</Badge>
            <Badge className={priorityColor(msg.priority)}>{PRIORITY_LABELS[msg.priority]}</Badge>
            <Badge className={scopeColor(msg.audience_scope)}>{SCOPE_LABELS[msg.audience_scope]}</Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{msg.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            {msg.status === "sent" && (
              <>
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {msg.recipient_count} recipients
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />
                  {msg.open_rate}% opened
                </span>
              </>
            )}
            <span>{timeAgo(msg.created_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {msg.status === "draft" && (
            <>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || sent}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-3 animate-spin" /> : sent ? <CheckCircle2 className="size-3" /> : <Send className="size-3" />}
                {sending ? "Sending…" : sent ? "Sent!" : "Send"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(msg.id)}
                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4">
          <p className="mb-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          {msg.status === "sent" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Recipients", value: msg.recipient_count },
                { label: "Read", value: msg.read_count },
                { label: "Open rate", value: `${msg.open_rate}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center">
                  <p className="text-lg font-bold text-zinc-950">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {msg.cta_label && msg.cta_url && (
            <a
              href={msg.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {msg.cta_label} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compose drawer ───────────────────────────────────────────

function ComposeDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (msg: CommMessage) => void;
}) {
  const [form, setForm] = useState<ComposeState>(DEFAULT_COMPOSE);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ComposeState>(k: K, v: ComposeState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(andSend = false) {
    setError(null);
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.body.trim()) { setError("Body is required."); return; }

    if (andSend) setSending(true); else setSaving(true);

    const id = await createMessage({
      title: form.title.trim(),
      body: form.body.trim(),
      type: "announcement",
      priority: form.priority,
      audience_scope: form.audience_scope,
      audience_group_id: form.audience_group_id || null,
      audience_subgroup_id: form.audience_subgroup_id || null,
      audience_campus_id: form.audience_campus_id || null,
      audience_cadre: form.audience_cadre || null,
      cta_label: form.cta_label || null,
      cta_url: form.cta_url || null,
      scheduled_at: form.scheduled_at || null,
    } as Partial<CommMessage>);

    if (!id) {
      setError("Failed to create announcement.");
      setSaving(false);
      setSending(false);
      return;
    }

    if (andSend) {
      await sendMessage(id);
    }

    // Refresh list
    const msgs = await fetchMessages({ type: "announcement" });
    const created = msgs.find((m) => m.id === id);
    if (created) onCreated(created);
    setSaving(false);
    setSending(false);
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-zinc-500" />
          <h3 className="font-heading text-sm font-semibold text-zinc-950">New Announcement</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Title" required>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Announcement title…"
              />
            </Field>
          </div>

          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value as MessagePriority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>

          <Field label="Audience scope">
            <Select
              value={form.audience_scope}
              onChange={(e) => set("audience_scope", e.target.value as AudienceScope)}
            >
              {(Object.entries(SCOPE_LABELS) as [AudienceScope, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>

          {form.audience_scope === "cadre" && (
            <div className="md:col-span-2">
              <Field label="Leadership cadre">
                <Select value={form.audience_cadre} onChange={(e) => set("audience_cadre", e.target.value)}>
                  <option value="">Select cadre…</option>
                  {LEADERSHIP_CADRES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          )}

          <div className="md:col-span-2">
            <Field label="Message body" required>
              <Textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={5}
                placeholder="Write your announcement…"
              />
            </Field>
          </div>

          <Field label="CTA button label (optional)">
            <Input
              value={form.cta_label}
              onChange={(e) => set("cta_label", e.target.value)}
              placeholder="e.g. View course"
            />
          </Field>

          <Field label="CTA link (optional)">
            <Input
              value={form.cta_url}
              onChange={(e) => set("cta_url", e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Schedule send (optional)">
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || sending}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving || sending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {sending ? "Sending…" : "Send now"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<"all" | "draft" | "sent">("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMessages({ type: "announcement" }).then((data) => {
      if (active) { setMessages(data); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function handleSend(id: string) {
    const result = await sendMessage(id);
    if (result) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "sent", sent_at: new Date().toISOString(), recipient_count: result.recipient_count }
            : m
        )
      );
    }
  }

  async function handleDelete(id: string) {
    await deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered =
    filter === "all" ? messages : messages.filter((m) => m.status === filter);

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.status === "sent").length,
    drafts: messages.filter((m) => m.status === "draft").length,
    totalRecipients: messages.reduce((s, m) => s + (m.recipient_count ?? 0), 0),
  };

  return (
    <CommsShell>
      {/* Stats bar */}
      <motion.div variants={shellItem} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Drafts", value: stats.drafts },
          { label: "Recipients reached", value: stats.totalRecipients.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xl font-bold text-zinc-950">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Compose toggle */}
      {composing && (
        <motion.div variants={shellItem}>
          <ComposeDrawer
            onClose={() => setComposing(false)}
            onCreated={(msg) => setMessages((prev) => [msg, ...prev])}
          />
        </motion.div>
      )}

      {/* List header */}
      <motion.div variants={shellItem} className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {(["all", "sent", "draft"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            New announcement
          </button>
        )}
      </motion.div>

      {/* Messages list */}
      <motion.div variants={shellItem} className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-zinc-100 bg-white p-4">
                <div className="flex gap-4">
                  <div className="size-9 rounded-lg bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-zinc-100" />
                    <div className="h-3 w-2/3 rounded bg-zinc-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center">
            <Megaphone className="size-10 text-zinc-200" />
            <p className="mt-3 text-sm font-medium text-zinc-500">
              {filter === "all" ? "No announcements yet" : `No ${filter} announcements`}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Create your first announcement to reach your leadership network.
            </p>
            {!composing && (
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Plus className="size-3.5" />
                New announcement
              </button>
            )}
          </div>
        ) : (
          filtered.map((msg) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              onSend={handleSend}
              onDelete={handleDelete}
            />
          ))
        )}
      </motion.div>
    </CommsShell>
  );
}

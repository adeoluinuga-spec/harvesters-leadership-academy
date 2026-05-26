"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { CommsShell } from "@/components/comms/comms-shell";
import { shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  fetchTemplates,
  createTemplate,
  deleteTemplate,
  PRIORITY_LABELS,
  priorityColor,
  timeAgo,
  type CommTemplate,
  type MessagePriority,
  type MessageType,
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

function TemplateCard({
  template,
  onDelete,
  onUse,
}: {
  template: CommTemplate;
  onDelete: (id: string) => void;
  onUse: (t: CommTemplate) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
            <ScrollText className="size-4 text-zinc-500" />
          </div>
          <div>
            <p className="font-semibold text-zinc-950">{template.name}</p>
            {template.description && (
              <p className="mt-0.5 text-xs text-zinc-500">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {template.is_global && (
            <Badge className="bg-violet-100 text-violet-700">Global</Badge>
          )}
          <Badge className={priorityColor(template.priority as MessagePriority)}>
            {PRIORITY_LABELS[template.priority as MessagePriority] ?? template.priority}
          </Badge>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
        <p className="text-xs font-semibold text-zinc-500">Preview</p>
        <p className="mt-1 text-sm font-medium text-zinc-950">{template.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{template.body}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{timeAgo(template.created_at)}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUse(template)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Copy className="size-3" />
            Use template
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTemplateDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: CommTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MessageType>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Template name is required."); return; }
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim()) { setError("Body is required."); return; }
    setSaving(true);
    const id = await createTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      title: title.trim(),
      body: body.trim(),
      priority,
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
    } as Partial<CommTemplate>);
    if (!id) { setError("Failed to create template."); setSaving(false); return; }
    const templates = await fetchTemplates();
    const created = templates.find((t) => t.id === id);
    if (created) onCreated(created);
    setSaving(false);
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-zinc-500" />
          <h3 className="font-heading text-sm font-semibold text-zinc-950">New Template</h3>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Template name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly leadership reminder" />
            </Field>
          </div>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as MessageType)}>
              <option value="announcement">Announcement</option>
              <option value="campaign">Campaign</option>
              <option value="reminder">Reminder</option>
            </Select>
          </Field>
          <Field label="Default priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as MessagePriority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Template description (optional)">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use this template…" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Default title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message title…" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Default body">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message body…" />
            </Field>
          </div>
          <Field label="CTA label (optional)">
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. View course" />
          </Field>
          <Field label="CTA URL (optional)">
            <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
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
          Save template
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CommTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTemplates().then((data) => { if (active) { setTemplates(data); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function handleDelete(id: string) {
    await deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function handleUse(t: CommTemplate) {
    // Navigate to announcements with template pre-fill (via query params for simplicity)
    window.location.href = `/dashboard/comms/announcements?template=${t.id}&title=${encodeURIComponent(t.title)}&body=${encodeURIComponent(t.body)}&priority=${t.priority}`;
  }

  return (
    <CommsShell>
      <motion.div variants={shellItem} className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { label: "Total templates", value: templates.length },
          { label: "Global", value: templates.filter((t) => t.is_global).length },
          { label: "Personal", value: templates.filter((t) => !t.is_global).length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xl font-bold text-zinc-950">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {creating && (
        <motion.div variants={shellItem}>
          <CreateTemplateDrawer
            onClose={() => setCreating(false)}
            onCreated={(t) => setTemplates((prev) => [t, ...prev])}
          />
        </motion.div>
      )}

      <motion.div variants={shellItem} className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-zinc-950">
          Templates <span className="text-zinc-400">({templates.length})</span>
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            New template
          </button>
        )}
      </motion.div>

      <motion.div variants={shellItem} className="grid gap-4 md:grid-cols-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-100 bg-white p-5">
              <div className="h-4 w-1/2 rounded bg-zinc-100" />
              <div className="mt-4 h-16 rounded-lg bg-zinc-50" />
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center">
            <ScrollText className="size-10 text-zinc-200" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No templates yet</p>
            <p className="mt-1 text-xs text-zinc-400">Save reusable message templates to speed up future communications.</p>
          </div>
        ) : (
          templates.map((t) => (
            <TemplateCard key={t.id} template={t} onDelete={handleDelete} onUse={handleUse} />
          ))
        )}
      </motion.div>
    </CommsShell>
  );
}

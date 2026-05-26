// ============================================================
// Communication Layer — client-side types and fetch helpers
// ============================================================

export type AudienceScope =
  | "platform"
  | "group"
  | "subgroup"
  | "campus"
  | "cadre"
  | "course"
  | "inactive"
  | "uncertified"
  | "specific";

export type MessagePriority = "low" | "normal" | "high" | "urgent";
export type MessageType = "announcement" | "campaign" | "reminder";
export type MessageStatus = "draft" | "scheduled" | "sent" | "cancelled";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type CommMessage = {
  id: string;
  sender_id: string;
  sender_role: string;
  type: MessageType;
  title: string;
  body: string;
  priority: MessagePriority;
  audience_scope: AudienceScope;
  audience_group_id: string | null;
  audience_subgroup_id: string | null;
  audience_campus_id: string | null;
  audience_cadre: string | null;
  audience_course_id: string | null;
  audience_user_ids: string[];
  cta_label: string | null;
  cta_url: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: MessageStatus;
  campaign_id: string | null;
  recipient_count: number;
  read_count: number;
  open_rate: number;
  created_at: string;
  updated_at: string;
};

export type CommTemplate = {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  type: MessageType;
  title: string;
  body: string;
  priority: MessagePriority;
  cta_label: string | null;
  cta_url: string | null;
  is_global: boolean;
  created_at: string;
};

export type CommCampaign = {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  audience_scope: AudienceScope;
  audience_group_id: string | null;
  audience_subgroup_id: string | null;
  audience_campus_id: string | null;
  message_count: number;
  recipient_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type ReminderRule = {
  id: string;
  created_by: string;
  name: string;
  trigger_type:
    | "enrolled_inactive"
    | "started_incomplete"
    | "assessment_incomplete"
    | "onboarding_incomplete"
    | "uncertified"
    | "no_enrollment";
  trigger_days: number;
  message_title: string;
  message_body: string;
  is_active: boolean;
  audience_scope: AudienceScope;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
};

export type CommsAnalytics = {
  summary: {
    total_sent: number;
    total_drafts: number;
    total_recipients: number;
    total_reads: number;
    open_rate: number;
  };
  timeline: { date: string; sent: number; reads: number }[];
  by_scope: Record<string, number>;
  by_priority: Record<string, number>;
  recent_messages: {
    id: string;
    type: string;
    priority: string;
    audience_scope: string;
    status: string;
    recipient_count: number;
    read_count: number;
    open_rate: number;
    sent_at: string | null;
  }[];
};

// ─── Fetch helpers ─────────────────────────────────────────────

export async function fetchMessages(params?: {
  status?: string;
  type?: string;
}): Promise<CommMessage[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  try {
    const res = await fetch(`/api/comms/messages?${qs}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { messages: CommMessage[] };
    return json.messages ?? [];
  } catch {
    return [];
  }
}

export async function createMessage(
  payload: Partial<CommMessage>
): Promise<string | null> {
  try {
    const res = await fetch("/api/comms/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch {
    return null;
  }
}

export async function sendMessage(id: string): Promise<{ recipient_count: number; warning?: string } | null> {
  try {
    const res = await fetch(`/api/comms/messages/${id}/send`, { method: "POST" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteMessage(id: string): Promise<void> {
  await fetch(`/api/comms/messages/${id}`, { method: "DELETE" });
}

export async function fetchMessageDetail(id: string): Promise<{
  message: CommMessage;
  analytics: { recipient_count: number; delivered_count: number; read_count: number; open_rate: number };
} | null> {
  try {
    const res = await fetch(`/api/comms/messages/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function markMessageRead(id: string): Promise<void> {
  await fetch(`/api/comms/messages/${id}/read`, { method: "POST" });
}

export async function fetchTemplates(): Promise<CommTemplate[]> {
  try {
    const res = await fetch("/api/comms/templates");
    if (!res.ok) return [];
    const json = (await res.json()) as { templates: CommTemplate[] };
    return json.templates ?? [];
  } catch {
    return [];
  }
}

export async function createTemplate(payload: Partial<CommTemplate>): Promise<string | null> {
  try {
    const res = await fetch("/api/comms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch {
    return null;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  await fetch(`/api/comms/templates/${id}`, { method: "DELETE" });
}

export async function fetchCampaigns(): Promise<CommCampaign[]> {
  try {
    const res = await fetch("/api/comms/campaigns");
    if (!res.ok) return [];
    const json = (await res.json()) as { campaigns: CommCampaign[] };
    return json.campaigns ?? [];
  } catch {
    return [];
  }
}

export async function createCampaign(payload: Partial<CommCampaign>): Promise<string | null> {
  try {
    const res = await fetch("/api/comms/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch {
    return null;
  }
}

export async function fetchCommsAnalytics(): Promise<CommsAnalytics | null> {
  try {
    const res = await fetch("/api/comms/analytics");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchReminderRules(): Promise<ReminderRule[]> {
  try {
    const res = await fetch("/api/comms/reminders");
    if (!res.ok) return [];
    const json = (await res.json()) as { rules: ReminderRule[] };
    return json.rules ?? [];
  } catch {
    return [];
  }
}

export async function createReminderRule(payload: Partial<ReminderRule>): Promise<string | null> {
  try {
    const res = await fetch("/api/comms/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch {
    return null;
  }
}

export async function updateReminderRule(id: string, patch: Partial<ReminderRule>): Promise<void> {
  await fetch("/api/comms/reminders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
}

export async function triggerReminderRule(ruleId: string): Promise<{ recipients_notified: number } | null> {
  try {
    const res = await fetch("/api/comms/reminders/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_id: ruleId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Label helpers ─────────────────────────────────────────────

export const SCOPE_LABELS: Record<AudienceScope, string> = {
  platform: "Entire Platform",
  group: "Group",
  subgroup: "Subgroup",
  campus: "Campus",
  cadre: "Leadership Cadre",
  course: "Course Enrolled",
  inactive: "Inactive Leaders",
  uncertified: "Leaders Without Certificate",
  specific: "Specific People",
};

export const PRIORITY_LABELS: Record<MessagePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const TRIGGER_LABELS: Record<ReminderRule["trigger_type"], string> = {
  enrolled_inactive: "Enrolled but inactive",
  started_incomplete: "Started but not finished",
  assessment_incomplete: "Assessment incomplete",
  onboarding_incomplete: "Onboarding incomplete",
  uncertified: "No certificate yet",
  no_enrollment: "Not enrolled in any course",
};

export function priorityColor(p: MessagePriority): string {
  return (
    {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      normal: "bg-blue-100 text-blue-700",
      low: "bg-zinc-100 text-zinc-600",
    }[p] ?? "bg-zinc-100 text-zinc-600"
  );
}

export function statusColor(s: MessageStatus): string {
  return (
    {
      sent: "bg-emerald-100 text-emerald-700",
      draft: "bg-zinc-100 text-zinc-600",
      scheduled: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-50 text-red-500",
    }[s] ?? "bg-zinc-100 text-zinc-600"
  );
}

export function scopeColor(s: AudienceScope): string {
  return (
    {
      platform: "bg-violet-100 text-violet-700",
      group: "bg-blue-100 text-blue-700",
      subgroup: "bg-sky-100 text-sky-700",
      campus: "bg-teal-100 text-teal-700",
      cadre: "bg-indigo-100 text-indigo-700",
      course: "bg-amber-100 text-amber-700",
      inactive: "bg-rose-100 text-rose-700",
      uncertified: "bg-orange-100 text-orange-700",
      specific: "bg-zinc-100 text-zinc-600",
    }[s] ?? "bg-zinc-100 text-zinc-600"
  );
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

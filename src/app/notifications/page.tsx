"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  Bell,
  CheckCircle2,
  ChevronDown,
  HeartHandshake,
  Info,
  Loader2,
  Megaphone,
  Send,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { fetchNotifications, markNotificationRead } from "@/lib/analytics";
import type { Notification } from "@/lib/analytics";
import { createMessage, sendMessage, SCOPE_LABELS, type AudienceScope } from "@/lib/comms";
import { AUTHENTICATED_ROLES, COMMUNICATION_ROLES } from "@/lib/roles";

type NotifFilter = "All" | "Unread" | "info" | "warning" | "alert" | "success";

const filters: NotifFilter[] = ["All", "Unread", "info", "warning", "alert", "success"];

const filterLabels: Record<NotifFilter, string> = {
  All: "All",
  Unread: "Unread",
  info: "Info",
  warning: "Warning",
  alert: "Urgent",
  success: "Success",
};

const typeIconMap: Record<string, LucideIcon> = {
  success: Award,
  alert: AlertCircle,
  warning: HeartHandshake,
  info: Info,
};

const typeStyleMap: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  alert: "bg-rose-50 text-rose-700 ring-rose-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
};

const preferenceOptions = [
  "Email",
  "In-app",
  "Reminders",
  "Assessment nudges",
  "Certification alerts",
];

// ─── Broadcast form ────────────────────────────────────────────

type BroadcastForm = {
  scope: AudienceScope;
  title: string;
  body: string;
};

function BroadcastInterface({ senderRole }: { senderRole: string }) {
  const [form, setForm] = useState<BroadcastForm>({
    scope: "platform",
    title: "This week's leadership learning rhythm",
    body: "Please complete your assigned lesson and reflection before your next ministry check-in.",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_SCOPES: AudienceScope[] = [
    "platform", "group", "subgroup", "campus", "cadre", "inactive", "uncertified",
  ];

  async function handleQueue() {
    setError(null);
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSending(true);
    const id = await createMessage({
      title: form.title.trim(),
      body: form.body.trim(),
      type: "announcement",
      priority: "normal",
      audience_scope: form.scope,
    });
    if (!id) { setError("Failed to create announcement."); setSending(false); return; }
    await sendMessage(id);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <CardContent className="grid gap-4 pt-1 xl:grid-cols-[1fr_0.85fr]">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            Audience scope
          </label>
          <div className="relative">
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as AudienceScope }))}
              className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200/70"
            >
              {ALLOWED_SCOPES.map((s) => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            Sender role
          </label>
          <div className="flex h-10 items-center rounded-lg border border-zinc-100 bg-zinc-50 px-3 text-sm text-zinc-600">
            {senderRole}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            Message title
          </label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-10 rounded-lg border-zinc-200 bg-white shadow-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            Message body
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="min-h-28 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200/70"
          />
        </div>

        {error && (
          <p className="col-span-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-heading font-semibold text-zinc-950">Preview</p>
          <Badge className="rounded-md bg-black text-white hover:bg-black">Draft</Badge>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            {SCOPE_LABELS[form.scope]}
          </p>
          <h3 className="font-heading mt-3 text-xl font-semibold text-zinc-950">{form.title || "—"}</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-500">{form.body || "—"}</p>
        </div>
        <Button
          className="mt-4 h-10 w-full rounded-lg bg-black text-white hover:bg-zinc-800 disabled:opacity-50"
          disabled={sending || sent}
          onClick={handleQueue}
        >
          {sending ? (
            <><Loader2 className="size-4 animate-spin" /> Sending…</>
          ) : sent ? (
            <><CheckCircle2 className="size-4" /> Sent!</>
          ) : (
            <><Send className="size-4" /> Send broadcast</>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-zinc-400">
          Recipients will receive an in-app notification instantly.
        </p>
        <Link
          href="/dashboard/comms/announcements"
          className="mt-1 block text-center text-xs text-zinc-500 underline-offset-4 hover:underline"
        >
          Advanced options in Communication Center →
        </Link>
      </div>
    </CardContent>
  );
}

// ─── Notification card (real data) ────────────────────────────

function formatTimeAgo(createdAt: string, now: number) {
  const diff = now - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationCard({
  notification,
  now,
  onRead,
}: {
  notification: Notification;
  now: number;
  onRead: (id: string) => void;
}) {
  const Icon = typeIconMap[notification.type] ?? Info;
  const typeStyle = typeStyleMap[notification.type] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200";
  const timeAgo = formatTimeAgo(notification.createdAt, now);

  return (
    <motion.div variants={shellItem} whileHover={{ y: -2 }}>
      <div
        className={cn(
          "grid gap-4 rounded-lg border border-zinc-100 bg-white p-4 transition hover:border-zinc-200 hover:shadow-sm md:grid-cols-[auto_1fr_auto]",
          !notification.isRead && "border-blue-100 bg-blue-50/30"
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-md ring-1 hover:bg-inherit", typeStyle)}>
              {notification.type}
            </Badge>
            {!notification.isRead && (
              <span className="inline-flex size-2 rounded-full bg-blue-500" />
            )}
          </div>
          <h3 className="font-heading text-base font-semibold text-zinc-950">{notification.title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{notification.message}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-medium text-zinc-400">{timeAgo}</p>
          {notification.actionUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-lg border-zinc-200 bg-white"
              asChild
            >
              <a href={notification.actionUrl} onClick={() => onRead(notification.id)}>
                Review
              </a>
            </Button>
          ) : (
            !notification.isRead && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg border-zinc-200 bg-white"
                onClick={() => onRead(notification.id)}
              >
                Mark read
              </Button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<NotifFilter>("All");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setNow(Date.now());
      const [profileResult, notifs] = await Promise.all([
        getCurrentUserProfile(),
        fetchNotifications(),
      ]);
      if (!active) return;
      if (profileResult.profile) setProfile(profileResult.profile);
      setNotifications(notifs);
      setLoadingNotifs(false);
    }
    load();
    return () => { active = false; };
  }, []);

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  const filtered = notifications.filter((n) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Unread") return !n.isRead;
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const followUps = notifications.filter((n) => n.type === "warning" || n.type === "alert").length;
  const reminders = notifications.filter((n) => n.type === "info").length;
  const canBroadcast = COMMUNICATION_ROLES.some((role) => role === profile?.role);

  return (
    <ProtectedRoute allowedRoles={[...AUTHENTICATED_ROLES]}>
      <DashboardShell searchPlaceholder="Search notifications, broadcasts, reminders..." showDate={false}>
        <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Notifications and communication
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              A calm leadership communication layer for every growth moment
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
              Role-aware reminders, follow-up signals, certificate alerts, and ministry broadcasts
              keep leaders engaged without making the Academy feel noisy.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#080808] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white text-black">
                <Bell className="size-5" />
              </div>
              <div>
                <p className="font-heading font-semibold">Communication health</p>
                <p className="text-sm text-zinc-400">{profile?.role ?? "Leader"} view</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Unread notifications", unreadCount],
                ["Info reminders", reminders],
                ["Alerts & follow-ups", followUps],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <span className="font-heading text-xl font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Notification center</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    {loadingNotifs ? "Loading…" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""} — ${unreadCount} unread`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((f) => (
                    <Button
                      key={f}
                      variant={activeFilter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(f)}
                      className={cn(
                        "rounded-lg",
                        activeFilter === f
                          ? "bg-black text-white hover:bg-zinc-800"
                          : "border-zinc-200 bg-white text-zinc-600"
                      )}
                    >
                      {filterLabels[f]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              {loadingNotifs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-zinc-100 bg-white p-4">
                      <div className="flex gap-4">
                        <div className="size-11 rounded-lg bg-zinc-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/3 rounded bg-zinc-100" />
                          <div className="h-3 w-2/3 rounded bg-zinc-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="size-10 text-zinc-200" />
                  <p className="mt-3 text-sm font-medium text-zinc-500">
                    {activeFilter === "All" ? "No notifications yet" : `No ${filterLabels[activeFilter].toLowerCase()} notifications`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Announcements and system alerts will appear here when sent by your oversight leaders.
                  </p>
                </div>
              ) : (
                <motion.div variants={shellContainer} className="space-y-3">
                  {filtered.map((n) => (
                    <NotificationCard key={n.id} notification={n} now={now} onRead={handleRead} />
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold">Preferences</CardTitle>
              <p className="text-sm text-zinc-500">Visible options for how leaders receive Academy communication.</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {preferenceOptions.map((option, index) => (
                <label
                  key={option}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-zinc-800">
                    <Settings2 className="size-4 text-zinc-400" />
                    {option}
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked={index < 4}
                    className="size-4 accent-black"
                  />
                </label>
              ))}
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="font-heading text-sm font-semibold text-zinc-950">AI communication tone</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Encouraging, pastoral, and specific. Reminders are grouped by learning rhythm so leaders receive clarity instead of pressure.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {canBroadcast ? (
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                    <Megaphone className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold">Quick broadcast</CardTitle>
                    <p className="text-sm text-zinc-500">Send a message to your hierarchy scope. All recipients get an in-app notification.</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/comms/announcements"
                  className="hidden text-xs font-medium text-zinc-500 underline-offset-4 hover:underline sm:block"
                >
                  Full Communication Center →
                </Link>
              </div>
            </CardHeader>
            <BroadcastInterface senderRole={profile?.role ?? "Leader"} />
          </Card>
        </motion.section>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}

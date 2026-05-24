"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, AlertCircle, Info, Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/analytics";
import type { Notification } from "@/lib/analytics";

const typeConfig = {
  success: { icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
  alert: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchNotifications().then((data) => {
      if (active) {
        setNotifications(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="font-heading text-sm font-semibold text-zinc-950">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {unread} new
                </span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-950"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg bg-zinc-50 p-3">
                    <div className="h-3 w-3/4 rounded bg-zinc-200" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell className="size-8 text-zinc-200" />
                <p className="mt-3 text-sm font-medium text-zinc-500">No notifications yet</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Alerts about leader activity will appear here
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 border-b border-zinc-50 p-4 transition-colors hover:bg-zinc-50",
                      !n.isRead && "bg-blue-50/40"
                    )}
                  >
                    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                      <Icon className={cn("size-4", cfg.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-950">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">{n.message}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkOne(n.id)}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700"
                          >
                            <Check className="size-3" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

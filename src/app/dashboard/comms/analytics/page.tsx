"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Eye, Loader2, Mail, MessageSquare, TrendingUp, Users } from "lucide-react";
import { CommsShell } from "@/components/comms/comms-shell";
import { shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  fetchCommsAnalytics,
  SCOPE_LABELS,
  PRIORITY_LABELS,
  priorityColor,
  scopeColor,
  statusColor,
  type CommsAnalytics,
  type AudienceScope,
  type MessagePriority,
  type MessageStatus,
} from "@/lib/comms";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-zinc-950">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
        </div>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", color)}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-zinc-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 h-2">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium text-zinc-700">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<CommsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCommsAnalytics().then((d) => { if (active) { setData(d); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <CommsShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-6 animate-spin text-zinc-400" />
        </div>
      </CommsShell>
    );
  }

  if (!data) {
    return (
      <CommsShell>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-24 text-center">
          <BarChart3 className="size-10 text-zinc-200" />
          <p className="mt-3 text-sm text-zinc-500">No analytics data yet. Send your first announcement.</p>
        </div>
      </CommsShell>
    );
  }

  const { summary, timeline, by_scope, by_priority, recent_messages } = data;
  const maxScope = Math.max(...Object.values(by_scope), 1);
  const maxPriority = Math.max(...Object.values(by_priority), 1);

  return (
    <CommsShell>
      {/* Summary cards */}
      <motion.div variants={shellItem} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <StatCard label="Messages sent" value={summary.total_sent} icon={MessageSquare} color="bg-blue-50 text-blue-600" />
        <StatCard label="Total recipients" value={summary.total_recipients.toLocaleString()} icon={Users} color="bg-violet-50 text-violet-600" />
        <StatCard label="Total reads" value={summary.total_reads.toLocaleString()} icon={Eye} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Open rate" value={`${summary.open_rate}%`} icon={TrendingUp} color="bg-amber-50 text-amber-600" />
        <StatCard label="Drafts" value={summary.total_drafts} icon={Mail} color="bg-zinc-100 text-zinc-600" />
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* By scope */}
        <motion.div variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="font-heading text-sm font-semibold text-zinc-950">Messages by audience scope</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(by_scope).length === 0 ? (
              <p className="text-xs text-zinc-400">No data yet.</p>
            ) : (
              Object.entries(by_scope).map(([k, v]) => (
                <BarRow
                  key={k}
                  label={SCOPE_LABELS[k as AudienceScope] ?? k}
                  value={v}
                  max={maxScope}
                  color="bg-violet-400"
                />
              ))
            )}
          </div>
        </motion.div>

        {/* By priority */}
        <motion.div variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="font-heading text-sm font-semibold text-zinc-950">Messages by priority</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(by_priority).length === 0 ? (
              <p className="text-xs text-zinc-400">No data yet.</p>
            ) : (
              Object.entries(by_priority).map(([k, v]) => (
                <BarRow
                  key={k}
                  label={PRIORITY_LABELS[k as MessagePriority] ?? k}
                  value={v}
                  max={maxPriority}
                  color={k === "urgent" ? "bg-red-400" : k === "high" ? "bg-orange-400" : k === "normal" ? "bg-blue-400" : "bg-zinc-300"}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <motion.div variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="font-heading text-sm font-semibold text-zinc-950">Activity (last 30 days)</h3>
          <div className="mt-4 flex items-end gap-1 overflow-x-auto">
            {timeline.map((t) => {
              const maxVal = Math.max(...timeline.map((x) => x.sent), 1);
              const h = Math.round((t.sent / maxVal) * 64);
              return (
                <div key={t.date} className="flex shrink-0 flex-col items-center gap-1" title={`${t.date}: ${t.sent} sent, ${t.reads} read`}>
                  <div
                    className="w-4 rounded-t bg-zinc-900"
                    style={{ height: `${Math.max(h, 2)}px` }}
                  />
                  <span className="text-[9px] text-zinc-400 rotate-90 mt-1">{t.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent messages table */}
      {recent_messages.length > 0 && (
        <motion.div variants={shellItem} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h3 className="font-heading text-sm font-semibold text-zinc-950">Recent message performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                  <th className="px-4 py-3 font-semibold text-zinc-500">Scope</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500">Priority</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-500">Recipients</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-500">Read</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-500">Open rate</th>
                </tr>
              </thead>
              <tbody>
                {recent_messages.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Badge className={scopeColor(m.audience_scope as AudienceScope)}>
                        {SCOPE_LABELS[m.audience_scope as AudienceScope] ?? m.audience_scope}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={priorityColor(m.priority as MessagePriority)}>
                        {PRIORITY_LABELS[m.priority as MessagePriority] ?? m.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColor(m.status as MessageStatus)}>{m.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-950">{m.recipient_count}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{m.read_count}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-semibold", m.open_rate >= 50 ? "text-emerald-600" : m.open_rate >= 25 ? "text-amber-600" : "text-zinc-600")}>
                        {m.open_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </CommsShell>
  );
}

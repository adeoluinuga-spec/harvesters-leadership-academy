"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Award,
  BookOpen,
  Building2,
  Layers,
  Network,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuditEvent = {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  campusId: string | null;
  subgroupId: string | null;
  groupId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const EVENT_TYPES = [
  "user_role_changed",
  "user_transferred",
  "user_deactivated",
  "user_reactivated",
  "user_updated",
  "campus_created",
  "campus_updated",
  "campus_archived",
  "subgroup_created",
  "subgroup_updated",
  "group_created",
  "group_updated",
  "course_enrolled",
  "assessment_passed",
  "assessment_failed",
  "certificate_issued",
  "onboarding_completed",
];

function eventIcon(type: string) {
  if (type.startsWith("user_")) return Users;
  if (type.startsWith("campus_")) return Building2;
  if (type.startsWith("subgroup_")) return Layers;
  if (type.startsWith("group_")) return Network;
  if (type.startsWith("course_") || type.startsWith("assessment_")) return BookOpen;
  if (type === "certificate_issued") return Award;
  if (type === "onboarding_completed") return Users;
  return Activity;
}

function eventLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function badgeClasses(type: string): string {
  if (type.includes("created")) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (type.includes("deactivated") || type.includes("archived") || type.includes("failed"))
    return "border-rose-100 bg-rose-50 text-rose-700";
  if (type.includes("role_changed") || type.includes("transferred"))
    return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function MetadataPreview({ meta }: { meta: Record<string, unknown> }) {
  if (!meta || Object.keys(meta).length === 0) return null;
  const prev = meta.previous as Record<string, unknown> | undefined;
  const upd = meta.updated as Record<string, unknown> | undefined;

  if (prev && upd) {
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {Object.keys(upd).map((key) => {
          const before = String(prev[key] ?? "—");
          const after = String(upd[key] ?? "—");
          if (before === after) return null;
          return (
            <span key={key} className="rounded-md border border-zinc-100 bg-zinc-50 px-2 py-1 font-mono">
              {key}: <span className="text-rose-600 line-through">{before}</span>{" "}
              → <span className="text-emerald-700">{after}</span>
            </span>
          );
        })}
      </div>
    );
  }

  const entries = Object.entries(meta).filter(([k]) => k !== "previous" && k !== "updated");
  if (entries.length === 0) return null;
  return (
    <p className="mt-1 font-mono text-xs text-zinc-500">
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
    </p>
  );
}

export default function ActivityLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(eventTypeFilter && { event_type: eventTypeFilter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });
      const res = await fetch(`/api/admin/activity?${params}`);
      const json = await res.json() as { events: AuditEvent[]; total: number };
      setEvents(json.events ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, eventTypeFilter, dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <ProtectedRoute allowedRoles={["Platform Super Admin", "Super Admin", "Admin"]}>
      <DashboardShell searchPlaceholder="Search activity log...">

        {/* Hero */}
        <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
                Admin · Audit Log
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Activity & Audit Log
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-500">
                Complete audit trail of all platform events — admin changes, user actions, learning milestones, and system operations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{total.toLocaleString()} events</span>
              <Button
                variant="outline"
                onClick={() => void load()}
                className="rounded-lg border-zinc-200"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Filters */}
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search actor, event type..."
                  className="rounded-lg border-zinc-200 pl-9"
                />
              </div>
              <select
                value={eventTypeFilter}
                onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                <option value="">All event types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{eventLabel(t)}</option>
                ))}
              </select>
              <div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="rounded-lg border-zinc-200"
                  placeholder="From date"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="rounded-lg border-zinc-200"
                  placeholder="To date"
                />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Event feed */}
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Audit trail
              </CardTitle>
              <p className="text-sm text-zinc-500">
                {loading ? "Loading…" : `${events.length} events (page ${page} of ${Math.max(totalPages, 1)})`}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {loading && [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100" />
              ))}
              {!loading && events.length === 0 && (
                <div className="py-14 text-center">
                  <AlertCircle className="mx-auto size-8 text-zinc-300" />
                  <p className="mt-3 text-sm text-zinc-400">No events match your filters</p>
                </div>
              )}
              {events.map((event) => {
                const Icon = eventIcon(event.eventType);
                return (
                  <div key={event.id} className="rounded-lg border border-zinc-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("rounded-md border text-xs hover:bg-inherit", badgeClasses(event.eventType))}>
                              {eventLabel(event.eventType)}
                            </Badge>
                            {event.entityType && (
                              <span className="text-xs text-zinc-400">
                                {event.entityType}
                                {event.entityId ? ` #${event.entityId.slice(0, 8)}` : ""}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-zinc-950">
                            {event.actorName}
                            {event.actorRole && (
                              <span className="ml-1 text-xs font-normal text-zinc-400">
                                ({event.actorRole})
                              </span>
                            )}
                          </p>
                          <MetadataPreview meta={event.metadata} />
                        </div>
                      </div>
                      <time className="shrink-0 text-xs text-zinc-400">
                        {new Date(event.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.section>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.section variants={shellItem} className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-lg border-zinc-200"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="rounded-lg border-zinc-200"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </motion.section>
        )}

      </DashboardShell>
    </ProtectedRoute>
  );
}

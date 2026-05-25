"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users } from "lucide-react";

import { shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SubgroupSummary, CampusSummary } from "@/lib/analytics";

export function healthLabel(rate: number) {
  if (rate >= 80) return "Thriving";
  if (rate >= 60) return "Stable";
  if (rate >= 40) return "Needs Attention";
  return "Declining";
}

export function healthClasses(rate: number) {
  if (rate >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (rate >= 60) return "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (rate >= 40) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
}

export function fmt(n: number) {
  return n.toLocaleString();
}

export function CampusCard({ campus }: { campus: CampusSummary }) {
  const enrollmentPct =
    campus.totalLeaders > 0 ? Math.round((campus.enrolledLeaders / campus.totalLeaders) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-100 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-950">{campus.campusName}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{campus.totalLeaders} leaders</p>
        </div>
        <Badge className={cn("rounded-md border hover:bg-inherit text-xs", healthClasses(campus.completionRate))}>
          {healthLabel(campus.completionRate)}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Leaders</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.totalLeaders)}</p>
        </div>
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Enrolled</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.enrolledLeaders)}</p>
        </div>
        <div className="rounded bg-zinc-50 p-2">
          <p className="text-zinc-400">Certified</p>
          <p className="mt-0.5 font-semibold text-zinc-950">{fmt(campus.certificates)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>Completion</span>
          <span className="font-medium text-zinc-700">{campus.completionRate}%</span>
        </div>
        <Progress value={campus.completionRate} className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
      </div>
      {campus.enrolledLeaders - campus.completedLeaders > 0 && (
        <p className="mt-2 text-xs text-zinc-400">
          {Math.max(0, campus.enrolledLeaders - campus.completedLeaders)} enrolled — not yet certified
        </p>
      )}
    </div>
  );
}

export function SubgroupPerformance({ subgroups }: { subgroups: SubgroupSummary[] }) {
  const [expanded, setExpanded] = useState(subgroups[0]?.subgroupId ?? "");

  if (subgroups.length === 0) {
    return (
      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Subgroup performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-zinc-400">
              No subgroup data found. Ensure users have the correct group_id assigned.
            </p>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Subgroup performance</CardTitle>
          <p className="text-sm text-zinc-500">
            Multi-campus leadership health by subgroup — click a subgroup to see its campuses
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {subgroups.map((subgroup) => {
            const isOpen = expanded === subgroup.subgroupId;
            return (
              <div key={subgroup.subgroupId} className="rounded-lg border border-zinc-100 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? "" : subgroup.subgroupId)}
                  className="flex w-full flex-col gap-4 p-4 text-left lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-zinc-950">{subgroup.subgroupName}</p>
                      <p className="text-sm text-zinc-500">
                        {subgroup.pastorName
                          ? subgroup.pastorName
                          : `${subgroup.campusSummaries.length} campus${subgroup.campusSummaries.length !== 1 ? "es" : ""}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-5 lg:min-w-[720px]">
                    {[
                      ["Campuses", subgroup.campusSummaries.length],
                      ["Leaders", fmt(subgroup.totalLeaders)],
                      ["Enrolled", fmt(subgroup.enrolledLeaders)],
                      ["Completion", `${subgroup.completionRate}%`],
                      ["Certificates", fmt(subgroup.certificates)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn("rounded-md border hover:bg-inherit shrink-0", healthClasses(subgroup.completionRate))}
                    >
                      {healthLabel(subgroup.completionRate)}
                    </Badge>
                    <ChevronDown
                      className={cn("size-5 text-zinc-400 transition-transform", isOpen && "rotate-180")}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-100 p-4">
                        <div className="mb-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Subgroup completion progress</span>
                            <span className="font-semibold text-zinc-950">{subgroup.completionRate}%</span>
                          </div>
                          <Progress
                            value={subgroup.completionRate}
                            className="h-2 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black"
                          />
                          <p className="mt-2 text-xs text-zinc-400">
                            {Math.max(0, subgroup.enrolledLeaders - subgroup.completedLeaders)} enrolled leaders still
                            working toward their certificate
                          </p>
                        </div>

                        {subgroup.campusSummaries.length === 0 ? (
                          <p className="py-4 text-center text-sm text-zinc-400">No campus data for this subgroup</p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {subgroup.campusSummaries.map((campus) => (
                              <CampusCard key={campus.campusId} campus={campus} />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.section>
  );
}

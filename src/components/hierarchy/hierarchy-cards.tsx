"use client";

import Link from "next/link";
import { AlertCircle, Building2, ChevronRight, Sparkles, UserCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type CampusCardData = {
  name: string;
  pastor: string;
  status: "Thriving" | "Stable" | "Declining" | "Needs Attention";
  leaders: number;
  active: number;
  inactive: number;
  engagement: number;
};

type LeaderCardData = {
  id: string;
  initials: string;
  name: string;
  role: string;
  status: "Active" | "Stable" | "Not Enrolled" | "Declining" | "Needs Attention";
  campus: string;
};

export function statusClasses(status: CampusCardData["status"] | LeaderCardData["status"]) {
  if (status === "Thriving" || status === "Active") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (status === "Stable") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (status === "Not Enrolled") return "border-zinc-200 bg-white text-zinc-600";
  if (status === "Declining") return "border-rose-100 bg-rose-50 text-rose-700";
  return "border-amber-100 bg-amber-50 text-amber-700";
}

export function CampusCard({ campus }: { campus: CampusCardData }) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-zinc-200/60">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            {campus.name}
          </CardTitle>
          <p className="mt-1 text-sm text-zinc-500">{campus.pastor}</p>
        </div>
        <Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(campus.status))}>
          {campus.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Leaders</p>
            <p className="font-heading mt-1 font-semibold text-zinc-950">{campus.leaders}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Active</p>
            <p className="font-heading mt-1 font-semibold text-zinc-950">{campus.active}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Inactive</p>
            <p className="font-heading mt-1 font-semibold text-zinc-950">{campus.inactive}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-zinc-500">Engagement</span>
            <span className="font-semibold text-zinc-950">{campus.engagement}%</span>
          </div>
          <Progress value={campus.engagement} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderCard({ leader }: { leader: LeaderCardData }) {
  return (
    <Link href={`/leaders/${leader.id}`} className="block">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-200/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarFallback className="bg-zinc-950 text-xs font-semibold text-white">
                {leader.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950">{leader.name}</p>
                  <p className="text-sm text-zinc-500">{leader.role}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-zinc-400" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(leader.status))}>
                  {leader.status}
                </Badge>
                <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                  {leader.campus}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function IntelligencePanel({
  title,
  subtitle,
  insights,
  dark = false,
}: {
  title: string;
  subtitle: string;
  insights: string[];
  dark?: boolean;
}) {
  return (
    <Card className={cn("rounded-xl border-zinc-200 shadow-sm", dark ? "bg-[#0b0b0b] text-white" : "bg-white")}>
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold">{title}</CardTitle>
        <p className={cn("text-sm", dark ? "text-zinc-400" : "text-zinc-500")}>{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = index % 3 === 0 ? Sparkles : index % 3 === 1 ? AlertCircle : UserCheck;
          return (
            <div
              key={insight}
              className={cn(
                "rounded-lg border p-4",
                dark ? "border-white/10 bg-white/[0.04]" : "border-zinc-100 bg-white"
              )}
            >
              <div className={cn("mb-3 flex size-9 items-center justify-center rounded-lg", dark ? "bg-white/10" : "bg-zinc-100 text-zinc-700")}>
                <Icon className="size-4" />
              </div>
              <p className={cn("font-heading text-sm font-semibold leading-6", dark ? "text-white" : "text-zinc-950")}>
                {insight}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AfricanMinistryVisual({ label }: { label: string }) {
  return (
    <div className="relative min-h-48 overflow-hidden rounded-xl bg-[#0b0b0b] p-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(135deg,#0b0b0b,#1f1a17_45%,#0f0f0f)]" />
      <div className="absolute -right-8 bottom-0 size-36 rounded-full bg-[#6b3f2a]/40 blur-2xl" />
      <div className="relative flex h-full flex-col justify-end">
        <Building2 className="mb-4 size-7 text-white/70" />
        <p className="font-heading text-xl font-semibold leading-tight">{label}</p>
        <p className="mt-2 text-sm text-zinc-400">Ministry leadership development environment</p>
      </div>
    </div>
  );
}

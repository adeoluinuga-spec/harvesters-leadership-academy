"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, Layers, Megaphone, ScrollText } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Announcements", href: "/dashboard/comms/announcements", icon: Megaphone },
  { label: "Campaigns", href: "/dashboard/comms/campaigns", icon: Layers },
  { label: "Reminders", href: "/dashboard/comms/reminders", icon: BellRing },
  { label: "Analytics", href: "/dashboard/comms/analytics", icon: BarChart3 },
  { label: "Templates", href: "/dashboard/comms/templates", icon: ScrollText },
];

export function CommsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardShell searchPlaceholder="Search messages…" showDate={false}>
      {/* Section header */}
      <div>
        <h1 className="font-heading text-xl font-semibold text-zinc-950">Communication Center</h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          Reach your leadership network — announcements, reminders, and campaigns.
        </p>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:bg-white/60 hover:text-zinc-700"
              )}
            >
              <tab.icon className="size-3.5 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </DashboardShell>
  );
}

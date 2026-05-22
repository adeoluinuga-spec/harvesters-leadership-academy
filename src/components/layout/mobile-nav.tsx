"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, Bell, GraduationCap, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { dashboardForRole, normalizeStoredRole } from "@/lib/mock-auth";

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  matchPrefix?: string;
};

export function MobileNav() {
  const pathname = usePathname();
  const [dashboardHref, setDashboardHref] = useState("/dashboard/leader");

  useEffect(() => {
    let mounted = true;
    async function resolveRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        const route = dashboardForRole(normalizeStoredRole(data?.role ?? ""));
        if (route && mounted) setDashboardHref(route);
      } catch {
        // silently ignore — non-critical
      }
    }
    resolveRole();
    return () => {
      mounted = false;
    };
  }, []);

  const items: NavItem[] = [
    { label: "Home", icon: LayoutDashboard, href: dashboardHref, matchPrefix: "/dashboard" },
    { label: "Courses", icon: GraduationCap, href: "/courses" },
    { label: "Certificates", icon: Award, href: "/certificates" },
    { label: "Alerts", icon: Bell, href: "/notifications" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#050505] md:hidden">
      <div className="grid h-16 grid-cols-4">
        {items.map(({ label, icon: Icon, href, matchPrefix }) => {
          const active =
            href !== "#" &&
            (matchPrefix
              ? pathname.startsWith(matchPrefix)
              : pathname === href || pathname.startsWith(href + "/"));

          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

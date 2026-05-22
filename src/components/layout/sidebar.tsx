"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  Brain,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { dashboardForRole, normalizeStoredRole } from "@/lib/mock-auth";

const ADMIN_COURSE_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
];

const sidebarItems = [
  { label: "My Dashboard", href: "/dashboard/leader", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "AI Intelligence", href: "/ai-course-intelligence", icon: Brain },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Users", href: "/users", icon: Users },
  { label: "Assessments", href: "/assessments", icon: ClipboardCheck },
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "#", icon: Settings },
];

function ManageCoursesLink({ pathname }: { pathname: string }) {
  const href = "/dashboard/admin/courses";
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm text-zinc-400 transition-all hover:bg-white/8 hover:text-white lg:justify-start",
        active && "bg-white text-black shadow-sm hover:bg-white hover:text-black"
      )}
    >
      <BookOpenCheck className="size-4 shrink-0" />
      <span className="hidden lg:inline">Manage Courses</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [dashboardHref, setDashboardHref] = useState("/dashboard/leader");

  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
        const role = data?.role ?? "";
        setCanManageCourses(ADMIN_COURSE_ROLES.includes(role));
        const route = dashboardForRole(normalizeStoredRole(role));
        if (route) setDashboardHref(route);
      } catch {
        // silently ignore — non-critical
      }
    }
    checkRole();
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-white/10 bg-[#050505] text-white shadow-2xl shadow-black/25 md:flex lg:w-72">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5 lg:px-6">
        <div className="flex size-10 items-center justify-center rounded-lg border border-white/15 bg-white text-black">
          <Sparkles className="size-5" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="font-heading truncate text-sm font-semibold tracking-tight">
            Harvesters Academy
          </p>
          <p className="text-xs text-zinc-500">Growth + Oversight</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-6 lg:px-4">
        {sidebarItems.map((navItem) => {
          const href = navItem.label === "My Dashboard" ? dashboardHref : navItem.href;
          const active =
            href !== "#" &&
            (pathname === href || pathname.startsWith(`${href}/`));

          return (
            <Link
              key={navItem.label}
              href={href}
              className={cn(
                "group flex h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm text-zinc-400 transition-all hover:bg-white/8 hover:text-white lg:justify-start",
                active && "bg-white text-black shadow-sm hover:bg-white hover:text-black"
              )}
            >
              <navItem.icon className="size-4 shrink-0" />
              <span className="hidden lg:inline">{navItem.label}</span>
            </Link>
          );
        })}

        {canManageCourses && (
          <ManageCoursesLink pathname={pathname} />
        )}
      </nav>

      <div className="border-t border-white/10 p-3 lg:p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
              <Activity className="size-4" />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-medium text-white">Network health</p>
              <p className="text-xs text-zinc-500">96% active</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

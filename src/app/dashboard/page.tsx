"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { dashboardForAuthRole, getCurrentUserProfile } from "@/lib/auth";
import { isInviteOnlyRole } from "@/lib/roles";

export default function DashboardRoutePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("Checking academy access...");

  useEffect(() => {
    let active = true;

    async function routeAuthenticatedUser() {
      const result = await getCurrentUserProfile();

      if (!active) return;

      if (!result.user || !result.profile) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      const { profile } = result;
      const hasDashboardAccess =
        profile.onboardingCompleted || isInviteOnlyRole(profile.role);

      window.localStorage.setItem(
        "harvesters_profile_incomplete",
        profile.onboardingCompleted ? "false" : "true"
      );
      window.dispatchEvent(new Event("harvesters-profile-change"));

      if (!hasDashboardAccess) {
        setMessage("Opening ministry profile onboarding...");
        router.replace("/onboarding");
        return;
      }

      setMessage(`Opening ${profile.role} dashboard...`);
      router.replace(dashboardForAuthRole(profile.role));
    }

    routeAuthenticatedUser();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 text-zinc-950">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-zinc-950" />
        {message}
      </div>
    </main>
  );
}

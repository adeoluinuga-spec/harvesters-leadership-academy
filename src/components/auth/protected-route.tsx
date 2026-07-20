"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { getAuthProfile } from "@/lib/auth";
import { createClient } from "@/lib/client";
import { dashboardForRole, isInviteOnlyRole, AcademyRole, roleCanAccess } from "@/lib/roles";

type ProtectedRouteProps = {
  allowedRoles: AcademyRole[];
  children: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const allowedRoleKey = allowedRoles.join("|");
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function verifySession() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session?.user) {
        setAllowed(false);
        setChecked(true);
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      let profile;

      try {
        profile = await getAuthProfile(data.session.user, "Attendee");
      } catch (profileError) {
        console.error("[protected-route] Failed to fetch or create academy profile", profileError);
        setAllowed(false);
        setChecked(true);
        router.replace("/login");
        return;
      }

      if (!active) return;

      window.localStorage.setItem(
        "harvesters_profile_incomplete",
        profile.onboardingCompleted ? "false" : "true"
      );

      if (!profile.onboardingCompleted && !isInviteOnlyRole(profile.role) && pathname !== "/onboarding") {
        setAllowed(false);
        setChecked(true);
        router.replace("/onboarding");
        return;
      }

      const allowedRoleList = allowedRoleKey.split("|") as AcademyRole[];
      const canAccess = roleCanAccess(profile.role, allowedRoleList);
      if (!canAccess && pathname.startsWith("/dashboard")) {
        const dashboardPath = dashboardForRole(profile.role);
        if (dashboardPath !== pathname) {
          setAllowed(false);
          setChecked(true);
          router.replace(dashboardPath);
          return;
        }
      }

      setAllowed(canAccess);
      setChecked(true);

      if (!canAccess) {
        router.replace(
          `/access-denied?from=${encodeURIComponent(pathname)}&role=${encodeURIComponent(profile.role)}`
        );
      }
    }

    verifySession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      verifySession();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [allowedRoleKey, pathname, router]);

  if (!checked || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50 text-zinc-950">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 shadow-sm">
          <LoaderCircle className="size-4 animate-spin text-zinc-950" />
          Checking academy access...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

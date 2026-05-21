"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MockRoleSwitcher } from "@/components/auth/mock-role-switcher";
import { createClient } from "@/lib/client";
import {
  getLeadershipProfile,
  getMockRole,
  identityForRole,
  MockLeadershipProfile,
  MockRole,
} from "@/lib/mock-auth";

type TopNavbarProps = {
  searchPlaceholder?: string;
  showDate?: boolean;
};

export function TopNavbar({
  searchPlaceholder = "Search leaders, courses, cohorts...",
  showDate = true,
}: TopNavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<MockRole>(() => getMockRole());
  const [profile, setProfile] = useState<MockLeadershipProfile>(() => getLeadershipProfile());
  const [signingOut, setSigningOut] = useState(false);
  const identity = identityForRole(role, profile);
  const initials = identity.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  useEffect(() => {
    function syncIdentity() {
      setRole(getMockRole());
      setProfile(getLeadershipProfile());
    }

    window.addEventListener("harvesters-role-change", syncIdentity);
    window.addEventListener("harvesters-profile-change", syncIdentity);
    window.addEventListener("storage", syncIdentity);

    return () => {
      window.removeEventListener("harvesters-role-change", syncIdentity);
      window.removeEventListener("harvesters-profile-change", syncIdentity);
      window.removeEventListener("storage", syncIdentity);
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
      <div className="flex min-h-20 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            className="h-10 rounded-lg border-zinc-200 bg-zinc-50 pl-9 text-sm shadow-none focus-visible:ring-zinc-300"
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {showDate ? (
            <p className="hidden text-sm font-medium text-zinc-500 md:block">
              Thursday, May 21, 2026
            </p>
          ) : null}
          <MockRoleSwitcher />
          <Button
            asChild
            variant="outline"
            size="icon-lg"
            className="rounded-lg border-zinc-200 bg-white"
          >
            <Link href="/notifications" aria-label="Open notifications">
              <Bell className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
            <Avatar>
              <AvatarFallback className="bg-black text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden pr-2 sm:block">
              <p className="text-sm font-semibold leading-none text-zinc-950">{identity.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{identity.title}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            disabled={signingOut}
            onClick={handleSignOut}
            className="rounded-lg border-zinc-200 bg-white"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

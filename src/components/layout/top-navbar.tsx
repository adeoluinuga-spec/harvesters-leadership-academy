"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/client";

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
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const displayName = profile?.fullName || "Academy Leader";
  const displayRole = formatMinistryIdentity(profile);
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  useEffect(() => {
    let active = true;

    async function syncIdentity() {
      const result = await getCurrentUserProfile();
      if (!active || !result.profile) return;

      let resolved = result.profile;

      // Explicit campus name resolution — mirrors useHierarchy's approach
      if (resolved.campusId && !resolved.campus) {
        const { data: campusRow } = await supabase
          .from("campuses")
          .select("name")
          .eq("id", resolved.campusId)
          .maybeSingle<{ name: string | null }>();
        if (campusRow?.name) {
          resolved = { ...resolved, campus: campusRow.name };
        }
      }

      if (active) setProfile(resolved);
    }

    syncIdentity();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      syncIdentity();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, supabase.auth]);

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
              {currentDate}
            </p>
          ) : null}
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
              {profile?.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-black text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden pr-2 sm:block">
              <p className="text-sm font-semibold leading-none text-zinc-950">{displayName}</p>
              <p className="mt-1 text-xs text-zinc-500">{displayRole}</p>
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

function formatMinistryIdentity(profile: AuthProfile | null) {
  if (!profile) return "Leader";

  if (profile.role === "Platform Super Admin" || profile.role === "Super Admin" || profile.role === "Admin") {
    return "Platform Administration";
  }

  if (profile.role === "Campus Pastor") {
    return profile.campus
      ? `${profile.role}, ${formatHarvestersCampus(profile.campus)}`
      : profile.role;
  }

  if (
    profile.role === "Sub-Group Pastor" || profile.role === "Subgroup Pastor" || profile.role === "Sub-group Pastor"
  ) {
    return profile.subgroup ? `${profile.role}, ${profile.subgroup}` : profile.role;
  }

  if (profile.role === "Group Pastor") {
    return profile.group ? `${profile.role}, ${profile.group}` : profile.role;
  }

  if (profile.campus) {
    return `${profile.role}, ${formatHarvestersCampus(profile.campus)}`;
  }

  return profile.role;
}

function formatHarvestersCampus(campus: string) {
  return campus.startsWith("Harvesters ") ? campus : `Harvesters ${campus.replace(/\s+Campus$/i, "")}`;
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { getCurrentUserProfile } from "@/lib/auth";
import type { AuthProfile } from "@/lib/auth";

export type HierarchyProfile = {
  loading: boolean;
  role: string;
  fullName: string;
  firstName: string;
  // Resolved names — what to display
  campusName: string;
  subgroupName: string;
  groupName: string;
  campusPastor: string;
  // Raw IDs — what to use for scoped DB queries
  campusId: string | null;
  subgroupId: string | null;
  groupId: string | null;
  // Learning context
  currentLeadershipRole: string;
  leadershipAspiration: string;
};

const LOADING_STATE: HierarchyProfile = {
  loading: true,
  role: "",
  fullName: "",
  firstName: "",
  campusName: "",
  subgroupName: "",
  groupName: "",
  campusPastor: "",
  campusId: null,
  subgroupId: null,
  groupId: null,
  currentLeadershipRole: "",
  leadershipAspiration: "",
};

function buildHierarchyProfile(profile: AuthProfile, resolvedCampusName: string): HierarchyProfile {
  const firstName = profile.fullName.split(" ").filter(Boolean)[0] ?? "Leader";

  return {
    loading: false,
    role: profile.role ?? "",
    fullName: profile.fullName ?? "",
    firstName,
    campusName: resolvedCampusName || (profile.campusId ? "" : "Campus not assigned"),
    subgroupName: profile.subgroup || "Subgroup not assigned",
    groupName: profile.group || "Group not assigned",
    campusPastor: profile.campusPastor || "",
    campusId: profile.campusId,
    subgroupId: profile.subgroupId,
    groupId: profile.groupId,
    currentLeadershipRole: profile.currentLeadershipRole || "None",
    leadershipAspiration: profile.leadershipAspiration || "",
  };
}

export function useHierarchy(): HierarchyProfile {
  const [hierarchy, setHierarchy] = useState<HierarchyProfile>(LOADING_STATE);

  useEffect(() => {
    let active = true;

    async function resolve() {
      const result = await getCurrentUserProfile();
      if (!active) return;

      if (!result.profile) {
        setHierarchy({ ...LOADING_STATE, loading: false });
        return;
      }

      const profile = result.profile;

      // Diagnostic logs
      console.log("[useHierarchy] auth.uid:", profile.id);
      console.log("[useHierarchy] campus_id:", profile.campusId);

      // Explicit campus name resolution — do not rely on getAuthProfile's join result
      // Query public.campuses directly whenever campus_id is present
      let resolvedCampusName = profile.campus;

      if (profile.campusId) {
        const supabase = createClient();
        const { data: campusRow, error: campusError } = await supabase
          .from("campuses")
          .select("name")
          .eq("id", profile.campusId)
          .maybeSingle<{ name: string | null }>();

        console.log("[useHierarchy] campus query result:", campusRow, "error:", campusError?.message ?? null);

        if (campusRow?.name) {
          resolvedCampusName = campusRow.name;
        }
      }

      console.log(
        "[useHierarchy] final campusName:",
        resolvedCampusName || (profile.campusId ? "(name lookup failed)" : "Campus not assigned")
      );

      if (!active) return;
      setHierarchy(buildHierarchyProfile(profile, resolvedCampusName));
    }

    resolve();
    return () => {
      active = false;
    };
  }, []);

  return hierarchy;
}

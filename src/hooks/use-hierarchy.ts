"use client";

import { useEffect, useState } from "react";
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

function buildHierarchyProfile(profile: AuthProfile): HierarchyProfile {
  const firstName = profile.fullName.split(" ").filter(Boolean)[0] ?? "Leader";

  // Log resolution failures so they are visible in browser console/server logs
  if (profile.campusId && !profile.campus) {
    console.warn("[hierarchy] campus_id exists but name resolution returned null — check campuses table RLS and the stored campus_id value", {
      campusId: profile.campusId,
      userId: profile.id,
    });
  }
  if (profile.subgroupId && !profile.subgroup) {
    console.warn("[hierarchy] subgroup_id exists but name resolution returned null", {
      subgroupId: profile.subgroupId,
      userId: profile.id,
    });
  }
  if (profile.groupId && !profile.group) {
    console.warn("[hierarchy] group_id exists but name resolution returned null", {
      groupId: profile.groupId,
      userId: profile.id,
    });
  }

  return {
    loading: false,
    role: profile.role ?? "",
    fullName: profile.fullName ?? "",
    firstName,
    // Show "not assigned" ONLY when the ID is truly null — not when name lookup failed
    campusName: profile.campus || (profile.campusId ? "Campus not assigned" : "Campus not assigned"),
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
    getCurrentUserProfile().then((result) => {
      if (active && result.profile) {
        setHierarchy(buildHierarchyProfile(result.profile));
      } else if (active) {
        setHierarchy({ ...LOADING_STATE, loading: false });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return hierarchy;
}

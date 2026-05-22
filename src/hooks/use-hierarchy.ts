"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth";
import type { AuthProfile } from "@/lib/auth";

export type HierarchyProfile = {
  loading: boolean;
  role: string;
  fullName: string;
  firstName: string;
  campusName: string;
  subgroupName: string;
  groupName: string;
  campusPastor: string;
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
  currentLeadershipRole: "",
  leadershipAspiration: "",
};

function buildHierarchyProfile(profile: AuthProfile): HierarchyProfile {
  const firstName = profile.fullName.split(" ").filter(Boolean)[0] ?? "Leader";
  return {
    loading: false,
    role: profile.role ?? "",
    fullName: profile.fullName ?? "",
    firstName,
    campusName: profile.campus || "Campus not assigned",
    subgroupName: profile.subgroup || "Subgroup not assigned",
    groupName: profile.group || "Group not assigned",
    campusPastor: profile.campusPastor || "",
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

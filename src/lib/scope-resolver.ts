import type { MockRole } from "@/lib/mock-auth";

// ── Types ────────────────────────────────────────────────────────────────────

export type ScopeType =
  | "group"
  | "subgroup"
  | "campus"
  | "campus_role_filtered"
  | "platform"
  | "personal";

export type LeadershipScope = {
  scopeType: ScopeType;
  scopeId: string | null;
  childRoles: MockRole[];
  dashboardTitle: string;
  insightContext: string;
};

// ── Role → child roles mapping ────────────────────────────────────────────────
// Each entry lists ALL roles that sit below the key role in the hierarchy.
// Child roles are ordered from nearest to furthest so breakdowns are intuitive.

export const OVERSIGHT_CHILD_ROLES: Partial<Record<MockRole, MockRole[]>> = {
  "Group Pastor": [
    "Sub-Group Pastor",
    "Campus Pastor",
    "Directional Leader",
    "District Pastor / Pastoral Leader",
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Sub-Group Pastor": [
    "Campus Pastor",
    "Directional Leader",
    "District Pastor / Pastoral Leader",
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Campus Pastor": [
    "Directional Leader",
    "District Pastor / Pastoral Leader",
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Campus Admin": [
    "Directional Leader",
    "District Pastor / Pastoral Leader",
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Directional Leader": [
    "District Pastor / Pastoral Leader",
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "District Pastor / Pastoral Leader": [
    "Area Leader",
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Area Leader": [
    "Community Leader",
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Community Leader": [
    "Zonal Leader / HOD",
    "Cell Leader / Assistant HOD",
  ],
  "Zonal Leader / HOD": ["Cell Leader / Assistant HOD"],
  "Cell Leader / Assistant HOD": [],
};

// ── Scope resolver ───────────────────────────────────────────────────────────

export function getLeadershipScope(
  role: MockRole,
  campusId: string | null
): LeadershipScope {
  switch (role) {
    case "Group Pastor":
      return {
        scopeType: "group",
        scopeId: null,
        childRoles: OVERSIGHT_CHILD_ROLES["Group Pastor"] ?? [],
        dashboardTitle: "Group Leadership Intelligence",
        insightContext: "full group hierarchy",
      };

    case "Sub-Group Pastor":
    case "Subgroup Pastor":
    case "Sub-group Pastor":
      return {
        scopeType: "subgroup",
        scopeId: null,
        childRoles: OVERSIGHT_CHILD_ROLES["Sub-Group Pastor"] ?? [],
        dashboardTitle: "Subgroup Leadership Intelligence",
        insightContext: "all campuses in subgroup",
      };

    case "Campus Pastor":
      return {
        scopeType: "campus",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Campus Pastor"] ?? [],
        dashboardTitle: "Campus Leadership Intelligence",
        insightContext: "all leaders in campus",
      };

    case "Campus Admin":
      return {
        scopeType: "campus",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Campus Admin"] ?? [],
        dashboardTitle: "Campus Administration Intelligence",
        insightContext: "all leaders in campus",
      };

    case "Directional Leader":
      return {
        scopeType: campusId ? "campus_role_filtered" : "platform",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Directional Leader"] ?? [],
        dashboardTitle: "Directional Leadership Intelligence",
        insightContext: "pastoral pipeline within campus",
      };

    case "District Pastor / Pastoral Leader":
      return {
        scopeType: campusId ? "campus_role_filtered" : "platform",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["District Pastor / Pastoral Leader"] ?? [],
        dashboardTitle: "District / Pastoral Leadership Intelligence",
        insightContext: "district pipeline within campus",
      };

    case "Area Leader":
      return {
        scopeType: campusId ? "campus_role_filtered" : "personal",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Area Leader"] ?? [],
        dashboardTitle: "Area Leadership Intelligence",
        insightContext: "community and zonal leaders within campus",
      };

    case "Community Leader":
      return {
        scopeType: campusId ? "campus_role_filtered" : "personal",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Community Leader"] ?? [],
        dashboardTitle: "Community Leadership Intelligence",
        insightContext: "zonal leaders and cell leaders within campus",
      };

    case "Zonal Leader / HOD":
      return {
        scopeType: campusId ? "campus_role_filtered" : "personal",
        scopeId: campusId,
        childRoles: OVERSIGHT_CHILD_ROLES["Zonal Leader / HOD"] ?? [],
        dashboardTitle: "Zonal / HOD Leadership Intelligence",
        insightContext: "cell leaders within campus",
      };

    default:
      return {
        scopeType: "personal",
        scopeId: null,
        childRoles: [],
        dashboardTitle: "Personal Learning",
        insightContext: "personal growth",
      };
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function roleDisplayLabel(role: MockRole): string {
  const map: Partial<Record<MockRole, string>> = {
    "Directional Leader": "Directional Leaders",
    "District Pastor / Pastoral Leader": "District / Pastoral Leaders",
    "Area Leader": "Area Leaders",
    "Community Leader": "Community Leaders",
    "Zonal Leader / HOD": "Zonal Leaders / HODs",
    "Cell Leader / Assistant HOD": "Cell Leaders / Asst. HODs",
    "Campus Pastor": "Campus Pastors",
    "Sub-Group Pastor": "Subgroup Pastors",
    "Group Pastor": "Group Pastors",
  };
  return map[role] ?? role;
}

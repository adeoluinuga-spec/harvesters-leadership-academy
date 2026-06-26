export type AcademyRole = string;

export type CurrentLeadershipRole =
  | "Cell Leader / Assistant HOD"
  | "Zonal Leader / HOD"
  | "Community Leader"
  | "Area Leader"
  | "District Pastor / Pastoral Leader"
  | "Directional Leader"
  | "Campus Pastor"
  | "Sub-Group Pastor"
  | "Group Pastor"
  | "None";

export type LeadershipAspiration =
  | "Cell Leader"
  | "Zonal Leader / HOD"
  | "Community Leader"
  | "Area Leader"
  | "District Pastor / Pastoral Leader"
  | "Pastoral Leadership"
  | "Directional Leadership"
  | "Directional Leader"
  | "Campus Pastor"
  | "Sub-Group Pastor"
  | "Group Pastor"
  | "Higher Strategic Leadership";

export const PLATFORM_ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"] as const;
export const INVITE_ONLY_ROLES = [
  "Platform Super Admin", "Group Pastor", "Sub-Group Pastor", "Campus Pastor", "Campus Admin", "Super Admin", "Admin",
] as const;

export const SELF_ONBOARDING_LEADERSHIP_ROLES = [
  "Cell Leader / Assistant HOD", "Zonal Leader / HOD", "Community Leader", "Area Leader",
  "District Pastor / Pastoral Leader", "Directional Leader",
] as const;

export const leadershipAspirations: LeadershipAspiration[] = [
  "Zonal Leader / HOD", "Community Leader", "Area Leader", "District Pastor / Pastoral Leader",
  "Directional Leader", "Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Higher Strategic Leadership",
];

const dashboardRoutes: Record<string, string> = {
  "Platform Super Admin": "/dashboard/admin", "Super Admin": "/dashboard/admin", Admin: "/dashboard/admin",
  "Cell Leader / Assistant HOD": "/dashboard/leader", Leader: "/dashboard/leader",
  "Zonal Leader / HOD": "/dashboard/community", "Community Leader": "/dashboard/community", "Area Leader": "/dashboard/community",
  "District Pastor / Pastoral Leader": "/dashboard/directional", "Directional Leader": "/dashboard/directional",
  "Campus Pastor": "/dashboard/campus", "Campus Admin": "/dashboard/campus-admin",
  "Sub-Group Pastor": "/dashboard/subgroup", "Subgroup Pastor": "/dashboard/subgroup", "Sub-group Pastor": "/dashboard/subgroup",
  "Group Pastor": "/dashboard/group", "Group Admin": "/dashboard/group", Attendee: "/dashboard/leader", Member: "/dashboard/leader", Worker: "/dashboard/leader",
};

const nextLeadershipRoleMap: Record<string, LeadershipAspiration> = {
  "Cell Leader / Assistant HOD": "Zonal Leader / HOD", "Zonal Leader / HOD": "Community Leader",
  "Community Leader": "Area Leader", "Area Leader": "District Pastor / Pastoral Leader",
  "District Pastor / Pastoral Leader": "Directional Leader", "Directional Leader": "Campus Pastor",
  "Campus Pastor": "Sub-Group Pastor", "Sub-Group Pastor": "Group Pastor", "Group Pastor": "Higher Strategic Leadership",
};

export function normalizeRole(role?: string | null): AcademyRole {
  if (["Platform Super Admin", "Admin", "Super Admin"].includes(role ?? "")) return "Platform Super Admin";
  if (["Subgroup Pastor", "Sub-group Pastor", "Sub-Group Pastor"].includes(role ?? "")) return "Sub-Group Pastor";
  if (["Zonal Leader", "HOD", "Zonal Leader / HOD"].includes(role ?? "")) return "Zonal Leader / HOD";
  if (["District Pastor", "Pastoral Leader", "District Pastor / Pastoral Leader"].includes(role ?? "")) return "District Pastor / Pastoral Leader";
  return role?.trim() || "Member";
}

export function dashboardForRole(role?: string | null) {
  return dashboardRoutes[normalizeRole(role)] ?? "/dashboard/leader";
}

export function roleCanAccess(role: string, allowedRoles: string[]) {
  const normalized = normalizeRole(role);
  return normalized === "Platform Super Admin" || allowedRoles.map(normalizeRole).includes(normalized);
}

export function isInviteOnlyRole(role?: string | null) {
  return INVITE_ONLY_ROLES.map(normalizeRole).includes(normalizeRole(role));
}

export function suggestedLeadershipAspiration(role?: string | null) {
  return nextLeadershipRoleMap[normalizeRole(role)] ?? "Cell Leader";
}

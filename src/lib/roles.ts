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
export const LEARNER_ROLES = ["Attendee", "Member", "Worker"] as const;
export const ADMIN_COURSE_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
  "Campus Admin",
  "Group Admin",
] as const;
export const COMMUNICATION_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
  "Campus Admin",
  "Group Admin",
] as const;
export const OVERSIGHT_ROLES = [
  "Cell Leader / Assistant HOD",
  "Leader",
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "District Pastor / Pastoral Leader",
  "Directional Leader",
  "Campus Pastor",
  "Campus Admin",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Group Pastor",
  "Group Admin",
  ...PLATFORM_ADMIN_ROLES,
] as const;
export const AUTHENTICATED_ROLES = [
  ...LEARNER_ROLES,
  ...OVERSIGHT_ROLES,
] as const;
export const INVITE_ONLY_ROLES = [
  "Platform Super Admin", "Group Pastor", "Group Admin", "Sub-Group Pastor", "Campus Pastor", "Campus Admin", "Super Admin", "Admin",
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
  "Group Pastor": "/dashboard/group", "Group Admin": "/dashboard/group", Attendee: "/dashboard/attendee", Member: "/dashboard/attendee", Worker: "/dashboard/attendee",
};

const nextLeadershipRoleMap: Record<string, LeadershipAspiration> = {
  "Cell Leader / Assistant HOD": "Zonal Leader / HOD", "Zonal Leader / HOD": "Community Leader",
  "Community Leader": "Area Leader", "Area Leader": "District Pastor / Pastoral Leader",
  "District Pastor / Pastoral Leader": "Directional Leader", "Directional Leader": "Campus Pastor",
  "Campus Pastor": "Sub-Group Pastor", "Sub-Group Pastor": "Group Pastor", "Group Pastor": "Higher Strategic Leadership",
};

export function normalizeRole(role?: string | null): AcademyRole {
  const value = role?.trim();
  if (!value) return "Member";

  const normalized = value.toLowerCase();

  if (["platform super admin", "admin", "super admin"].includes(normalized)) return "Platform Super Admin";
  if (["subgroup pastor", "sub-group pastor", "sub group pastor"].includes(normalized)) return "Sub-Group Pastor";
  if (["zonal leader", "hod", "zonal leader / hod"].includes(normalized)) return "Zonal Leader / HOD";
  if (["district pastor", "pastoral leader", "district pastor / pastoral leader"].includes(normalized)) return "District Pastor / Pastoral Leader";
  if (["attendee"].includes(normalized)) return "Attendee";
  if (["member", "cell member"].includes(normalized)) return "Member";
  if (["worker"].includes(normalized)) return "Worker";
  if (["cell leader", "assistant hod", "cell leader / assistant hod"].includes(normalized)) return "Cell Leader / Assistant HOD";
  if (["campus pastor"].includes(normalized)) return "Campus Pastor";
  if (["campus admin"].includes(normalized)) return "Campus Admin";
  if (["group pastor", "group admin"].includes(normalized)) return "Group Pastor";
  if (["sub-group pastor", "subgroup pastor"].includes(normalized)) return "Sub-Group Pastor";
  if (["leader"].includes(normalized)) return "Leader";

  return value;
}

export function dashboardForRole(role?: string | null) {
  return dashboardRoutes[normalizeRole(role)] ?? "/dashboard/attendee";
}

export function roleCanAccess(role: string, allowedRoles: string[]) {
  const normalized = normalizeRole(role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  if (normalized === "Platform Super Admin") return true;
  if ((LEARNER_ROLES as readonly string[]).includes(normalized)) {
    return normalizedAllowed.includes("Attendee") || normalizedAllowed.includes("Member") || normalizedAllowed.includes("Worker");
  }

  return normalizedAllowed.includes(normalized);
}

export function isInviteOnlyRole(role?: string | null) {
  return INVITE_ONLY_ROLES.map(normalizeRole).includes(normalizeRole(role));
}

export function suggestedLeadershipAspiration(role?: string | null) {
  return nextLeadershipRoleMap[normalizeRole(role)] ?? "Cell Leader";
}

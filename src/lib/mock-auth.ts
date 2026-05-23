export type MockRole =
  | "Platform Super Admin"
  | "Cell Leader / Assistant HOD"
  | "Zonal Leader / HOD"
  | "Community Leader"
  | "Area Leader"
  | "District Pastor / Pastoral Leader"
  | "Directional Leader"
  | "Campus Pastor"
  | "Sub-Group Pastor"
  | "Group Pastor"
  | "Campus Admin"
  | "Super Admin"
  | "Leader"
  | "Subgroup Pastor"
  | "Sub-group Pastor"
  | "Admin";

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

export type MockLeadershipProfile = {
  avatarUrl?: string;
  campus: string;
  subgroup: string;
  group: string;
  campusPastor: string;
  currentLeadershipRole: CurrentLeadershipRole;
  leadershipAspiration: LeadershipAspiration;
};

export const mockRoles: MockRole[] = [
  "Platform Super Admin",
  "Cell Leader / Assistant HOD",
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "Directional Leader",
  "Campus Pastor",
  "Sub-Group Pastor",
  "Group Pastor",
  "Campus Admin",
  "Super Admin",
];

export const controlledPreseedRoles: MockRole[] = [
  "Platform Super Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Campus Pastor",
  "Campus Admin",
  "Super Admin",
];

export const selfOnboardingRoles: MockRole[] = [
  "Cell Leader / Assistant HOD",
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "District Pastor / Pastoral Leader",
  "Directional Leader",
];

export const roleDashboardRoutes: Record<MockRole, string> = {
  "Platform Super Admin": "/dashboard/admin",
  "Cell Leader / Assistant HOD": "/dashboard/leader",
  "Zonal Leader / HOD": "/dashboard/community",
  "Community Leader": "/dashboard/community",
  "Area Leader": "/dashboard/community",
  "District Pastor / Pastoral Leader": "/dashboard/directional",
  "Directional Leader": "/dashboard/directional",
  "Campus Pastor": "/dashboard/campus",
  "Sub-Group Pastor": "/dashboard/subgroup",
  "Group Pastor": "/dashboard/group",
  "Campus Admin": "/dashboard/campus-admin",
  "Super Admin": "/dashboard/admin",
  Leader: "/dashboard/leader",
  "Subgroup Pastor": "/dashboard/subgroup",
  "Sub-group Pastor": "/dashboard/subgroup",
  Admin: "/dashboard/admin",
};

export const currentLeadershipRoles: CurrentLeadershipRole[] = [
  "Cell Leader / Assistant HOD",
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "District Pastor / Pastoral Leader",
  "Directional Leader",
  "Campus Pastor",
  "Sub-Group Pastor",
  "Group Pastor",
  "None",
];

export const leadershipAspirations: LeadershipAspiration[] = [
  "Zonal Leader / HOD",
  "Community Leader",
  "Area Leader",
  "District Pastor / Pastoral Leader",
  "Directional Leader",
  "Campus Pastor",
  "Sub-Group Pastor",
  "Group Pastor",
  "Higher Strategic Leadership",
];

export const nextLeadershipRoleMap: Partial<Record<MockRole, LeadershipAspiration>> = {
  "Cell Leader / Assistant HOD": "Zonal Leader / HOD",
  "Zonal Leader / HOD": "Community Leader",
  "Community Leader": "Area Leader",
  "Area Leader": "District Pastor / Pastoral Leader",
  "District Pastor / Pastoral Leader": "Directional Leader",
  "Directional Leader": "Campus Pastor",
  "Campus Pastor": "Sub-Group Pastor",
  "Sub-Group Pastor": "Group Pastor",
  "Group Pastor": "Higher Strategic Leadership",
};

export const defaultLeadershipProfile: MockLeadershipProfile = {
  campus: "Ilupeju Campus",
  subgroup: "Magodo Subgroup",
  group: "Group Alpha",
  campusPastor: "Pastor Adeolu Osinuga",
  currentLeadershipRole: "Cell Leader / Assistant HOD",
  leadershipAspiration: "Zonal Leader / HOD",
};

export function dashboardForRole(role: MockRole) {
  return roleDashboardRoutes[normalizeStoredRole(role)];
}

export function roleCanAccess(role: MockRole, allowedRoles: MockRole[]) {
  const normalizedRole = normalizeStoredRole(role);

  if (normalizedRole === "Platform Super Admin") {
    return true;
  }

  return allowedRoles.map(normalizeStoredRole).includes(normalizedRole);
}

export function isControlledPreseedRole(role: MockRole) {
  return controlledPreseedRoles.includes(normalizeStoredRole(role));
}

export function normalizeStoredRole(role?: string | null): MockRole {
  if (role === "Platform Super Admin" || role === "Admin" || role === "Super Admin") {
    return "Platform Super Admin";
  }

  if (role === "Group Pastor") {
    return "Group Pastor";
  }

  if (role === "Campus Admin") {
    return "Campus Admin";
  }

  if (role === "Directional Leader") {
    return "Directional Leader";
  }

  if (role === "District Pastor / Pastoral Leader" || role === "District Pastor" || role === "Pastoral Leader") {
    return "District Pastor / Pastoral Leader";
  }

  if (role === "Subgroup Pastor" || role === "Sub-group Pastor" || role === "Sub-Group Pastor") {
    return "Sub-Group Pastor";
  }

  if (role === "Campus Pastor") {
    return "Campus Pastor";
  }

  if (role === "Area Leader") {
    return "Area Leader";
  }

  if (role === "Community Leader") {
    return "Community Leader";
  }

  if (role === "Zonal Leader / HOD" || role === "Zonal Leader" || role === "HOD") {
    return "Zonal Leader / HOD";
  }

  return "Cell Leader / Assistant HOD";
}

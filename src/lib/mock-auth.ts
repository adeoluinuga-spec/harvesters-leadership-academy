export type MockRole = "Leader" | "Campus Pastor" | "Subgroup Pastor" | "Group Pastor" | "Admin";
export type CurrentLeadershipRole =
  | "Directional Leader"
  | "Pastoral Leader"
  | "Community Leader"
  | "Zonal Leader / HOD"
  | "Cell Leader / Assistant HOD"
  | "None";
export type LeadershipAspiration =
  | "Cell Leader"
  | "Zonal Leader / HOD"
  | "Community Leader"
  | "Pastoral Leadership"
  | "Directional Leadership";

export type MockLeadershipProfile = {
  campus: string;
  subgroup: string;
  group: string;
  campusPastor: string;
  department: string;
  currentLeadershipRole: CurrentLeadershipRole;
  leadershipAspiration: LeadershipAspiration;
};

export const mockRoles: MockRole[] = [
  "Leader",
  "Campus Pastor",
  "Subgroup Pastor",
  "Group Pastor",
  "Admin",
];

export const roleDashboardRoutes: Record<MockRole, string> = {
  Leader: "/leader-dashboard",
  "Campus Pastor": "/campus-dashboard",
  "Subgroup Pastor": "/subgroup-dashboard",
  "Group Pastor": "/group-dashboard",
  Admin: "/dashboard",
};

const roleStorageKey = "harvesters_mock_role";
const profileStorageKey = "harvesters_mock_leadership_profile";

export const currentLeadershipRoles: CurrentLeadershipRole[] = [
  "Directional Leader",
  "Pastoral Leader",
  "Community Leader",
  "Zonal Leader / HOD",
  "Cell Leader / Assistant HOD",
  "None",
];

export const leadershipAspirations: LeadershipAspiration[] = [
  "Cell Leader",
  "Zonal Leader / HOD",
  "Community Leader",
  "Pastoral Leadership",
  "Directional Leadership",
];

export const defaultLeadershipProfile: MockLeadershipProfile = {
  campus: "Ilupeju Campus",
  subgroup: "Magodo Subgroup",
  group: "Group Alpha",
  campusPastor: "Pastor Adeolu Osinuga",
  department: "Media Department",
  currentLeadershipRole: "Cell Leader / Assistant HOD",
  leadershipAspiration: "Zonal Leader / HOD",
};

export function getMockRole(): MockRole {
  if (typeof window === "undefined") return "Admin";

  const storedRole = window.localStorage.getItem(roleStorageKey);
  return mockRoles.includes(storedRole as MockRole) ? (storedRole as MockRole) : "Admin";
}

export function setMockRole(role: MockRole) {
  window.localStorage.setItem(roleStorageKey, role);
  window.dispatchEvent(new CustomEvent("harvesters-role-change", { detail: role }));
}

export function getLeadershipProfile(): MockLeadershipProfile {
  if (typeof window === "undefined") return defaultLeadershipProfile;

  const storedProfile = window.localStorage.getItem(profileStorageKey);

  if (!storedProfile) {
    return defaultLeadershipProfile;
  }

  try {
    return { ...defaultLeadershipProfile, ...JSON.parse(storedProfile) };
  } catch {
    return defaultLeadershipProfile;
  }
}

export function setLeadershipProfile(profile: MockLeadershipProfile) {
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("harvesters-profile-change", { detail: profile }));
}

export function identityForRole(role: MockRole, profile = defaultLeadershipProfile) {
  if (role === "Group Pastor") {
    return { name: "Pastor Mayowa Agboade", title: "Group Pastor" };
  }

  if (role === "Campus Pastor") {
    return {
      name: profile.campusPastor,
      title: `Campus Pastor — ${profile.campus}`,
    };
  }

  if (role === "Subgroup Pastor") {
    return {
      name: profile.subgroup === "Magodo Subgroup" ? "Pastor Gbenga Agboola" : "Subgroup Pastor",
      title: `Subgroup Pastor — ${profile.subgroup}`,
    };
  }

  if (role === "Admin") {
    return { name: "Pastor Mayowa Agboade", title: "Academy Administrator" };
  }

  return {
    name: "Tolu Adebayo",
    title: `Leader — ${profile.department}`,
  };
}

export function dashboardForRole(role: MockRole) {
  return roleDashboardRoutes[role];
}

export function roleCanAccess(role: MockRole, allowedRoles: MockRole[]) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return allowedRoles.includes(role);
}

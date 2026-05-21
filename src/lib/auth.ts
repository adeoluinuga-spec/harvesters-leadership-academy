import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/client";
import { campuses as fallbackCampuses, groupAlpha } from "@/lib/hierarchy-data";
import {
  dashboardForRole,
  defaultLeadershipProfile,
  LeadershipAspiration,
  MockLeadershipProfile,
  MockRole,
  mockRoles,
  CurrentLeadershipRole,
} from "@/lib/mock-auth";

export type AuthProfile = MockLeadershipProfile & {
  id: string;
  email: string;
  fullName: string;
  role: MockRole;
  onboardingCompleted: boolean;
};

type ProfileRow = {
  id?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  role_id?: string | null;
  campus_id?: string | null;
  subgroup_id?: string | null;
  group_id?: string | null;
  department_id?: string | null;
  campus?: string | null;
  campuses?: RelatedName | RelatedName[] | null;
  subgroup?: string | null;
  subgroups?: RelatedName | RelatedName[] | null;
  group_name?: string | null;
  group?: string | null;
  groups?: RelatedName | RelatedName[] | null;
  campus_pastor?: string | null;
  department?: string | null;
  departments?: RelatedName | RelatedName[] | null;
  current_leadership_role?: MockLeadershipProfile["currentLeadershipRole"] | null;
  aspirational_leadership_role?: MockLeadershipProfile["leadershipAspiration"] | null;
  leadership_aspiration?: MockLeadershipProfile["leadershipAspiration"] | null;
  years_in_ministry?: number | string | null;
  onboarding_completed?: boolean | null;
  roles?: RelatedName | RelatedName[] | null;
};

type RelatedName = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
};

type LookupRow = {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  group_id?: string | number | null;
  subgroup_id?: string | number | null;
};

export type MinistryCampusOption = {
  id: string;
  name: string;
  subgroupId: string | null;
  subgroupName: string;
  groupId: string | null;
  groupName: string;
  groupPastor: string;
  campusPastor: string;
  subgroupPastor: string;
  source: "supabase" | "fallback";
};

export type MinistryLookupOption = {
  id: string;
  name: string;
};

export type OnboardingProfileInput = {
  phone: string;
  gender: string;
  campus: MinistryCampusOption;
  departmentId: string;
  roleId: string;
  role: MockRole;
  currentLeadershipRole: CurrentLeadershipRole;
  aspirationalLeadershipRole: LeadershipAspiration;
  yearsInMinistry: number | null;
};

export function normalizeRole(role?: string | null): MockRole {
  if (mockRoles.includes(role as MockRole)) {
    return role as MockRole;
  }

  return "Leader";
}

export function authErrorMessage(message?: string) {
  const lowerMessage = message?.toLowerCase() ?? "";

  if (lowerMessage.includes("invalid login") || lowerMessage.includes("invalid credentials")) {
    return "The email or password is incorrect. Please check your details and try again.";
  }

  if (lowerMessage.includes("not found") || lowerMessage.includes("user")) {
    return "We could not find an academy account with those details.";
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    return "An account already exists with this email. Please sign in instead.";
  }

  return message || "Something went wrong. Please try again.";
}

export async function getAuthProfile(user: User, fallbackRole: MockRole = "Leader") {
  const supabase = createClient();
  let { data } = await supabase
    .from("users")
    .select("*, roles(name), campuses(name), subgroups(name), groups(name), departments(name)")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!data) {
    const fallbackProfile = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();
    data = fallbackProfile.data ?? null;
  }

  const metadata = user.user_metadata ?? {};
  let roleName = data?.role ?? relatedName(data?.roles);

  if (!roleName && data?.role_id) {
    const { data: roleRow } = await supabase
      .from("roles")
      .select("name, title")
      .eq("id", data.role_id)
      .maybeSingle<LookupRow>();
    roleName = roleRow?.name ?? roleRow?.title ?? null;
  }

  const role = roleName
    ? normalizeRole(roleName)
    : normalizeRole((metadata.role as string | undefined) ?? fallbackRole);

  return {
    id: user.id,
    email: data?.email ?? user.email ?? "",
    fullName: data?.full_name ?? (metadata.full_name as string | undefined) ?? user.email ?? "Academy Leader",
    role,
    onboardingCompleted: data?.onboarding_completed ?? false,
    campus: data?.campus ?? relatedName(data?.campuses) ?? defaultLeadershipProfile.campus,
    subgroup: data?.subgroup ?? relatedName(data?.subgroups) ?? defaultLeadershipProfile.subgroup,
    group: data?.group_name ?? data?.group ?? relatedName(data?.groups) ?? defaultLeadershipProfile.group,
    campusPastor: data?.campus_pastor ?? defaultLeadershipProfile.campusPastor,
    department: data?.department ?? relatedName(data?.departments) ?? defaultLeadershipProfile.department,
    currentLeadershipRole:
      data?.current_leadership_role ?? defaultLeadershipProfile.currentLeadershipRole,
    leadershipAspiration:
      data?.aspirational_leadership_role ??
      data?.leadership_aspiration ??
      defaultLeadershipProfile.leadershipAspiration,
  } satisfies AuthProfile;
}

export async function upsertSignupProfile({
  id,
  email,
  fullName,
}: {
  id: string;
  email: string;
  fullName: string;
}) {
  const supabase = createClient();

  const { error } = await supabase.from("users").upsert(
    {
      id,
      email,
      full_name: fullName,
      onboarding_completed: false,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUserProfile() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, profile: null, error: error?.message ?? "No authenticated user session was found." };
  }

  const profile = await getAuthProfile(data.user);
  return { user: data.user, profile, error: null };
}

export async function fetchMinistryCampuses(): Promise<MinistryCampusOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campuses")
    .select("id, name, group_id, subgroup_id, pastor, campus_pastor")
    .order("name");

  if (error || !data?.length) {
    return fallbackCampuses.map((campus) => ({
      id: campus.id,
      name: campus.name,
      subgroupId: null,
      subgroupName: campus.subgroup,
      groupId: null,
      groupName: campus.group,
      groupPastor: campus.groupPastor,
      campusPastor: campus.pastor,
      subgroupPastor: campus.subgroupPastor,
      source: "fallback",
    }));
  }

  const campusRows = data as Array<LookupRow & Record<string, unknown>>;
  const subgroupIds = uniqueIds(campusRows.map((campus) => campus.subgroup_id));
  const directGroupIds = uniqueIds(campusRows.map((campus) => campus.group_id));
  const { data: subgroupRows } = subgroupIds.length
    ? await supabase.from("subgroups").select("id, name, pastor, group_id").in("id", subgroupIds)
    : { data: [] };
  const subgroupsById = new Map(
    ((subgroupRows ?? []) as Array<LookupRow & Record<string, unknown>>).map((subgroup) => [
      String(subgroup.id),
      subgroup,
    ])
  );
  const groupIds = uniqueIds([
    ...directGroupIds,
    ...Array.from(subgroupsById.values()).map((subgroup) => subgroup.group_id),
  ]);
  const { data: groupRows } = groupIds.length
    ? await supabase.from("groups").select("id, name, pastor").in("id", groupIds)
    : { data: [] };
  const groupsById = new Map(
    ((groupRows ?? []) as Array<LookupRow & Record<string, unknown>>).map((group) => [
      String(group.id),
      group,
    ])
  );

  return campusRows.map((campus) => {
    const subgroupId = stringifyId(campus.subgroup_id);
    const subgroup = subgroupId ? subgroupsById.get(subgroupId) : null;
    const groupId = stringifyId(campus.group_id ?? subgroup?.group_id);
    const group = groupId ? groupsById.get(groupId) : null;

    return {
      id: String(campus.id ?? ""),
      name: campus.name ?? "Unnamed campus",
      subgroupId,
      subgroupName: subgroup?.name ?? "Unassigned subgroup",
      groupId,
      groupName: group?.name ?? groupAlpha.group,
      groupPastor: stringValue(group?.pastor) ?? groupAlpha.groupPastor,
      campusPastor: stringValue(campus.campus_pastor ?? campus.pastor) ?? "Campus Pastor",
      subgroupPastor: stringValue(subgroup?.pastor) ?? "Subgroup Pastor",
      source: "supabase",
    };
  });
}

export async function fetchLookupOptions(table: "roles" | "departments"): Promise<MinistryLookupOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from(table).select("id, name, title").order("name");

  if (error || !data) {
    return [];
  }

  return (data as LookupRow[])
    .map((row) => ({
      id: String(row.id ?? ""),
      name: row.name ?? row.title ?? "",
    }))
    .filter((row) => row.id && row.name);
}

export async function saveOnboardingProfile(input: OnboardingProfileInput) {
  if (!input.roleId) {
    throw new Error("Missing role. Please select a valid ministry role before continuing.");
  }

  if (!input.departmentId) {
    throw new Error("Missing department. Please enter a valid department from academy records.");
  }

  if (input.campus.source !== "supabase" || !input.campus.subgroupId || !input.campus.groupId) {
    throw new Error("Invalid hierarchy mapping. Please select a campus that is linked to a subgroup and group.");
  }

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Your session has expired. Please sign in again before completing onboarding.");
  }

  const { error } = await supabase
    .from("users")
    .update({
      phone: input.phone,
      gender: input.gender,
      campus_id: input.campus.id,
      subgroup_id: input.campus.subgroupId,
      group_id: input.campus.groupId,
      department_id: input.departmentId,
      role_id: input.roleId,
      current_leadership_role: input.currentLeadershipRole,
      aspirational_leadership_role: input.aspirationalLeadershipRole,
      years_in_ministry: input.yearsInMinistry,
      onboarding_completed: true,
    })
    .eq("id", authData.user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export function dashboardForAuthRole(role: MockRole) {
  return dashboardForRole(role);
}

function relatedName(value?: RelatedName | RelatedName[] | null) {
  const related = Array.isArray(value) ? value[0] : value;
  return related?.name ?? related?.title ?? null;
}

function stringifyId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function uniqueIds(values: unknown[]) {
  return Array.from(new Set(values.map(stringifyId).filter((value): value is string => Boolean(value))));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

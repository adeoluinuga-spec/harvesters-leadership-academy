import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/client";
import {
  dashboardForRole,
  AcademyRole,
  LeadershipAspiration,
  CurrentLeadershipRole,
  normalizeRole as normalizeStoredRole,
} from "@/lib/roles";

export type AuthProfile = {
  id: string;
  email: string;
  designation: string;
  fullName: string;
  avatarUrl: string;
  role: AcademyRole;
  accountType: "attendee" | "member" | "worker" | "leader";
  directLeaderId: string | null;
  ministryUnitId: string | null;
  onboardingCompleted: boolean;
  organizationId: string | null;
  organizationName: string;
  tenantSlug: string;
  campusId: string | null;
  subgroupId: string | null;
  groupId: string | null;
  campus: string;
  subgroup: string;
  group: string;
  campusPastor: string;
  currentLeadershipRole: CurrentLeadershipRole;
  leadershipAspiration: LeadershipAspiration;
};

type ProfileRow = {
  id?: string | null;
  email?: string | null;
  designation?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  role?: string | null;
  account_type?: "attendee" | "member" | "worker" | "leader" | null;
  direct_leader_id?: string | null;
  ministry_unit_id?: string | null;
  role_id?: string | null;
  organization_id?: string | null;
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
  current_leadership_role?: CurrentLeadershipRole | null;
  aspirational_leadership_role?: LeadershipAspiration | null;
  leadership_aspiration?: LeadershipAspiration | null;
  years_in_ministry?: number | string | null;
  onboarding_completed?: boolean | null;
  roles?: RelatedName | RelatedName[] | null;
  organization?: RelatedName | RelatedName[] | null;
  organizations?: OrganizationRelation | OrganizationRelation[] | null;
};

type RelatedName = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
};

type OrganizationRelation = RelatedName & {
  slug?: string | null;
};

type LookupRow = {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  group_id?: string | number | null;
  subgroup_id?: string | number | null;
  slug?: string | null;
  campus_pastor?: string | null;
  pastor?: string | null;
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
  source: "supabase";
};

export type MinistryLookupOption = {
  id: string;
  name: string;
};

export type MinistryUnitOption = {
  id: string;
  name: string;
  unitType: "department_zone" | "unit_area" | "cell";
};

export type OnboardingProfileInput = {
  accountType: "attendee" | "member" | "worker" | "leader";
  designation: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string;
  gender: string;
  campus: MinistryCampusOption;
  roleId: string | null;
  role: AcademyRole;
  directLeaderId: string | null;
  ministryUnitId: string | null;
  currentLeadershipRole: CurrentLeadershipRole;
  aspirationalLeadershipRole: LeadershipAspiration;
  yearsInMinistry: number | null;
};

export function normalizeRole(role?: string | null): AcademyRole {
  return normalizeStoredRole(role);
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

export async function ensureUserProfile(
  user: User,
  input: {
    designation?: string;
    fullName?: string;
  } = {}
) {
  const supabase = createClient();
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? "";
  const fullName =
    input.fullName?.trim() ||
    (metadata.full_name as string | undefined)?.trim() ||
    email ||
    "Academy Leader";
  const designation =
    normalizeDesignation(input.designation ?? (metadata.designation as string | undefined));

  const profilePayload = {
    id: user.id,
    email,
    designation,
    full_name: fullName,
    role: "Cell Leader",
    avatar_url: null,
    organization_id: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  const { data: existingProfile, error: lookupError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (lookupError) {
    console.error("[auth] Failed to look up public.users profile", {
      userId: user.id,
      message: lookupError.message,
      details: lookupError.details,
      hint: lookupError.hint,
    });
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("users")
    .upsert(profilePayload, { onConflict: "id" })
    .select("*")
    .single<ProfileRow>();

  if (!insertError && insertedProfile) {
    return insertedProfile;
  }

  console.error("[auth] Failed to create public.users profile", {
    userId: user.id,
    message: insertError?.message,
    details: insertError?.details,
    hint: insertError?.hint,
  });

  throw new Error("We could not create your academy profile. Please try again or contact academy support.");
}

export async function getAuthProfile(user: User, fallbackRole: AcademyRole = "Attendee") {
  const supabase = createClient();

  let { data } = await supabase
    .from("users")
    .select("*, roles(name), organizations(name, slug)")
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

  if (!data) {
    data = await ensureUserProfile(user, {
      fullName: metadata.full_name as string | undefined,
      designation: metadata.designation as string | undefined,
    });
  }

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

  const organizationId = data?.organization_id ?? null;
  let organizationName = relatedOrganization(data?.organizations)?.name ?? relatedName(data?.organization);
  let tenantSlug = relatedOrganization(data?.organizations)?.slug ?? null;

  if (organizationId && (!organizationName || !tenantSlug)) {
    const { data: organizationRow } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organizationId)
      .maybeSingle<LookupRow>();

    organizationName = organizationName ?? organizationRow?.name ?? null;
    tenantSlug = tenantSlug ?? organizationRow?.slug ?? null;
  }

  const campusId = data?.campus_id ?? null;
  const subgroupId = data?.subgroup_id ?? null;
  const groupId = data?.group_id ?? null;

  const [campusRow, subgroupRow, groupRow] = await Promise.all([
    campusId
      ? supabase
          .from("campuses")
          .select("name, campus_pastor, pastor")
          .eq("id", campusId)
          .maybeSingle<LookupRow>()
          .then((r) => {
            if (r.error) {
              console.error("[auth] campuses query failed", {
                userId: user.id,
                campusId,
                message: r.error.message,
                code: r.error.code,
              });
            }
            return r.data;
          })
      : Promise.resolve(null),
    subgroupId
      ? supabase
          .from("subgroups")
          .select("name")
          .eq("id", subgroupId)
          .maybeSingle<LookupRow>()
          .then((r) => r.data)
      : Promise.resolve(null),
    groupId
      ? supabase
          .from("groups")
          .select("name")
          .eq("id", groupId)
          .maybeSingle<LookupRow>()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const campusName = campusRow?.name ?? (data?.campus || null);
  const subgroupName = subgroupRow?.name ?? null;
  const groupName = groupRow?.name ?? null;
  const campusPastor = campusRow?.campus_pastor ?? campusRow?.pastor ?? null;

  return {
    id: user.id,
    email: data?.email ?? user.email ?? "",
    designation: normalizeDesignation(data?.designation ?? (metadata.designation as string | undefined)),
    fullName: data?.full_name ?? (metadata.full_name as string | undefined) ?? user.email ?? "Academy Leader",
    avatarUrl: data?.avatar_url ?? "",
    role,
    accountType: data?.account_type ?? (role === "Attendee" ? "attendee" : role === "Member" ? "member" : role === "Worker" ? "worker" : "leader"),
    directLeaderId: data?.direct_leader_id ?? null,
    ministryUnitId: data?.ministry_unit_id ?? null,
    onboardingCompleted: data?.onboarding_completed ?? false,
    organizationId,
    organizationName: organizationName ?? "Harvesters International Christian Centre",
    tenantSlug: tenantSlug ?? "harvesters",
    campusId,
    subgroupId,
    groupId,
    campus: campusName ?? "",
    subgroup: subgroupName ?? "",
    group: groupName ?? "",
    campusPastor: campusPastor ?? "",
    currentLeadershipRole: data?.current_leadership_role ?? "None",
    leadershipAspiration:
      data?.aspirational_leadership_role ??
      data?.leadership_aspiration ??
      "Pastoral Leadership",
  } satisfies AuthProfile;
}

export async function upsertSignupProfile({
  id,
  email,
  designation,
  fullName,
}: {
  id: string;
  email: string;
  designation: string;
  fullName: string;
}) {
  const supabase = createClient();

  const { error } = await supabase.from("users").upsert(
    {
      id,
      email,
      designation: normalizeDesignation(designation),
      full_name: fullName,
      avatar_url: null,
      organization_id: null,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
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

  try {
    const profile = await getAuthProfile(data.user);
    return { user: data.user, profile, error: null };
  } catch (profileError) {
    console.error("[auth] Failed to resolve current user profile", profileError);
    return {
      user: data.user,
      profile: null,
      error:
        profileError instanceof Error
          ? profileError.message
          : "We could not load your academy profile.",
    };
  }
}

export async function fetchMinistryCampuses(): Promise<MinistryCampusOption[]> {
  const supabase = createClient();

  const { data: campusRows, error: campusError } = await supabase
    .from("campuses")
    .select("id, name, subgroup_id")
    .order("name", { ascending: true });

  if (campusError) {
    console.error("[fetchMinistryCampuses] campus fetch failed", campusError);
    throw new Error("Your campus list could not be loaded from the server. Please refresh the page and try again.");
  }

  if (!campusRows || campusRows.length === 0) {
    console.error("[fetchMinistryCampuses] no campuses returned");
    throw new Error("No campuses are available yet. Please contact academy support.");
  }

  const subgroupIds = Array.from(
    new Set(
      campusRows
        .map((campus) => campus.subgroup_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: subgroupRows, error: subgroupError } = subgroupIds.length
    ? await supabase
        .from("subgroups")
        .select("id, name, group_id")
        .in("id", subgroupIds)
    : { data: [], error: null };

  if (subgroupError) {
    console.error("[fetchMinistryCampuses] subgroup fetch failed", subgroupError);
  }

  const groupIds = Array.from(
    new Set(
      (subgroupRows ?? [])
        .map((subgroup) => subgroup.group_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: groupRows, error: groupError } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds)
    : { data: [], error: null };

  if (groupError) {
    console.error("[fetchMinistryCampuses] group fetch failed", groupError);
  }

  const subgroupMap = new Map(
    (subgroupRows ?? []).map((subgroup) => [subgroup.id, subgroup])
  );

  const groupMap = new Map(
    (groupRows ?? []).map((group) => [group.id, group])
  );

  return campusRows.map((campus) => {
    const subgroup = campus.subgroup_id ? subgroupMap.get(campus.subgroup_id) : null;
    const group = subgroup?.group_id ? groupMap.get(subgroup.group_id) : null;

    return {
      id: campus.id,
      name: campus.name ?? "Unnamed Campus",
      subgroupId: campus.subgroup_id ?? null,
      subgroupName: subgroup?.name ?? "Unassigned subgroup",
      groupId: subgroup?.group_id ?? null,
      groupName: group?.name ?? "Unassigned group",
      groupPastor: "",
      campusPastor: "",
      subgroupPastor: "",
      source: "supabase",
    };
  });
}

export async function fetchLookupOptions(table: "roles"): Promise<MinistryLookupOption[]> {
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

export async function fetchMinistryUnits(campusId: string, accountType: "member" | "worker"): Promise<MinistryUnitOption[]> {
  if (!campusId) return [];
  const types = accountType === "member" ? ["cell"] : ["department_zone", "unit_area"];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ministry_units")
    .select("id, name, unit_type")
    .eq("campus_id", campusId)
    .in("unit_type", types)
    .order("name");
  if (error) throw new Error("Ministry structure could not be loaded. Please try again.");
  return (data ?? []).map((unit) => ({
    id: unit.id,
    name: unit.name,
    unitType: unit.unit_type as MinistryUnitOption["unitType"],
  }));
}

export async function saveOnboardingProfile(input: OnboardingProfileInput): Promise<void> {
  if (!input.campus.name?.trim()) {
    throw new Error("Please select a valid campus before continuing.");
  }

  const supabase = createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Your session has expired. Please sign in again before completing onboarding.");
  }

  const token = sessionData.session.access_token;

  const response = await fetch("/api/auth/save-onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: token,
      campusName: input.campus.name,
      campusIdHint: input.campus.id,
      campusSubgroupId: input.campus.subgroupId ?? null,
      campusGroupId: input.campus.groupId ?? null,
      role: input.role,
      accountType: input.accountType,
      directLeaderId: input.directLeaderId,
      ministryUnitId: input.ministryUnitId,
      roleId: input.roleId ?? null,
      designation: input.designation,
      fullName: input.fullName,
      email: input.email,
      avatarUrl: input.avatarUrl,
      phone: input.phone,
      gender: input.gender,
      currentLeadershipRole: input.currentLeadershipRole,
      aspirationalLeadershipRole: input.aspirationalLeadershipRole,
      yearsInMinistry: input.yearsInMinistry ?? null,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: "Save failed." }));
    throw new Error(
      (errorJson as { error?: string }).error ?? "We could not save your ministry profile. Please try again."
    );
  }

  const result = (await response.json()) as { ok: boolean; campus_id: string | null };
  if (!result.campus_id) {
    throw new Error(
      "Campus assignment could not be completed. Please go back and re-select your campus."
    );
  }
}

export function dashboardForAuthRole(role: AcademyRole) {
  return dashboardForRole(role);
}

export async function fetchClaimedCampusIds(excludeUserId?: string): Promise<Set<string>> {
  const supabase = createClient();

  type ClaimRow = { campus_id: string | null };

  let query = supabase
    .from("users")
    .select("campus_id")
    .eq("role", "Campus Pastor")
    .eq("onboarding_completed", true)
    .not("campus_id", "is", null);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.returns<ClaimRow[]>();

  if (error) {
    console.error("[auth] fetchClaimedCampusIds failed", error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.campus_id)
      .filter((id): id is string => Boolean(id))
  );
}

function relatedName(value?: RelatedName | RelatedName[] | null) {
  const related = Array.isArray(value) ? value[0] : value;
  return related?.name ?? related?.title ?? null;
}

function relatedOrganization(value?: OrganizationRelation | OrganizationRelation[] | null) {
  const related = Array.isArray(value) ? value[0] : value;
  return related
    ? {
        name: related.name ?? related.title ?? null,
        slug: related.slug ?? null,
      }
    : null;
}

export function normalizeDesignation(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : "None";
}

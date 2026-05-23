import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/client";
import { campuses as fallbackCampuses, groupAlpha } from "@/lib/hierarchy-data";
import {
  dashboardForRole,
  defaultLeadershipProfile,
  LeadershipAspiration,
  MockLeadershipProfile,
  MockRole,
  CurrentLeadershipRole,
  normalizeStoredRole,
} from "@/lib/mock-auth";

export type AuthProfile = MockLeadershipProfile & {
  id: string;
  email: string;
  designation: string;
  fullName: string;
  avatarUrl: string;
  role: MockRole;
  onboardingCompleted: boolean;
  organizationId: string | null;
  organizationName: string;
  tenantSlug: string;
  campusId: string | null;
  subgroupId: string | null;
  groupId: string | null;
};

type ProfileRow = {
  id?: string | null;
  email?: string | null;
  designation?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  role?: string | null;
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
  current_leadership_role?: MockLeadershipProfile["currentLeadershipRole"] | null;
  aspirational_leadership_role?: MockLeadershipProfile["leadershipAspiration"] | null;
  leadership_aspiration?: MockLeadershipProfile["leadershipAspiration"] | null;
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
  source: "supabase" | "fallback";
};

export type MinistryLookupOption = {
  id: string;
  name: string;
};

export type OnboardingProfileInput = {
  designation: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string;
  gender: string;
  campus: MinistryCampusOption;
  roleId: string | null;
  role: MockRole;
  currentLeadershipRole: CurrentLeadershipRole;
  aspirationalLeadershipRole: LeadershipAspiration;
  yearsInMinistry: number | null;
};

export function normalizeRole(role?: string | null): MockRole {
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

export async function getAuthProfile(user: User, fallbackRole: MockRole = "Leader") {
  const supabase = createClient();

  // Step 1: fetch user row — no campus/subgroup/group FK joins, just scalar columns + role/org
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

  // Step 2: read IDs directly from scalar columns on the user row
  const campusId = data?.campus_id ?? null;
  const subgroupId = data?.subgroup_id ?? null;
  const groupId = data?.group_id ?? null;

  // Steps 3–6: parallel explicit queries for each name — no FK join reliance, no text column fallback
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
  const { data, error } = await supabase
    .from("campuses")
    .select("id, name, group_id, subgroup_id, pastor, campus_pastor")
    .order("name");

  if (error || !data?.length) {
    // Direct query failed (likely RLS blocks campus read for this role).
    // Try the server-side API route which uses the service role key to bypass RLS.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const response = await fetch("/api/auth/campuses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const json = (await response.json()) as {
            campuses?: Array<Omit<MinistryCampusOption, "source">>;
          };
          if (json.campuses?.length) {
            console.log("[fetchMinistryCampuses] resolved via API route:", json.campuses.length, "campuses");
            return json.campuses.map((campus) => ({ ...campus, source: "supabase" as const }));
          }
        }
      }
    } catch (apiError) {
      console.warn("[fetchMinistryCampuses] API route fallback failed:", apiError);
    }

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
      subgroupPastor: stringValue(subgroup?.pastor) ?? "Sub-group Pastor",
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

  // Delegate all campus resolution and DB writes to the server-side API route.
  // The route uses the service role key, which bypasses RLS on public.campuses
  // so campus_id / subgroup_id / group_id are always resolved from real DB rows.
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

export function dashboardForAuthRole(role: MockRole) {
  return dashboardForRole(role);
}

/**
 * Returns the set of campus_ids already claimed by a Campus Pastor with
 * onboarding_completed = true, optionally excluding one user (the current
 * user so they can re-claim/change their own campus).
 */
/**
 * Returns the set of campus_ids already claimed by a Campus Pastor with
 * onboarding_completed = true. Pass the current user's id as excludeUserId
 * so their own campus is not counted as taken.
 */
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

export function normalizeDesignation(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : "None";
}

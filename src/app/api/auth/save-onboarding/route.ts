import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SaveOnboardingBody = {
  accessToken: string;
  campusName: string;
  campusIdHint: string;
  campusSubgroupId?: string | null;
  campusGroupId?: string | null;
  role: string;
  accountType?: "attendee" | "member" | "worker" | "leader";
  directLeaderId?: string | null;
  ministryUnitId?: string | null;
  roleId?: string | null;
  designation?: string | null;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  gender?: string | null;
  currentLeadershipRole?: string | null;
  aspirationalLeadershipRole?: string | null;
  yearsInMinistry?: number | null;
};

type CampusRow = {
  id: string;
  subgroup_id: string | null;
  group_id: string | null;
};

type GroupRow = {
  organization_id: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isUUID(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeDesignation(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "None";
}

async function resolveCampusByName(
  campusName: string,
  campusIdHint: string,
  client: SupabaseClient
): Promise<CampusRow | null> {
  const { data: byName } = await client
    .from("campuses")
    .select("id, subgroup_id, group_id")
    .eq("name", campusName.trim())
    .maybeSingle<CampusRow>();
  if (byName?.id) return byName;

  if (isUUID(campusIdHint)) {
    const { data: byId } = await client
      .from("campuses")
      .select("id, subgroup_id, group_id")
      .eq("id", campusIdHint)
      .maybeSingle<CampusRow>();
    if (byId?.id) return byId;
  }

  return null;
}

export async function POST(request: Request) {
  let body: SaveOnboardingBody;

  try {
    body = (await request.json()) as SaveOnboardingBody;
  } catch {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const {
    accessToken,
    campusName,
    campusIdHint,
    campusSubgroupId,
    campusGroupId,
    role,
    accountType,
    directLeaderId,
    ministryUnitId,
    roleId,
    ...rest
  } = body;

  if (!accessToken || !campusName?.trim() || !role?.trim()) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[save-onboarding] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
    return Response.json({ error: "Server configuration error." }, { status: 500 });
  }

  if (!supabaseServiceRoleKey) {
    console.warn(
      "[save-onboarding] SUPABASE_SERVICE_ROLE_KEY not set — campus reads use user session (RLS applies). " +
        "If campus resolution fails, client-provided UUIDs will be used as fallback."
    );
  }

  // userClient — acts as the authenticated user; handles users table writes via RLS.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // adminClient — bypasses RLS; only created when service role key is available.
  const adminClient = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  // ── 1. Verify JWT ─────────────────────────────────────────────────────────
  const { data: authData, error: verifyError } = await (adminClient ?? userClient).auth.getUser(
    accessToken
  );
  if (verifyError || !authData.user) {
    console.error("[save-onboarding] JWT verification failed.", verifyError?.message);
    return Response.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const userId = authData.user.id;
  const userEmail = authData.user.email ?? (rest.email ?? "").trim();

  // ── 2. Campus resolution (three-tier) ────────────────────────────────────
  // Tier 1: admin client (service role, bypasses RLS — guaranteed if key is set)
  // Tier 2: user client (subject to RLS — works when table allows authenticated reads)
  // Tier 3: trust client-provided UUIDs — used when RLS blocks the user session and
  //         no service role key is configured. Only safe because the client-side
  //         fetchMinistryCampuses only returns real UUIDs when it successfully read
  //         from the DB; slugs (non-UUID) are caught by isUUID() and rejected.

  let campus: CampusRow | null = null;
  let resolutionPath = "none";

  if (adminClient) {
    campus = await resolveCampusByName(campusName, campusIdHint, adminClient);
    if (campus) resolutionPath = "admin-client";
  }

  if (!campus) {
    campus = await resolveCampusByName(campusName, campusIdHint, userClient);
    if (campus) resolutionPath = "user-client";
  }

  if (!campus && isUUID(campusIdHint)) {
    // DB lookup was blocked (RLS) but the client provided a real UUID, meaning
    // fetchMinistryCampuses successfully read from the DB when loading the form.
    campus = {
      id: campusIdHint,
      subgroup_id: isUUID(campusSubgroupId) ? (campusSubgroupId ?? null) : null,
      group_id: isUUID(campusGroupId) ? (campusGroupId ?? null) : null,
    };
    resolutionPath = "client-uuid-fallback";
  }

  console.log("[save-onboarding] campus resolution:", {
    userId,
    campusName,
    campusIdHint,
    campusSubgroupId,
    campusGroupId,
    resolvedCampusId: campus?.id ?? null,
    resolutionPath,
  });

  if (!campus?.id) {
    return Response.json(
      {
        error:
          "We could not find your selected campus. Please go back to Ministry Information and re-select your campus.",
      },
      { status: 422 }
    );
  }

  const resolvedCampusId = campus.id;
  const resolvedSubgroupId = campus.subgroup_id;
  const resolvedGroupId = campus.group_id;

  // ── 3. Campus Pastor claim check ─────────────────────────────────────────
  if (role === "Campus Pastor") {
    const claimClient = adminClient ?? userClient;
    const { data: claimRows } = await claimClient
      .from("users")
      .select("campus_id")
      .eq("role", "Campus Pastor")
      .eq("onboarding_completed", true)
      .eq("campus_id", resolvedCampusId)
      .neq("id", userId)
      .limit(1)
      .returns<Array<{ campus_id: string | null }>>();

    if (claimRows && claimRows.length > 0) {
      return Response.json(
        {
          error:
            "This campus is already claimed by another Campus Pastor. Please select a different campus or contact your Platform Super Admin.",
        },
        { status: 409 }
      );
    }
  }

  // ── 4. Resolve organization_id from group ─────────────────────────────────
  let organizationId: string | null = null;
  if (resolvedGroupId) {
    const orgClient = adminClient ?? userClient;
    const { data: groupRow } = await orgClient
      .from("groups")
      .select("organization_id")
      .eq("id", resolvedGroupId)
      .maybeSingle<GroupRow>();
    organizationId = groupRow?.organization_id ?? null;
  }

  // ── 5. Build update payload ───────────────────────────────────────────────
  const updatePayload: Record<string, unknown> = {
    email: userEmail,
    designation: normalizeDesignation(rest.designation),
    full_name: (rest.fullName ?? "").trim(),
    avatar_url: rest.avatarUrl ?? null,
    phone: (rest.phone ?? "").trim(),
    gender: (rest.gender ?? "").trim(),
    role: accountType === "attendee" ? "Attendee" : accountType === "member" ? "Member" : accountType === "worker" ? "Worker" : role,
    account_type: accountType ?? "leader",
    direct_leader_id: isUUID(directLeaderId) ? directLeaderId : null,
    ministry_unit_id: isUUID(ministryUnitId) ? ministryUnitId : null,
    campus_id: resolvedCampusId,
    subgroup_id: resolvedSubgroupId,
    group_id: resolvedGroupId,
    organization_id: organizationId,
    current_leadership_role: rest.currentLeadershipRole ?? "None",
    aspirational_leadership_role: rest.aspirationalLeadershipRole ?? "",
    years_in_ministry: rest.yearsInMinistry ?? null,
    onboarding_completed: true,
  };

  if (roleId) {
    updatePayload.role_id = roleId;
  }

  console.log("[save-onboarding] update payload:", {
    userId,
    campus_id: resolvedCampusId,
    subgroup_id: resolvedSubgroupId,
    group_id: resolvedGroupId,
    organization_id: organizationId,
    role,
    onboarding_completed: true,
  });

  // ── 6. UPDATE by auth uid (normal self-signup) ────────────────────────────
  const { data: existingRow } = await userClient
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle<{ id: string }>();

  if (existingRow?.id) {
    console.log("[save-onboarding] path: UPDATE by id", userId);
    const { error: updateError } = await userClient
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) {
      console.error("[save-onboarding] UPDATE by id failed:", updateError.message, updateError.details);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    console.log("[save-onboarding] UPDATE by id succeeded — campus_id:", resolvedCampusId);
    return Response.json({ ok: true, campus_id: resolvedCampusId });
  }

  // ── 7. Pre-seeded user: UPDATE by email ───────────────────────────────────
  const lookupClient = adminClient ?? userClient;
  const { data: emailRow } = await lookupClient
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .maybeSingle<{ id: string }>();

  if (emailRow?.id) {
    console.log("[save-onboarding] path: UPDATE by email (preseeded)", userEmail);
    const writeClient = adminClient ?? userClient;
    const { error: updateError } = await writeClient
      .from("users")
      .update(updatePayload)
      .eq("email", userEmail);

    if (updateError) {
      console.error("[save-onboarding] UPDATE by email failed:", updateError.message);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    console.log("[save-onboarding] UPDATE by email succeeded — campus_id:", resolvedCampusId);
    return Response.json({ ok: true, campus_id: resolvedCampusId });
  }

  // ── 8. No row found ───────────────────────────────────────────────────────
  console.error("[save-onboarding] No user row found for", { userId, userEmail });
  return Response.json(
    { error: "Academy profile not found. Please try signing in again." },
    { status: 404 }
  );
}

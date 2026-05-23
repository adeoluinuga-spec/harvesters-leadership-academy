import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SaveOnboardingBody = {
  accessToken: string;
  campusName: string;
  campusIdHint: string;
  role: string;
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
// Optional — when present, used only for campus resolution (bypasses RLS).
// Normal user profile writes always use the authenticated user session.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeDesignation(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "None";
}

async function resolveCampus(
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

  if (campusIdHint && isUUID(campusIdHint)) {
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

  const { accessToken, campusName, campusIdHint, role, roleId, ...rest } = body;

  if (!accessToken || !campusName?.trim() || !role?.trim()) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  // NEXT_PUBLIC_* variables are always available — fail fast if missing.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[save-onboarding] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
    return Response.json({ error: "Server configuration error." }, { status: 500 });
  }

  if (!supabaseServiceRoleKey) {
    console.warn(
      "[save-onboarding] SUPABASE_SERVICE_ROLE_KEY is not set — campus resolution will use the user session (RLS applies). " +
        "Set this key in your environment to guarantee campus reads for all leader roles."
    );
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  // userClient: acts as the authenticated user — respects RLS (user can update own row).
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // adminClient: bypasses RLS — used only for campus resolution and preseeded-user lookups.
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

  // ── 2. Campus resolution ──────────────────────────────────────────────────
  // Try admin client first (bypasses RLS). If unavailable or unsuccessful, try user session.
  let campus: CampusRow | null = null;
  if (adminClient) {
    campus = await resolveCampus(campusName, campusIdHint, adminClient);
  }
  if (!campus) {
    campus = await resolveCampus(campusName, campusIdHint, userClient);
  }

  console.log("[save-onboarding] campus resolution:", {
    userId,
    campusName,
    campusIdHint,
    resolvedCampusId: campus?.id ?? null,
    usedAdmin: Boolean(adminClient),
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

  // ── 5. Build update payload (no campus/subgroup/group text columns) ────────
  const updatePayload: Record<string, unknown> = {
    email: userEmail,
    designation: normalizeDesignation(rest.designation),
    full_name: (rest.fullName ?? "").trim(),
    avatar_url: rest.avatarUrl ?? null,
    phone: (rest.phone ?? "").trim(),
    gender: (rest.gender ?? "").trim(),
    role,
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

  // ── 6. UPDATE by auth uid (normal self-signup path) ───────────────────────
  // Use the user session — RLS allows each user to update their own row.
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
  // Row exists with a different id (admin pre-created). Requires admin client to
  // bypass RLS (the user session can't update a row where auth.uid() ≠ id).
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

import { createClient } from "@supabase/supabase-js";

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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeDesignation(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "None";
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

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[save-onboarding] Missing Supabase configuration.");
    return Response.json({ error: "Server configuration error." }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Verify JWT ─────────────────────────────────────────────────────────
  const { data: authData, error: verifyError } = await adminClient.auth.getUser(accessToken);
  if (verifyError || !authData.user) {
    console.error("[save-onboarding] JWT verification failed.", verifyError?.message);
    return Response.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const userId = authData.user.id;
  const userEmail = authData.user.email ?? rest.email?.trim() ?? "";

  // ── 2. Resolve campus UUID via service role (bypasses RLS) ───────────────
  let resolvedCampusId: string | null = null;
  let resolvedSubgroupId: string | null = null;
  let resolvedGroupId: string | null = null;

  // Primary: look up by name
  const { data: campusByName } = await adminClient
    .from("campuses")
    .select("id, subgroup_id, group_id")
    .eq("name", campusName.trim())
    .maybeSingle<CampusRow>();

  if (campusByName?.id) {
    resolvedCampusId = campusByName.id;
    resolvedSubgroupId = campusByName.subgroup_id;
    resolvedGroupId = campusByName.group_id;
  } else if (campusIdHint && isUUID(campusIdHint)) {
    // Secondary: campusIdHint is a real UUID — look up by id
    const { data: campusById } = await adminClient
      .from("campuses")
      .select("id, subgroup_id, group_id")
      .eq("id", campusIdHint)
      .maybeSingle<CampusRow>();

    if (campusById?.id) {
      resolvedCampusId = campusById.id;
      resolvedSubgroupId = campusById.subgroup_id;
      resolvedGroupId = campusById.group_id;
    }
  }

  console.log("[save-onboarding] campus resolution:", {
    userId,
    campusName,
    campusIdHint,
    resolvedCampusId,
  });

  if (!resolvedCampusId) {
    return Response.json(
      { error: "We could not find your selected campus. Please go back and re-select your campus." },
      { status: 422 }
    );
  }

  // ── 3. Campus Pastor claim check ─────────────────────────────────────────
  if (role === "Campus Pastor") {
    const { data: claimRows } = await adminClient
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

  // ── 4. Resolve organization_id from group ────────────────────────────────
  let organizationId: string | null = null;
  if (resolvedGroupId) {
    const { data: groupRow } = await adminClient
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

  // ── 6. UPDATE by auth uid (normal self-signup path) ──────────────────────
  const { data: existingRow } = await adminClient
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle<{ id: string }>();

  if (existingRow?.id) {
    console.log("[save-onboarding] path: UPDATE by id", userId);
    const { error: updateError } = await adminClient
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) {
      console.error("[save-onboarding] UPDATE by id failed:", updateError.message);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    console.log("[save-onboarding] UPDATE by id succeeded — campus_id:", resolvedCampusId);
    return Response.json({ ok: true, campus_id: resolvedCampusId });
  }

  // ── 7. Pre-seeded user: UPDATE by email (row exists with a different id) ──
  const { data: emailRow } = await adminClient
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .maybeSingle<{ id: string }>();

  if (emailRow?.id) {
    console.log("[save-onboarding] path: UPDATE by email (preseeded row)", userEmail);
    const { error: updateError } = await adminClient
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

  // ── 8. No existing row — should not occur if ensureUserProfile ran ────────
  console.error("[save-onboarding] No user row found for", { userId, userEmail });
  return Response.json(
    { error: "Academy profile not found. Please try signing in again." },
    { status: 404 }
  );
}

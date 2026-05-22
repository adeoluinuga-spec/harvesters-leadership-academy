import { createClient } from "@supabase/supabase-js";

type EnsureProfileRequest = {
  id?: string;
  email?: string;
  fullName?: string;
  designation?: string;
  accessToken?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  let payload: EnsureProfileRequest;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[ensure-profile] Missing Supabase URL or anon key.");
    return Response.json({ error: "Server configuration error." }, { status: 500 });
  }

  if (!payload.id || !payload.email) {
    return Response.json({ error: "Missing user id or email." }, { status: 400 });
  }

  const profilePayload = {
    id: payload.id,
    email: payload.email.trim(),
    designation: normalizeDesignation(payload.designation),
    full_name: payload.fullName?.trim() || payload.email.trim(),
    role: "Cell Leader",
    avatar_url: null,
    organization_id: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  // ── Path 1: service role key — bypasses RLS ──────────────────────────────
  if (supabaseServiceRoleKey) {
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate the JWT if a token was provided — skip only for no-session signups
    // where the DB trigger already created the row.
    if (payload.accessToken) {
      const { data: authData, error: verifyError } = await adminClient.auth.getUser(
        payload.accessToken
      );
      if (verifyError || authData.user?.id !== payload.id) {
        console.error("[ensure-profile] JWT verification failed.", {
          userId: payload.id,
          message: verifyError?.message,
        });
        return Response.json(
          { error: "Your session could not be verified. Please sign in again." },
          { status: 401 }
        );
      }
    }

    const { error } = await adminClient
      .from("users")
      .upsert(profilePayload, { onConflict: "id" });

    if (error) {
      console.error("[ensure-profile] Service-role upsert failed.", {
        userId: payload.id,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.info("[ensure-profile] Profile created via service role.", { userId: payload.id });
    return Response.json({ ok: true });
  }

  // ── Path 2: user access token — RLS enforces auth.uid() = id ─────────────
  if (payload.accessToken) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${payload.accessToken}` },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await userClient
      .from("users")
      .upsert(profilePayload, { onConflict: "id" });

    if (error) {
      console.error("[ensure-profile] Session upsert failed.", {
        userId: payload.id,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.info("[ensure-profile] Profile created via user session.", { userId: payload.id });
    return Response.json({ ok: true });
  }

  // ── Path 3: no token and no service role key ──────────────────────────────
  // Email confirmation is pending — the DB trigger already created the public.users
  // row when the auth account was inserted. Nothing more to do here.
  console.info("[ensure-profile] No session/service key — relying on DB trigger.", {
    userId: payload.id,
  });
  return Response.json({ ok: true });
}

function normalizeDesignation(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : "None";
}

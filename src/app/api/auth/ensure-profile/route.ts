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
    return Response.json({ error: "Invalid profile request payload." }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[ensure-profile] Missing Supabase URL or anon key.");
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  if (!payload.id || !payload.email) {
    return Response.json({ error: "Missing auth user id or email." }, { status: 400 });
  }

  const profilePayload = {
    id: payload.id,
    email: payload.email.trim(),
    designation: normalizeDesignation(payload.designation),
    full_name: payload.fullName?.trim() || payload.email.trim(),
    avatar_url: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  if (supabaseServiceRoleKey) {
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authUser, error: authLookupError } =
      await adminClient.auth.admin.getUserById(payload.id);

    if (authLookupError || !authUser.user) {
      console.error("[ensure-profile] Could not verify auth user before profile upsert.", {
        userId: payload.id,
        message: authLookupError?.message,
      });

      return Response.json(
        { error: "Auth account was created, but we could not verify it for profile creation." },
        { status: 404 }
      );
    }

    const { data, error } = await adminClient
      .from("users")
      .upsert(profilePayload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.error("[ensure-profile] Service-role profile upsert failed.", {
        userId: payload.id,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return Response.json({ error: error.message }, { status: 500 });
    }

    console.info("[ensure-profile] public.users profile persisted with service role.", {
      userId: payload.id,
      email: payload.email,
    });

    return Response.json({ profile: data });
  }

  if (!payload.accessToken) {
    console.error("[ensure-profile] Missing SUPABASE_SERVICE_ROLE_KEY and no user session token was available.", {
      userId: payload.id,
      email: payload.email,
    });

    return Response.json(
      {
        error:
          "Profile creation requires the Supabase auth trigger or SUPABASE_SERVICE_ROLE_KEY when signup does not return a session.",
      },
      { status: 503 }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(payload.accessToken);

  if (authError || authData.user?.id !== payload.id) {
    console.error("[ensure-profile] Session token did not match requested profile user.", {
      requestedUserId: payload.id,
      sessionUserId: authData.user?.id,
      message: authError?.message,
    });

    return Response.json({ error: "Your signup session could not be verified." }, { status: 401 });
  }

  const { data, error } = await userClient
    .from("users")
    .upsert(profilePayload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.error("[ensure-profile] Session profile upsert failed.", {
      userId: payload.id,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return Response.json({ error: error.message }, { status: 500 });
  }

  console.info("[ensure-profile] public.users profile persisted with user session.", {
    userId: payload.id,
    email: payload.email,
  });

  return Response.json({ profile: data });
}

function normalizeDesignation(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : "None";
}

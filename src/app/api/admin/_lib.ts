/**
 * Shared admin API helpers.
 * Validates the caller is a Super Admin and returns both a
 * user-scoped client (for reads respecting RLS) and an
 * admin client that bypasses RLS for writes.
 */

import { createClient } from "@/lib/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/activity";

export interface AdminContext {
  userId: string;
  userRole: string;
  /** User-scoped client — respects RLS */
  db: Awaited<ReturnType<typeof createClient>>;
  /** Service-role client — bypasses RLS for admin writes */
  adminDb: Awaited<ReturnType<typeof createClient>>;
}

export async function requireAdmin(): Promise<AdminContext | null> {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !isAdminRole(profile.role)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const adminDb = (
    serviceKey
      ? createServiceClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : db
  ) as unknown as Awaited<ReturnType<typeof createClient>>;

  return { userId: user.id, userRole: profile.role, db, adminDb };
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 });
}

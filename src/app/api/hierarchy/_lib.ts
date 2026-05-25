/**
 * Shared helpers for hierarchy API routes.
 * Uses service-role Supabase client to bypass RLS, allowing Campus Pastors,
 * Group Pastors, and Subgroup Pastors to read their own hierarchy's user counts.
 */

import { createClient } from "@/lib/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type ServiceDb = ReturnType<typeof createServiceClient>;

export async function getHierarchyDb(): Promise<{ db: ServiceDb } | null> {
  const authClient = await createClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const db: ServiceDb = serviceKey
    ? createServiceClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : (authClient as unknown as ServiceDb);

  return { db };
}

export function buildWeeklyTrend(
  enrollments: { created_at: string }[],
  certs: { issued_at: string }[]
): { week: string; enrollments: number; certificates: number }[] {
  const weeks: { week: string; enrollments: number; certificates: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const label = weekStart.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const enrCount = enrollments.filter((e) => {
      const d = new Date(e.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    const certCount = certs.filter((c) => {
      const d = new Date(c.issued_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    weeks.push({ week: label, enrollments: enrCount, certificates: certCount });
  }
  return weeks;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

// Roles that are platform/system admins, not ministry leaders.
// Users with these roles are excluded from hierarchy leader counts.
export const PLATFORM_ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"] as const;

// PostgREST "not in" filter string for platform admin roles
export const NOT_PLATFORM_ADMIN = `("Platform Super Admin","Super Admin","Admin")`;

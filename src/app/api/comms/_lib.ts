/**
 * Communication Layer — shared API helpers.
 * Uses service-role client for all DB access (bypasses RLS) and
 * enforces hierarchy authority programmatically based on sender role.
 */

import { createClient } from "@/lib/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type AudienceScope =
  | "platform"
  | "group"
  | "subgroup"
  | "campus"
  | "cadre"
  | "course"
  | "inactive"
  | "uncertified"
  | "specific";

export type CommsDb = Awaited<ReturnType<typeof createClient>>;

export type CommsContext = {
  userId: string;
  role: string;
  campusId: string | null;
  subgroupId: string | null;
  groupId: string | null;
  isAdmin: boolean;
  canCommunicate: boolean;
  db: CommsDb;
};

const COMM_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
];

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

export async function getCommsContext(): Promise<CommsContext | null> {
  const authClient = await createClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await authClient
    .from("users")
    .select("role, campus_id, subgroup_id, group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const db = (
    serviceKey
      ? createServiceClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : authClient
  ) as unknown as CommsDb;

  const role = profile.role ?? "";
  const canCommunicate = COMM_ROLES.includes(role);
  const isAdmin = ADMIN_ROLES.includes(role);

  return {
    userId: user.id,
    role,
    campusId: profile.campus_id ?? null,
    subgroupId: profile.subgroup_id ?? null,
    groupId: profile.group_id ?? null,
    isAdmin,
    canCommunicate,
    db,
  };
}

/** Verify that the sender's role authorises messaging the requested scope */
export function assertScopeAuthorized(
  ctx: CommsContext,
  scope: AudienceScope,
  targetGroupId?: string | null,
  targetSubgroupId?: string | null,
  targetCampusId?: string | null
): boolean {
  if (ctx.isAdmin) return true;

  const r = ctx.role;

  if (r === "Group Pastor" || r === "Group Pastor") {
    // Can scope to: their group (+ any subset)
    if (scope === "platform") return false;
    if (scope === "group") return targetGroupId === ctx.groupId;
    if (scope === "subgroup") return true; // verified downstream via group membership
    if (scope === "campus") return true;
    return true;
  }

  if (
    r === "Sub-Group Pastor" ||
    r === "Subgroup Pastor" ||
    r === "Sub-group Pastor"
  ) {
    if (scope === "platform" || scope === "group") return false;
    if (scope === "subgroup") return targetSubgroupId === ctx.subgroupId;
    if (scope === "campus") return true;
    return true;
  }

  if (r === "Campus Pastor") {
    if (scope === "platform" || scope === "group" || scope === "subgroup") return false;
    if (scope === "campus") return targetCampusId === ctx.campusId;
    return true;
  }

  return false;
}

/**
 * Resolve the list of user IDs that match an audience scope.
 * All queries use the service-role client.
 */
export async function resolveRecipientIds(
  ctx: CommsContext,
  scope: AudienceScope,
  opts: {
    groupId?: string | null;
    subgroupId?: string | null;
    campusId?: string | null;
    cadre?: string | null;
    courseId?: string | null;
    specificUserIds?: string[];
  }
): Promise<string[]> {
  const db = ctx.db;

  const EXCLUDED_ROLES = [
    "Platform Super Admin",
    "Super Admin",
    "Admin",
  ];

  try {
    switch (scope) {
      case "platform": {
        const { data } = await db
          .from("users")
          .select("id")
          .not("role", "is", null)
          .not("role", "in", `(${EXCLUDED_ROLES.map((r) => `"${r}"`).join(",")})`)
          .neq("id", ctx.userId);
        return (data ?? []).map((u: { id: string }) => u.id);
      }

      case "group": {
        if (!opts.groupId) return [];
        const { data } = await db
          .from("users")
          .select("id")
          .eq("group_id", opts.groupId)
          .not("role", "is", null)
          .neq("id", ctx.userId);
        return (data ?? []).map((u: { id: string }) => u.id);
      }

      case "subgroup": {
        if (!opts.subgroupId) return [];
        const { data } = await db
          .from("users")
          .select("id")
          .eq("subgroup_id", opts.subgroupId)
          .not("role", "is", null)
          .neq("id", ctx.userId);
        return (data ?? []).map((u: { id: string }) => u.id);
      }

      case "campus": {
        if (!opts.campusId) return [];
        const { data } = await db
          .from("users")
          .select("id")
          .eq("campus_id", opts.campusId)
          .not("role", "is", null)
          .neq("id", ctx.userId);
        return (data ?? []).map((u: { id: string }) => u.id);
      }

      case "cadre": {
        if (!opts.cadre) return [];
        const { data } = await db
          .from("users")
          .select("id")
          .eq("role", opts.cadre)
          .neq("id", ctx.userId);
        return (data ?? []).map((u: { id: string }) => u.id);
      }

      case "course": {
        if (!opts.courseId) return [];
        const { data } = await db
          .from("enrollments")
          .select("user_id")
          .eq("course_id", opts.courseId)
          .neq("user_id", ctx.userId);
        return (data ?? []).map((e: { user_id: string }) => e.user_id);
      }

      case "inactive": {
        // Users enrolled in at least one course but with no lesson progress in 14 days
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: enrolled } = await db
          .from("enrollments")
          .select("user_id")
          .neq("user_id", ctx.userId);
        const enrolledIds = [...new Set((enrolled ?? []).map((e: { user_id: string }) => e.user_id))];
        if (enrolledIds.length === 0) return [];
        const { data: active } = await db
          .from("lesson_progress")
          .select("user_id")
          .gte("updated_at", cutoff);
        const activeSet = new Set((active ?? []).map((p: { user_id: string }) => p.user_id));
        return enrolledIds.filter((id) => !activeSet.has(id));
      }

      case "uncertified": {
        const { data: allUsers } = await db
          .from("users")
          .select("id")
          .not("role", "is", null)
          .not("role", "in", `(${EXCLUDED_ROLES.map((r) => `"${r}"`).join(",")})`)
          .neq("id", ctx.userId);
        const allIds = (allUsers ?? []).map((u: { id: string }) => u.id);
        const { data: certs } = await db.from("certificates").select("user_id");
        const certSet = new Set((certs ?? []).map((c: { user_id: string }) => c.user_id));
        return allIds.filter((id: string) => !certSet.has(id));
      }

      case "specific": {
        return (opts.specificUserIds ?? []).filter((id) => id !== ctx.userId);
      }

      default:
        return [];
    }
  } catch {
    return [];
  }
}

/** Push an in-app notification row for each recipient */
export async function pushNotificationsToRecipients(
  db: CommsDb,
  recipientIds: string[],
  message: {
    id: string;
    title: string;
    body: string;
    priority: string;
  }
): Promise<void> {
  if (recipientIds.length === 0) return;

  const notifType =
    message.priority === "urgent"
      ? "alert"
      : message.priority === "high"
      ? "warning"
      : "info";

  const BATCH = 200;
  for (let i = 0; i < recipientIds.length; i += BATCH) {
    const batch = recipientIds.slice(i, i + BATCH);
    await db.from("notifications").insert(
      batch.map((uid) => ({
        user_id: uid,
        type: notifType,
        title: message.title,
        message: message.body.slice(0, 200),
        action_url: `/dashboard/comms/announcements/${message.id}`,
        is_read: false,
      }))
    );
  }
}

export function commsUnauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function commsBadRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 });
}

export function commsForbidden(msg = "Insufficient hierarchy authority.") {
  return Response.json({ error: msg }, { status: 403 });
}

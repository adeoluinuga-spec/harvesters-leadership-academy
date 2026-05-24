/**
 * Server-side audit logging helper.
 * Import only in API routes (server context).
 * All writes are best-effort — never throws or blocks callers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEventType =
  | "user_signed_in"
  | "user_signed_out"
  | "onboarding_completed"
  | "course_enrolled"
  | "course_started"
  | "video_started"
  | "video_completed"
  | "assessment_started"
  | "assessment_submitted"
  | "assessment_passed"
  | "assessment_failed"
  | "certificate_issued"
  | "course_created"
  | "course_updated"
  | "course_deleted"
  | "user_updated"
  | "user_role_changed"
  | "user_transferred"
  | "user_deactivated"
  | "user_reactivated"
  | "campus_created"
  | "campus_updated"
  | "campus_archived"
  | "subgroup_created"
  | "subgroup_updated"
  | "group_created"
  | "group_updated";

export type EntityType = "user" | "campus" | "subgroup" | "group" | "course";

export interface AuditParams {
  supabase: SupabaseClient;
  actorId: string;
  actorRole: string;
  eventType: AuditEventType;
  entityType?: EntityType;
  entityId?: string;
  campusId?: string;
  subgroupId?: string;
  groupId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  const {
    supabase,
    actorId,
    actorRole,
    eventType,
    entityType,
    entityId,
    campusId,
    subgroupId,
    groupId,
    metadata,
  } = params;

  try {
    await supabase.from("activity_events").insert({
      user_id: actorId,
      actor_id: actorId,
      actor_role: actorRole,
      role: actorRole,
      event_type: eventType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      campus_id: campusId ?? null,
      subgroup_id: subgroupId ?? null,
      group_id: groupId ?? null,
      metadata: metadata ?? {},
      event_payload: metadata ?? {},
    });
  } catch {
    // Audit logging must never block the primary operation
  }
}

export const ADMIN_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

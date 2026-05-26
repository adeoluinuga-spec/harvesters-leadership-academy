import { NextRequest } from "next/server";
import {
  getCommsContext,
  resolveRecipientIds,
  pushNotificationsToRecipients,
  commsUnauthorized,
  commsBadRequest,
  type AudienceScope,
} from "../../_lib";

// POST /api/comms/reminders/trigger
// Manually trigger a reminder rule — finds matching users and sends notifications.
export async function POST(req: NextRequest) {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return commsBadRequest("Invalid JSON body.");
  }

  const ruleId = body.rule_id as string | undefined;
  if (!ruleId) return commsBadRequest("rule_id is required.");

  const { data: rule, error } = await ctx.db
    .from("reminder_rules")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();

  if (error || !rule) {
    return Response.json({ error: "Rule not found." }, { status: 404 });
  }
  if (!rule.is_active) {
    return Response.json({ error: "Rule is disabled." }, { status: 409 });
  }

  // Map trigger_type → audience scope for recipient resolution
  let scope: AudienceScope = rule.audience_scope as AudienceScope;

  if (rule.trigger_type === "enrolled_inactive" || rule.trigger_type === "started_incomplete") {
    scope = "inactive";
  } else if (rule.trigger_type === "uncertified") {
    scope = "uncertified";
  }

  const recipientIds = await resolveRecipientIds(ctx, scope, {
    groupId: rule.audience_group_id,
    subgroupId: rule.audience_subgroup_id,
    campusId: rule.audience_campus_id,
  });

  if (recipientIds.length > 0) {
    // Create a message record for audit trail
    const { data: msg } = await ctx.db
      .from("communication_messages")
      .insert({
        sender_id: ctx.userId,
        sender_role: ctx.role,
        type: "reminder",
        title: rule.message_title,
        body: rule.message_body,
        priority: "normal",
        audience_scope: scope,
        audience_group_id: rule.audience_group_id,
        audience_subgroup_id: rule.audience_subgroup_id,
        audience_campus_id: rule.audience_campus_id,
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: recipientIds.length,
      })
      .select("id")
      .single();

    if (msg) {
      // Insert recipients
      const BATCH = 200;
      for (let i = 0; i < recipientIds.length; i += BATCH) {
        const batch = recipientIds.slice(i, i + BATCH);
        await ctx.db.from("communication_recipients").upsert(
          batch.map((uid) => ({
            message_id: msg.id,
            user_id: uid,
            status: "delivered",
            delivered_at: new Date().toISOString(),
          })),
          { onConflict: "message_id,user_id", ignoreDuplicates: true }
        );
      }
      await pushNotificationsToRecipients(ctx.db, recipientIds, {
        id: msg.id,
        title: rule.message_title,
        body: rule.message_body,
        priority: "normal",
      });
    }
  }

  // Update last_triggered_at and increment counter
  await ctx.db
    .from("reminder_rules")
    .update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: (rule.trigger_count ?? 0) + 1,
    })
    .eq("id", ruleId);

  return Response.json({ ok: true, recipients_notified: recipientIds.length });
}

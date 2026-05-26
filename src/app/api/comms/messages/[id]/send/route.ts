import { NextRequest } from "next/server";
import {
  getCommsContext,
  resolveRecipientIds,
  pushNotificationsToRecipients,
  commsUnauthorized,
  commsForbidden,
  type AudienceScope,
} from "../../../_lib";

// POST /api/comms/messages/[id]/send
// Resolves recipients for the message's audience scope, inserts
// communication_recipients rows, pushes notifications, marks as sent.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  // Fetch the message — only sender can send
  const { data: msg, error } = await ctx.db
    .from("communication_messages")
    .select("*")
    .eq("id", id)
    .eq("sender_id", ctx.userId)
    .maybeSingle();

  if (error || !msg) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }
  if (msg.status === "sent") {
    return Response.json({ error: "Message already sent." }, { status: 409 });
  }
  if (msg.status === "cancelled") {
    return commsForbidden("Cannot send a cancelled message.");
  }

  // Resolve recipients
  const recipientIds = await resolveRecipientIds(ctx, msg.audience_scope as AudienceScope, {
    groupId: msg.audience_group_id,
    subgroupId: msg.audience_subgroup_id,
    campusId: msg.audience_campus_id,
    cadre: msg.audience_cadre,
    courseId: msg.audience_course_id,
    specificUserIds: msg.audience_user_ids ?? [],
  });

  if (recipientIds.length === 0) {
    return Response.json({ ok: true, recipient_count: 0, warning: "No matching recipients found." });
  }

  // Insert communication_recipients (ignore duplicates)
  const BATCH = 200;
  for (let i = 0; i < recipientIds.length; i += BATCH) {
    const batch = recipientIds.slice(i, i + BATCH);
    await ctx.db.from("communication_recipients").upsert(
      batch.map((uid) => ({
        message_id: id,
        user_id: uid,
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true }
    );
  }

  // Push in-app notifications
  await pushNotificationsToRecipients(ctx.db, recipientIds, {
    id,
    title: msg.title,
    body: msg.body,
    priority: msg.priority,
  });

  // Mark message as sent
  await ctx.db
    .from("communication_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: recipientIds.length,
    })
    .eq("id", id);

  return Response.json({ ok: true, recipient_count: recipientIds.length });
}

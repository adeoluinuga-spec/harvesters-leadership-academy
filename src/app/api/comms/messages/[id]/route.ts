import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized, commsBadRequest } from "../../_lib";

// GET /api/comms/messages/[id] — message detail with delivery analytics
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const { data: msg, error } = await ctx.db
    .from("communication_messages")
    .select("*")
    .eq("id", id)
    .eq("sender_id", ctx.userId)
    .maybeSingle();

  if (error || !msg) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const [readsRes, recipientsRes] = await Promise.all([
    ctx.db.from("message_reads").select("user_id, read_at").eq("message_id", id),
    ctx.db.from("communication_recipients").select("user_id, status, delivered_at").eq("message_id", id),
  ]);

  const readCount = (readsRes.data ?? []).length;
  const deliveredCount = (recipientsRes.data ?? []).filter(
    (r: { status: string }) => r.status === "delivered"
  ).length;

  return Response.json({
    message: msg,
    analytics: {
      recipient_count: msg.recipient_count,
      delivered_count: deliveredCount,
      read_count: readCount,
      open_rate: msg.recipient_count > 0 ? Math.round((readCount / msg.recipient_count) * 100) : 0,
    },
  });
}

// PATCH /api/comms/messages/[id] — update draft
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return commsBadRequest("Invalid JSON body.");
  }

  const allowed = [
    "title", "body", "priority", "audience_scope", "audience_group_id",
    "audience_subgroup_id", "audience_campus_id", "audience_cadre",
    "audience_course_id", "audience_user_ids", "cta_label", "cta_url",
    "scheduled_at", "status", "campaign_id",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  const { error } = await ctx.db
    .from("communication_messages")
    .update(patch)
    .eq("id", id)
    .eq("sender_id", ctx.userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/comms/messages/[id] — cancel / remove draft
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  await ctx.db
    .from("communication_messages")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("sender_id", ctx.userId);

  return Response.json({ ok: true });
}

import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized, commsBadRequest } from "../_lib";

// GET /api/comms/reminders — list all reminder rules (scoped to sender)
export async function GET() {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const query = ctx.isAdmin
    ? ctx.db.from("reminder_rules").select("*").order("created_at", { ascending: false })
    : ctx.db
        .from("reminder_rules")
        .select("*")
        .eq("created_by", ctx.userId)
        .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return Response.json({ rules: [] });
  return Response.json({ rules: data ?? [] });
}

// POST /api/comms/reminders — create a reminder rule
export async function POST(req: NextRequest) {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return commsBadRequest("Invalid JSON body.");
  }

  const name = (body.name as string | undefined)?.trim();
  const triggerType = body.trigger_type as string | undefined;
  const messageTitle = (body.message_title as string | undefined)?.trim();
  const messageBody = (body.message_body as string | undefined)?.trim();

  if (!name) return commsBadRequest("name is required.");
  if (!triggerType) return commsBadRequest("trigger_type is required.");
  if (!messageTitle) return commsBadRequest("message_title is required.");
  if (!messageBody) return commsBadRequest("message_body is required.");

  const { data, error } = await ctx.db
    .from("reminder_rules")
    .insert({
      created_by: ctx.userId,
      name,
      trigger_type: triggerType,
      trigger_days: (body.trigger_days as number | undefined) ?? 7,
      message_title: messageTitle,
      message_body: messageBody,
      is_active: (body.is_active as boolean | undefined) ?? true,
      audience_scope: (body.audience_scope as string | undefined) ?? "platform",
      audience_group_id: (body.audience_group_id as string | undefined) ?? null,
      audience_subgroup_id: (body.audience_subgroup_id as string | undefined) ?? null,
      audience_campus_id: (body.audience_campus_id as string | undefined) ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? "Failed to create rule." }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}

// PATCH /api/comms/reminders — bulk update a rule (toggle active, change interval, etc.)
export async function PATCH(req: NextRequest) {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return commsBadRequest("Invalid JSON body.");
  }

  const id = body.id as string | undefined;
  if (!id) return commsBadRequest("id is required.");

  const allowed = ["name", "trigger_days", "message_title", "message_body", "is_active", "audience_scope"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  const { error } = await ctx.db
    .from("reminder_rules")
    .update(patch)
    .eq("id", id)
    .eq("created_by", ctx.userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

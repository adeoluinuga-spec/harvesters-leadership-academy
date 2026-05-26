import { NextRequest } from "next/server";
import {
  getCommsContext,
  assertScopeAuthorized,
  commsUnauthorized,
  commsBadRequest,
  commsForbidden,
  type AudienceScope,
} from "../_lib";

// GET /api/comms/messages — list sent messages for current user
export async function GET(req: NextRequest) {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  let query = ctx.db
    .from("communication_messages")
    .select(
      `id, type, title, body, priority, audience_scope, audience_group_id, audience_subgroup_id,
       audience_campus_id, audience_cadre, cta_label, cta_url, status, scheduled_at, sent_at,
       recipient_count, campaign_id, created_at, updated_at`
    )
    .eq("sender_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return Response.json({ messages: [] });

  // Attach read counts
  const ids = (data ?? []).map((m: { id: string }) => m.id);
  let readCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: reads } = await ctx.db
      .from("message_reads")
      .select("message_id")
      .in("message_id", ids);
    for (const r of reads ?? []) {
      readCounts[r.message_id] = (readCounts[r.message_id] ?? 0) + 1;
    }
  }

  const messages = (data ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    read_count: readCounts[m.id as string] ?? 0,
    open_rate:
      (m.recipient_count as number) > 0
        ? Math.round(((readCounts[m.id as string] ?? 0) / (m.recipient_count as number)) * 100)
        : 0,
  }));

  return Response.json({ messages });
}

// POST /api/comms/messages — create a new message (draft or send immediately)
export async function POST(req: NextRequest) {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return commsBadRequest("Invalid JSON body.");
  }

  const title = (body.title as string | undefined)?.trim();
  const messageBody = (body.body as string | undefined)?.trim();
  const type = (body.type as string | undefined) ?? "announcement";
  const priority = (body.priority as string | undefined) ?? "normal";
  const scope = (body.audience_scope as AudienceScope | undefined) ?? "platform";

  if (!title) return commsBadRequest("title is required.");
  if (!messageBody) return commsBadRequest("body is required.");

  const targetGroupId = (body.audience_group_id as string | undefined) ?? null;
  const targetSubgroupId = (body.audience_subgroup_id as string | undefined) ?? null;
  const targetCampusId = (body.audience_campus_id as string | undefined) ?? null;

  if (!assertScopeAuthorized(ctx, scope, targetGroupId, targetSubgroupId, targetCampusId)) {
    return commsForbidden();
  }

  const { data: msg, error } = await ctx.db
    .from("communication_messages")
    .insert({
      sender_id: ctx.userId,
      sender_role: ctx.role,
      type,
      title,
      body: messageBody,
      priority,
      audience_scope: scope,
      audience_group_id: targetGroupId,
      audience_subgroup_id: targetSubgroupId,
      audience_campus_id: targetCampusId,
      audience_cadre: (body.audience_cadre as string | undefined) ?? null,
      audience_course_id: (body.audience_course_id as string | undefined) ?? null,
      audience_user_ids: (body.audience_user_ids as string[] | undefined) ?? [],
      cta_label: (body.cta_label as string | undefined) ?? null,
      cta_url: (body.cta_url as string | undefined) ?? null,
      scheduled_at: (body.scheduled_at as string | undefined) ?? null,
      campaign_id: (body.campaign_id as string | undefined) ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !msg) {
    return Response.json({ error: error?.message ?? "Failed to create message." }, { status: 500 });
  }

  return Response.json({ id: msg.id }, { status: 201 });
}

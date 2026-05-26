import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized, commsBadRequest } from "../_lib";

// GET /api/comms/campaigns
export async function GET() {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const { data, error } = await ctx.db
    .from("communication_campaigns")
    .select("*")
    .eq("created_by", ctx.userId)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ campaigns: [] });

  // Enrich with message stats
  const ids = (data ?? []).map((c: { id: string }) => c.id);
  let msgStats: Record<string, { count: number; recipients: number }> = {};
  if (ids.length > 0) {
    const { data: msgs } = await ctx.db
      .from("communication_messages")
      .select("campaign_id, recipient_count")
      .in("campaign_id", ids)
      .eq("status", "sent");
    for (const m of msgs ?? []) {
      const cur = msgStats[m.campaign_id] ?? { count: 0, recipients: 0 };
      cur.count += 1;
      cur.recipients += m.recipient_count ?? 0;
      msgStats[m.campaign_id] = cur;
    }
  }

  const campaigns = (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    message_count: msgStats[c.id as string]?.count ?? 0,
    recipient_count: msgStats[c.id as string]?.recipients ?? 0,
  }));

  return Response.json({ campaigns });
}

// POST /api/comms/campaigns
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
  if (!name) return commsBadRequest("name is required.");

  const { data, error } = await ctx.db
    .from("communication_campaigns")
    .insert({
      created_by: ctx.userId,
      name,
      description: (body.description as string | undefined) ?? null,
      status: "draft",
      audience_scope: (body.audience_scope as string | undefined) ?? "platform",
      audience_group_id: (body.audience_group_id as string | undefined) ?? null,
      audience_subgroup_id: (body.audience_subgroup_id as string | undefined) ?? null,
      audience_campus_id: (body.audience_campus_id as string | undefined) ?? null,
      starts_at: (body.starts_at as string | undefined) ?? null,
      ends_at: (body.ends_at as string | undefined) ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? "Failed to create campaign." }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}

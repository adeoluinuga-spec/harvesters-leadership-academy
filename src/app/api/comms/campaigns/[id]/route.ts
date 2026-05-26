import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized } from "../../_lib";

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
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const allowed = ["name", "description", "status", "starts_at", "ends_at"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  await ctx.db
    .from("communication_campaigns")
    .update(patch)
    .eq("id", id)
    .eq("created_by", ctx.userId);

  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  await ctx.db
    .from("communication_campaigns")
    .delete()
    .eq("id", id)
    .eq("created_by", ctx.userId);

  return Response.json({ ok: true });
}

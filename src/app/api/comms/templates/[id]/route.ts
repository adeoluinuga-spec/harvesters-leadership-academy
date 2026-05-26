import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized } from "../../_lib";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  await ctx.db
    .from("communication_templates")
    .delete()
    .eq("id", id)
    .eq("created_by", ctx.userId);

  return Response.json({ ok: true });
}

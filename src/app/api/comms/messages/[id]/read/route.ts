import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized } from "../../../_lib";

// POST /api/comms/messages/[id]/read — mark a message as read by current user
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getCommsContext();
  if (!ctx) return commsUnauthorized();

  await ctx.db
    .from("message_reads")
    .upsert(
      { message_id: id, user_id: ctx.userId, read_at: new Date().toISOString() },
      { onConflict: "message_id,user_id", ignoreDuplicates: true }
    );

  return Response.json({ ok: true });
}

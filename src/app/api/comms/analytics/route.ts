import { getCommsContext, commsUnauthorized } from "../_lib";

// GET /api/comms/analytics — delivery and engagement metrics for current user's messages
export async function GET() {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const [msgsRes, readsRes] = await Promise.all([
    ctx.db
      .from("communication_messages")
      .select("id, type, priority, audience_scope, recipient_count, sent_at, status, created_at")
      .eq("sender_id", ctx.userId)
      .order("created_at", { ascending: false }),
    ctx.db
      .from("message_reads")
      .select("message_id, read_at")
      .in(
        "message_id",
        // Sub-query: get IDs of this sender's messages
        (
          await ctx.db
            .from("communication_messages")
            .select("id")
            .eq("sender_id", ctx.userId)
        ).data?.map((m: { id: string }) => m.id) ?? []
      ),
  ]);

  const messages = msgsRes.data ?? [];
  const reads = readsRes.data ?? [];

  const readsByMessage: Record<string, number> = {};
  for (const r of reads) {
    readsByMessage[r.message_id] = (readsByMessage[r.message_id] ?? 0) + 1;
  }

  const totalSent = messages.filter((m: { status: string }) => m.status === "sent").length;
  const totalDrafts = messages.filter((m: { status: string }) => m.status === "draft").length;
  const totalRecipients = messages.reduce(
    (sum: number, m: { recipient_count: number }) => sum + (m.recipient_count ?? 0),
    0
  );
  const totalReads = reads.length;
  const openRate = totalRecipients > 0 ? Math.round((totalReads / totalRecipients) * 100) : 0;

  // Messages over last 30 days grouped by day
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentMessages = messages.filter(
    (m: { sent_at: string | null }) => m.sent_at && new Date(m.sent_at) >= thirtyDaysAgo
  );

  const byDay: Record<string, { sent: number; reads: number }> = {};
  for (const m of recentMessages) {
    const day = (m as { sent_at: string }).sent_at.slice(0, 10);
    byDay[day] = byDay[day] ?? { sent: 0, reads: 0 };
    byDay[day].sent += 1;
    byDay[day].reads += readsByMessage[(m as { id: string }).id] ?? 0;
  }
  const timeline = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // By scope breakdown
  const byScope: Record<string, number> = {};
  for (const m of messages) {
    if ((m as { status: string }).status !== "sent") continue;
    const s = (m as { audience_scope: string }).audience_scope;
    byScope[s] = (byScope[s] ?? 0) + 1;
  }

  // By priority breakdown
  const byPriority: Record<string, number> = {};
  for (const m of messages) {
    if ((m as { status: string }).status !== "sent") continue;
    const p = (m as { priority: string }).priority;
    byPriority[p] = (byPriority[p] ?? 0) + 1;
  }

  // Recent messages with engagement
  const recentWithStats = messages.slice(0, 10).map((m: Record<string, unknown>) => ({
    id: m.id,
    title: undefined, // not selected — add if needed
    type: m.type,
    priority: m.priority,
    audience_scope: m.audience_scope,
    status: m.status,
    recipient_count: m.recipient_count as number,
    read_count: readsByMessage[m.id as string] ?? 0,
    open_rate:
      (m.recipient_count as number) > 0
        ? Math.round(((readsByMessage[m.id as string] ?? 0) / (m.recipient_count as number)) * 100)
        : 0,
    sent_at: m.sent_at,
  }));

  return Response.json({
    summary: {
      total_sent: totalSent,
      total_drafts: totalDrafts,
      total_recipients: totalRecipients,
      total_reads: totalReads,
      open_rate: openRate,
    },
    timeline,
    by_scope: byScope,
    by_priority: byPriority,
    recent_messages: recentWithStats,
  });
}

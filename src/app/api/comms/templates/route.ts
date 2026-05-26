import { NextRequest } from "next/server";
import { getCommsContext, commsUnauthorized, commsBadRequest } from "../_lib";

// GET /api/comms/templates
export async function GET() {
  const ctx = await getCommsContext();
  if (!ctx || !ctx.canCommunicate) return commsUnauthorized();

  const { data, error } = await ctx.db
    .from("communication_templates")
    .select("*")
    .or(`is_global.eq.true,created_by.eq.${ctx.userId}`)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ templates: [] });
  return Response.json({ templates: data ?? [] });
}

// POST /api/comms/templates
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
  const title = (body.title as string | undefined)?.trim();
  const templateBody = (body.body as string | undefined)?.trim();

  if (!name) return commsBadRequest("name is required.");
  if (!title) return commsBadRequest("title is required.");
  if (!templateBody) return commsBadRequest("body is required.");

  const { data, error } = await ctx.db
    .from("communication_templates")
    .insert({
      created_by: ctx.userId,
      name,
      description: (body.description as string | undefined) ?? null,
      type: (body.type as string | undefined) ?? "announcement",
      title,
      body: templateBody,
      priority: (body.priority as string | undefined) ?? "normal",
      cta_label: (body.cta_label as string | undefined) ?? null,
      cta_url: (body.cta_url as string | undefined) ?? null,
      is_global: ctx.isAdmin ? ((body.is_global as boolean | undefined) ?? false) : false,
    })
    .select("id")
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? "Failed to create template." }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}

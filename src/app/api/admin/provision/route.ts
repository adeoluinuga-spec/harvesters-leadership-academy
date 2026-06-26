import { badRequest, requireAdmin, unauthorized } from "../_lib";
import { logAuditEvent } from "@/lib/activity";
import { isResendConfigured, sendResendEmail } from "@/lib/resend";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();
  let body: { type?: "organization" | "group"; name?: string; leaderName?: string; leaderEmail?: string; leaderRole?: string; organizationId?: string };
  try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!body.type || !body.name?.trim() || !body.leaderName?.trim() || !body.leaderEmail?.trim()) return badRequest("Type, name, leader name, and leader email are required.");
  if (!isResendConfigured()) return Response.json({ error: "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before sending leadership invitations." }, { status: 503 });

  let organizationId = body.organizationId ?? null;
  let groupId: string | null = null;
  const leaderRole = body.leaderRole?.trim() || (body.type === "group" ? "Group Pastor" : "Platform Super Admin");

  if (body.type === "organization") {
    const base = slugify(body.name);
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const { data: organization, error } = await ctx.adminDb
      .from("organizations")
      .insert({ name: body.name.trim(), slug, status: "active", plan: "ministry" })
      .select("id").single();
    if (error || !organization) return Response.json({ error: error?.message ?? "Could not create organisation." }, { status: 500 });
    organizationId = organization.id;
  } else {
    if (!organizationId) {
      const { data: defaultOrg } = await ctx.adminDb.from("organizations").select("id").order("created_at").limit(1).maybeSingle<{ id: string }>();
      organizationId = defaultOrg?.id ?? null;
    }
    if (!organizationId) return badRequest("Create an organisation before adding a group.");
    const { data: group, error } = await ctx.adminDb.from("groups").insert({ name: body.name.trim(), organization_id: organizationId }).select("id").single();
    if (error || !group) return Response.json({ error: error?.message ?? "Could not create group." }, { status: 500 });
    groupId = group.id;
  }

  const redirectTo = new URL("/onboarding", request.url).toString();
  const { data: invite, error: inviteError } = await ctx.adminDb.auth.admin.generateLink({
    type: "invite", email: body.leaderEmail.trim(), options: { data: { full_name: body.leaderName.trim(), role: leaderRole }, redirectTo },
  });
  if (inviteError || !invite.user || !invite.properties.action_link) return Response.json({ error: inviteError?.message ?? "The organisation was created, but the invitation could not be generated." }, { status: 502 });
  await sendResendEmail({
    to: [{ email: body.leaderEmail.trim(), name: body.leaderName.trim() }],
    subject: `You have been invited to ${body.name.trim()}`,
    text: `Hello ${body.leaderName.trim()},\n\nYou have been invited to join Harvesters Leadership Academy as ${leaderRole}. Complete your account setup to accept your leadership assignment.`,
    actionUrl: invite.properties.action_link,
    actionLabel: "Accept invitation",
  });

  const { error: profileError } = await ctx.adminDb.from("users").upsert({
    id: invite.user.id, email: body.leaderEmail.trim(), full_name: body.leaderName.trim(), role: leaderRole,
    account_type: "leader", organization_id: organizationId, group_id: groupId, onboarding_completed: false,
  }, { onConflict: "id" });
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });

  const { data: record, error: recordError } = await ctx.adminDb.from("admin_invitations").insert({
    email: body.leaderEmail.trim(), full_name: body.leaderName.trim(), role: leaderRole,
    organization_id: organizationId, group_id: groupId, invited_by: ctx.userId, invited_auth_user_id: invite.user.id,
  }).select("id").single();
  if (recordError) return Response.json({ error: recordError.message }, { status: 500 });

  await logAuditEvent({ supabase: ctx.adminDb, actorId: ctx.userId, actorRole: ctx.userRole, eventType: body.type === "group" ? "group_created" : "user_updated", entityType: body.type === "group" ? "group" : "user", entityId: groupId ?? organizationId ?? undefined, metadata: { name: body.name.trim(), invitationId: record.id, leaderRole } });
  return Response.json({ ok: true, organizationId, groupId, invitationId: record.id }, { status: 201 });
}

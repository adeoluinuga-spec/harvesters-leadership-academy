import { requireAdmin, unauthorized } from "../../_lib";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return unauthorized();

  const { data, error } = await ctx.db
    .from("users")
    .select(`
      id, full_name, email, role, designation,
      onboarding_completed, is_active, created_at,
      current_leadership_role,
      campuses(name),
      subgroups(name),
      groups(name)
    `)
    .order("full_name");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const headers = [
    "ID",
    "Full Name",
    "Email",
    "Role",
    "Current Leadership Role",
    "Campus",
    "Subgroup",
    "Group",
    "Onboarding Completed",
    "Is Active",
    "Created At",
  ];

  const rows = (data ?? []).map((u) => [
    u.id,
    u.full_name ?? "",
    u.email ?? "",
    u.role ?? "",
    u.current_leadership_role ?? "",
    (u.campuses as { name?: string } | null)?.name ?? "",
    (u.subgroups as { name?: string } | null)?.name ?? "",
    (u.groups as { name?: string } | null)?.name ?? "",
    u.onboarding_completed ? "Yes" : "No",
    (u.is_active ?? true) ? "Yes" : "No",
    u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "",
  ]);

  const csvLines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const csv = csvLines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="harvesters-leaders-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

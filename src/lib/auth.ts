export async function saveOnboardingProfile(input: OnboardingProfileInput): Promise<void> {
  if (!input.campus?.id || input.campus.source !== "supabase") {
    throw new Error("Please select a valid campus before continuing.");
  }

  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Your session has expired. Please sign in again before completing onboarding.");
  }

  const user = authData.user;

  const payload = {
    email: input.email || user.email || "",
    designation: normalizeDesignation(input.designation),
    full_name: input.fullName,
    avatar_url: input.avatarUrl,
    phone: input.phone,
    gender: input.gender,
    role: input.role,
    role_id: input.roleId,
    campus_id: input.campus.id,
    subgroup_id: input.campus.subgroupId,
    group_id: input.campus.groupId,
    current_leadership_role: input.currentLeadershipRole,
    aspirational_leadership_role: input.aspirationalLeadershipRole,
    leadership_aspiration: input.aspirationalLeadershipRole,
    years_in_ministry: input.yearsInMinistry,
    onboarding_completed: true,
  };

  const { data: existingById } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingById) {
    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      console.error("[saveOnboardingProfile] update by id failed", error);
      throw new Error(error.message);
    }

    return;
  }

  const { data: existingByEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (existingByEmail?.id) {
    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("email", user.email);

    if (error) {
      console.error("[saveOnboardingProfile] update by email failed", error);
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("users")
    .insert({
      id: user.id,
      ...payload,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[saveOnboardingProfile] insert failed", error);
    throw new Error(error.message);
  }
}
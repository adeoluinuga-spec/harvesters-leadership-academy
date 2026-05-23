"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Camera, CheckCircle2, ChevronRight, LoaderCircle, MapPin, Phone, Upload, User } from "lucide-react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { roles } from "@/lib/role-data";
import {
  CurrentLeadershipRole,
  leadershipAspirations,
  LeadershipAspiration,
  MockRole,
  nextLeadershipRoleMap,
  selfOnboardingRoles,
} from "@/lib/mock-auth";
import {
  dashboardForAuthRole,
  fetchClaimedCampusIds,
  fetchLookupOptions,
  fetchMinistryCampuses,
  getCurrentUserProfile,
  MinistryCampusOption,
  normalizeRole,
  saveOnboardingProfile,
} from "@/lib/auth";
import { createClient } from "@/lib/client";

const steps = ["Basic Information", "Ministry Information", "Confirmation"];

const leadershipRoleValues = new Set([
  "Cell Leader / Assistant HOD", "Zonal Leader / HOD", "Community Leader",
  "Area Leader", "District Pastor / Pastoral Leader", "Directional Leader",
  "Campus Pastor", "Sub-Group Pastor", "Group Pastor",
]);

function derivedCurrentLeadershipRole(role: MockRole): CurrentLeadershipRole {
  return leadershipRoleValues.has(role) ? (role as CurrentLeadershipRole) : "None";
}

function isValidUUID(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
const designationOptions = ["Pastor", "Dcns", "Dcn", "Minister", "Pst", "Bro", "Sis", "None"];
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxAvatarSize = 5 * 1024 * 1024;

function campusOptionLabel(campus: MinistryCampusOption): string {
  const parts = [campus.name];
  if (campus.subgroupName && campus.subgroupName !== "Unassigned subgroup") {
    parts.push(campus.subgroupName);
  }
  if (campus.groupName && campus.groupName !== groupAlphaFallback) {
    parts.push(campus.groupName);
  } else if (campus.groupName) {
    parts.push(campus.groupName);
  }
  return parts.join(" — ");
}

const groupAlphaFallback = "Group Alpha";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [designation, setDesignation] = useState("None");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedRole, setSelectedRole] = useState<MockRole>("Cell Leader / Assistant HOD");
  const [assignedRole, setAssignedRole] = useState<MockRole | null>(null);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [campusOptions, setCampusOptions] = useState<MinistryCampusOption[]>([]);
  const [claimedCampusIds, setClaimedCampusIds] = useState<Set<string>>(new Set());
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [leadershipAspiration, setLeadershipAspiration] =
    useState<LeadershipAspiration>("Zonal Leader / HOD");

  const isCampusPastor = selectedRole === "Campus Pastor";

  // Campuses available for selection — Campus Pastors only see unclaimed ones
  // (their own current campus is never in the claimed set because we excluded it)
  const availableCampuses = useMemo(() => {
    if (!isCampusPastor) return campusOptions;
    return campusOptions.filter((c) => !claimedCampusIds.has(c.id));
  }, [isCampusPastor, campusOptions, claimedCampusIds]);

  const selectedCampusRecord =
    campusOptions.find((campus) => campus.id === selectedCampusId) ?? null;

  // Whether the currently selected campus is already claimed by another Pastor
  const selectedCampusClaimed = isCampusPastor && selectedCampusId
    ? claimedCampusIds.has(selectedCampusId)
    : false;

  const selectedRoleOption = roleOptions.find(
    (role) => normalizeRole(role.name) === selectedRole
  );
  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      setLoadingLookups(true);
      const [campuses, roleRows, profileResult] = await Promise.all([
        fetchMinistryCampuses(),
        fetchLookupOptions("roles"),
        getCurrentUserProfile(),
      ]);

      if (!active) return;

      if (profileResult.error) {
        console.error("[onboarding] Failed to load current profile", profileResult.error);
        router.replace("/login");
        return;
      }

      const profile = profileResult.profile;
      const detectedRole: MockRole = profile?.role ?? "Cell Leader / Assistant HOD";

      setCampusOptions(campuses);
      setRoleOptions(roleRows);
      setDesignation(profile?.designation ?? "None");
      setFullName(profile?.fullName ?? "");
      setEmail(profile?.email ?? "");
      setAvatarUrl(profile?.avatarUrl ?? "");
      setAvatarPreview(profile?.avatarUrl ?? "");
      setSelectedRole(detectedRole);
      setAssignedRole(detectedRole);

      // Campus Pastors: fetch claimed campus IDs (excluding self) and smart-default their campus
      if (detectedRole === "Campus Pastor") {
        const claimed = await fetchClaimedCampusIds(profile?.id);
        if (active) {
          setClaimedCampusIds(claimed);
        }
        // Pre-select their existing campus if already assigned; otherwise leave blank
        const preSeededCampusId = profile?.campusId ?? null;
        if (preSeededCampusId && campuses.some((c) => c.id === preSeededCampusId)) {
          setSelectedCampusId(preSeededCampusId);
        } else {
          // Force them to choose — do not default to first campus
          setSelectedCampusId("");
        }
      } else {
        // For all other roles, default to Ilupeju Campus or first campus
        setSelectedCampusId(
          campuses.find((c) => c.name === "Ilupeju Campus")?.id ?? campuses[0]?.id ?? ""
        );
      }

      setLoadingLookups(false);
    }

    loadLookups();

    return () => {
      active = false;
    };
  }, [router]);

  // When the role changes to/from Campus Pastor, reset campus selection and re-filter
  useEffect(() => {
    if (isCampusPastor) {
      // Don't auto-reset if they already have a valid, unclaimed selection
      if (selectedCampusId && !claimedCampusIds.has(selectedCampusId)) return;
      setSelectedCampusId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCampusPastor]);

  // Auto-suggest the next leadership level whenever the selected role changes
  useEffect(() => {
    const suggested = nextLeadershipRoleMap[selectedRole];
    if (suggested) setLeadershipAspiration(suggested);
  }, [selectedRole]);

  function handleAvatarChange(file?: File) {
    setError("");
    setSuccessMessage("");

    if (!file) return;

    if (!acceptedImageTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP profile picture.");
      return;
    }

    if (file.size > maxAvatarSize) {
      setError("Profile picture must be 5MB or smaller.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return avatarUrl || null;

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Your session has expired. Please sign in again before uploading a profile picture.");
    }

    const fileExtension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${authData.user.id}/${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { cacheControl: "3600", contentType: avatarFile.type, upsert: true });

    if (uploadError) {
      console.error("[onboarding] Avatar upload failed", { message: uploadError.message });
      throw new Error("We could not upload your profile picture. Please try another image or continue later.");
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  async function completeOnboarding() {
    if (!avatarPreview) {
      setError("Please upload a profile picture before completing onboarding.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name before completing onboarding.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address before completing onboarding.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address before completing onboarding.");
      return;
    }
    if (!selectedCampusRecord || !selectedCampusRecord.name?.trim()) {
      setError("Please select your campus before completing onboarding.");
      return;
    }
    if (!gender) {
      setError("Please select Male or Female before continuing.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      setUploadingAvatar(Boolean(avatarFile));
      const uploadedAvatarUrl = await uploadAvatarIfNeeded();
      setUploadingAvatar(false);

      const finalSubmitPayload = {
        role: selectedRole,
        campusId: selectedCampusRecord?.id ?? null,
        campusName: selectedCampusRecord?.name ?? null,
        subgroupId: selectedCampusRecord?.subgroupId ?? null,
        groupId: selectedCampusRecord?.groupId ?? null,
        campusSource: selectedCampusRecord
          ? isValidUUID(selectedCampusRecord.id) ? "uuid" : "slug-fallback"
          : "none",
        leadershipAspiration,
      };
      console.log("[onboarding] finalSubmitPayload:", finalSubmitPayload);

      await saveOnboardingProfile({
        designation,
        fullName: fullName.trim(),
        email: email.trim(),
        avatarUrl: uploadedAvatarUrl,
        phone: phone.trim(),
        gender: gender.trim(),
        campus: selectedCampusRecord,
        roleId: selectedRoleOption?.id ?? null,
        role: selectedRole,
        currentLeadershipRole: derivedCurrentLeadershipRole(selectedRole),
        aspirationalLeadershipRole: leadershipAspiration,
        yearsInMinistry: null,
      });

      // Re-fetch profile to confirm campus_id was actually written to the DB
      const refreshed = await getCurrentUserProfile();
      const savedProfile = refreshed.profile;

      console.log("[onboarding] auth.uid:", savedProfile?.id ?? "unknown");
      console.log("[onboarding] role:", savedProfile?.role ?? "unknown");
      console.log("[onboarding] campus_id:", savedProfile?.campusId ?? null);
      console.log("[onboarding] subgroup_id:", savedProfile?.subgroupId ?? null);
      console.log("[onboarding] group_id:", savedProfile?.groupId ?? null);

      if (!savedProfile?.campusId) {
        setError(
          "Campus assignment could not be verified. Please go back to Ministry Information and re-select your campus."
        );
        setSaving(false);
        return;
      }

      const dashRoute = dashboardForAuthRole(savedProfile.role ?? selectedRole);
      console.log("[onboarding] final dashboard route:", dashRoute);

      setSuccessMessage("Profile saved. Routing you to your dashboard...");
      window.localStorage.setItem("harvesters_profile_incomplete", "false");
      router.push(dashRoute);
    } catch (saveError) {
      setUploadingAvatar(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not save your ministry profile. Please try again."
      );
      setSaving(false);
    }
  }

  function validateStep(currentStep: number) {
    setError("");

    if (currentStep === 0) {
      if (!avatarPreview) {
        setError("Please upload a profile picture before continuing to ministry information.");
        return false;
      }
      if (!fullName.trim()) {
        setError("Please enter your full name before continuing.");
        return false;
      }
      if (!email.trim()) {
        setError("Please enter your email address before continuing.");
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError("Please enter a valid email address before continuing.");
        return false;
      }
      if (!gender) {
        setError("Please select Male or Female before continuing.");
        return false;
      }
    }

    if (currentStep === 1) {
      // Log campus state for debugging
      console.log("[onboarding] validateStep(1) campus state:", {
        selectedCampusId,
        selectedSubgroupId: selectedCampusRecord?.subgroupId ?? null,
        selectedGroupId: selectedCampusRecord?.groupId ?? null,
        campusSource: selectedCampusRecord ? (isValidUUID(selectedCampusRecord.id) ? "uuid" : "slug-fallback") : "none",
      });

      // Campus Pastor must claim an unclaimed campus
      if (isCampusPastor) {
        if (!selectedCampusId) {
          setError("Please select the campus you oversee before continuing.");
          return false;
        }
        if (selectedCampusClaimed) {
          setError("This campus already has a Campus Pastor assigned. Please select a different campus.");
          return false;
        }
      } else if (!selectedCampusRecord) {
        setError("Please select a valid campus before continuing.");
        return false;
      }

      // Ensure the campus ID is a real UUID — if fetchMinistryCampuses fell back to
      // hardcoded slugs (no service role key + RLS blocks), the ID will not be a UUID.
      if (!isValidUUID(selectedCampusRecord?.id)) {
        setError(
          "Your campus list could not be loaded from the server. Please refresh the page and try again."
        );
        return false;
      }

      if (!selfOnboardingRoles.includes(selectedRole) && selectedRole !== assignedRole) {
        setError("This role is pre-created by Platform Super Admin. Please select a leader onboarding role.");
        return false;
      }
    }

    return true;
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !validateStep(step)) return;
    setSuccessMessage("");
    setStep(nextStep);
  }

  return (
    <AuthLayout
      eyebrow="Premium onboarding"
      title="Complete your ministry leadership profile"
      subtitle="A structured setup experience for role-based academy access and leadership growth intelligence."
      backHref="/signup"
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {steps.map((label, index) => (
              <button
                key={label}
                onClick={() => goToStep(index)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  index === step ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-500"
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>
          <Progress value={progress} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Step 0: Basic Information ─────────────────────── */}
            {step === 0 ? (
              <div className="grid gap-4">
                <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-zinc-100 p-4 transition-colors hover:border-zinc-200">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-500">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="" className="size-full object-cover" />
                    ) : (
                      <Camera className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-zinc-950">Profile picture</p>
                    <p className="text-sm text-zinc-500">JPG, PNG, or WEBP. Maximum 5MB.</p>
                  </div>
                  <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors">
                    {uploadingAvatar ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    Upload
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Designation</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      list="academy-designations"
                      className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                      placeholder="Pastor, Dcns, Dcn, Minister, Pst, Bro, Sis, None"
                      value={designation}
                      disabled={saving}
                      onChange={(event) => setDesignation(event.target.value)}
                    />
                    <datalist id="academy-designations">
                      {designationOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Full name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                      placeholder="Adeolu Osinuga"
                      value={fullName}
                      disabled={saving}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Email address</span>
                  <Input
                    className="h-11 rounded-lg border-zinc-200 bg-zinc-50"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@harvestersng.org"
                    value={email}
                    disabled={saving}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Phone number</span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                      placeholder="+234 801 234 5678"
                      value={phone}
                      disabled={saving}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Gender</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <select
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-9 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                      value={gender}
                      disabled={saving}
                      onChange={(event) => setGender(event.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Location</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <Input className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9" placeholder="Lagos, Nigeria" disabled={saving} />
                  </div>
                </label>
              </div>
            ) : null}

            {/* ── Step 1: Ministry Information ──────────────────── */}
            {step === 1 ? (
              <div className="grid gap-4">

                {/* Campus Pastor: claim-campus flow */}
                {isCampusPastor ? (
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-zinc-950">Claim your campus</p>
                          <p className="text-sm text-zinc-500">
                            Select the campus you oversee. Each campus can only be claimed by one Campus Pastor.
                          </p>
                        </div>
                      </div>
                    </div>

                    {availableCampuses.length === 0 && !loadingLookups ? (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        All campuses are currently claimed. Contact your Platform Super Admin to resolve campus assignments.
                      </div>
                    ) : (
                      <label>
                        <span className="mb-2 block text-sm font-medium text-zinc-700">
                          Select your campus
                        </span>
                        <select
                          value={selectedCampusId}
                          disabled={saving || loadingLookups}
                          onChange={(event) => {
                            setSelectedCampusId(event.target.value);
                            setError("");
                          }}
                          className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                        >
                          <option value="">Choose your campus…</option>
                          {availableCampuses.map((campus) => (
                            <option key={campus.id} value={campus.id}>
                              {campusOptionLabel(campus)}
                            </option>
                          ))}
                        </select>
                        {selectedCampusClaimed && (
                          <p className="mt-2 text-sm text-rose-600">
                            This campus already has a Campus Pastor assigned.
                          </p>
                        )}
                      </label>
                    )}

                    {/* Show hierarchy details for chosen campus */}
                    {selectedCampusRecord && (
                      <div className="grid gap-2 rounded-xl border border-zinc-100 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                          Campus hierarchy
                        </p>
                        {[
                          ["Campus", selectedCampusRecord.name],
                          ["Sub-Group", selectedCampusRecord.subgroupName],
                          ["Group", selectedCampusRecord.groupName],
                          ["Listed Campus Pastor", selectedCampusRecord.campusPastor],
                          ["Sub-Group Pastor", selectedCampusRecord.subgroupPastor],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                            <span className="text-zinc-500">{label}</span>
                            <span className="font-medium text-zinc-950">{value ?? "Not mapped"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* All other roles: standard campus selection */
                  <div className="grid gap-4">
                    <label>
                      <span className="mb-2 block text-sm font-medium text-zinc-700">Campus selection</span>
                      <select
                        value={selectedCampusId}
                        disabled={saving || loadingLookups}
                        onChange={(event) => setSelectedCampusId(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                      >
                        {campusOptions.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {[
                      ["Sub-Group", selectedCampusRecord?.subgroupName],
                      ["Group", selectedCampusRecord?.groupName],
                      ["Campus Pastor", selectedCampusRecord?.campusPastor],
                      ["Sub-Group Pastor", selectedCampusRecord?.subgroupPastor],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                        <p className="font-heading mt-1 font-semibold text-zinc-950">{value ?? "Not mapped"}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Role selector */}
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Role</p>
                  <div className="grid gap-2">
                    {roles.map((role) => {
                      const roleName = role.name as MockRole;
                      const canSelfSelect = selfOnboardingRoles.includes(roleName) || assignedRole === roleName;

                      return (
                        <button
                          key={role.name}
                          disabled={!canSelfSelect || saving}
                          onClick={() => setSelectedRole(roleName)}
                          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                            selectedRole === role.name
                              ? "border-black bg-black text-white"
                              : !canSelfSelect
                                ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400"
                                : "border-zinc-100 bg-white text-zinc-950 hover:bg-zinc-50"
                          }`}
                        >
                          <span className={`font-medium ${selectedRole === role.name ? "text-white" : !canSelfSelect ? "text-zinc-400" : "text-zinc-950"}`}>
                            {role.name}
                          </span>
                          {!canSelfSelect ? (
                            <Badge className={`rounded-md ${selectedRole === role.name ? "bg-white text-black hover:bg-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-100"}`}>
                              Platform Super Admin
                            </Badge>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leadership growth question */}
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">
                    What role are you preparing for?
                  </span>
                  <p className="mb-2 text-xs text-zinc-500">Suggested based on your current role — adjust if needed.</p>
                  <select
                    value={leadershipAspiration}
                    disabled={saving}
                    onChange={(event) => setLeadershipAspiration(event.target.value as LeadershipAspiration)}
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                  >
                    {leadershipAspirations.map((aspiration) => (
                      <option key={aspiration} value={aspiration}>{aspiration}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {/* ── Step 2: Confirmation ───────────────────────────── */}
            {step === 2 ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <CheckCircle2 className="mb-4 size-7 text-emerald-700" />
                  <h3 className="font-heading text-xl font-semibold text-zinc-950">
                    {isCampusPastor
                      ? `Campus claim ready — ${selectedCampusRecord?.name ?? "Campus"}`
                      : "Onboarding profile ready"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {isCampusPastor
                      ? `Your academy profile is prepared. You will be assigned as Campus Pastor for ${selectedCampusRecord?.name ?? "your selected campus"} with full campus oversight access.`
                      : "Your ministry profile is prepared for role-based academy access, learning recommendations, and leadership intelligence."}
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl border border-zinc-100 bg-white p-4">
                  <p className="font-heading font-semibold text-zinc-950">
                    {isCampusPastor ? "Campus claim summary" : "Hierarchy summary"}
                  </p>
                  {[
                    ["Designation", designation],
                    ["Full Name", fullName],
                    ["Role", selectedRole],
                    isCampusPastor
                      ? ["Campus (claimed)", selectedCampusRecord?.name]
                      : ["Campus", selectedCampusRecord?.name],
                    ["Sub-Group", selectedCampusRecord?.subgroupName],
                    ["Group", selectedCampusRecord?.groupName],
                    ...(!isCampusPastor
                      ? [
                          ["Campus Pastor", selectedCampusRecord?.campusPastor],
                          ["Sub-Group Pastor", selectedCampusRecord?.subgroupPastor],
                          ["Group Pastor", selectedCampusRecord?.groupPastor],
                          ["Preparing For", leadershipAspiration],
                        ]
                      : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                      <span className="text-zinc-500">{label}</span>
                      <span className="font-medium text-zinc-950">{value ?? "Not mapped"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? (
          <p className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-lg border-zinc-200 bg-white"
            disabled={saving}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </Button>
          {step === steps.length - 1 ? (
            <Button
              className="rounded-lg bg-black text-white hover:bg-zinc-800"
              disabled={saving}
              onClick={completeOnboarding}
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {uploadingAvatar ? "Uploading image..." : "Saving profile..."}
                </>
              ) : (
                <>
                  {isCampusPastor ? "Claim campus and open dashboard" : "Continue to dashboard"}
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              className="rounded-lg bg-black text-white hover:bg-zinc-800"
              disabled={saving || loadingLookups}
              onClick={() => goToStep(Math.min(steps.length - 1, step + 1))}
            >
              {step === 0 ? "Continue to Ministry Information" : "Continue"}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

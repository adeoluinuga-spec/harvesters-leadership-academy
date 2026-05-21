"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CheckCircle2, ChevronRight, LoaderCircle, MapPin, Phone, User } from "lucide-react";

import { RoleRoutingCards } from "@/components/auth/role-components";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { roles } from "@/lib/role-data";
import {
  currentLeadershipRoles,
  leadershipAspirations,
  CurrentLeadershipRole,
  LeadershipAspiration,
  MockRole,
  setLeadershipProfile,
  setMockRole,
} from "@/lib/mock-auth";
import {
  dashboardForAuthRole,
  fetchLookupOptions,
  fetchMinistryCampuses,
  MinistryCampusOption,
  MinistryLookupOption,
  saveOnboardingProfile,
} from "@/lib/auth";

const steps = ["Basic Information", "Ministry Information", "Leadership Profile", "Confirmation"];
const pathway = [
  "Cell Leader",
  "Zonal Leader",
  "Community Leader",
  "Pastoral Leader",
  "Directional Leader",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<MockRole>("Leader");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [yearsInMinistry, setYearsInMinistry] = useState("");
  const [campusOptions, setCampusOptions] = useState<MinistryCampusOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<MinistryLookupOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<MinistryLookupOption[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [department, setDepartment] = useState("Media Department");
  const [currentLeadershipRole, setCurrentLeadershipRole] =
    useState<CurrentLeadershipRole>("Cell Leader / Assistant HOD");
  const [leadershipAspiration, setLeadershipAspiration] =
    useState<LeadershipAspiration>("Zonal Leader / HOD");
  const selectedCampusRecord =
    campusOptions.find((campus) => campus.id === selectedCampusId) ?? campusOptions[0];
  const selectedRoleOption = roleOptions.find(
    (role) => role.name.toLowerCase() === selectedRole.toLowerCase()
  );
  const selectedDepartmentOption = departmentOptions.find(
    (option) => option.name.toLowerCase() === department.trim().toLowerCase()
  );
  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      setLoadingLookups(true);
      const [campuses, roleRows, departmentRows] = await Promise.all([
        fetchMinistryCampuses(),
        fetchLookupOptions("roles"),
        fetchLookupOptions("departments"),
      ]);

      if (!active) return;

      setCampusOptions(campuses);
      setRoleOptions(roleRows);
      setDepartmentOptions(departmentRows);
      setSelectedCampusId(
        campuses.find((campus) => campus.name === "Ilupeju Campus")?.id ?? campuses[0]?.id ?? ""
      );
      setLoadingLookups(false);
    }

    loadLookups();

    return () => {
      active = false;
    };
  }, []);

  async function completeOnboarding() {
    if (!selectedCampusRecord) {
      setError("Invalid hierarchy mapping. Please select a campus before continuing.");
      return;
    }

    if (!selectedRoleOption) {
      setError("Missing role. Please select a valid ministry role before continuing.");
      return;
    }

    if (!selectedDepartmentOption) {
      setError("Missing department. Please enter a department that exists in academy records.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await saveOnboardingProfile({
        phone: phone.trim(),
        gender: gender.trim(),
        campus: selectedCampusRecord,
        departmentId: selectedDepartmentOption.id,
        roleId: selectedRoleOption.id,
        role: selectedRole,
        currentLeadershipRole,
        aspirationalLeadershipRole: leadershipAspiration,
        yearsInMinistry: yearsInMinistry ? Number(yearsInMinistry) : null,
      });

      setMockRole(selectedRole);
      setLeadershipProfile({
        campus: selectedCampusRecord.name,
        subgroup: selectedCampusRecord.subgroupName,
        group: selectedCampusRecord.groupName,
        campusPastor: selectedCampusRecord.campusPastor,
        department,
        currentLeadershipRole,
        leadershipAspiration,
      });

      router.push(dashboardForAuthRole(selectedRole));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not save your ministry profile. Please try again."
      );
      setSaving(false);
    }
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
                onClick={() => setStep(index)}
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
            {step === 0 ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-4 rounded-lg border border-zinc-100 p-4">
                  <div className="flex size-16 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <Camera className="size-6" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-zinc-950">Profile picture</p>
                    <p className="text-sm text-zinc-500">Ministry leader profile image placeholder</p>
                  </div>
                </div>
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
                    <Input
                      className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                      placeholder="Select gender"
                      value={gender}
                      disabled={saving}
                      onChange={(event) => setGender(event.target.value)}
                    />
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

            {step === 1 ? (
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
                  ["Subgroup", selectedCampusRecord?.subgroupName],
                  ["Group", selectedCampusRecord?.groupName],
                  ["Campus Pastor", selectedCampusRecord?.campusPastor],
                  ["Subgroup Pastor", selectedCampusRecord?.subgroupPastor],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">{value ?? "Not mapped"}</p>
                  </div>
                ))}
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Department</span>
                  <Input
                    list="academy-departments"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-11 rounded-lg border-zinc-200 bg-zinc-50"
                    placeholder="Choose department"
                    disabled={saving}
                  />
                  <datalist id="academy-departments">
                    {departmentOptions.map((option) => (
                      <option key={option.id} value={option.name} />
                    ))}
                  </datalist>
                </label>
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Role</p>
                  <div className="grid gap-2">
                    {roles.map((role) => (
                      <button
                        key={role.name}
                        disabled={role.inviteOnly || saving}
                        onClick={() => setSelectedRole(role.name as MockRole)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          selectedRole === role.name
                            ? "border-black bg-black text-white"
                            : role.inviteOnly
                              ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400"
                              : "border-zinc-100 bg-white text-zinc-950 hover:bg-zinc-50"
                        }`}
                      >
                        <span className={`font-medium ${selectedRole === role.name ? "text-white" : role.inviteOnly ? "text-zinc-400" : "text-zinc-950"}`}>
                          {role.name}
                        </span>
                        {role.inviteOnly ? (
                          <Badge className={`rounded-md ${selectedRole === role.name ? "bg-white text-black hover:bg-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-100"}`}>
                            Invite Only
                          </Badge>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Current Leadership Role</span>
                  <select
                    value={currentLeadershipRole}
                    disabled={saving}
                    onChange={(event) =>
                      setCurrentLeadershipRole(event.target.value as CurrentLeadershipRole)
                    }
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                  >
                    {currentLeadershipRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">
                    What leadership level are you preparing for?
                  </span>
                  <select
                    value={leadershipAspiration}
                    disabled={saving}
                    onChange={(event) =>
                      setLeadershipAspiration(event.target.value as LeadershipAspiration)
                    }
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition-all focus:border-zinc-300 focus:ring-3 focus:ring-zinc-300/40"
                  >
                    {leadershipAspirations.map((aspiration) => (
                      <option key={aspiration} value={aspiration}>
                        {aspiration}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="font-heading font-semibold text-zinc-950">Leadership pathway</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {pathway.map((level, index) => (
                      <div key={level} className="flex items-center gap-2">
                        <span className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700">
                          {level}
                        </span>
                        {index < pathway.length - 1 ? (
                          <span className="text-xs text-zinc-400">-&gt;</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Years in ministry</span>
                  <Input
                    className="h-11 rounded-lg border-zinc-200 bg-zinc-50"
                    placeholder="Add years in ministry"
                    type="number"
                    min="0"
                    value={yearsInMinistry}
                    disabled={saving}
                    onChange={(event) => setYearsInMinistry(event.target.value)}
                  />
                </label>
                {["Leadership interests", "Ministry strengths", "Growth goals"].map((label) => (
                  <label key={label}>
                    <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
                    <Input className="h-11 rounded-lg border-zinc-200 bg-zinc-50" placeholder={`Add ${label.toLowerCase()}`} disabled={saving} />
                  </label>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <CheckCircle2 className="mb-4 size-7 text-emerald-700" />
                  <h3 className="font-heading text-xl font-semibold text-zinc-950">
                    Onboarding profile ready
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Your ministry profile is prepared for role-based academy access, learning recommendations, and leadership intelligence.
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl border border-zinc-100 bg-white p-4">
                  <p className="font-heading font-semibold text-zinc-950">Hierarchy summary</p>
                  {[
                    ["Campus", selectedCampusRecord?.name],
                    ["Subgroup", selectedCampusRecord?.subgroupName],
                    ["Group", selectedCampusRecord?.groupName],
                    ["Campus Pastor", selectedCampusRecord?.campusPastor],
                    ["Subgroup Pastor", selectedCampusRecord?.subgroupPastor],
                    ["Group Pastor", selectedCampusRecord?.groupPastor],
                    ["Role", selectedRole],
                    ["Current Leadership Role", currentLeadershipRole],
                    ["Preparing For", leadershipAspiration],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                      <span className="text-zinc-500">{label}</span>
                      <span className="font-medium text-zinc-950">{value ?? "Not mapped"}</span>
                    </div>
                  ))}
                </div>
                <RoleRoutingCards />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? (
          <p className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
            {error}
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
                  Saving profile...
                </>
              ) : (
                <>
                  Continue to dashboard
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              className="rounded-lg bg-black text-white hover:bg-zinc-800"
              disabled={saving || loadingLookups}
              onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

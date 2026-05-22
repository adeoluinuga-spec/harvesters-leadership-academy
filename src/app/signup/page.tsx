"use client";

import { useState } from "react";
import { LoaderCircle, Mail, User, LockKeyhole } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthFooterLink, AuthLayout, AuthSubmitButton } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { authErrorMessage } from "@/lib/auth";
import { createClient } from "@/lib/client";

const designationOptions = ["Pastor", "Dcns", "Dcn", "Minister", "Pst", "Bro", "Sis", "None"];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    designation: "None",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fields: Array<{
    label: string;
    placeholder: string;
    icon: LucideIcon;
    type: string;
    value: string;
    field: keyof typeof form;
  }> = [
    { label: "Designation", placeholder: "Pastor, Dcns, Dcn, Minister, Pst, Bro, Sis, None", icon: User, type: "text", value: form.designation, field: "designation" },
    { label: "Full name", placeholder: "Adeolu Osinuga", icon: User, type: "text", value: form.fullName, field: "fullName" },
    { label: "Email address", placeholder: "adeolu@harvestersng.org", icon: Mail, type: "email", value: form.email, field: "email" },
    { label: "Password", placeholder: "Create password", icon: LockKeyhole, type: "password", value: form.password, field: "password" },
    { label: "Confirm password", placeholder: "Confirm password", icon: LockKeyhole, type: "password", value: form.confirmPassword, field: "confirmPassword" },
  ];

  async function handleSignup() {
    setError("");

    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError("Please enter your full name, email, and password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match. Please confirm the password again.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          designation: form.designation.trim() || "None",
          full_name: form.fullName.trim(),
          role: "Cell Leader",
        },
      },
    });

    if (signupError) {
      console.error("[signup] Supabase signup failed", {
        message: signupError.message,
        status: signupError.status,
      });
      setError(authErrorMessage(signupError.message));
      setLoading(false);
      return;
    }

    if (!data.user) {
      console.error("[signup] Supabase signup returned no user and no explicit error");
      setError("We could not complete account creation. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const profileResponse = await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.user.id,
          email: form.email.trim(),
          designation: form.designation.trim() || "None",
          fullName: form.fullName.trim(),
          accessToken: data.session?.access_token,
        }),
      });

      if (!profileResponse.ok) {
        const result = (await profileResponse.json().catch(() => null)) as { error?: string } | null;
        const msg = result?.error ?? "We could not create your ministry profile. Please try signing in again.";
        setError(msg);
        setLoading(false);
        return;
      }
    } catch {
      // Non-fatal: the DB trigger may have already created the profile.
      // Let the user continue — onboarding will create the profile as a fallback.
      console.warn("[signup] ensure-profile call failed; continuing to rely on DB trigger.");
    }

    if (!data.session) {
      setError("Account created — please check your email to confirm your address, then sign in to continue onboarding.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/onboarding");
  }

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Begin your leadership academy journey"
      subtitle="Set up your account, then continue into ministry profile onboarding."
      backHref="/login"
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Account setup progress</span>
            <span className="text-zinc-500">35%</span>
          </div>
          <Progress value={35} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
        </div>
        <div className="grid gap-4">
          {fields.map(({ label, placeholder, icon: Icon, type, value, field }) => (
            <label key={label} className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
              <div className="relative">
                <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  list={field === "designation" ? "signup-designations" : undefined}
                  className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                  type={type}
                  placeholder={placeholder}
                  value={value}
                  disabled={loading}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
                {field === "designation" ? (
                  <datalist id="signup-designations">
                    {designationOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                ) : null}
              </div>
            </label>
          ))}
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
            {error}
          </p>
        ) : null}
        <AuthSubmitButton onClick={handleSignup} disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Continue to onboarding"
          )}
        </AuthSubmitButton>
      </div>
      <AuthFooterLink label="Already have an account?" href="/login" action="Sign in" />
    </AuthLayout>
  );
}

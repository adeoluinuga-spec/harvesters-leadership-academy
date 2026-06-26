"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";

import { AuthFooterLink, AuthLayout, AuthSubmitButton } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrorMessage, dashboardForAuthRole, getAuthProfile } from "@/lib/auth";
import { createClient } from "@/lib/client";
import { isInviteOnlyRole } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleLogin() {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError || !data.user) {
      console.error("[login] Supabase login failed", {
        message: loginError?.message,
        status: loginError?.status,
      });
      setError(authErrorMessage(loginError?.message));
      setLoading(false);
      return;
    }

    let profile;

    try {
      profile = await getAuthProfile(data.user);
    } catch (profileError) {
      console.error("[login] Failed to fetch or create public.users profile", profileError);
      setError("You are signed in, but we could not load your academy profile. Please try again or contact academy support.");
      setLoading(false);
      return;
    }

    setLoading(false);
    const shouldOpenDashboard = profile.onboardingCompleted || isInviteOnlyRole(profile.role);
    window.localStorage.setItem(
      "harvesters_profile_incomplete",
      profile.onboardingCompleted ? "false" : "true"
    );
    router.push(shouldOpenDashboard ? dashboardForAuthRole(profile.role) : "/onboarding");
  }

  async function handlePasswordReset() {
    setResetMessage("");

    if (!resetEmail.trim()) {
      setResetMessage("Enter your academy email to receive reset instructions.");
      return;
    }

    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });

    setResetMessage(
      resetError
        ? authErrorMessage(resetError.message)
        : "If this account exists, password reset instructions have been sent."
    );
    setResetLoading(false);
  }

  return (
    <AuthLayout
      eyebrow="Secure sign in"
      title="Welcome back to Harvesters Academy"
      subtitle="Continue stewarding leadership growth across your ministry layer with clarity and care."
      backHref="/dashboard"
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Email address</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                placeholder="pastor@harvestersng.org"
                type="email"
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-11 rounded-lg border-zinc-200 bg-zinc-50 pl-9"
                type="password"
                placeholder="Enter password"
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-zinc-600">
            <input type="checkbox" className="size-4 rounded border-zinc-300" />
            Remember me
          </label>
          <button onClick={() => setForgotOpen(true)} className="font-medium text-zinc-950 hover:underline">
            Forgot password?
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
            {error}
          </p>
        ) : null}

        <AuthSubmitButton onClick={handleLogin} disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </AuthSubmitButton>
        <p className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
          Leadership is stewardship. This platform helps every leader grow with structure, reflection, and spiritual maturity.
        </p>
      </div>
      <AuthFooterLink label="New to the academy?" href="/signup" action="Create an account" />

      <AnimatePresence>
        {forgotOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-heading text-xl font-semibold text-zinc-950">Reset password</h3>
                <button onClick={() => setForgotOpen(false)} className="flex size-9 items-center justify-center rounded-lg border border-zinc-200">
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-sm leading-6 text-zinc-500">
                Enter your academy email and we will send password recovery instructions.
              </p>
              <Input
                className="mt-4 h-11 rounded-lg border-zinc-200 bg-zinc-50"
                placeholder="name@harvestersng.org"
                value={resetEmail}
                disabled={resetLoading}
                onChange={(event) => setResetEmail(event.target.value)}
              />
              {resetMessage ? (
                <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
                  {resetMessage}
                </p>
              ) : null}
              <Button
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="mt-4 w-full rounded-lg bg-black text-white hover:bg-zinc-800"
              >
                {resetLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Send reset instructions
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthLayout>
  );
}

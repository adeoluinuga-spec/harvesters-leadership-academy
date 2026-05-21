"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthLayoutProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  backHref?: string;
};

export function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
  backHref = "/dashboard",
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#050505] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(135deg,#050505,#17110e_48%,#050505)]" />
          <div className="absolute bottom-0 right-0 size-72 rounded-full bg-[#6b3f2a]/30 blur-3xl" />
          <div className="relative">
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
              <ArrowLeft className="size-4" />
              Return to platform
            </Link>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-8 flex size-12 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles className="size-6" />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Harvesters Leadership Academy
            </p>
            <h1 className="font-heading mt-5 text-5xl font-semibold tracking-tight">
              Harvesters Leadership Academy
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-400">
              Leadership growth with clarity, structure, and spiritual maturity.
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                {eyebrow}
              </p>
              <h2 className="font-heading mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-7 text-zinc-500">{subtitle}</p>
            </div>
            {children}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export function AuthFooterLink({
  label,
  href,
  action,
}: {
  label: string;
  href: string;
  action: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-zinc-500">
      {label}{" "}
      <Link
        href={href}
        className="inline-flex cursor-pointer items-center font-medium text-zinc-950 underline-offset-4 transition-colors hover:text-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50"
      >
        {action}
      </Link>
    </p>
  );
}

export function AuthSubmitButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="mt-5 h-11 w-full rounded-lg bg-black text-white hover:bg-zinc-800"
    >
      {children}
    </Button>
  );
}

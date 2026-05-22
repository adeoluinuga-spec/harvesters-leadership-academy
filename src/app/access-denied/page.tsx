"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ShieldAlert } from "lucide-react";

import { PermissionExamples } from "@/components/auth/role-components";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardForRole, normalizeStoredRole } from "@/lib/mock-auth";

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role = normalizeStoredRole(roleParam);
  const from = searchParams.get("from") ?? "this leadership layer";

  return (
    <AuthLayout
      eyebrow="Restricted leadership layer"
      title="You do not currently have permission to access this leadership layer."
      subtitle="Some oversight areas are invite-only and require a confirmed ministry assignment before access is granted."
      backHref="/dashboard"
    >
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <ShieldAlert className="size-6" />
          </div>
          <p className="text-sm leading-6 text-zinc-500">
            This is not a technical error. Your current ministry role is{" "}
            <span className="font-medium text-zinc-950">{role}</span>, and it is not assigned
            to access <span className="font-medium text-zinc-950">{from}</span>.
          </p>
          <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
            This leadership layer requires a confirmed ministry assignment. Contact an administrator
            if your access should be updated.
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="rounded-lg bg-black text-white hover:bg-zinc-800">
              <Link href={dashboardForRole(role)}>
                <LockKeyhole className="size-4" />
                Return to my dashboard
              </Link>
            </Button>
            <Button variant="outline" className="rounded-lg border-zinc-200 bg-white">
              <Mail className="size-4" />
              Contact administrator
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5">
        <PermissionExamples />
      </div>
    </AuthLayout>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={null}>
      <AccessDeniedContent />
    </Suspense>
  );
}

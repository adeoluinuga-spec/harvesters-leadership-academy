"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crown, MailCheck, ShieldCheck } from "lucide-react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { RoleRoutingCards } from "@/components/auth/role-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitationPage() {
  const router = useRouter();
  return (
    <AuthLayout
      eyebrow="Invitation acceptance"
      title="Invitation required"
      subtitle="Leadership invitations are created and assigned by a Platform Super Admin."
      backHref="/login"
    >
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-black text-white">
            <MailCheck className="size-6" />
          </div>
          <CardTitle className="font-heading text-xl font-semibold">Invitation details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-zinc-100 p-4">
            <p className="text-sm leading-6 text-zinc-600">No invitation has been loaded. Ask your Platform Super Admin to send or reissue one.</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
              <ShieldCheck className="size-3.5" />
              Invite Only
            </Badge>
            <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
              <Crown className="size-3.5" />
              Leadership oversight
            </Badge>
          </div>
          <div className="grid gap-2 pt-3 sm:grid-cols-2">
            <Button
              className="rounded-lg bg-black text-white hover:bg-zinc-800"
              onClick={() => {
                router.push("/onboarding");
              }}
            >
              <CheckCircle2 className="size-4" />
              Accept invitation
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
              <Link href="/signup">Setup account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5">
        <RoleRoutingCards />
      </div>
    </AuthLayout>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crown, MailCheck, ShieldCheck } from "lucide-react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { RoleRoutingCards } from "@/components/auth/role-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invitationProfiles } from "@/lib/role-data";

export default function InvitationPage() {
  const router = useRouter();
  const invitation = invitationProfiles[1];

  return (
    <AuthLayout
      eyebrow="Invitation acceptance"
      title="You have been invited into a leadership oversight layer"
      subtitle="Review your assignment, accept the invitation, and set up your Harvesters Academy account."
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
          {[
            ["Invited leader", invitation.name],
            ["Assigned role", invitation.role],
            ["Assigned campus/subgroup", invitation.assignment],
            ["Invited by", invitation.invitedBy],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-100 p-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
            </div>
          ))}
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

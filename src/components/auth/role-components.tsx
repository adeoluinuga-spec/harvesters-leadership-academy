"use client";

import Link from "next/link";
import { CheckCircle2, LockKeyhole, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roles } from "@/lib/role-data";

export function RoleRoutingCards() {
  return (
    <div className="grid gap-3">
      {roles.map((role) => (
        <Card key={role.name} className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <role.icon className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-semibold text-zinc-950">{role.name}</p>
                  {role.inviteOnly ? (
                    <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                      Invite Only
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-zinc-500">{role.description}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
              <Link href={role.route}>{role.layer}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PermissionExamples() {
  const examples: Array<{ status: string; copy: string; icon: LucideIcon }> = [
    {
      status: "Allowed",
      copy: "Campus Pastor sees personal learning plus campus participation, inactive leaders, mentorship, and ministry-team performance.",
      icon: CheckCircle2,
    },
    {
      status: "Restricted",
      copy: "Leader cannot access subgroup or group oversight layers.",
      icon: LockKeyhole,
    },
    {
      status: "Allowed",
      copy: "Platform Super Admin governs organizations and tenant systems, while Directional Leaders carry pastoral oversight through their ministry reporting chain.",
      icon: CheckCircle2,
    },
    {
      status: "Restricted",
      copy: "Invite-only roles require administrative assignment.",
      icon: LockKeyhole,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {examples.map(({ status, copy, icon: Icon }) => (
        <Card key={copy} className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <Icon className="size-4" />
            </div>
            <CardTitle className="font-heading text-base font-semibold">{status}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-zinc-500">{copy}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MailPlus, Search, Settings2, SlidersHorizontal, UserPlus, X } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LeaderCard, statusClasses } from "@/components/hierarchy/hierarchy-cards";
import { leaders } from "@/lib/hierarchy-data";
import { cn } from "@/lib/utils";

const filters = ["Role", "Subgroup", "Campus", "Leadership level", "Status", "Enrollment"];

export default function UsersPage() {
  const [selected, setSelected] = useState(leaders[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
    <DashboardShell searchPlaceholder="Search users, roles, campuses..." showDate={false}>
      <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              User management
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Leadership User Ecosystem
            </h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-500">
              Manage leader access, assignments, enrollment, roles, and activity across Harvesters Academy.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-lg border-zinc-200 bg-white"><MailPlus className="size-4" /> Invite leaders</Button>
            <Button className="rounded-lg bg-black text-white hover:bg-zinc-800"><UserPlus className="size-4" /> Add user</Button>
          </div>
        </div>
      </motion.section>

      <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input className="h-10 rounded-lg border-zinc-200 bg-zinc-50 pl-9" placeholder="Intelligent search by leader, campus, role..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button key={filter} variant="outline" className="rounded-lg border-zinc-200 bg-white">
                <SlidersHorizontal className="size-4" />
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-zinc-100">
            <div>
              <CardTitle className="font-heading text-lg font-semibold">All leaders</CardTitle>
              <p className="text-sm text-zinc-500">Role, campus, enrollment, status, and activity tracking</p>
            </div>
            <Button variant="outline" className="rounded-lg border-zinc-200 bg-white"><Settings2 className="size-4" /> Bulk actions</Button>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-1">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                <tr className="border-b border-zinc-100">
                  <th className="py-3 font-medium">Leader</th>
                  <th className="py-3 font-medium">Role</th>
                  <th className="py-3 font-medium">Subgroup</th>
                  <th className="py-3 font-medium">Campus</th>
                  <th className="py-3 font-medium">Level</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Enrollment</th>
                  <th className="py-3 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader) => (
                  <tr
                    key={leader.id}
                    onClick={() => {
                      setSelected(leader);
                      setDrawerOpen(true);
                    }}
                    className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar><AvatarFallback className="bg-zinc-950 text-xs font-semibold text-white">{leader.initials}</AvatarFallback></Avatar>
                        <span className="font-medium text-zinc-950">{leader.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-zinc-600">{leader.role}</td>
                    <td className="py-4 text-zinc-600">{leader.subgroup}</td>
                    <td className="py-4 text-zinc-600">{leader.campus}</td>
                    <td className="py-4 text-zinc-600">{leader.level}</td>
                    <td className="py-4"><Badge className={cn("rounded-md border hover:bg-inherit", statusClasses(leader.status))}>{leader.status}</Badge></td>
                    <td className="py-4 text-zinc-600">{leader.enrolled ? "Enrolled" : "Invite pending"}</td>
                    <td className="py-4 text-zinc-600">{leader.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Quick profile</CardTitle></CardHeader>
          <CardContent><LeaderCard leader={selected} /></CardContent>
        </Card>
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Invitation flow UI</CardTitle><p className="text-sm text-zinc-400">Frontend-only operational state for bulk onboarding</p></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {["Upload leader list", "Assign campus and subgroup", "Send academy invitations"].map((step, index) => (
              <div key={step} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="font-heading text-2xl font-semibold">{index + 1}</p>
                <p className="mt-3 text-sm text-zinc-300">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold">Quick edit profile</h2>
                <button onClick={() => setDrawerOpen(false)} className="flex size-9 items-center justify-center rounded-lg border border-zinc-200"><X className="size-4" /></button>
              </div>
              <LeaderCard leader={selected} />
              <div className="mt-5 grid gap-3">
                {["Role assignment", "Subgroup assignment", "Campus assignment", "Leadership level", "Enrollment status"].map((field) => (
                  <div key={field} className="rounded-lg border border-zinc-100 p-4">
                    <p className="text-xs text-zinc-500">{field}</p>
                    <p className="mt-1 font-medium text-zinc-950">Editable frontend control</p>
                  </div>
                ))}
              </div>
              <Button className="mt-5 w-full rounded-lg bg-black text-white hover:bg-zinc-800">Save quick edits</Button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DashboardShell>
    </ProtectedRoute>
  );
}

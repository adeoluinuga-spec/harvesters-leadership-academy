"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpenCheck,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  HeartHandshake,
  Megaphone,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { MockRole } from "@/lib/mock-auth";

type NotificationType = "Learning" | "Assessments" | "Certificates" | "Follow-up" | "System";
type NotificationPriority = "Care" | "Action" | "Insight" | "Celebration";

type AcademyNotification = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  time: string;
  audience: MockRole[];
  icon: LucideIcon;
};

const filters: Array<"All" | NotificationType> = [
  "All",
  "Learning",
  "Assessments",
  "Certificates",
  "Follow-up",
  "System",
];

const notifications: AcademyNotification[] = [
  {
    id: "leader-course",
    title: "Continue your Church Planting course",
    body: "You are 62% through the module. A focused 18-minute session will keep your pathway on pace.",
    type: "Learning",
    priority: "Action",
    time: "Today, 8:30 AM",
    audience: ["Cell Leader / Assistant HOD", "Super Admin"],
    icon: BookOpenCheck,
  },
  {
    id: "leader-assessment",
    title: "Assessment due in 2 days",
    body: "Ministry Culture Review closes soon. Complete it before your next leadership check-in.",
    type: "Assessments",
    priority: "Care",
    time: "Today, 7:45 AM",
    audience: ["Cell Leader / Assistant HOD", "Super Admin"],
    icon: CalendarClock,
  },
  {
    id: "leader-certificate",
    title: "Certificate unlocked",
    body: "Your Stewardship Foundations certificate is ready for review and ministry records.",
    type: "Certificates",
    priority: "Celebration",
    time: "Yesterday",
    audience: ["Cell Leader / Assistant HOD", "Super Admin"],
    icon: Award,
  },
  {
    id: "leader-ai",
    title: "AI recommends your next course",
    body: "Based on your aspiration, Pastoral Care Readiness is the strongest next step.",
    type: "Learning",
    priority: "Insight",
    time: "Yesterday",
    audience: ["Cell Leader / Assistant HOD", "Super Admin"],
    icon: Brain,
  },
  {
    id: "campus-not-started",
    title: "12 leaders have not started assigned pathway",
    body: "A short campus reminder may help leaders begin before this week's cohort review.",
    type: "Learning",
    priority: "Action",
    time: "Today, 9:10 AM",
    audience: ["Campus Pastor", "Campus Admin", "Super Admin"],
    icon: Users,
  },
  {
    id: "campus-follow-up",
    title: "4 leaders need follow-up",
    body: "These leaders have missed two reminders. Consider pastoral check-ins before escalation.",
    type: "Follow-up",
    priority: "Care",
    time: "Today, 8:55 AM",
    audience: ["Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Super Admin"],
    icon: HeartHandshake,
  },
  {
    id: "campus-assessments",
    title: "8 leaders completed assessments",
    body: "Assessment responses are ready for review in the next oversight conversation.",
    type: "Assessments",
    priority: "Celebration",
    time: "Yesterday",
    audience: ["Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Super Admin"],
    icon: CheckCircle2,
  },
  {
    id: "campus-drop",
    title: "Campus completion dropped this week",
    body: "Engagement moved down by 6%. AI suggests reinforcing learning rhythms through department leads.",
    type: "System",
    priority: "Insight",
    time: "Monday",
    audience: ["Campus Pastor", "Group Pastor", "Super Admin"],
    icon: Brain,
  },
  {
    id: "subgroup-progress",
    title: "Magodo Subgroup reached 76% completion",
    body: "This subgroup is trending toward certificate readiness across core leadership modules.",
    type: "Certificates",
    priority: "Celebration",
    time: "Today, 10:20 AM",
    audience: ["Sub-Group Pastor", "Group Pastor", "Super Admin"],
    icon: ShieldCheck,
  },
  {
    id: "group-campus-attention",
    title: "Ilupeju Campus needs attention",
    body: "Learning starts are healthy, but assessment submission has slowed across two departments.",
    type: "Follow-up",
    priority: "Care",
    time: "Today, 9:40 AM",
    audience: ["Group Pastor", "Sub-Group Pastor", "Super Admin"],
    icon: HeartHandshake,
  },
  {
    id: "cert-ready",
    title: "23 leaders are certification-ready",
    body: "Leaders across three campuses have completed required learning and assessment milestones.",
    type: "Certificates",
    priority: "Action",
    time: "Yesterday",
    audience: ["Group Pastor", "Super Admin"],
    icon: Award,
  },
  {
    id: "declining-engagement",
    title: "AI detected declining engagement trend",
    body: "Two cohorts have reduced activity for seven days. A targeted encouragement broadcast is recommended.",
    type: "System",
    priority: "Insight",
    time: "Monday",
    audience: ["Sub-Group Pastor", "Group Pastor", "Super Admin"],
    icon: Sparkles,
  },
];

const typeStyles: Record<NotificationType, string> = {
  Learning: "bg-sky-50 text-sky-700 ring-sky-100",
  Assessments: "bg-amber-50 text-amber-700 ring-amber-100",
  Certificates: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Follow-up": "bg-rose-50 text-rose-700 ring-rose-100",
  System: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

const preferenceOptions = [
  "Email",
  "In-app",
  "Reminders",
  "Assessment nudges",
  "Certification alerts",
];

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<"All" | NotificationType>("All");
  const [role, setRole] = useState<MockRole>("Super Admin");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [broadcast, setBroadcast] = useState({
    audience: "All active leaders",
    role: "Leader",
    campus: "Ilupeju Campus",
    subgroup: "Magodo Subgroup",
    course: "Church Planting",
    title: "This week's leadership learning rhythm",
    body: "Please complete your assigned lesson and reflection before your next ministry check-in.",
  });

  useEffect(() => {
    let active = true;

    async function syncRole() {
      const result = await getCurrentUserProfile();
      if (active && result.profile) {
        setRole(result.profile.role);
        setProfile(result.profile);
      }
    }

    syncRole();

    return () => {
      active = false;
    };
  }, []);

  const roleNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          notification.audience.includes(role) &&
          (activeFilter === "All" || notification.type === activeFilter)
      ),
    [activeFilter, role]
  );

  const unreadCount = roleNotifications.length;
  const followUps = roleNotifications.filter((item) => item.type === "Follow-up").length;
  const reminders = roleNotifications.filter(
    (item) => item.type === "Learning" || item.type === "Assessments"
  ).length;

  return (
    <ProtectedRoute allowedRoles={["Leader", "Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Super Admin"]}>
      <DashboardShell searchPlaceholder="Search notifications, broadcasts, reminders..." showDate={false}>
        <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Notifications and communication
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              A calm leadership communication layer for every growth moment
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
              Role-aware reminders, follow-up signals, certificate alerts, and ministry broadcasts
              keep leaders engaged without making the Academy feel noisy.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#080808] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white text-black">
                <Bell className="size-5" />
              </div>
              <div>
                <p className="font-heading font-semibold">Communication health</p>
                <p className="text-sm text-zinc-400">{role} view tuned to {profile?.campus ?? "your campus"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Visible signals", unreadCount],
                ["Learning reminders", reminders],
                ["Follow-up alerts", followUps],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <span className="font-heading text-xl font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={shellItem} className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Leaders nudged gently", value: "84%", icon: BookOpenCheck },
            { label: "Follow-up closed", value: "17", icon: HeartHandshake },
            { label: "Certificates surfaced", value: "23", icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                  <CardTitle className="font-heading mt-3 text-3xl font-semibold text-zinc-950">{value}</CardTitle>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Icon className="size-5" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </motion.section>

        <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Notification center</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">Filtered by your current leadership role.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "rounded-lg",
                        activeFilter === filter
                          ? "bg-black text-white hover:bg-zinc-800"
                          : "border-zinc-200 bg-white text-zinc-600"
                      )}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <motion.div variants={shellContainer} className="space-y-3">
                {roleNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </motion.div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold">Preferences</CardTitle>
              <p className="text-sm text-zinc-500">Visible options for how leaders receive Academy communication.</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {preferenceOptions.map((option, index) => (
                <label
                  key={option}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-zinc-800">
                    <Settings2 className="size-4 text-zinc-400" />
                    {option}
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked={index < 4}
                    className="size-4 accent-black"
                  />
                </label>
              ))}
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="font-heading text-sm font-semibold text-zinc-950">AI communication tone</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Encouraging, pastoral, and specific. Reminders are grouped by learning rhythm so leaders receive clarity instead of pressure.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                  <Megaphone className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Super Admin broadcast interface</CardTitle>
                  <p className="text-sm text-zinc-500">Compose targeted announcements for roles, campuses, subgroups, and course participants.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-1 xl:grid-cols-[1fr_0.85fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Target audience"
                  value={broadcast.audience}
                  options={["All active leaders", "Leaders needing follow-up", "Certificate-ready leaders"]}
                  onChange={(audience) => setBroadcast((current) => ({ ...current, audience }))}
                />
                <SelectField
                  label="Role"
                  value={broadcast.role}
                  options={["Leader", "Campus Pastor", "Sub-Group Pastor", "Group Pastor", "Super Admin"]}
                  onChange={(nextRole) => setBroadcast((current) => ({ ...current, role: nextRole }))}
                />
                <SelectField
                  label="Campus"
                  value={broadcast.campus}
                  options={["All campuses", "Ilupeju Campus", "Lekki Campus", "Magodo Campus"]}
                  onChange={(campus) => setBroadcast((current) => ({ ...current, campus }))}
                />
                <SelectField
                  label="Subgroup"
                  value={broadcast.subgroup}
                  options={["All subgroups", "Magodo Subgroup", "Mainland Subgroup", "Island Subgroup"]}
                  onChange={(subgroup) => setBroadcast((current) => ({ ...current, subgroup }))}
                />
                <SelectField
                  label="Course participants"
                  value={broadcast.course}
                  options={["All courses", "Church Planting", "Pastoral Care Readiness", "Stewardship Foundations"]}
                  onChange={(course) => setBroadcast((current) => ({ ...current, course }))}
                />
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Message title
                  </label>
                  <Input
                    value={broadcast.title}
                    onChange={(event) => setBroadcast((current) => ({ ...current, title: event.target.value }))}
                    className="h-10 rounded-lg border-zinc-200 bg-white shadow-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Message body
                  </label>
                  <textarea
                    value={broadcast.body}
                    onChange={(event) => setBroadcast((current) => ({ ...current, body: event.target.value }))}
                    className="min-h-32 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-300 focus:ring-3 focus:ring-zinc-200/70"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-heading font-semibold text-zinc-950">Preview</p>
                  <Badge className="rounded-md bg-black text-white hover:bg-black">Draft</Badge>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    {broadcast.role} - {broadcast.campus}
                  </p>
                  <h3 className="font-heading mt-3 text-xl font-semibold text-zinc-950">{broadcast.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{broadcast.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[broadcast.audience, broadcast.subgroup, broadcast.course].map((item) => (
                      <Badge key={item} className="rounded-md border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-50">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button className="mt-4 h-10 w-full rounded-lg bg-black text-white hover:bg-zinc-800">
                  <Send className="size-4" />
                  Queue broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </DashboardShell>
    </ProtectedRoute>
  );
}

function NotificationCard({ notification }: { notification: AcademyNotification }) {
  const Icon = notification.icon;

  return (
    <motion.div variants={shellItem} whileHover={{ y: -2 }}>
      <div className="grid gap-4 rounded-lg border border-zinc-100 bg-white p-4 transition hover:border-zinc-200 hover:shadow-sm md:grid-cols-[auto_1fr_auto]">
        <div className="flex size-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-md ring-1 hover:bg-inherit", typeStyles[notification.type])}>
              {notification.type}
            </Badge>
            <span className="text-xs font-medium text-zinc-400">{notification.priority}</span>
          </div>
          <h3 className="font-heading text-base font-semibold text-zinc-950">{notification.title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{notification.body}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-medium text-zinc-400">{notification.time}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-lg border-zinc-200 bg-white">
            Review
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-300 focus:ring-3 focus:ring-zinc-200/70"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  );
}

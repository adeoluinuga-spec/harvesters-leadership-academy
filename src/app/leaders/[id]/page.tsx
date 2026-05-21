"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { Award, BookOpenCheck, LineChart, Sparkles, UserCheck } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { AfricanMinistryVisual, IntelligencePanel } from "@/components/hierarchy/hierarchy-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/lib/course-data";
import { leaders } from "@/lib/hierarchy-data";

type LeaderProfilePageProps = {
  params: Promise<{ id: string }>;
};

const profileMetricIcons = {
  engagement: LineChart,
  completion: BookOpenCheck,
  certificates: Award,
  coursesDone: UserCheck,
};

const timeline = [
  "Completed New Leaders Orientation",
  "Joined campus follow-up team",
  "Led first discipleship circle",
  "Recommended for ministry leadership review",
];

const assessments = [
  { name: "Leadership Posture Review", score: 86, date: "May 2026" },
  { name: "Ministry Culture Assessment", score: 79, date: "April 2026" },
  { name: "Pastoral Care Readiness", score: 82, date: "March 2026" },
];

export default function LeaderProfilePage({ params }: LeaderProfilePageProps) {
  const { id } = use(params);
  const leader = leaders.find((item) => item.id === id) ?? leaders[0];
  const recommended = courses.slice(0, 3);
  const metrics = [
    { label: "Engagement", value: `${leader.engagement}%`, icon: profileMetricIcons.engagement },
    { label: "Completion", value: `${leader.completion}%`, icon: profileMetricIcons.completion },
    { label: "Certificates", value: leader.certificates, icon: profileMetricIcons.certificates },
    { label: "Courses Done", value: leader.coursesCompleted, icon: profileMetricIcons.coursesDone },
  ];

  return (
    <DashboardShell searchPlaceholder="Search leader history, courses, mentorship notes..." showDate={false}>
      <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Ministry growth profile
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-zinc-950">
            {leader.name}
          </h1>
          <p className="mt-3 text-base text-zinc-500">{leader.role}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className="rounded-md bg-black text-white hover:bg-black">{leader.campus}</Badge>
            <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">{leader.subgroup}</Badge>
            <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">{leader.group}</Badge>
            <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">{leader.level}</Badge>
          </div>
        </div>
        <AfricanMinistryVisual label="Ministry leader profile environment" />
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 md:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                <CardTitle className="font-heading mt-3 text-3xl font-semibold">{value}</CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100"><Icon className="size-5" /></div>
            </CardHeader>
          </Card>
        ))}
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Spiritual growth timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg border border-zinc-100 p-4">
                <div className="font-heading flex size-8 items-center justify-center rounded-lg bg-black text-xs font-semibold text-white">{index + 1}</div>
                <div>
                  <p className="font-medium text-zinc-950">{item}</p>
                  <p className="text-sm text-zinc-500">Leadership milestone recorded</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <IntelligencePanel
          title="AI growth insights"
          subtitle="Recommended next steps for ministry development"
          insights={[
            "Strong operational consistency, but mentorship notes suggest deeper pastoral care training.",
            "Ready for advanced discipleship systems within the next cohort.",
            "Engagement spikes after team-based learning sessions.",
            "Recommended next action: assign a senior mentor for 30 days.",
          ]}
          dark
        />
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">Hierarchy assignment</CardTitle>
            <p className="text-sm text-zinc-500">Inherited ministry structure for oversight and reporting</p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[
              ["Campus", leader.campus],
              ["Subgroup", leader.subgroup],
              ["Group", leader.group],
              ["Campus Pastor", leader.campusPastor],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                <p className="font-heading mt-2 font-semibold text-zinc-950">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Completed courses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {courses.slice(1, 4).map((course) => (
              <div key={course.id} className="rounded-lg border border-zinc-100 p-4">
                <p className="font-medium text-zinc-950">{course.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{course.duration}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Assessment history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {assessments.map((assessment) => (
              <div key={assessment.name} className="rounded-lg border border-zinc-100 p-4">
                <div className="mb-2 flex justify-between"><p className="font-medium">{assessment.name}</p><span>{assessment.score}%</span></div>
                <Progress value={assessment.score} className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black" />
                <p className="mt-2 text-xs text-zinc-500">{assessment.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Mentorship notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["Shows high ownership in team rhythms.", "Needs support balancing workload and coaching.", "Next mentorship check-in scheduled."].map((note) => (
              <div key={note} className="rounded-lg border border-zinc-100 p-4 text-sm leading-6 text-zinc-600">{note}</div>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg font-semibold">Recommended next courses</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {recommended.map((course) => (
              <div key={course.id} className="rounded-lg border border-zinc-100 p-4">
                <Sparkles className="mb-4 size-5 text-zinc-400" />
                <p className="font-heading font-semibold text-zinc-950">{course.title}</p>
                <p className="mt-2 text-sm text-zinc-500">{course.category} · {course.duration}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
  );
}

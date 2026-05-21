"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  MessageSquareText,
  Pause,
  Radio,
  Sparkles,
  Unlock,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { courses, recommendedCourses } from "@/lib/course-data";

type CourseLearnPageProps = {
  params: Promise<{ id: string }>;
};

const lessons = [
  {
    number: "01",
    title: "The leader as a steward of spiritual culture",
    duration: "18:42",
    complete: true,
    locked: false,
    checkpoint: true,
    current: false,
  },
  {
    number: "02",
    title: "Decision clarity under ministry pressure",
    duration: "24:16",
    complete: false,
    locked: false,
    checkpoint: true,
    current: true,
  },
  {
    number: "03",
    title: "Leading teams through measurable rhythms",
    duration: "21:08",
    complete: false,
    locked: false,
    checkpoint: false,
    current: false,
  },
  {
    number: "04",
    title: "Coaching leaders with pastoral intelligence",
    duration: "28:33",
    complete: false,
    locked: true,
    checkpoint: true,
    current: false,
  },
  {
    number: "05",
    title: "Assessment readiness and certificate review",
    duration: "16:20",
    complete: false,
    locked: true,
    checkpoint: false,
    current: false,
  },
];

const tabs = ["Overview", "Notes", "Transcript", "Resources", "AI Insights"];

const insights = [
  {
    title: "Key leadership takeaway",
    body: "Healthy ministry execution begins when leaders can name the culture they are protecting before they name the task they are assigning.",
    icon: Sparkles,
  },
  {
    title: "Scripture reference",
    body: "1 Peter 5:2-3 frames leadership as willing shepherding, not control. Use it to examine posture before delegation.",
    icon: BookOpen,
  },
  {
    title: "AI-generated summary",
    body: "This section connects stewardship, clarity, and rhythm as the operating system for scalable leadership development.",
    icon: Bot,
  },
  {
    title: "Action point",
    body: "Write one sentence that defines the leadership culture your team should feel in every weekly meeting.",
    icon: CheckCircle2,
  },
];

const progressStats = [
  { label: "Overall course progress", value: "62%", detail: "11 of 18 lessons watched" },
  { label: "Lessons completed", value: "11", detail: "7 lessons remaining" },
  { label: "Assessment readiness", value: "74%", detail: "Ready after checkpoint 4" },
  { label: "Certificate eligibility", value: "Pending", detail: "Complete 90% to unlock" },
];

export default function CourseLearnPage({ params }: CourseLearnPageProps) {
  const { id } = use(params);
  const course = courses.find((item) => item.id === id) ?? courses[0];
  const currentLesson = lessons.find((lesson) => lesson.current) ?? lessons[0];

  return (
    <DashboardShell searchPlaceholder="Search lesson notes, transcript, resources..." showDate={false}>
      <motion.div variants={shellItem} className="flex items-center justify-between gap-4">
        <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
          <Link href={`/courses/${course.id}`}>
            <ArrowLeft className="size-4" />
            Course overview
          </Link>
        </Button>
        <Badge className="rounded-md border-zinc-200 bg-white text-zinc-700 hover:bg-white">
          AI-assisted learning session
        </Badge>
      </motion.div>

      <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-xl border-zinc-200 bg-white p-0 shadow-sm">
            <div className="relative aspect-video overflow-hidden bg-[#070707]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#070707_0%,#171717_48%,#0b0b0b_100%)]" />
              <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
              <div className="absolute left-8 top-8 max-w-md text-white">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                  Harvesters Leadership Academy
                </p>
                <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  Ministry leadership session
                </h1>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  A cinematic teaching environment for Harvesters leaders, pastoral teams,
                  and ministry builders.
                </p>
              </div>

              <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-black/45 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button className="flex size-10 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105">
                      <Pause className="size-4" />
                    </button>
                    <div>
                      <p className="text-sm font-medium">02:18 / 24:16</p>
                      <p className="text-xs text-zinc-400">AI checkpoint approaching</p>
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
                    <Radio className="size-3.5 text-emerald-300" />
                    Live learning telemetry
                  </div>
                </div>
                <Progress
                  value={38}
                  className="h-1.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-white"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="absolute right-6 top-6 hidden max-w-sm rounded-xl border border-white/15 bg-white/95 p-4 text-zinc-950 shadow-2xl lg:block"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-black text-white">
                    <Bot className="size-4" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold">
                      AI Reflection Checkpoint
                    </p>
                    <p className="text-xs text-zinc-500">Appears at 02:30</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-zinc-600">
                  What leadership principle was emphasized in this section?
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="rounded-lg bg-black text-white hover:bg-zinc-800">
                    Answer now
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg border-zinc-200 bg-white">
                    Continue watching
                  </Button>
                </div>
              </motion.div>
            </div>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{course.title}</p>
                  <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                    {currentLesson.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">Instructor: {course.instructor}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm lg:min-w-[360px]">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Progress</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">38%</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Duration</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">24:16</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Timestamp</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">02:18</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Lesson navigation
            </CardTitle>
            <p className="text-sm text-zinc-500">Course pathway and AI checkpoints</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {lessons.map((lesson) => (
              <button
                key={lesson.number}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50",
                  lesson.current
                    ? "border-black bg-zinc-950 text-white hover:bg-zinc-950"
                    : "border-zinc-100 bg-white text-zinc-950"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "font-heading flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                        lesson.current ? "bg-white text-black" : "bg-zinc-100 text-zinc-600"
                      )}
                    >
                      {lesson.number}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-5">{lesson.title}</p>
                      <p className={cn("mt-1 text-xs", lesson.current ? "text-zinc-400" : "text-zinc-500")}>
                        {lesson.duration}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {lesson.checkpoint ? <Bot className="size-4 text-emerald-500" /> : null}
                    {lesson.locked ? (
                      <Lock className="size-4 text-zinc-400" />
                    ) : lesson.complete ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Unlock className="size-4 text-zinc-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab, index) => (
                  <button
                    key={tab}
                    className={cn(
                      "h-9 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all",
                      index === 4
                        ? "border-black bg-black text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
              {insights.map((insight) => (
                <div key={insight.title} className="rounded-lg border border-zinc-100 p-4">
                  <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                    <insight.icon className="size-4" />
                  </div>
                  <h3 className="font-heading font-semibold text-zinc-950">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{insight.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Related courses
              </CardTitle>
              <p className="text-sm text-zinc-500">Continue your leadership development pathway</p>
            </CardHeader>
            <CardContent className="flex gap-3 overflow-x-auto pt-1">
              {recommendedCourses.map((related) => (
                <div
                  key={related.title}
                  className="min-w-[260px] rounded-lg border border-zinc-100 bg-white p-4 transition-shadow hover:shadow-lg hover:shadow-zinc-200/70"
                >
                  <div className="mb-4 flex h-28 items-end rounded-lg bg-[#0b0b0b] p-3 text-white">
                    <p className="font-heading text-sm font-semibold leading-5">
                      Ministry leadership cohort
                    </p>
                  </div>
                  <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                    {related.category}
                  </Badge>
                  <p className="font-heading mt-3 font-semibold leading-snug text-zinc-950">
                    {related.title}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">{related.duration}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg font-semibold">Course progress</CardTitle>
              <p className="text-sm text-zinc-400">Readiness indicators for certification</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {progressStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-400">{stat.label}</p>
                    <p className="font-heading font-semibold text-white">{stat.value}</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{stat.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Learning tools
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { label: "Add private note", icon: MessageSquareText },
                { label: "Download resource", icon: Download },
                { label: "Open transcript", icon: FileText },
                { label: "Certificate path", icon: Award },
              ].map((tool) => (
                <Button
                  key={tool.label}
                  variant="outline"
                  className="h-11 justify-start rounded-lg border-zinc-200 bg-white"
                >
                  <tool.icon className="size-4" />
                  {tool.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </DashboardShell>
  );
}

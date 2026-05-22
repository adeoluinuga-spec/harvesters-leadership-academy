"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  PlayCircle,
  Users,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { courses as staticCourses } from "@/lib/course-data";
import { fetchCourseWithLessons } from "@/lib/lms";
import type { CourseWithLessons } from "@/lib/lms-types";
import { formatDuration, formatSeconds } from "@/lib/lms-types";

type CourseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params);
  const staticCourse = staticCourses.find((c) => c.id === id) ?? staticCourses[0];

  const [live, setLive] = useState<CourseWithLessons | null>(null);
  const [enrolling, startEnroll] = useTransition();
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetchCourseWithLessons(id)
      .then((data) => {
        if (data) {
          setLive(data);
          setEnrolled(data.enrolled);
        }
      })
      .catch(() => {});
  }, [id]);

  const title = live?.title ?? staticCourse.title;
  const description = live?.description ?? staticCourse.description;
  const thumbnail = live?.thumbnail_url ?? staticCourse.thumbnail;
  const category = live?.category ?? staticCourse.category;
  const level = live?.level ?? staticCourse.level;
  const instructorName = live?.instructor_name ?? staticCourse.instructor;
  const durationStr = live ? formatDuration(live.duration_minutes) : staticCourse.duration;
  const lessonCount = live?.lessons.length ?? staticCourse.lessons;
  const progressPercent = live?.progress_percent ?? staticCourse.progress;
  const hasCertificate = Boolean(live?.certificate);

  const cta = hasCertificate
    ? "View Certificate"
    : enrolled || live?.enrolled
    ? "Continue learning"
    : "Enrol now";

  const ctaHref =
    hasCertificate
      ? `/courses/${id}/certificate`
      : enrolled || live?.enrolled
      ? `/courses/${id}/learn`
      : undefined;

  function handleEnroll() {
    if (!live?.id) return;
    startEnroll(async () => {
      try {
        const res = await fetch("/api/lms/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: live.id }),
        });
        if (res.ok) {
          setEnrolled(true);
        }
      } catch {}
    });
  }

  const modules =
    live?.lessons && live.lessons.length > 0
      ? (() => {
          if (live.modules.length > 0) {
            return live.modules.map((m) => ({
              title: m.title,
              length: `${m.lessons?.length ?? 0} lessons`,
              complete: m.lessons?.every((l) => live.completed_lesson_ids.has(l.id)) ?? false,
            }));
          }
          const grouped: Array<{ title: string; length: string; complete: boolean }> = [];
          for (let i = 0; i < live.lessons.length; i += 3) {
            const chunk = live.lessons.slice(i, i + 3);
            const totalSecs = chunk.reduce((a, l) => a + l.duration_seconds, 0);
            grouped.push({
              title: chunk[0].title,
              length: formatSeconds(totalSecs),
              complete: chunk.every((l) => live.completed_lesson_ids.has(l.id)),
            });
          }
          return grouped;
        })()
      : [
          { title: "Leadership posture and ministry clarity", length: "28 min", complete: false },
          { title: "Building culture through repeated rhythms", length: "36 min", complete: false },
          { title: "Operational scorecards for campus teams", length: "42 min", complete: false },
          { title: "Coaching leaders through execution gaps", length: "31 min", complete: false },
        ];

  return (
    <DashboardShell searchPlaceholder="Search course lessons, modules, notes..." showDate={false}>
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="relative min-h-[420px] bg-zinc-950">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
          <div className="relative flex min-h-[420px] flex-col justify-between p-6 md:p-8">
            <Button
              asChild
              variant="outline"
              className="w-fit rounded-lg border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link href="/courses">
                <ArrowLeft className="size-4" />
                Course library
              </Link>
            </Button>

            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap gap-2">
                <Badge className="rounded-md border-white/15 bg-white text-zinc-950 hover:bg-white">
                  {category}
                </Badge>
                <Badge className="rounded-md border-white/15 bg-white/10 text-white hover:bg-white/10">
                  {level}
                </Badge>
              </div>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">{description}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {ctaHref ? (
                  <Button asChild className="h-10 rounded-lg bg-white px-4 text-black hover:bg-zinc-100">
                    <Link href={ctaHref}>
                      <PlayCircle className="size-4" />
                      {cta}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="h-10 rounded-lg bg-white px-4 text-black hover:bg-zinc-100"
                  >
                    {enrolling ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                    {cta}
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-lg border-white/20 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link href={`/courses/${id}/learn`}>
                    <FileCheck2 className="size-4" />
                    Course outline
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={shellItem} className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Course intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Instructor", value: instructorName, icon: Users },
                { label: "Lessons", value: String(lessonCount), icon: BookOpen },
                { label: "Duration", value: durationStr, icon: Clock3 },
                { label: "Certificate", value: hasCertificate ? "Earned" : "Earn upon completion", icon: Award },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border border-zinc-100 p-4">
                  <metric.icon className="mb-3 size-4 text-zinc-400" />
                  <p className="text-xs text-zinc-500">{metric.label}</p>
                  <p className="font-heading mt-1 text-lg font-semibold text-zinc-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-950">Completion progress</span>
                <span className="font-semibold text-zinc-950">{progressPercent}%</span>
              </div>
              <Progress
                value={progressPercent}
                className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Learning pathway
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Structured modules for ministry leadership development
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {modules.map((module, index) => (
              <div
                key={module.title}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                    {module.complete ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950">
                      {index + 1}. {module.title}
                    </p>
                    <p className="text-sm text-zinc-500">{module.length}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-lg border-zinc-200 bg-white">
                  <Link href={`/courses/${id}/learn`}>Open</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
  );
}

"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fetchCourseWithLessons } from "@/lib/lms";
import type { CourseWithLessons } from "@/lib/lms-types";
import { formatDuration, formatSeconds } from "@/lib/lms-types";

type CourseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [live, setLive] = useState<CourseWithLessons | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, startEnroll] = useTransition();
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetchCourseWithLessons(id)
      .then((data) => {
        if (data) {
          setLive(data);
          setEnrolled(data.enrolled);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const hasCertificate = Boolean(live?.certificate);
  const isEnrolled = enrolled || Boolean(live?.enrolled);

  const cta = hasCertificate
    ? "View Certificate"
    : isEnrolled
    ? "Continue learning"
    : "Enrol now";

  const ctaHref =
    hasCertificate
      ? `/courses/${id}/certificate`
      : isEnrolled
      ? `/courses/${id}/learn`
      : null;

  function handleEnroll() {
    if (!live?.id) return;
    startEnroll(async () => {
      try {
        const res = await fetch("/api/lms/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: live.id }),
        });
        if (res.ok) setEnrolled(true);
      } catch {}
    });
  }

  const modules =
    live && live.lessons.length > 0
      ? (() => {
          if (live.modules.length > 0) {
            return live.modules.map((m) => ({
              id: m.id,
              title: m.title,
              length: `${m.lessons?.length ?? 0} lessons`,
              complete: m.lessons?.every((l) => live.completed_lesson_ids.has(l.id)) ?? false,
            }));
          }
          const grouped: Array<{ id: string; title: string; length: string; complete: boolean }> = [];
          for (let i = 0; i < live.lessons.length; i += 3) {
            const chunk = live.lessons.slice(i, i + 3);
            const totalSecs = chunk.reduce((a, l) => a + l.duration_seconds, 0);
            grouped.push({
              id: chunk[0].id,
              title: chunk[0].title,
              length: formatSeconds(totalSecs),
              complete: chunk.every((l) => live.completed_lesson_ids.has(l.id)),
            });
          }
          return grouped;
        })()
      : [];

  if (loading) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  if (!live) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20">
          <p className="font-heading text-lg font-semibold text-zinc-950">Course not found</p>
          <button
            type="button"
            onClick={() => router.push("/courses")}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Back to courses
          </button>
        </div>
      </DashboardShell>
    );
  }

  const progressPercent = live.progress_percent;
  const instructorDisplay = [live.instructor_name, live.instructor_role ?? live.instructor_title]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashboardShell searchPlaceholder="Search course lessons, modules, notes..." showDate={false}>
      {/* Hero banner */}
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="relative min-h-[420px] bg-zinc-950">
          {live.thumbnail_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-70"
              style={{ backgroundImage: `url(${live.thumbnail_url})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
          <div className="relative flex min-h-[420px] flex-col justify-between p-6 md:p-8">
            <Link
              href="/courses"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="size-4" />
              Course library
            </Link>

            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap gap-2">
                <Badge className="rounded-md border-white/15 bg-white text-zinc-950 hover:bg-white">
                  {live.category}
                </Badge>
                <Badge className="rounded-md border-white/15 bg-white/10 text-white hover:bg-white/10">
                  {live.level}
                </Badge>
                {live.is_required && (
                  <Badge className="rounded-md border-rose-400/30 bg-rose-600 text-white hover:bg-rose-600">
                    Required
                  </Badge>
                )}
              </div>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {live.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">{live.description}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {ctaHref ? (
                  <Link
                    href={ctaHref}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
                  >
                    <PlayCircle className="size-4" />
                    {cta}
                  </Link>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-70"
                  >
                    {enrolling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                    {cta}
                  </button>
                )}
                <Link
                  href={`/courses/${id}/learn`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <FileCheck2 className="size-4" />
                  Course outline
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Course intelligence + Learning pathway */}
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
                { label: "Instructor", value: instructorDisplay, icon: Users },
                { label: "Lessons", value: String(live.lessons.length), icon: BookOpen },
                { label: "Duration", value: formatDuration(live.duration_minutes), icon: Clock3 },
                { label: "Certificate", value: hasCertificate ? "Earned" : "Earn upon completion", icon: Award },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border border-zinc-100 p-4">
                  <metric.icon className="mb-3 size-4 text-zinc-400" />
                  <p className="text-xs text-zinc-500">{metric.label}</p>
                  <p className="font-heading mt-1 text-base font-semibold text-zinc-950 leading-snug">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            {(live.leadership_targets ?? []).length > 0 && (
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="mb-2 text-xs text-zinc-500">Leadership cadres</p>
                <div className="flex flex-wrap gap-1.5">
                  {(live.leadership_targets ?? []).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
          <CardContent className="space-y-3 pt-3">
            {modules.length > 0 ? (
              modules.map((module, index) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        module.complete ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-700"
                      )}
                    >
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
                  <Link
                    href={`/courses/${id}/learn`}
                    className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Open
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BookOpen className="size-8 text-zinc-300" />
                <p className="mt-3 text-sm text-zinc-500">
                  {isEnrolled
                    ? "Lessons are being prepared for this course."
                    : "Enrol to access course lessons."}
                </p>
                {!isEnrolled && (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="mt-4 inline-flex h-8 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
                  >
                    {enrolling ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Enrol now
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Overview */}
      {live.overview && (
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Course overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm leading-7 text-zinc-600 whitespace-pre-line">{live.overview}</p>
            </CardContent>
          </Card>
        </motion.section>
      )}
    </DashboardShell>
  );
}

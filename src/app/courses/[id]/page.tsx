"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock3,
  Loader2,
  PlayCircle,
  Users,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchSimpleCourseDetail, type SimpleCourseDetail } from "@/lib/lms";
import { formatDuration } from "@/lib/lms-types";
import { extractVimeoId, vimeoEmbedUrl } from "@/lib/vimeo";

type CourseDetailPageProps = { params: Promise<{ id: string }> };

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<SimpleCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, startEnroll] = useTransition();
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetchSimpleCourseDetail(id)
      .then((data) => {
        if (data) {
          setCourse(data);
          setEnrolled(data.enrolled);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handleEnroll() {
    if (!course?.id) return;
    startEnroll(async () => {
      try {
        const res = await fetch("/api/lms/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: course.id }),
        });
        if (res.ok) setEnrolled(true);
      } catch {}
    });
  }

  if (loading) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  if (!course) {
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

  const isEnrolled = enrolled || course.enrolled;
  const instructorDisplay = [course.instructor_name, course.instructor_role ?? course.instructor_title]
    .filter(Boolean)
    .join(" · ");

  const vimeoId = course.video_url ? extractVimeoId(course.video_url) : null;

  return (
    <DashboardShell searchPlaceholder="Search courses..." showDate={false}>

      {/* ── Hero banner ─────────────────────────────────────── */}
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="relative min-h-[380px] bg-zinc-950">
          {course.thumbnail_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: `url(${course.thumbnail_url})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />

          <div className="relative flex min-h-[380px] flex-col justify-between p-6 md:p-8">
            <Link
              href="/courses"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="size-4" />
              Course library
            </Link>

            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="rounded-md border-white/15 bg-white text-zinc-950 hover:bg-white">
                  {course.category}
                </Badge>
                <Badge className="rounded-md border-white/15 bg-white/10 text-white hover:bg-white/10">
                  {course.level}
                </Badge>
                {course.is_required && (
                  <Badge className="rounded-md border-rose-400/30 bg-rose-600 text-white hover:bg-rose-600">
                    Required
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {course.title}
              </h1>
              {course.description && (
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
                  {course.description}
                </p>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {isEnrolled ? (
                  <a
                    href="#video"
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
                  >
                    <PlayCircle className="size-4" />
                    Start watching
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-70"
                  >
                    {enrolling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                    {enrolling ? "Enrolling..." : "Enrol now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Video embed ──────────────────────────────────────── */}
      {vimeoId && (
        <motion.section variants={shellItem} id="video">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 shadow-sm">
            <div className="relative aspect-video w-full">
              <iframe
                src={vimeoEmbedUrl(vimeoId)}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={course.title}
              />
            </div>
            {!isEnrolled && (
              <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
                <p className="text-sm text-zinc-400">Enrol to track your progress through this course</p>
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-70"
                >
                  {enrolling ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {enrolling ? "Enrolling..." : "Enrol now"}
                </button>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* ── No video placeholder ─────────────────────────────── */}
      {!vimeoId && (
        <motion.section variants={shellItem}>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-14">
            <PlayCircle className="size-10 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-500">Video not yet available</p>
            <p className="mt-1 text-xs text-zinc-400">The course instructor hasn't uploaded a video yet</p>
          </div>
        </motion.section>
      )}

      {/* ── Course info + Overview ───────────────────────────── */}
      <motion.section variants={shellItem} className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">

        {/* Course info card */}
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-base font-semibold text-zinc-950">
              Course details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">

            {/* Instructor */}
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <Users className="size-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Instructor</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-950">{instructorDisplay}</p>
              </div>
            </div>

            {/* Duration */}
            {course.duration_minutes > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <Clock3 className="size-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Duration</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-950">
                    {formatDuration(course.duration_minutes)}
                  </p>
                </div>
              </div>
            )}

            {/* Enrollment status */}
            <div className={cn(
              "rounded-lg border p-3 text-center text-xs font-medium",
              isEnrolled
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-zinc-100 bg-zinc-50 text-zinc-500"
            )}>
              {isEnrolled ? "You are enrolled in this course" : "Not yet enrolled"}
            </div>

            {/* Leadership targets */}
            {(course.leadership_targets ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-xs text-zinc-400">Leadership cadres</p>
                <div className="flex flex-wrap gap-1.5">
                  {course.leadership_targets.map((t: string) => (
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

            {!isEnrolled && (
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
              >
                {enrolling ? <Loader2 className="size-4 animate-spin" /> : null}
                {enrolling ? "Enrolling..." : "Enrol now"}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Overview card */}
        {course.overview ? (
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100">
              <CardTitle className="font-heading text-base font-semibold text-zinc-950">
                Course overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm leading-7 text-zinc-600 whitespace-pre-line">{course.overview}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-zinc-400">No overview added yet</p>
            </CardContent>
          </Card>
        )}
      </motion.section>

    </DashboardShell>
  );
}

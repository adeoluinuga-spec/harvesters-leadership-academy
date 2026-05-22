"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  PlayCircle,
  Plus,
  Users,
} from "lucide-react";

import {
  DashboardShell,
  shellContainer,
  shellItem,
} from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fetchCourseCatalog } from "@/lib/lms";
import type { CatalogCourses } from "@/lib/lms";
import type { CourseWithProgress } from "@/lib/lms-types";
import { formatDuration } from "@/lib/lms-types";

const CREATOR_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
];

type Tab = "all" | "in-progress" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All Courses" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function CourseCard({ course }: { course: CourseWithProgress }) {
  const completed = Boolean(course.certificate);
  const inProgress = course.enrolled && !completed;
  const cta = completed ? "View Certificate" : inProgress ? "Continue" : "Enrol now";
  const ctaHref = completed
    ? `/courses/${course.slug}/certificate`
    : inProgress
    ? `/courses/${course.slug}/learn`
    : `/courses/${course.slug}`;

  return (
    <motion.article variants={shellItem} whileHover={{ y: -4 }} className="h-full">
      <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-zinc-200/70">
        <Link
          href={`/courses/${course.slug}`}
          className="group relative block aspect-[16/10] overflow-hidden rounded-t-xl bg-zinc-900"
        >
          {course.thumbnail_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${course.thumbnail_url})` }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="size-12 text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <Badge className="absolute left-4 top-4 rounded-md border-white/15 bg-white/90 text-zinc-900 hover:bg-white">
            {course.category}
          </Badge>
          {completed ? (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white">
              <CheckCircle2 className="size-3.5" />
              Completed
            </div>
          ) : course.is_required ? (
            <div className="absolute right-4 top-4 rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
              Required
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div>
              <p className="text-xs text-white/70">{course.level}</p>
              <p className="font-heading mt-1 line-clamp-2 text-lg font-semibold leading-snug">
                {course.title}
              </p>
            </div>
            <PlayCircle className="size-8 shrink-0 text-white/85" />
          </div>
        </Link>

        <CardContent className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-950">{course.instructor_name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {course.total_lessons > 0 ? `${course.total_lessons} lessons` : "—"}
              </span>
              <span className="flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {formatDuration(course.duration_minutes)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {course.enrolled ? "Enrolled" : "Open"}
              </span>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {course.enrolled ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Progress</span>
                  <span className="font-semibold text-zinc-900">{course.progress_percent}%</span>
                </div>
                <Progress
                  value={course.progress_percent}
                  className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                {(course.leadership_targets ?? []).length > 0
                  ? `For: ${(course.leadership_targets ?? []).slice(0, 2).join(", ")}${(course.leadership_targets ?? []).length > 2 ? ` +${(course.leadership_targets ?? []).length - 2} more` : ""}`
                  : "Available to all leaders"}
              </div>
            )}

            <Link
              href={ctaHref}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors",
                completed
                  ? "border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50"
                  : "bg-black text-white hover:bg-zinc-800"
              )}
            >
              {cta}
            </Link>
          </div>
        </CardContent>
      </div>
    </motion.article>
  );
}

function RequiredSection({ courses }: { courses: CourseWithProgress[] }) {
  if (!courses.length) return null;
  return (
    <motion.section variants={shellItem} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-rose-600" />
          <h2 className="font-heading text-lg font-semibold text-zinc-950">
            Required for your role
          </h2>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
          {courses.length} course{courses.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </motion.section>
  );
}

function PathwaySection({ courses, userRole }: { courses: CourseWithProgress[]; userRole: string }) {
  if (!courses.length) return null;
  return (
    <motion.section variants={shellItem} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-violet-600" />
          <h2 className="font-heading text-lg font-semibold text-zinc-950">
            Your Leadership Pathway
          </h2>
        </div>
        {userRole ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {userRole}
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </motion.section>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogCourses | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  useEffect(() => {
    fetchCourseCatalog()
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isCreator = CREATOR_ROLES.includes(catalog?.userRole ?? "");
  const allCourses = catalog?.all ?? [];
  const required = catalog?.required ?? [];
  const pathway = catalog?.pathway ?? [];

  const filtered = allCourses.filter((c) => {
    if (activeTab === "in-progress") return c.enrolled && !c.certificate;
    if (activeTab === "completed") return Boolean(c.certificate);
    return true;
  });

  const enrolledCount = allCourses.filter((c) => c.enrolled).length;
  const completedCount = allCourses.filter((c) => c.certificate).length;

  const stats = [
    { label: "Available courses", value: String(allCourses.length), detail: "Filtered for your role" },
    { label: "Enrolled", value: String(enrolledCount), detail: "Active learning tracks" },
    { label: "Completed", value: String(completedCount), detail: "Certificates earned" },
  ];

  return (
    <DashboardShell searchPlaceholder="Search courses, tracks, instructors..." showDate={false}>
      {/* Hero */}
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              Course library
            </Badge>
            <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Leadership Growth Tracks
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
              Equip leaders across Harvesters with world-class ministry intelligence.
            </p>
            {isCreator && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/courses/new")}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                New course
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
                    <div className="h-3 w-24 rounded bg-zinc-200" />
                    <div className="mt-3 h-7 w-12 rounded bg-zinc-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-zinc-200" />
                  </div>
                ))
              : stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                      {stat.label}
                    </p>
                    <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
                  </div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <motion.section variants={shellItem} className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "h-9 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.section>

      {/* Content */}
      {loading ? (
        <motion.div variants={shellItem} className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={shellItem}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20"
        >
          <GraduationCap className="size-10 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-500">
            {activeTab === "in-progress"
              ? "No courses in progress"
              : activeTab === "completed"
              ? "No completed courses yet"
              : "No courses available"}
          </p>
          {activeTab === "all" && isCreator && (
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/courses/new")}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              Create your first course
            </button>
          )}
        </motion.div>
      ) : activeTab === "all" ? (
        <motion.div variants={shellContainer} className="space-y-8">
          <RequiredSection courses={required} />
          <PathwaySection courses={pathway} userRole={catalog?.userRole ?? ""} />
          {(required.length > 0 || pathway.length > 0) && (
            <motion.div variants={shellItem} className="space-y-3">
              <h2 className="font-heading text-lg font-semibold text-zinc-950">All Courses</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </motion.div>
          )}
          {required.length === 0 && pathway.length === 0 && (
            <motion.div variants={shellContainer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={shellContainer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </motion.div>
      )}
    </DashboardShell>
  );
}

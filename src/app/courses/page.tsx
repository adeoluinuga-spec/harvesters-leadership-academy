"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";

import {
  DashboardShell,
  shellContainer,
  shellItem,
} from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Course,
  courses,
  recentlyWatched,
  recommendedCourses,
} from "@/lib/course-data";

const libraryStats = [
  { label: "Total courses", value: "64", detail: "12 growth tracks" },
  { label: "Active learners", value: "8,420", detail: "+18% this month" },
  { label: "Completion stats", value: "84%", detail: "network average" },
];

const tabs = ["All Courses", "In Progress", "Completed", "Saved"];

const filters = [
  { label: "Leadership Level", value: "All levels" },
  { label: "Category", value: "Ministry systems" },
  { label: "Duration", value: "Any length" },
  { label: "Status", value: "All statuses" },
];

function LibraryHero() {
  return (
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
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {libraryStats.map((stat) => (
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
  );
}

function CourseControls() {
  return (
    <motion.section variants={shellItem} className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={cn(
              "h-9 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all",
              index === 0
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filters.map((filter) => (
          <button
            key={filter.label}
            className="flex h-12 items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 text-left shadow-sm transition-colors hover:border-zinc-300"
          >
            <span>
              <span className="block text-xs text-zinc-400">{filter.label}</span>
              <span className="block text-sm font-medium text-zinc-800">{filter.value}</span>
            </span>
            <ChevronDown className="size-4 text-zinc-400" />
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function CourseCard({ course }: { course: Course }) {
  const completed = course.status === "completed";
  const inProgress = course.status === "in-progress";
  const cta = completed ? "View Certificate" : inProgress ? "Continue" : "Enrol now";

  return (
    <motion.article variants={shellItem} whileHover={{ y: -4 }} className="h-full">
      <Card className="h-full rounded-xl border-zinc-200 bg-white p-0 shadow-sm transition-shadow hover:shadow-xl hover:shadow-zinc-200/70">
        <Link href={`/courses/${course.id}`} className="group relative block aspect-[16/10] overflow-hidden rounded-t-xl bg-zinc-900">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${course.thumbnail})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <Badge className="absolute left-4 top-4 rounded-md border-white/15 bg-white/90 text-zinc-900 hover:bg-white">
            {course.category}
          </Badge>
          {completed ? (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white">
              <CheckCircle2 className="size-3.5" />
              Completed
            </div>
          ) : (
            <span className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-white backdrop-blur transition-colors group-hover:bg-black/55">
              <Bookmark className="size-4" />
            </span>
          )}
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
            <p className="text-sm font-medium text-zinc-950">{course.instructor}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {course.lessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {course.duration}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {course.enrolled}
              </span>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {course.status !== "not-enrolled" ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Progress</span>
                  <span className="font-semibold text-zinc-900">{course.progress}%</span>
                </div>
                <Progress
                  value={course.progress}
                  className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                Recommended for your leadership pathway
              </div>
            )}

            <Button
              asChild
              className={cn(
                "h-10 w-full rounded-lg",
                completed
                  ? "border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50"
                  : "bg-black text-white hover:bg-zinc-800"
              )}
            >
              <Link href={`/courses/${course.id}`}>{cta}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

function CourseGrid() {
  return (
    <motion.section variants={shellContainer} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </motion.section>
  );
}

function RecommendedSection() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Recommended courses
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Curated for Harvesters leadership development pathways
              </p>
            </div>
            <Star className="size-5 text-zinc-400" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-3">
          {recommendedCourses.map((course) => (
            <div
              key={course.title}
              className="group overflow-hidden rounded-lg border border-zinc-100 bg-white"
            >
              <div className="relative h-32 overflow-hidden bg-zinc-900">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${course.thumbnail})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <Badge className="absolute left-3 top-3 rounded-md bg-white/90 text-zinc-900 hover:bg-white">
                  {course.category}
                </Badge>
              </div>
              <div className="p-4">
                <p className="font-heading font-medium leading-snug text-zinc-950">{course.title}</p>
                <p className="mt-2 text-sm text-zinc-500">{course.duration}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

function RecentlyWatched() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Recently watched</CardTitle>
          <p className="text-sm text-zinc-400">Resume learning where your leaders paused</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recentlyWatched.map((lesson) => (
            <div key={lesson.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <PlayCircle className="size-4" />
                </div>
                <span className="text-xs text-zinc-400">{lesson.progress}%</span>
              </div>
              <p className="min-h-12 text-sm font-medium leading-6">{lesson.title}</p>
              <Progress
                value={lesson.progress}
                className="mt-4 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-white"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function CoursesPage() {
  return (
    <DashboardShell searchPlaceholder="Search courses, tracks, instructors..." showDate={false}>
      <LibraryHero />
      <CourseControls />
      <CourseGrid />
      <RecommendedSection />
      <RecentlyWatched />
    </DashboardShell>
  );
}

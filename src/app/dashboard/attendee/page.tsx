"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, PlayCircle, Sparkles, Trophy, Users } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurrentUserProfile } from "@/lib/auth";
import { fetchCourseCatalog } from "@/lib/lms";
import type { CourseWithProgress } from "@/lib/lms-types";
import { formatDuration } from "@/lib/lms-types";

function initials(value: string | null | undefined) {
  if (!value) return "A";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AttendeeDashboardContent() {
  const [profileName, setProfileName] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const profileResult = await getCurrentUserProfile();
        if (!active) return;
        if (profileResult.profile) {
          setProfileName(profileResult.profile.fullName || profileResult.profile.email || "Attendee");
        }

        const catalog = await fetchCourseCatalog();
        if (!active) return;
        setCourses(catalog.all ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "We could not load your learning dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const inProgressCourses = useMemo(() => courses.filter((course) => course.enrolled && course.progress_percent > 0 && !course.certificate), [courses]);
  const completedCourses = useMemo(() => courses.filter((course) => Boolean(course.certificate)), [courses]);

  return (
    <DashboardShell searchPlaceholder="Search learning, pathways, and progress..." showDate={false}>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="mb-3 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">Attendee dashboard</Badge>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Welcome back, {profileName ?? "there"}.</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Your learning journey is here. Continue your current courses, review your completed work, and stay connected to the academy experience.
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
              {initials(profileName)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="border-zinc-200 bg-zinc-50/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-zinc-600">
                  <BookOpen className="size-4" />
                  <span className="text-sm font-medium">Enrolled</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{courses.filter((course) => course.enrolled).length}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 bg-zinc-50/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-zinc-600">
                  <PlayCircle className="size-4" />
                  <span className="text-sm font-medium">In progress</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{inProgressCourses.length}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 bg-zinc-50/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Trophy className="size-4" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{completedCourses.length}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-lg font-semibold text-zinc-950">Recommended next step</CardTitle>
          </CardHeader>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold">Keep momentum</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Pick up the course you last viewed and continue building your leadership pathway.
            </p>
            <Link href="/courses" className="mt-4 inline-flex items-center rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Browse courses
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Your learning list</h2>
            <p className="mt-1 text-sm text-zinc-600">Continue what you have started and revisit completed content.</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">Loading your learning list...</div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : courses.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-600">
            No courses are available yet. Once courses are published, they will appear here.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {courses.slice(0, 6).map((course) => {
              const completed = Boolean(course.certificate);
              const progress = Math.max(course.progress_percent ?? 0, completed ? 100 : 0);
              return (
                <div key={course.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{course.title}</p>
                      <p className="mt-1 text-sm text-zinc-600">{course.instructor_name}</p>
                    </div>
                    <Badge className="rounded-full border-zinc-200 bg-white text-zinc-700 hover:bg-white">{completed ? "Completed" : course.enrolled ? "In progress" : "Open"}</Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1"><GraduationCap className="size-3.5" /> {course.total_lessons} lessons</span>
                    <span className="flex items-center gap-1"><Users className="size-3.5" /> {course.enrolled ? "Enrolled" : "Available"}</span>
                    {course.duration_minutes > 0 ? <span>{formatDuration(course.duration_minutes)}</span> : null}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-zinc-950" />
                  </div>
                  <div className="mt-4">
                    <Link href={completed ? `/courses/${course.slug}/certificate` : course.enrolled ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`} className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                      {completed ? "View certificate" : course.enrolled ? "Continue" : "Open course"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

export default function AttendeeDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Attendee", "Member", "Worker"]}>
      <AttendeeDashboardContent />
    </ProtectedRoute>
  );
}

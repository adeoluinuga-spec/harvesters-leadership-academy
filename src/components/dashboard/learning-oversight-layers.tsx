"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Compass,
  LineChart,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import { shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { recommendedCourses, recentlyWatched } from "@/lib/course-data";
import { AuthProfile, getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/client";
import { MockRole } from "@/lib/mock-auth";
import { fetchCoursesWithProgress } from "@/lib/lms";
import type { CourseWithProgress } from "@/lib/lms-types";
import { motion } from "framer-motion";

type LearningMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

const learningMetrics: LearningMetric[] = [
  {
    label: "Assessments",
    value: "2 pending",
    detail: "Next leadership readiness check due this week",
    icon: ClipboardCheck,
  },
  {
    label: "Certificates",
    value: "3 earned",
    detail: "1 certificate close to completion",
    icon: Award,
  },
  {
    label: "Growth pathway",
    value: "Level 4",
    detail: "Building toward next leadership responsibility",
    icon: Compass,
  },
  {
    label: "Course progress",
    value: "62%",
    detail: "Quarterly personal learning pace",
    icon: LineChart,
  },
];

const roleContext: Record<MockRole, string> = {
  "Platform Super Admin": "platform-wide tenant governance, AI systems, white-label readiness, and global course architecture",
  "Cell Leader / Assistant HOD": "the cell members you influence and the ministry habits you are forming",
  "Zonal Leader / HOD": "zonal leadership, team development, and readiness signals",
  "Community Leader": "community leadership health, leader maturity, and participation patterns",
  "Area Leader": "area leadership health, community comparison, and follow-up intelligence",
  "District Pastor / Pastoral Leader": "pastoral oversight, district health, and leader care signals",
  "Directional Leader": "directional oversight, pastoral reporting, and leadership pipeline intelligence",
  "Campus Pastor": "campus participation, inactive leaders, mentorship, and leadership-team performance",
  "Sub-Group Pastor": "sub-group health, campus comparisons, leadership performance, and participation trends",
  "Group Pastor": "group-wide ministry intelligence, sub-group analytics, pipeline visibility, and campus growth",
  "Campus Admin": "campus operations, enrollment management, and campus-level learning analytics",
  "Super Admin": "platform-wide tenant governance, AI systems, white-label readiness, and global course architecture",
  Leader: "the leaders you influence and the ministry habits you are forming",
  "Sub-group Pastor": "sub-group health, campus comparisons, leadership performance, and participation trends",
  "Subgroup Pastor": "sub-group health, campus comparisons, leadership performance, and participation trends",
  Admin: "platform-wide tenant governance, AI systems, white-label readiness, and global course architecture",
};

export function PersonalLearningLayer({ role }: { role: MockRole }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithProgress[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [profileResult, courses] = await Promise.all([
        getCurrentUserProfile(),
        fetchCoursesWithProgress(),
      ]);
      if (!active) return;

      if (profileResult.profile) {
        let resolved = profileResult.profile;

        // Explicit campus name resolution — do not rely on getAuthProfile join result
        if (resolved.campusId && !resolved.campus) {
          const supabase = createClient();
          const { data: campusRow } = await supabase
            .from("campuses")
            .select("name")
            .eq("id", resolved.campusId)
            .maybeSingle<{ name: string | null }>();
          if (campusRow?.name) {
            resolved = { ...resolved, campus: campusRow.name };
          }
        }

        if (active) setProfile(resolved);
      }

      if (active) setEnrolledCourses(courses.filter((c) => c.enrolled));
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const activeCourse = enrolledCourses[0] ?? null;

  const effectiveRole = profile?.role ?? role;
  const currentRole = profile?.currentLeadershipRole ?? effectiveRole;
  const aspiration = profile?.leadershipAspiration ?? "your next leadership step";
  const aiInsight = activeCourse
    ? `As a ${effectiveRole} preparing for ${aspiration}, prioritize ${activeCourse.title} alongside ${roleContext[effectiveRole as MockRole] ?? roleContext["Leader"]}.`
    : `As a ${effectiveRole} preparing for ${aspiration}, explore the course library to begin your leadership growth journey.`;

  return (
    <motion.section variants={shellItem} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-3 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Personal learning layer
          </Badge>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-zinc-950">
            Your leadership growth continues here
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            All leaders are learners. Some leaders also carry oversight responsibility, and this layer stays personal to you.
          </p>
        </div>
        <Badge className="w-fit rounded-md bg-black px-3 py-1.5 text-white hover:bg-black">
          Learner profile: {currentRole}
        </Badge>
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardContent className="grid gap-3 pt-1 md:grid-cols-3">
          {[
            ["Current leadership role", currentRole],
            ["Leadership aspiration", aspiration],
            ["Learning context", profile?.campus || (profile?.campusId ? "" : "Campus not assigned")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                {label}
              </p>
              <p className="font-heading mt-2 font-semibold text-zinc-950">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">Continue learning</CardTitle>
            <p className="text-sm text-zinc-500">
              Current course for your {aspiration} pathway
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-1 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-lg border border-zinc-100 p-4">
              <BookOpenCheck className="mb-4 size-5 text-zinc-500" />
              {activeCourse ? (
                <>
                  <p className="font-heading text-lg font-semibold text-zinc-950">{activeCourse.title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{activeCourse.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{activeCourse.category}</span>
                    <span className="font-semibold text-zinc-950">{activeCourse.progress_percent}% complete</span>
                  </div>
                  <Progress
                    value={activeCourse.progress_percent}
                    className="mt-2 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                  />
                  <Link
                    href={`/courses/${activeCourse.slug}`}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    Continue
                    <ChevronRight className="size-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-heading text-lg font-semibold text-zinc-950">No courses started yet</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">Browse the course library to begin your leadership growth journey.</p>
                  <Link
                    href="/courses"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    Browse courses
                    <ChevronRight className="size-4" />
                  </Link>
                </>
              )}
            </div>

            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <Brain className="mb-4 size-5 text-zinc-600" />
              <p className="font-heading font-semibold text-zinc-950">AI learning insights</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{aiInsight}</p>
              <div className="mt-4 rounded-lg bg-white p-3 text-xs leading-5 text-zinc-500">
                AI adapts to your current role, leadership aspiration, oversight responsibilities, and learning history.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold">Recommended courses</CardTitle>
            <p className="text-sm text-zinc-500">Personalized next steps</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {recommendedCourses.map((course) => (
              <div key={course.title} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="font-medium text-zinc-950">{course.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {course.category} - {course.duration}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {learningMetrics.map((metric) => (
          <Card key={metric.label} className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                  {metric.label}
                </p>
                <CardTitle className="font-heading mt-3 text-2xl font-semibold text-zinc-950">
                  {metric.value}
                </CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <metric.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-zinc-500">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold">Recent learning activity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-3">
          {recentlyWatched.slice(0, 3).map((item) => (
            <div key={item.title} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-zinc-950">{item.title}</p>
                <CalendarCheck className="size-4 shrink-0 text-zinc-400" />
              </div>
              <Progress
                value={item.progress}
                className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
              />
              <p className="mt-2 text-xs text-zinc-500">{item.progress}% watched</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export function OversightLayerIntro({
  title,
  description,
  modules,
}: {
  title: string;
  description: string;
  modules: string[];
}) {
  return (
    <motion.section variants={shellItem} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <Badge className="mb-3 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
        Oversight intelligence layer
      </Badge>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-zinc-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <Badge key={module} className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
              <Target className="size-3.5" />
              {module}
            </Badge>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

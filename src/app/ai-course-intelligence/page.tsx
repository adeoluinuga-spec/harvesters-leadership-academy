"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";

import { DashboardShell, shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/client";

type GenerationRow = {
  id: string;
  source_type: string | null;
  source_url: string | null;
  generated_payload: {
    course_title?: string;
    course_category?: string;
    difficulty_level?: string;
    modules?: unknown[];
    assessment_strategy?: {
      final_assessment_questions?: unknown[];
    };
    _published_course_id?: string;
  } | null;
  created_at: string | null;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  is_published: boolean | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AiCourseIntelligencePage() {
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIntelligence() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      try {
        const [generationRes, courseRes] = await Promise.all([
          supabase
            .from("ai_course_generations")
            .select("id, source_type, source_url, generated_payload, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("courses")
            .select("id, slug, title, status, is_published, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (!active) return;
        if (generationRes.error) throw generationRes.error;
        if (courseRes.error) throw courseRes.error;
        setGenerations((generationRes.data ?? []) as GenerationRow[]);
        setCourses((courseRes.data ?? []) as CourseRow[]);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load AI course intelligence.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadIntelligence();

    return () => {
      active = false;
    };
  }, []);

  const publishedGenerationIds = useMemo(
    () => generations.filter((generation) => generation.generated_payload?._published_course_id).length,
    [generations]
  );
  const moduleCount = useMemo(
    () => generations.reduce((sum, generation) => sum + (generation.generated_payload?.modules?.length ?? 0), 0),
    [generations]
  );
  const assessmentCount = useMemo(
    () =>
      generations.reduce(
        (sum, generation) =>
          sum + (generation.generated_payload?.assessment_strategy?.final_assessment_questions?.length ?? 0),
        0
      ),
    [generations]
  );

  const heroStats = [
    { label: "AI runs", value: generations.length.toLocaleString() },
    { label: "Published from AI", value: publishedGenerationIds.toLocaleString() },
    { label: "Generated modules", value: moduleCount.toLocaleString() },
    { label: "Assessment items", value: assessmentCount.toLocaleString() },
  ];

  return (
    <DashboardShell searchPlaceholder="Search AI insights, transcripts, scriptures..." showDate={false}>
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              AI Course Intelligence
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Turn ministry teachings into trackable academy courses
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500">
              This view now reflects real AI course-generation activity, generated course structure,
              and publishing movement from the academy database.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-10 rounded-lg bg-black px-4 text-white hover:bg-zinc-800">
                <Link href="/dashboard/admin/ai-course-builder">
                  <Bot className="size-4" />
                  Generate course
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-lg border-zinc-200 bg-white px-4">
                <Link href="/courses">
                  View course library
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#0b0b0b] p-5 text-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white text-black">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-heading font-semibold">Live intelligence</p>
                <p className="text-sm text-zinc-400">Generated from saved AI course activity</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                  <p className="font-heading mt-2 text-2xl font-semibold">{loading ? "..." : stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {error ? (
        <motion.section variants={shellItem} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </motion.section>
      ) : null}

      {loading ? (
        <motion.section variants={shellItem} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Loading AI course intelligence...
        </motion.section>
      ) : null}

      {!loading && !error ? (
        <>
          <motion.section variants={shellContainer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Generation records", value: generations.length, icon: Bot },
              { label: "Generated courses", value: courses.length, icon: GraduationCap },
              { label: "Modules drafted", value: moduleCount, icon: BookOpenCheck },
              { label: "Assessment questions", value: assessmentCount, icon: CheckCircle2 },
            ].map((metric) => (
              <motion.div key={metric.label} variants={shellItem}>
                <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{metric.label}</p>
                      <CardTitle className="font-heading mt-3 text-3xl font-semibold text-zinc-950">
                        {metric.value.toLocaleString()}
                      </CardTitle>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                      <metric.icon className="size-5" />
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.section>

          <motion.section variants={shellItem} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-lg font-semibold">Recent AI generations</CardTitle>
                <p className="text-sm text-zinc-500">Saved transcript analysis and course-generation output</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                {generations.map((generation) => (
                  <div key={generation.id} className="rounded-lg border border-zinc-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-heading font-semibold text-zinc-950">
                          {generation.generated_payload?.course_title ?? "Untitled generated course"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {generation.source_type ?? "Unknown source"} - {formatDate(generation.created_at)}
                        </p>
                      </div>
                      <Badge className="w-fit rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                        {generation.generated_payload?._published_course_id ? "Published" : "Draft output"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {[
                        ["Category", generation.generated_payload?.course_category ?? "Not set"],
                        ["Level", generation.generated_payload?.difficulty_level ?? "Not set"],
                        ["Modules", String(generation.generated_payload?.modules?.length ?? 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-xs text-zinc-400">{label}</p>
                          <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {generations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                    No AI course generations have been saved yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <CardTitle className="font-heading text-lg font-semibold">Recent course outputs</CardTitle>
                <p className="text-sm text-zinc-500">Latest courses available in the academy catalog</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                {courses.map((course) => (
                  <Link key={course.id} href={`/courses/${course.slug}`} className="block rounded-lg border border-zinc-100 p-4 transition-colors hover:bg-zinc-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-950">{course.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{formatDate(course.created_at)}</p>
                      </div>
                      <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                        {course.is_published ? "Published" : course.status ?? "Draft"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {courses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                    No courses are available yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section variants={shellItem}>
            <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">Operational note</CardTitle>
                <p className="text-sm text-zinc-400">
                  The AI builder is the source of generated course intelligence. Run a generation, review it, then publish it into the LMS.
                </p>
              </CardHeader>
              <CardContent>
                <Button asChild className="h-10 rounded-lg bg-white px-4 text-black hover:bg-zinc-100">
                  <Link href="/dashboard/admin/ai-course-builder">
                    <FileText className="size-4" />
                    Open AI course builder
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.section>
        </>
      ) : null}
    </DashboardShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUserAttempts } from "@/lib/lms";

type Attempt = Awaited<ReturnType<typeof fetchUserAttempts>>[number];

export default function AssessmentsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAttempts()
      .then(setAttempts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const passed = attempts.filter((a) => a.passed);
  const failed = attempts.filter((a) => !a.passed);

  return (
    <DashboardShell searchPlaceholder="Search assessments..." showDate={false}>
      <motion.section variants={shellItem} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 md:p-8">
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Assessments
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Your Assessment History
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
            Track your quiz performance and course readiness across all ministry learning tracks.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total attempts", value: attempts.length, detail: "across all courses" },
              { label: "Passed", value: passed.length, detail: `${attempts.length > 0 ? Math.round((passed.length / attempts.length) * 100) : 0}% pass rate` },
              { label: "Best score", value: attempts.length > 0 ? `${Math.max(...attempts.map((a) => a.score))}%` : "—", detail: "highest recorded" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{stat.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Attempt history
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {loading ? "Loading..." : attempts.length === 0 ? "No assessments taken yet." : `${attempts.length} attempt${attempts.length !== 1 ? "s" : ""} recorded`}
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-100">
            {loading ? (
              <div className="py-8 text-center text-sm text-zinc-400">Loading assessment history...</div>
            ) : attempts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-zinc-100">
                  <ClipboardCheck className="size-6 text-zinc-400" />
                </div>
                <p className="font-heading font-semibold text-zinc-950">No assessments yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Complete a course to unlock its assessment.
                </p>
                <Button asChild className="mt-5 rounded-lg bg-black text-white hover:bg-zinc-800">
                  <Link href="/courses">Browse courses</Link>
                </Button>
              </div>
            ) : (
              attempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-10 items-center justify-center rounded-full ${
                        attempt.passed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                      }`}
                    >
                      {attempt.passed ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-950">
                        {attempt.course?.title ?? "Unknown course"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {new Date(attempt.attempted_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-heading text-lg font-semibold text-zinc-950">{attempt.score}%</p>
                      <Badge
                        className={
                          attempt.passed
                            ? "rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "rounded-md bg-red-100 text-red-700 hover:bg-red-100"
                        }
                      >
                        {attempt.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    {attempt.course?.slug ? (
                      <Button asChild variant="outline" size="sm" className="rounded-lg border-zinc-200 bg-white">
                        <Link href={`/courses/${attempt.course.slug}/learn`}>Open course</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.section>

      {failed.length > 0 ? (
        <motion.section variants={shellItem}>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                Courses to retry
              </CardTitle>
              <p className="text-sm text-zinc-500">Keep studying — you can retake these assessments</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {failed.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-4">
                  <div>
                    <p className="font-medium text-zinc-950">{attempt.course?.title ?? "Course"}</p>
                    <p className="mt-1 text-sm text-zinc-500">Last score: {attempt.score}%</p>
                  </div>
                  {attempt.course?.slug ? (
                    <Button asChild size="sm" className="rounded-lg bg-black text-white hover:bg-zinc-800">
                      <Link href={`/courses/${attempt.course.slug}/learn`}>Retry</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      ) : null}
    </DashboardShell>
  );
}

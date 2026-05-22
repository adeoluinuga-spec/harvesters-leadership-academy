"use client";

import { use, useEffect, useOptimistic, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Lock,
  MessageSquareText,
  Sparkles,
  Unlock,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { courses as staticCourses, recommendedCourses } from "@/lib/course-data";
import { fetchCourseWithLessons } from "@/lib/lms";
import { VideoPlayer } from "@/components/lms/video-player";
import { AssessmentModal } from "@/components/lms/assessment-modal";
import type { CourseWithLessons, LMSLesson } from "@/lib/lms-types";
import { formatSeconds } from "@/lib/lms-types";

type CourseLearnPageProps = {
  params: Promise<{ id: string }>;
};

const tabs = ["Overview", "Notes", "Transcript", "Resources", "AI Insights"];

const staticAiInsights = [
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

export default function CourseLearnPage({ params }: CourseLearnPageProps) {
  const { id } = use(params);
  const staticCourse = staticCourses.find((item) => item.id === id) ?? staticCourses[0];

  const [live, setLive] = useState<CourseWithLessons | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("AI Insights");
  const [showAssessment, setShowAssessment] = useState(false);
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [optimisticCompleted, addOptimisticCompleted] = useOptimistic(
    new Set<string>(),
    (state, lessonId: string) => new Set([...state, lessonId])
  );

  useEffect(() => {
    fetchCourseWithLessons(id)
      .then((data) => {
        if (data) {
          setLive(data);
          if (data.certificate) {
            setCertNumber(data.certificate.certificate_number);
          }
          // Set first incomplete lesson as current
          const firstIncomplete = data.lessons.find((l) => !data.completed_lesson_ids.has(l.id));
          setCurrentLessonId(firstIncomplete?.id ?? data.lessons[0]?.id ?? null);
        }
      })
      .catch(() => {});
  }, [id]);

  const lessons: LMSLesson[] = live?.lessons ?? [];
  const completedIds = new Set([...(live?.completed_lesson_ids ?? []), ...optimisticCompleted]);
  const totalLessons = lessons.length || staticCourse.lessons;
  const completedCount = completedIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : live?.progress_percent ?? staticCourse.progress;
  const assessmentReadyPercent = live?.assessment ? 90 : 100;
  const readyForAssessment = progressPercent >= assessmentReadyPercent;
  const hasCertificate = Boolean(live?.certificate || certNumber);
  const canTakeAssessment = readyForAssessment && live?.assessment && !live.best_attempt?.passed;

  const currentLesson = lessons.find((l) => l.id === currentLessonId) ?? lessons[0] ?? null;

  function selectLesson(lesson: LMSLesson) {
    if (!completedIds.has(lesson.id) && !canAccessLesson(lesson, lessons, completedIds)) return;
    setCurrentLessonId(lesson.id);
  }

  async function markComplete(lesson: LMSLesson) {
    if (!live?.id || completedIds.has(lesson.id)) return;
    addOptimisticCompleted(lesson.id);

    try {
      const res = await fetch("/api/lms/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lesson.id, course_id: live.id, completed: true }),
      });
      const json = await res.json() as { certificate?: { certificate_number: string }; assessment_required?: boolean };
      if (json.certificate?.certificate_number) {
        setCertNumber(json.certificate.certificate_number);
      }
      if (json.assessment_required) {
        setShowAssessment(true);
      }
      // Refresh live data
      fetchCourseWithLessons(id).then((data) => data && setLive(data)).catch(() => {});
    } catch {}
  }

  async function saveNote() {
    if (!currentLesson || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await fetch("/api/lms/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: currentLesson.id, course_id: live?.id ?? "", completed: false }),
      });
      setNoteText("");
    } catch {} finally {
      setSavingNote(false);
    }
  }

  const progressStats = [
    { label: "Overall course progress", value: `${progressPercent}%`, detail: `${completedCount} of ${totalLessons} lessons watched` },
    { label: "Lessons completed", value: String(completedCount), detail: `${totalLessons - completedCount} lessons remaining` },
    { label: "Assessment readiness", value: readyForAssessment ? "Ready" : `${progressPercent}%`, detail: readyForAssessment ? "Assessment available" : `Need ${assessmentReadyPercent}% to unlock` },
    { label: "Certificate eligibility", value: hasCertificate ? "Earned" : "Pending", detail: hasCertificate ? "Certificate issued" : "Complete 90% to unlock" },
  ];

  return (
    <DashboardShell searchPlaceholder="Search lesson notes, transcript, resources..." showDate={false}>
      <AnimatePresence>
        {showAssessment && live?.assessment ? (
          <AssessmentModal
            assessment={live.assessment}
            courseId={live.id}
            courseSlug={id}
            onClose={() => setShowAssessment(false)}
            onCertificateEarned={(num) => {
              setCertNumber(num);
              setShowAssessment(false);
              fetchCourseWithLessons(id).then((data) => data && setLive(data)).catch(() => {});
            }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div variants={shellItem} className="flex items-center justify-between gap-4">
        <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
          <Link href={`/courses/${id}`}>
            <ArrowLeft className="size-4" />
            Course overview
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {hasCertificate ? (
            <Button asChild className="rounded-lg bg-black text-white hover:bg-zinc-800">
              <Link href={`/courses/${id}/certificate`}>
                <Award className="size-4" />
                View certificate
              </Link>
            </Button>
          ) : canTakeAssessment ? (
            <Button onClick={() => setShowAssessment(true)} className="rounded-lg bg-black text-white hover:bg-zinc-800">
              <ClipboardCheck className="size-4" />
              Take assessment
            </Button>
          ) : null}
          <Badge className="rounded-md border-zinc-200 bg-white text-zinc-700 hover:bg-white">
            AI-assisted learning session
          </Badge>
        </div>
      </motion.div>

      <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-xl border-zinc-200 bg-white p-0 shadow-sm">
            <VideoPlayer
              videoUrl={currentLesson?.video_url ?? null}
              lessonTitle={currentLesson?.title ?? "Ministry Leadership Session"}
              courseTitle={live?.title ?? staticCourse.title}
              checkpointQuestion={currentLesson?.checkpoint_question}
              progress={progressPercent}
            />
          </Card>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{live?.title ?? staticCourse.title}</p>
                  <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                    {currentLesson?.title ?? "Select a lesson"}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Instructor: {live?.instructor_name ?? staticCourse.instructor}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm lg:min-w-[360px]">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Progress</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">{progressPercent}%</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Duration</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">
                      {currentLesson ? formatSeconds(currentLesson.duration_seconds) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">Lessons</p>
                    <p className="font-heading mt-1 font-semibold text-zinc-950">{completedCount}/{totalLessons}</p>
                  </div>
                </div>
              </div>
              {currentLesson && !completedIds.has(currentLesson.id) ? (
                <div className="mt-5 flex gap-3">
                  <Button
                    onClick={() => markComplete(currentLesson)}
                    className="rounded-lg bg-black text-white hover:bg-zinc-800"
                  >
                    <CheckCircle2 className="size-4" />
                    Mark lesson complete
                  </Button>
                </div>
              ) : currentLesson && completedIds.has(currentLesson.id) ? (
                <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Lesson completed
                </div>
              ) : null}
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
            {lessons.length > 0
              ? lessons.map((lesson, idx) => {
                  const isCompleted = completedIds.has(lesson.id);
                  const isCurrent = lesson.id === currentLessonId;
                  const accessible = isCompleted || canAccessLesson(lesson, lessons, completedIds);

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => accessible && setCurrentLessonId(lesson.id)}
                      disabled={!accessible}
                      className={cn(
                        "w-full rounded-lg border p-4 text-left transition-all",
                        isCurrent
                          ? "border-black bg-zinc-950 text-white hover:bg-zinc-950"
                          : accessible
                          ? "border-zinc-100 bg-white text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50"
                          : "cursor-not-allowed border-zinc-100 bg-white text-zinc-400 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span
                            className={cn(
                              "font-heading flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                              isCurrent ? "bg-white text-black" : "bg-zinc-100 text-zinc-600"
                            )}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-sm font-medium leading-5">{lesson.title}</p>
                            <p className={cn("mt-1 text-xs", isCurrent ? "text-zinc-400" : "text-zinc-500")}>
                              {formatSeconds(lesson.duration_seconds)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {lesson.has_checkpoint ? <Bot className="size-4 text-emerald-500" /> : null}
                          {!accessible ? (
                            <Lock className="size-4 text-zinc-400" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <Unlock className="size-4 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              : // Static fallback lessons
                [
                  { number: "01", title: "The leader as a steward of spiritual culture", duration: "18:42", complete: true, locked: false, checkpoint: true, current: false },
                  { number: "02", title: "Decision clarity under ministry pressure", duration: "24:16", complete: false, locked: false, checkpoint: true, current: true },
                  { number: "03", title: "Leading teams through measurable rhythms", duration: "21:08", complete: false, locked: false, checkpoint: false, current: false },
                  { number: "04", title: "Coaching leaders with pastoral intelligence", duration: "28:33", complete: false, locked: true, checkpoint: true, current: false },
                  { number: "05", title: "Assessment readiness and certificate review", duration: "16:20", complete: false, locked: true, checkpoint: false, current: false },
                ].map((lesson) => (
                  <button
                    key={lesson.number}
                    disabled={lesson.locked}
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
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "h-9 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all",
                      activeTab === tab
                        ? "border-black bg-black text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              {activeTab === "AI Insights" && (
                <div className="grid gap-3 md:grid-cols-2">
                  {staticAiInsights.map((insight) => (
                    <div key={insight.title} className="rounded-lg border border-zinc-100 p-4">
                      <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                        <insight.icon className="size-4" />
                      </div>
                      <h3 className="font-heading font-semibold text-zinc-950">{insight.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">{insight.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "Transcript" && (
                <div className="py-2">
                  {currentLesson?.transcript ? (
                    <p className="text-sm leading-7 text-zinc-600 whitespace-pre-line">
                      {currentLesson.transcript}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      Transcript will appear here once the instructor uploads it.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "Notes" && (
                <div className="space-y-4 py-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a private note for this lesson..."
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    rows={4}
                  />
                  <Button
                    onClick={saveNote}
                    disabled={savingNote || !noteText.trim()}
                    size="sm"
                    className="rounded-lg bg-black text-white hover:bg-zinc-800"
                  >
                    Save note
                  </Button>
                </div>
              )}

              {activeTab === "Overview" && (
                <div className="py-2">
                  <p className="text-sm leading-7 text-zinc-600">
                    {currentLesson?.description ?? live?.description ?? staticCourse.description}
                  </p>
                </div>
              )}

              {activeTab === "Resources" && (
                <div className="py-2">
                  {currentLesson?.resources && currentLesson.resources.length > 0 ? (
                    <div className="space-y-2">
                      {currentLesson.resources.map((r, i) => (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 text-sm text-zinc-700 hover:border-zinc-300"
                        >
                          <Download className="size-4 text-zinc-400" />
                          {r.title}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">No resources attached to this lesson.</p>
                  )}
                </div>
              )}
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
                { label: "Add private note", icon: MessageSquareText, action: () => setActiveTab("Notes") },
                { label: "Open transcript", icon: FileText, action: () => setActiveTab("Transcript") },
                ...(canTakeAssessment
                  ? [{ label: "Take assessment", icon: ClipboardCheck, action: () => setShowAssessment(true) }]
                  : []),
                ...(hasCertificate
                  ? [{ label: "View certificate", icon: Award, action: undefined, href: `/courses/${id}/certificate` }]
                  : []),
              ].map((tool) =>
                tool.href ? (
                  <Button
                    key={tool.label}
                    asChild
                    variant="outline"
                    className="h-11 justify-start rounded-lg border-zinc-200 bg-white"
                  >
                    <Link href={tool.href}>
                      <tool.icon className="size-4" />
                      {tool.label}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    key={tool.label}
                    variant="outline"
                    onClick={tool.action}
                    className="h-11 justify-start rounded-lg border-zinc-200 bg-white"
                  >
                    <tool.icon className="size-4" />
                    {tool.label}
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </DashboardShell>
  );
}

function canAccessLesson(
  lesson: LMSLesson,
  allLessons: LMSLesson[],
  completedIds: Set<string>
): boolean {
  const idx = allLessons.findIndex((l) => l.id === lesson.id);
  if (idx === 0) return true;
  const previous = allLessons[idx - 1];
  return completedIds.has(previous.id);
}

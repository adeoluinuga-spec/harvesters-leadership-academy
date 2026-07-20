"use client";

import { use, useEffect, useMemo, useOptimistic, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileText,
  Lock,
  Menu,
  MessageSquareText,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";

import { AssessmentModal } from "@/components/lms/assessment-modal";
import { VideoPlayer } from "@/components/lms/video-player";
import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fetchCourseWithLessons } from "@/lib/lms";
import type { CourseWithLessons, LMSLesson, LMSModule } from "@/lib/lms-types";
import { formatSeconds } from "@/lib/lms-types";
import { cn } from "@/lib/utils";

type CourseLearnPageProps = {
  params: Promise<{ id: string }>;
};

type ModuleSection = {
  id: string;
  title: string;
  description: string | null;
  lessons: LMSLesson[];
};

const tabs = ["Overview", "Notes", "Transcript", "Resources", "AI Insights"];

export default function CourseLearnPage({ params }: CourseLearnPageProps) {
  const { id } = use(params);

  const [live, setLive] = useState<CourseWithLessons | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAssessment, setShowAssessment] = useState(false);
  const [showMobileOutline, setShowMobileOutline] = useState(false);
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
        if (!data) return;
        setLive(data);
        if (data.certificate) setCertNumber(data.certificate.certificate_number);
        const firstIncomplete = data.lessons.find((lesson) => !data.completed_lesson_ids.has(lesson.id));
        setCurrentLessonId(firstIncomplete?.id ?? data.lessons[0]?.id ?? null);
      })
      .catch(() => {});
  }, [id]);

  const lessons = live?.lessons ?? [];
  const completedIds = useMemo(
    () => new Set([...(live?.completed_lesson_ids ?? []), ...optimisticCompleted]),
    [live?.completed_lesson_ids, optimisticCompleted]
  );
  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) ?? lessons[0] ?? null;
  const currentIndex = currentLesson ? lessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1;

  const totalLessons = lessons.length;
  const completedCount = completedIds.size;
  const remainingCount = Math.max(totalLessons - completedCount, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : live?.progress_percent ?? 0;
  const assessmentReadyPercent = live?.assessment ? 90 : 100;
  const readyForAssessment = progressPercent >= assessmentReadyPercent;
  const hasCertificate = Boolean(live?.certificate || certNumber);
  const canTakeAssessment = readyForAssessment && live?.assessment && !live.best_attempt?.passed;

  const moduleSections = useMemo(
    () => buildModuleSections(live?.modules ?? [], lessons),
    [live?.modules, lessons]
  );

  function selectLesson(lesson: LMSLesson) {
    if (!completedIds.has(lesson.id) && !canAccessLesson(lesson, lessons, completedIds)) return;
    setCurrentLessonId(lesson.id);
    setShowMobileOutline(false);
  }

  async function refreshCourse() {
    fetchCourseWithLessons(id).then((data) => data && setLive(data)).catch(() => {});
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
      if (json.certificate?.certificate_number) setCertNumber(json.certificate.certificate_number);
      if (json.assessment_required) setShowAssessment(true);
      refreshCourse();
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

  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : null;
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

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
              refreshCourse();
            }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div variants={shellItem} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/courses/${id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="size-4" />
            Course overview
          </Link>
          <button
            type="button"
            onClick={() => setShowMobileOutline(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 lg:hidden"
          >
            <Menu className="size-4" />
            Course outline
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md border-zinc-200 bg-white text-zinc-700 hover:bg-white">
            {completedCount}/{totalLessons} lessons complete
          </Badge>
          {hasCertificate ? (
            <Link
              href={`/courses/${id}/certificate`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Award className="size-4" />
              View certificate
            </Link>
          ) : canTakeAssessment ? (
            <Button onClick={() => setShowAssessment(true)} className="rounded-lg bg-black text-white hover:bg-zinc-800">
              <ClipboardCheck className="size-4" />
              Take assessment
            </Button>
          ) : null}
        </div>
      </motion.div>

      <AnimatePresence>
        {showMobileOutline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2 }}
              className="h-full w-[min(92vw,380px)] overflow-y-auto bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
                <p className="font-heading font-semibold text-zinc-950">Course outline</p>
                <button
                  type="button"
                  onClick={() => setShowMobileOutline(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="size-4" />
                </button>
              </div>
              <CourseOutline
                sections={moduleSections}
                lessons={lessons}
                completedIds={completedIds}
                currentLessonId={currentLesson?.id ?? null}
                progressPercent={progressPercent}
                onSelectLesson={selectLesson}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.section variants={shellItem} className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-5">
            <CourseOutline
              sections={moduleSections}
              lessons={lessons}
              completedIds={completedIds}
              currentLessonId={currentLesson?.id ?? null}
              progressPercent={progressPercent}
              onSelectLesson={selectLesson}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden rounded-lg border-zinc-200 bg-white p-0 shadow-sm">
            <VideoPlayer
              videoUrl={currentLesson?.video_url ?? null}
              lessonTitle={currentLesson?.title ?? "Select a lesson"}
              courseTitle={live?.title ?? "Course"}
              checkpointQuestion={currentLesson?.checkpoint_question}
              progress={progressPercent}
            />
          </Card>

          <Card className="rounded-lg border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-500">{live?.title ?? "Course"}</p>
                  <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                    {currentLesson?.title ?? "Select a lesson"}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-500">
                    {currentLesson
                      ? `Lesson ${currentIndex + 1} of ${totalLessons} - ${formatSeconds(currentLesson.duration_seconds)}`
                      : "Choose a lesson from the course outline"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm xl:min-w-[360px]">
                  <Metric label="Progress" value={`${progressPercent}%`} />
                  <Metric label="Complete" value={`${completedCount}/${totalLessons}`} />
                  <Metric label="Remaining" value={String(remainingCount)} />
                </div>
              </div>

              <Progress value={progressPercent} className="mt-5 h-2 bg-zinc-100" />

              <div className="mt-5 flex flex-wrap gap-3">
                {currentLesson && !completedIds.has(currentLesson.id) ? (
                  <Button onClick={() => markComplete(currentLesson)} className="rounded-lg bg-black text-white hover:bg-zinc-800">
                    <CheckCircle2 className="size-4" />
                    Mark lesson complete
                  </Button>
                ) : currentLesson ? (
                  <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    Lesson completed
                  </div>
                ) : null}

                {previousLesson ? (
                  <Button variant="outline" onClick={() => selectLesson(previousLesson)} className="rounded-lg border-zinc-200 bg-white">
                    Previous lesson
                  </Button>
                ) : null}

                {nextLesson && canAccessLesson(nextLesson, lessons, completedIds) ? (
                  <Button variant="outline" onClick={() => selectLesson(nextLesson)} className="rounded-lg border-zinc-200 bg-white">
                    Next lesson
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="rounded-lg border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-zinc-100">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
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
              <CardContent className="min-h-[220px] p-5">
                <LessonTab
                  activeTab={activeTab}
                  currentLesson={currentLesson}
                  live={live}
                  noteText={noteText}
                  savingNote={savingNote}
                  onNoteChange={setNoteText}
                  onSaveNote={saveNote}
                />
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="rounded-lg border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg font-semibold">Certification</CardTitle>
                  <p className="text-sm text-zinc-400">
                    {readyForAssessment ? "You have unlocked the next step." : `Reach ${assessmentReadyPercent}% progress to unlock.`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={progressPercent} className="h-2 bg-white/15 [&_[data-slot=progress-indicator]]:bg-white" />
                  <div className="grid gap-2 text-sm">
                    <StatusRow label="Assessment" value={readyForAssessment ? "Ready" : "Locked"} />
                    <StatusRow label="Certificate" value={hasCertificate ? "Earned" : "Pending"} />
                  </div>
                  {canTakeAssessment ? (
                    <Button onClick={() => setShowAssessment(true)} className="w-full rounded-lg bg-white text-black hover:bg-zinc-100">
                      <ClipboardCheck className="size-4" />
                      Take assessment
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Learning tools</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <ToolButton icon={MessageSquareText} label="Private notes" onClick={() => setActiveTab("Notes")} />
                  <ToolButton icon={FileText} label="Transcript" onClick={() => setActiveTab("Transcript")} />
                  <ToolButton icon={Sparkles} label="AI insights" onClick={() => setActiveTab("AI Insights")} />
                  {hasCertificate ? (
                    <Link
                      href={`/courses/${id}/certificate`}
                      className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      <Award className="size-4" />
                      Certificate
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.section>
    </DashboardShell>
  );
}

function CourseOutline({
  sections,
  lessons,
  completedIds,
  currentLessonId,
  progressPercent,
  onSelectLesson,
}: {
  sections: ModuleSection[];
  lessons: LMSLesson[];
  completedIds: Set<string>;
  currentLessonId: string | null;
  progressPercent: number;
  onSelectLesson: (lesson: LMSLesson) => void;
}) {
  return (
    <Card className="rounded-lg border-zinc-200 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">Course outline</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">{completedIds.size} of {lessons.length} lessons complete</p>
          </div>
          <Badge className="rounded-md bg-zinc-950 text-white hover:bg-zinc-950">{progressPercent}%</Badge>
        </div>
        <Progress value={progressPercent} className="mt-3 h-2 bg-zinc-100" />
      </CardHeader>
      <CardContent className="max-h-[calc(100vh-190px)] overflow-y-auto p-0">
        {sections.length > 0 ? (
          sections.map((section, moduleIndex) => {
            const completedInModule = section.lessons.filter((lesson) => completedIds.has(lesson.id)).length;
            return (
              <details key={section.id} open className="border-b border-zinc-100 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-zinc-400">Module {moduleIndex + 1}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">{section.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {completedInModule}/{section.lessons.length} complete
                    </p>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-zinc-400" />
                </summary>
                <div className="pb-2">
                  {section.lessons.map((lesson) => {
                    const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
                    const isCompleted = completedIds.has(lesson.id);
                    const isCurrent = lesson.id === currentLessonId;
                    const accessible = isCompleted || canAccessLesson(lesson, lessons, completedIds);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson(lesson)}
                        disabled={!accessible}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                          isCurrent && "bg-zinc-950 text-white",
                          !isCurrent && accessible && "text-zinc-700 hover:bg-zinc-50",
                          !accessible && "cursor-not-allowed text-zinc-400 opacity-70"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                            isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                            isCurrent && !isCompleted && "border-white bg-white text-black",
                            !isCurrent && !isCompleted && accessible && "border-zinc-200 bg-white text-zinc-500",
                            !accessible && "border-zinc-200 bg-zinc-50 text-zinc-400"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="size-4" /> : lessonIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-5">{lesson.title}</span>
                          <span className={cn("mt-1 flex items-center gap-2 text-xs", isCurrent ? "text-zinc-300" : "text-zinc-500")}>
                            <PlayCircle className="size-3.5" />
                            {formatSeconds(lesson.duration_seconds)}
                            {lesson.has_checkpoint ? (
                              <>
                                <span>-</span>
                                <Bot className="size-3.5" />
                              </>
                            ) : null}
                          </span>
                        </span>
                        {!accessible ? <Lock className="mt-1 size-4 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <BookOpen className="size-10 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No lessons yet</p>
            <p className="mt-1 text-xs text-zinc-400">The outline will appear once lessons are added.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LessonTab({
  activeTab,
  currentLesson,
  live,
  noteText,
  savingNote,
  onNoteChange,
  onSaveNote,
}: {
  activeTab: string;
  currentLesson: LMSLesson | null;
  live: CourseWithLessons | null;
  noteText: string;
  savingNote: boolean;
  onNoteChange: (value: string) => void;
  onSaveNote: () => void;
}) {
  if (activeTab === "AI Insights") {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-center gap-2 text-zinc-700">
          <Sparkles className="size-4" />
          <p className="text-sm font-medium">AI insights</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          AI insights will appear here when an authorised instructor generates them for this lesson.
        </p>
      </div>
    );
  }

  if (activeTab === "Transcript") {
    return currentLesson?.transcript ? (
      <p className="text-sm leading-7 text-zinc-600 whitespace-pre-line">{currentLesson.transcript}</p>
    ) : (
      <p className="text-sm text-zinc-400">Transcript will appear here once the instructor uploads it.</p>
    );
  }

  if (activeTab === "Notes") {
    return (
      <div className="space-y-4">
        <textarea
          value={noteText}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add a private note for this lesson..."
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          rows={5}
        />
        <Button
          onClick={onSaveNote}
          disabled={savingNote || !noteText.trim()}
          size="sm"
          className="rounded-lg bg-black text-white hover:bg-zinc-800"
        >
          Save note
        </Button>
      </div>
    );
  }

  if (activeTab === "Resources") {
    return currentLesson?.resources && currentLesson.resources.length > 0 ? (
      <div className="space-y-2">
        {currentLesson.resources.map((resource, index) => (
          <a
            key={`${resource.url}-${index}`}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 text-sm text-zinc-700 hover:border-zinc-300"
          >
            <Download className="size-4 text-zinc-400" />
            {resource.title}
          </a>
        ))}
      </div>
    ) : (
      <p className="text-sm text-zinc-400">No resources attached to this lesson.</p>
    );
  }

  return (
    <p className="text-sm leading-7 text-zinc-600">
      {currentLesson?.description ?? live?.description ?? "No lesson overview is available yet."}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-heading mt-1 font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" onClick={onClick} className="h-11 justify-start rounded-lg border-zinc-200 bg-white">
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

function buildModuleSections(modules: LMSModule[], lessons: LMSLesson[]): ModuleSection[] {
  const moduleSections = modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessons: lessons.filter((lesson) => lesson.module_id === module.id),
  })).filter((section) => section.lessons.length > 0);

  const orphanLessons = lessons.filter((lesson) => !lesson.module_id);
  if (orphanLessons.length > 0) {
    moduleSections.push({
      id: "standalone-lessons",
      title: "Standalone lessons",
      description: null,
      lessons: orphanLessons,
    });
  }

  return moduleSections;
}

function canAccessLesson(
  lesson: LMSLesson,
  allLessons: LMSLesson[],
  completedIds: Set<string>
): boolean {
  const idx = allLessons.findIndex((item) => item.id === lesson.id);
  if (idx <= 0) return true;
  const previous = allLessons[idx - 1];
  return completedIds.has(previous.id);
}

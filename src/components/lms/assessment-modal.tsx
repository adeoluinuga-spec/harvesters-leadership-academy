"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LMSAssessment } from "@/lib/lms-types";

type AssessmentModalProps = {
  assessment: LMSAssessment;
  courseId: string;
  courseSlug: string;
  userAttemptCount?: number;
  onClose: () => void;
  onCertificateEarned: (certNumber: string) => void;
};

type SubmitResult = {
  score: number;
  passed: boolean;
  certificate?: { certificate_number: string };
  certificate_issued?: boolean;
  message?: string;
  error?: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AssessmentModal({
  assessment,
  courseId,
  courseSlug,
  userAttemptCount = 0,
  onClose,
  onCertificateEarned,
}: AssessmentModalProps) {
  const questions = assessment.questions ?? [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Timer state
  const totalSeconds = assessment.duration_minutes ? assessment.duration_minutes * 60 : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(totalSeconds);
  const startedAt = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attempt limit
  const maxAttempts = assessment.max_attempts ?? null;
  const attemptsLeft = maxAttempts !== null ? maxAttempts - userAttemptCount : null;
  const blocked = attemptsLeft !== null && attemptsLeft <= 0;

  // Start timer on mount (if duration is set)
  useEffect(() => {
    if (!totalSeconds) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[current];
  const answered = q
    ? q.question_type === "short_answer"
      ? typeof answers[q.id] === "string" && (answers[q.id] as string).trim().length > 0
      : answers[q.id] !== undefined
    : false;
  const isLast = current === questions.length - 1;

  function selectAnswer(value: number | string) {
    if (!q || result) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function next() {
    if (!isLast) setCurrent((c) => c + 1);
  }

  async function handleSubmit(autoSubmit = false) {
    if (submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    const timeTaken = Math.floor((Date.now() - startedAt.current) / 1000);

    try {
      const res = await fetch("/api/lms/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessment.id,
          course_id: courseId,
          answers,
          started_at: new Date(startedAt.current).toISOString(),
          time_taken_seconds: timeTaken,
          auto_submitted: autoSubmit,
        }),
      });
      const json = (await res.json()) as SubmitResult;
      setResult(json);
      if (json.passed && json.certificate?.certificate_number) {
        onCertificateEarned(json.certificate.certificate_number);
      }
    } catch {
      setResult({ score: 0, passed: false, message: "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const progressValue = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const timerUrgent = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        {/* Blocked: no attempts remaining */}
        {blocked ? (
          <div className="flex flex-col items-center p-10 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-red-100 text-red-500">
              <XCircle className="size-8" />
            </div>
            <h2 className="font-heading text-2xl font-semibold text-zinc-950">No attempts remaining</h2>
            <p className="mt-2 text-zinc-500">
              You have used all {maxAttempts} attempt{maxAttempts !== 1 ? "s" : ""} for this assessment.
            </p>
            <Button variant="outline" onClick={onClose} className="mt-7 rounded-lg border-zinc-200 bg-white">
              Back to course
            </Button>
          </div>
        ) : result ? (
          <ResultView result={result} courseSlug={courseSlug} onClose={onClose} />
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-zinc-100 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                    Course Assessment
                  </p>
                  <h2 className="font-heading mt-1 text-xl font-semibold text-zinc-950">
                    {assessment.title}
                  </h2>
                  {assessment.instructions ? (
                    <p className="mt-1 text-sm text-zinc-500">{assessment.instructions}</p>
                  ) : null}
                </div>
                <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600">
                  <XCircle className="size-5" />
                </button>
              </div>

              {/* Progress + timer row */}
              <div className="flex items-center gap-3">
                <Progress
                  value={progressValue}
                  className="flex-1 h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                />
                <span className="shrink-0 text-sm font-medium text-zinc-500">
                  {current + 1} / {questions.length}
                </span>
                {timeLeft !== null && (
                  <span
                    className={cn(
                      "flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums",
                      timerUrgent
                        ? "bg-red-100 text-red-600 animate-pulse"
                        : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    <Clock className="size-3" />
                    {formatTime(timeLeft)}
                  </span>
                )}
              </div>

              {/* Attempts info */}
              {attemptsLeft !== null && (
                <p className="mt-2 text-xs text-zinc-400">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining after this one
                </p>
              )}
            </div>

            {/* Question body */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="font-heading text-lg font-semibold leading-snug text-zinc-950">
                    {q?.question}
                  </p>

                  {/* MCQ options */}
                  {q?.question_type !== "short_answer" && (
                    <div className="mt-5 space-y-3">
                      {(q?.options ?? []).map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectAnswer(idx)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left text-sm font-medium transition-all",
                            answers[q.id] === idx
                              ? "border-black bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                          )}
                        >
                          <span
                            className={cn(
                              "mr-3 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                              answers[q.id] === idx ? "bg-white text-black" : "bg-zinc-100 text-zinc-600"
                            )}
                          >
                            {q.question_type === "true_false"
                              ? (idx === 0 ? "T" : "F")
                              : String.fromCharCode(65 + idx)}
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Short answer */}
                  {q?.question_type === "short_answer" && (
                    <div className="mt-5 space-y-2">
                      <textarea
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => selectAnswer(e.target.value)}
                        rows={4}
                        placeholder="Type your answer here..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none"
                      />
                      <p className="text-xs text-zinc-400">
                        Short answers are recorded for instructor review.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-3 border-t border-zinc-100 px-6 py-4">
              <div className="text-sm text-zinc-500">Passing score: {assessment.passing_score}%</div>
              {isLast ? (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={!answered || submitting}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Submit assessment
                </Button>
              ) : (
                <Button
                  onClick={next}
                  disabled={!answered}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800"
                >
                  Next question
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ResultView({
  result,
  courseSlug,
  onClose,
}: {
  result: SubmitResult;
  courseSlug: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center p-10 text-center">
      <div
        className={cn(
          "mb-5 flex size-16 items-center justify-center rounded-full",
          result.passed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
        )}
      >
        {result.passed ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
      </div>

      <h2 className="font-heading text-2xl font-semibold text-zinc-950">
        {result.passed ? "Assessment passed!" : "Not quite there yet"}
      </h2>
      <p className="mt-2 text-zinc-500">You scored {result.score}%</p>

      {result.error ? (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {result.error}
        </div>
      ) : null}

      {result.passed && result.certificate_issued ? (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Your certificate has been issued.{" "}
          <span className="font-semibold">{result.certificate?.certificate_number}</span>
        </div>
      ) : null}

      {result.message ? (
        <p className="mt-4 text-sm text-zinc-500">{result.message}</p>
      ) : null}

      <div className="mt-7 flex gap-3">
        {result.passed && result.certificate ? (
          <Button asChild className="rounded-lg bg-black text-white hover:bg-zinc-800">
            <a href={`/courses/${courseSlug}/certificate`}>View certificate</a>
          </Button>
        ) : null}
        <Button variant="outline" onClick={onClose} className="rounded-lg border-zinc-200 bg-white">
          {result.passed ? "Back to course" : "Try again later"}
        </Button>
      </div>
    </div>
  );
}

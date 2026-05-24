"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/lms-types";

// ── Types ──────────────────────────────────────────────────────────────────

type DraftQuestion = {
  id?: string;
  question: string;
  question_type: QuestionType;
  options: string[];
  correct_option: number;
  explanation: string;
  order_index: number;
};

type AssessmentDraft = {
  id?: string;
  course_id: string;
  title: string;
  passing_score: number;
  duration_minutes: number | null;
  max_attempts: number | null;
  instructions: string;
  is_required: boolean;
  questions: DraftQuestion[];
};

function emptyQuestion(orderIndex: number): DraftQuestion {
  return {
    question: "",
    question_type: "mcq",
    options: ["", "", "", ""],
    correct_option: 0,
    explanation: "",
    order_index: orderIndex,
  };
}

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200",
        className
      )}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none"
    />
  );
}

// ── Question Editor ────────────────────────────────────────────────────────

function QuestionEditor({
  q,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  q: DraftQuestion;
  index: number;
  total: number;
  onChange: (updated: DraftQuestion) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);

  function set<K extends keyof DraftQuestion>(key: K, value: DraftQuestion[K]) {
    onChange({ ...q, [key]: value });
  }

  function setOption(i: number, text: string) {
    const opts = [...q.options];
    opts[i] = text;
    set("options", opts);
  }

  function changeType(type: QuestionType) {
    const next: DraftQuestion = { ...q, question_type: type };
    if (type === "true_false") {
      next.options = ["True", "False"];
      next.correct_option = 0;
    } else if (type === "short_answer") {
      next.options = [];
      next.correct_option = 0;
    } else {
      next.options = q.options.length >= 2 ? q.options : ["", "", "", ""];
    }
    onChange(next);
  }

  const typeLabels: Record<QuestionType, string> = {
    mcq: "Multiple Choice",
    true_false: "True / False",
    short_answer: "Short Answer",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <GripVertical className="size-4 shrink-0 text-zinc-300" />
        <span className="min-w-[1.5rem] text-xs font-semibold text-zinc-400">Q{index + 1}</span>
        <span className="flex-1 truncate text-sm font-medium text-zinc-700">
          {q.question.trim() || "Untitled question"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-600"
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4">
              {/* Question type selector */}
              <Field label="Question type">
                <div className="flex gap-2">
                  {(["mcq", "true_false", "short_answer"] as QuestionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => changeType(t)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        q.question_type === t
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                      )}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Question text */}
              <Field label="Question">
                <Textarea
                  value={q.question}
                  onChange={(v) => set("question", v)}
                  placeholder="Enter your question..."
                  rows={2}
                />
              </Field>

              {/* MCQ options */}
              {q.question_type === "mcq" && (
                <Field label="Answer options" hint="Click the circle to mark the correct answer">
                  <div className="space-y-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => set("correct_option", i)}
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            q.correct_option === i
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-300 bg-white text-transparent hover:border-zinc-500"
                          )}
                        >
                          <CheckCircle2 className="size-3.5" />
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => setOption(i, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const opts = q.options.filter((_, idx) => idx !== i);
                              const newCorrect = i <= q.correct_option ? Math.max(0, q.correct_option - 1) : q.correct_option;
                              onChange({ ...q, options: opts, correct_option: newCorrect });
                            }}
                            className="text-zinc-300 hover:text-red-400"
                          >
                            <XCircle className="size-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => set("options", [...q.options, ""])}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        <Plus className="size-3.5" /> Add option
                      </button>
                    )}
                  </div>
                </Field>
              )}

              {/* True/False */}
              {q.question_type === "true_false" && (
                <Field label="Correct answer">
                  <div className="flex gap-2">
                    {["True", "False"].map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set("correct_option", i)}
                        className={cn(
                          "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                          q.correct_option === i
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {/* Short answer hint */}
              {q.question_type === "short_answer" && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  Short answer questions are not auto-graded. Responses are stored for instructor review
                  and do not affect the pass/fail score.
                </div>
              )}

              {/* Explanation */}
              <Field label="Explanation (optional)" hint="Shown to learner after they submit">
                <Input
                  value={q.explanation}
                  onChange={(v) => set("explanation", v)}
                  placeholder="Why is this the correct answer?"
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AssessmentBuilderPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  const [draft, setDraft] = useState<AssessmentDraft>({
    course_id: courseId,
    title: "",
    passing_score: 70,
    duration_minutes: null,
    max_attempts: null,
    instructions: "",
    is_required: true,
    questions: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/lms/assessment-builder?course_id=${courseId}`);
    const json = await res.json() as { assessment?: AssessmentDraft & { questions?: DraftQuestion[] } };
    if (json.assessment) {
      const a = json.assessment;
      setDraft({
        id: a.id,
        course_id: courseId,
        title: a.title ?? "",
        passing_score: a.passing_score ?? 70,
        duration_minutes: a.duration_minutes ?? null,
        max_attempts: a.max_attempts ?? null,
        instructions: a.instructions ?? "",
        is_required: a.is_required ?? true,
        questions: (a.questions ?? []).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
          explanation: q.explanation ?? "",
        })),
      });
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  function setField<K extends keyof AssessmentDraft>(key: K, value: AssessmentDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addQuestion() {
    setDraft((d) => ({
      ...d,
      questions: [...d.questions, emptyQuestion(d.questions.length)],
    }));
  }

  function updateQuestion(index: number, updated: DraftQuestion) {
    setDraft((d) => {
      const qs = [...d.questions];
      qs[index] = updated;
      return { ...d, questions: qs };
    });
  }

  function removeQuestion(index: number) {
    setDraft((d) => ({
      ...d,
      questions: d.questions
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order_index: i })),
    }));
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const qs = [...d.questions];
      const target = index + dir;
      if (target < 0 || target >= qs.length) return d;
      [qs[index], qs[target]] = [qs[target], qs[index]];
      return { ...d, questions: qs.map((q, i) => ({ ...q, order_index: i })) };
    });
  }

  async function save() {
    setSaving(true);
    setSaveMsg("");
    setSaveErr("");
    try {
      const res = await fetch("/api/lms/assessment-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          questions: draft.questions.map((q, i) => ({ ...q, order_index: i })),
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setSaveMsg("Assessment saved successfully.");
      await load();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssessment() {
    if (!draft.id) return;
    if (!confirm("Delete this entire assessment and all its questions? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/lms/assessment-builder?assessment_id=${draft.id}`, { method: "DELETE" });
    setDraft((d) => ({ ...d, id: undefined, title: "", questions: [] }));
    setDeleting(false);
  }

  const autoGradedCount = draft.questions.filter((q) => q.question_type !== "short_answer").length;

  if (loading) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell showDate={false}>
      {/* Header */}
      <motion.div variants={shellItem} className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/courses"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Courses
          </Link>
          <span className="text-zinc-300">/</span>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-zinc-500" />
            <h1 className="font-heading text-xl font-semibold text-zinc-950">Assessment Builder</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draft.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAssessment}
              disabled={deleting}
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete assessment
            </Button>
          )}
          <Button
            onClick={save}
            disabled={saving || !draft.title.trim()}
            className="rounded-lg bg-zinc-950 text-white hover:bg-zinc-800"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save assessment
          </Button>
        </div>
      </motion.div>

      {/* Status messages */}
      <AnimatePresence>
        {saveMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {saveMsg}
          </motion.div>
        )}
        {saveErr && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {saveErr}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Questions */}
        <motion.div variants={shellItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-zinc-950">
              Questions{" "}
              <span className="font-normal text-zinc-400">({draft.questions.length})</span>
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
            >
              <Plus className="size-3.5" /> Add question
            </button>
          </div>

          {draft.questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16">
              <ClipboardCheck className="size-10 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-500">No questions yet</p>
              <button
                type="button"
                onClick={addQuestion}
                className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Plus className="size-4" /> Add first question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {draft.questions.map((q, i) => (
                <QuestionEditor
                  key={i}
                  q={q}
                  index={i}
                  total={draft.questions.length}
                  onChange={(updated) => updateQuestion(i, updated)}
                  onRemove={() => removeQuestion(i)}
                  onMove={(dir) => moveQuestion(i, dir)}
                />
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-3 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
              >
                <Plus className="size-4" /> Add question
              </button>
            </div>
          )}
        </motion.div>

        {/* Right: Assessment settings */}
        <motion.div variants={shellItem} className="space-y-4">
          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="font-heading text-base font-semibold text-zinc-950">
                Assessment settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Field label="Assessment title">
                <Input
                  value={draft.title}
                  onChange={(v) => setField("title", v)}
                  placeholder="e.g. Leadership Foundations Quiz"
                />
              </Field>

              <Field label="Passing score (%)" hint="Minimum % to pass (MCQ + True/False only)">
                <Input
                  type="number"
                  value={draft.passing_score}
                  onChange={(v) => setField("passing_score", Math.min(100, Math.max(0, Number(v))))}
                  placeholder="70"
                />
              </Field>

              <Field label="Time limit (minutes)" hint="Leave empty for no limit">
                <Input
                  type="number"
                  value={draft.duration_minutes ?? ""}
                  onChange={(v) => setField("duration_minutes", v ? Number(v) : null)}
                  placeholder="No limit"
                />
              </Field>

              <Field label="Max attempts" hint="Leave empty for unlimited">
                <Input
                  type="number"
                  value={draft.max_attempts ?? ""}
                  onChange={(v) => setField("max_attempts", v ? Number(v) : null)}
                  placeholder="Unlimited"
                />
              </Field>

              <Field label="Instructions (optional)">
                <Textarea
                  value={draft.instructions}
                  onChange={(v) => setField("instructions", v)}
                  placeholder="Any instructions for learners before they begin..."
                  rows={3}
                />
              </Field>

              {/* Required toggle */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-700">Required to complete course</p>
                  <p className="text-xs text-zinc-400">Learner must pass before certificate is issued</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("is_required", !draft.is_required)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    draft.is_required ? "bg-zinc-900" : "bg-zinc-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                      draft.is_required ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Summary card */}
          {draft.questions.length > 0 && (
            <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Summary</p>
                <div className="space-y-1.5 text-sm text-zinc-600">
                  <div className="flex justify-between">
                    <span>Total questions</span>
                    <span className="font-medium text-zinc-900">{draft.questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-graded</span>
                    <span className="font-medium text-zinc-900">{autoGradedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Short answers</span>
                    <span className="font-medium text-zinc-900">
                      {draft.questions.length - autoGradedCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passing score</span>
                    <span className="font-medium text-zinc-900">{draft.passing_score}%</span>
                  </div>
                  {draft.duration_minutes && (
                    <div className="flex justify-between">
                      <span>Time limit</span>
                      <span className="font-medium text-zinc-900">{draft.duration_minutes} min</span>
                    </div>
                  )}
                  {draft.max_attempts && (
                    <div className="flex justify-between">
                      <span>Max attempts</span>
                      <span className="font-medium text-zinc-900">{draft.max_attempts}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}

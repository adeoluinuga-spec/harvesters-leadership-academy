"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { COURSE_CATEGORIES, COURSE_DIFFICULTY_LEVELS } from "@/lib/lms-types";
import type { AIGeneratedCourse, AIGeneratedModule, AIGeneratedQuestion, AISourceType } from "@/lib/lms-types";

// ============================================================
// Auth
// ============================================================

const BUILDER_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

// ============================================================
// Wizard step types
// ============================================================

type Step = "input" | "analyzing" | "review" | "published";

const ANALYSIS_STEPS = [
  "Parsing transcript structure…",
  "Identifying topic clusters…",
  "Generating module breakdown…",
  "Creating learning objectives…",
  "Composing assessment questions…",
  "Finalising course scaffold…",
];

// ============================================================
// Small reusable primitives (keep consistent with existing style)
// ============================================================

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none",
        className
      )}
    />
  );
}

function SelectField({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300",
        className
      )}
    >
      {children}
    </select>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-zinc-100 px-5 py-4">
      <h3 className="font-heading text-sm font-semibold text-zinc-950">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
    </div>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
      <Sparkles className="size-2.5" />
      AI Generated
    </span>
  );
}

// ============================================================
// Step 1 — Input source
// ============================================================

type SourceOption = { type: AISourceType; label: string; icon: React.ElementType; hint: string };
const SOURCE_OPTIONS: SourceOption[] = [
  { type: "youtube", label: "YouTube URL", icon: Video, hint: "Paste a YouTube video link" },
  { type: "vimeo", label: "Vimeo URL", icon: Video, hint: "Paste a Vimeo video link" },
  { type: "transcript_text", label: "Paste transcript", icon: FileText, hint: "Type or paste the transcript text" },
  { type: "transcript_file", label: "Upload .txt file", icon: Upload, hint: "Upload a plain-text transcript" },
];

function InputStep({
  onAnalyze,
}: {
  onAnalyze: (sourceType: AISourceType, sourceUrl: string, transcript: string) => void;
}) {
  const [sourceType, setSourceType] = useState<AISourceType>("transcript_text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      setError("Only .txt files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTranscript((ev.target?.result as string) ?? "");
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleAnalyze() {
    setError(null);
    if ((sourceType === "youtube" || sourceType === "vimeo") && !sourceUrl.trim()) {
      setError("Please enter a video URL.");
      return;
    }
    if (!transcript.trim() || transcript.trim().length < 50) {
      setError("Transcript is required and must be at least 50 characters. For video URLs, paste the transcript manually until video transcription is wired up.");
      return;
    }
    onAnalyze(sourceType, sourceUrl, transcript);
  }

  return (
    <motion.div variants={shellItem} className="space-y-5">
      {/* Source type selector */}
      <Card>
        <SectionHeader
          title="Content source"
          description="Choose how you want to supply the course content"
        />
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => { setSourceType(opt.type); setError(null); }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                sourceType === opt.type
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              )}
            >
              <opt.icon className="size-5" />
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* URL input */}
      {(sourceType === "youtube" || sourceType === "vimeo") ? (
        <Card>
          <SectionHeader title="Video URL" description="The video URL is stored for reference but transcript is still required" />
          <div className="p-5">
            <Field label={sourceType === "youtube" ? "YouTube URL" : "Vimeo URL"}>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={sourceType === "youtube" ? "https://youtube.com/watch?v=…" : "https://vimeo.com/…"}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {/* Transcript input */}
      {sourceType === "transcript_file" ? (
        <Card>
          <SectionHeader title="Upload transcript" description="Upload a .txt file containing the full transcript" />
          <div className="p-5 space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Upload className="size-4" />
              Choose file
            </button>
            <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileUpload} />
            {transcript ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
                {transcript.slice(0, 200)}…
                <span className="ml-2 font-medium text-zinc-700">({transcript.length.toLocaleString()} chars loaded)</span>
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card>
          <SectionHeader
            title="Transcript"
            description="Paste the full text transcript of the lesson or video"
          />
          <div className="p-5">
            <Field
              label="Transcript text"
              required
              hint="Minimum 50 characters. The richer the transcript, the better the AI output."
            >
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the full video transcript here. The AI will analyse the content and build a complete course structure including modules, timestamps, learning objectives, and assessment questions…"
                rows={12}
              />
            </Field>
            <p className="mt-2 text-right text-xs text-zinc-400">
              {transcript.length.toLocaleString()} chars
            </p>
          </div>
        </Card>
      )}

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAnalyze}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Sparkles className="size-4" />
          Analyze content
          <ArrowRight className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Step 2 — Analyzing
// ============================================================

function AnalyzingStep({ stepIndex }: { stepIndex: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="mb-8 flex size-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
        <Sparkles className="size-7 text-amber-600 animate-pulse" />
      </div>
      <h2 className="font-heading text-xl font-semibold text-zinc-950">Analysing content…</h2>
      <p className="mt-2 text-sm text-zinc-500">Building your course structure from the transcript</p>

      <div className="mt-10 w-full max-w-sm space-y-3">
        {ANALYSIS_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all",
                i < stepIndex
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : i === stepIndex
                    ? "border-amber-400 bg-amber-50 text-amber-600"
                    : "border-zinc-200 bg-white text-zinc-400"
              )}
            >
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "text-sm transition-colors",
                i < stepIndex ? "text-zinc-400 line-through" : i === stepIndex ? "font-medium text-zinc-950" : "text-zinc-400"
              )}
            >
              {step}
            </span>
            {i === stepIndex ? <Loader2 className="ml-auto size-3.5 animate-spin text-amber-500" /> : null}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================
// Step 3 — Review & edit
// ============================================================

function EditableStringList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (updated: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        <Plus className="size-3" />
        Add item
      </button>
    </div>
  );
}

function ModuleEditor({
  module: mod,
  index,
  onChange,
  onDelete,
}: {
  module: AIGeneratedModule;
  index: number;
  onChange: (m: AIGeneratedModule) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  function update<K extends keyof AIGeneratedModule>(key: K, val: AIGeneratedModule[K]) {
    onChange({ ...mod, [key]: val });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      {/* Module header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-100"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-bold text-zinc-600">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900">{mod.module_title || `Module ${index + 1}`}</span>
        <span className="mr-2 font-mono text-xs text-zinc-400">
          {mod.timestamp_start} – {mod.timestamp_end}
        </span>
        {expanded ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="module-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Field label="Module title">
                    <Input
                      value={mod.module_title}
                      onChange={(e) => update("module_title", e.target.value)}
                      placeholder="Module title"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <Input
                      value={mod.timestamp_start}
                      onChange={(e) => update("timestamp_start", e.target.value)}
                      placeholder="0:00"
                    />
                  </Field>
                  <Field label="End">
                    <Input
                      value={mod.timestamp_end}
                      onChange={(e) => update("timestamp_end", e.target.value)}
                      placeholder="5:44"
                    />
                  </Field>
                </div>
              </div>

              <Field label="Module summary">
                <Textarea
                  value={mod.module_summary}
                  onChange={(e) => update("module_summary", e.target.value)}
                  rows={3}
                  placeholder="Brief summary of what this module covers"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Learning objectives
                  </p>
                  <EditableStringList
                    items={mod.learning_objectives}
                    onChange={(v) => update("learning_objectives", v)}
                    placeholder="Learning objective…"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Key takeaways
                  </p>
                  <EditableStringList
                    items={mod.key_takeaways}
                    onChange={(v) => update("key_takeaways", v)}
                    placeholder="Key takeaway…"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Reflection questions
                  </p>
                  <EditableStringList
                    items={mod.reflection_questions}
                    onChange={(v) => update("reflection_questions", v)}
                    placeholder="Reflection question…"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="size-3.5" />
                  Remove module
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function QuestionEditor({
  question: q,
  index,
  onChange,
  onDelete,
}: {
  question: AIGeneratedQuestion;
  index: number;
  onChange: (q: AIGeneratedQuestion) => void;
  onDelete: () => void;
}) {
  function update<K extends keyof AIGeneratedQuestion>(key: K, val: AIGeneratedQuestion[K]) {
    onChange({ ...q, [key]: val });
  }

  const typeLabel: Record<string, string> = {
    mcq: "Multiple Choice",
    true_false: "True / False",
    reflection: "Reflection",
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Q{index + 1}</span>
            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {typeLabel[q.question_type] ?? q.question_type}
            </span>
          </div>
          <Textarea
            value={q.question}
            onChange={(e) => update("question", e.target.value)}
            rows={2}
            placeholder="Question text…"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="mt-6 flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {q.question_type !== "reflection" ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Options</p>
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update("correct_answer", opt)}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                  q.correct_answer === opt
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-300 text-zinc-400 hover:border-emerald-300"
                )}
                title="Mark as correct"
              >
                {q.correct_answer === opt ? "✓" : ""}
              </button>
              <Input
                value={opt}
                onChange={(e) => {
                  const opts = [...q.options];
                  const wasCorrect = q.correct_answer === opt;
                  opts[i] = e.target.value;
                  onChange({
                    ...q,
                    options: opts,
                    correct_answer: wasCorrect ? e.target.value : q.correct_answer,
                  });
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      ) : null}

      <Field label="Explanation / rationale">
        <Input
          value={q.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          placeholder="Why is this the correct answer?"
        />
      </Field>
    </div>
  );
}

function ReviewStep({
  course: initial,
  videoUrl: initialVideoUrl,
  generationId,
  onPublished,
}: {
  course: AIGeneratedCourse;
  videoUrl: string;
  generationId: string | null;
  onPublished: (courseId: string, slug: string) => void;
}) {
  const [course, setCourse] = useState<AIGeneratedCourse>(initial);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCourse<K extends keyof AIGeneratedCourse>(key: K, val: AIGeneratedCourse[K]) {
    setCourse((c) => ({ ...c, [key]: val }));
  }

  function updateModule(i: number, m: AIGeneratedModule) {
    const next = [...course.modules];
    next[i] = m;
    updateCourse("modules", next);
  }

  function deleteModule(i: number) {
    updateCourse("modules", course.modules.filter((_, j) => j !== i));
  }

  function addModule() {
    updateCourse("modules", [
      ...course.modules,
      {
        module_title: `Module ${course.modules.length + 1}`,
        timestamp_start: "0:00",
        timestamp_end: "0:00",
        module_summary: "",
        learning_objectives: [],
        key_takeaways: [],
        reflection_questions: [],
      },
    ]);
  }

  function updateQuestion(i: number, q: AIGeneratedQuestion) {
    const next = [...course.assessments];
    next[i] = q;
    updateCourse("assessments", next);
  }

  function deleteQuestion(i: number) {
    updateCourse("assessments", course.assessments.filter((_, j) => j !== i));
  }

  function addQuestion() {
    updateCourse("assessments", [
      ...course.assessments,
      {
        question: "",
        question_type: "mcq",
        options: ["", "", "", ""],
        correct_answer: "",
        explanation: "",
      },
    ]);
  }

  async function handlePublish() {
    setError(null);
    if (!course.course_title.trim()) {
      setError("Course title is required.");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/ai-course-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          course,
          video_url: videoUrl,
          generation_id: generationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Publish failed.");
        setPublishing(false);
        return;
      }
      onPublished(data.course_id, data.slug);
    } catch {
      setError("Network error. Please try again.");
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <motion.div variants={shellItem} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <AiBadge />
          <p className="text-sm text-zinc-700">
            Review and edit everything before publishing. All fields are editable.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {publishing ? "Publishing…" : "Publish course"}
          </button>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Course meta */}
      <motion.div variants={shellItem}>
        <Card>
          <SectionHeader title="Course overview" description="Core course metadata — shown on the course card and detail page" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Course title" required>
                <Input
                  value={course.course_title}
                  onChange={(e) => updateCourse("course_title", e.target.value)}
                  placeholder="Course title"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Course description">
                <Textarea
                  value={course.course_description}
                  onChange={(e) => updateCourse("course_description", e.target.value)}
                  rows={4}
                  placeholder="Course description"
                />
              </Field>
            </div>

            <Field label="Category">
              <SelectField
                value={course.course_category}
                onChange={(e) => updateCourse("course_category", e.target.value)}
              >
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SelectField>
            </Field>

            <Field label="Difficulty level">
              <SelectField
                value={course.difficulty_level}
                onChange={(e) => updateCourse("difficulty_level", e.target.value as AIGeneratedCourse["difficulty_level"])}
              >
                {COURSE_DIFFICULTY_LEVELS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
            </Field>

            <Field label="Target audience">
              <Input
                value={course.target_audience}
                onChange={(e) => updateCourse("target_audience", e.target.value)}
                placeholder="Target audience"
              />
            </Field>

            <Field label="Estimated duration">
              <Input
                value={course.total_estimated_duration}
                onChange={(e) => updateCourse("total_estimated_duration", e.target.value)}
                placeholder="e.g. 1h 30m"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Video URL" hint="The single hosted video that learners watch — Vimeo or YouTube">
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://vimeo.com/…"
                    className="pl-8"
                  />
                </div>
              </Field>
            </div>

            <Field label="Certificate title">
              <Input
                value={course.certificate_title}
                onChange={(e) => updateCourse("certificate_title", e.target.value)}
                placeholder="Certificate of Completion"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">Suggested tags</p>
              <div className="flex flex-wrap gap-2">
                {course.suggested_tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600"
                  >
                    <Tag className="size-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Thumbnail prompt */}
      <motion.div variants={shellItem}>
        <Card>
          <SectionHeader title="AI thumbnail prompt" description="Use this prompt with an image generator to create a course thumbnail" />
          <div className="p-5">
            <Textarea
              value={course.thumbnail_prompt}
              onChange={(e) => updateCourse("thumbnail_prompt", e.target.value)}
              rows={3}
            />
          </div>
        </Card>
      </motion.div>

      {/* Modules */}
      <motion.div variants={shellItem}>
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h3 className="font-heading text-sm font-semibold text-zinc-950">Modules</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {course.modules.length} module{course.modules.length !== 1 ? "s" : ""} — each maps to one chapter of the video
              </p>
            </div>
            <button
              type="button"
              onClick={addModule}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Plus className="size-3.5" />
              Add module
            </button>
          </div>
          <div className="space-y-3 p-5">
            {course.modules.map((m, i) => (
              <ModuleEditor
                key={i}
                module={m}
                index={i}
                onChange={(updated) => updateModule(i, updated)}
                onDelete={() => deleteModule(i)}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Assessments */}
      <motion.div variants={shellItem}>
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h3 className="font-heading text-sm font-semibold text-zinc-950">Assessment questions</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {course.assessments.length} question{course.assessments.length !== 1 ? "s" : ""} — 70% passing score by default
              </p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Plus className="size-3.5" />
              Add question
            </button>
          </div>
          <div className="space-y-3 p-5">
            {course.assessments.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                onChange={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Bottom publish bar */}
      <motion.div variants={shellItem} className="sticky bottom-0 z-10 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-lg shadow-zinc-100">
        <p className="text-sm text-zinc-500">
          Course will be created as a <strong className="text-zinc-700">draft</strong> — you can publish it from the courses list.
        </p>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {publishing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {publishing ? "Publishing…" : "Publish course"}
        </button>
      </motion.div>
    </div>
  );
}

// ============================================================
// Step 4 — Published
// ============================================================

function PublishedStep({ courseId, slug }: { courseId: string; slug: string }) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
        <CheckCircle2 className="size-8 text-emerald-500" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-zinc-950">Course created</h2>
      <p className="mt-3 max-w-sm text-center text-sm text-zinc-500">
        The course has been saved as a draft. Review and edit it in the course editor before publishing to learners.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={`/dashboard/admin/courses/${courseId}/edit`}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Pencil className="size-4" />
          Open in course editor
        </Link>
        <Link
          href={`/dashboard/admin/courses/${courseId}/lessons`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <BookOpen className="size-4" />
          Manage lessons
        </Link>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/ai-course-builder")}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <Sparkles className="size-4" />
          Build another course
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Step indicator
// ============================================================

const STEPS = [
  { key: "input", label: "Input source", icon: FileText },
  { key: "analyzing", label: "AI analysis", icon: Sparkles },
  { key: "review", label: "Review & edit", icon: Pencil },
  { key: "published", label: "Published", icon: CheckCircle2 },
] as const;

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-all",
              i < idx
                ? "border-emerald-400 bg-emerald-500 text-white"
                : i === idx
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-400"
            )}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={cn(
              "hidden text-xs font-medium sm:block",
              i === idx ? "text-zinc-950" : "text-zinc-400"
            )}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 ? (
            <div className={cn("mx-1 h-px w-8 bg-zinc-200", i < idx && "bg-emerald-400")} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function AICourseBuilderPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const authRan = useRef(false);

  useEffect(() => {
    if (authRan.current) return;
    authRan.current = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAuthChecked(true); return; }
        const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
        setAuthorized(BUILDER_ROLES.includes(data?.role ?? ""));
        setAuthChecked(true);
      } catch {
        setAuthChecked(true);
      }
    })();
  }, []);

  const [step, setStep] = useState<Step>("input");
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const [generatedCourse, setGeneratedCourse] = useState<AIGeneratedCourse | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [publishedData, setPublishedData] = useState<{ courseId: string; slug: string } | null>(null);

  async function handleAnalyze(sourceType: AISourceType, sourceUrl: string, transcript: string) {
    setStep("analyzing");
    setAnalysisStepIdx(0);

    // Drive the visual step ticker
    const interval = setInterval(() => {
      setAnalysisStepIdx((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 400);

    setSourceVideoUrl(sourceUrl);

    try {
      const res = await fetch("/api/ai-course-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", source_type: sourceType, source_url: sourceUrl, transcript }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (!res.ok) {
        setStep("input");
        return;
      }
      setGeneratedCourse(data.course);
      setGenerationId(data.generation_id ?? null);
      setAnalysisStepIdx(ANALYSIS_STEPS.length - 1);
      setTimeout(() => setStep("review"), 500);
    } catch {
      clearInterval(interval);
      setStep("input");
    }
  }

  function handlePublished(courseId: string, slug: string) {
    setPublishedData({ courseId, slug });
    setStep("published");
  }

  if (authChecked && !authorized) {
    return (
      <DashboardShell showDate={false}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20"
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-zinc-100">
            <Lock className="size-6 text-zinc-500" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-zinc-950">Access restricted</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-zinc-500">
            The AI Course Builder is available to Super Admins and Platform Super Admins only.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/courses")}
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Back to courses
          </button>
        </motion.div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell searchPlaceholder="AI Course Builder…" showDate={false}>
      {/* Page header */}
      <motion.div variants={shellItem} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/courses"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="size-4" />
            Courses
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-semibold text-zinc-950">AI Course Builder</h1>
              <AiBadge />
            </div>
            <p className="text-xs text-zinc-500">
              Paste a transcript or video URL — AI generates the full course structure
            </p>
          </div>
        </div>
        <StepIndicator current={step} />
      </motion.div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === "input" ? (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InputStep onAnalyze={handleAnalyze} />
          </motion.div>
        ) : step === "analyzing" ? (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingStep stepIndex={analysisStepIdx} />
          </motion.div>
        ) : step === "review" && generatedCourse ? (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReviewStep
              course={generatedCourse}
              videoUrl={sourceVideoUrl}
              generationId={generationId}
              onPublished={handlePublished}
            />
          </motion.div>
        ) : step === "published" && publishedData ? (
          <motion.div key="published" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PublishedStep courseId={publishedData.courseId} slug={publishedData.slug} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DashboardShell>
  );
}

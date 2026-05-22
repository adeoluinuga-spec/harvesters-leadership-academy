"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fetchAdminCourseById,
  fetchModulesAndLessons,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  type ModuleWithLessons,
  type LessonFormData,
  type ModuleFormData,
} from "@/lib/course-management";
import type { AdminCourse, LMSLesson } from "@/lib/lms-types";
import { extractVimeoId, normalizeVimeoUrl, vimeoEmbedUrl } from "@/lib/vimeo";

type PageProps = { params: Promise<{ id: string }> };

// ── Duration helpers ──────────────────────────────────────────

function secondsToInput(s: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}:${String(sec).padStart(2, "0")}` : String(m);
}

function inputToSeconds(input: string): number {
  if (!input.trim()) return 0;
  if (input.includes(":")) {
    const [m, s] = input.split(":").map((n) => parseInt(n) || 0);
    return m * 60 + s;
  }
  return Math.round(parseFloat(input) * 60) || 0;
}

function displayDuration(s: number): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

// ── Empty defaults ────────────────────────────────────────────

const EMPTY_LESSON: LessonFormData = {
  title: "",
  description: "",
  video_url: "",
  duration_seconds: 0,
  transcript: "",
  module_id: null,
  is_preview: false,
  has_checkpoint: false,
  checkpoint_question: "",
  resources: [],
};

const EMPTY_MODULE: ModuleFormData = { title: "", description: "" };

// ── Field components ──────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300",
        props.className
      )}
    />
  );
}

// ── Lesson editor panel ───────────────────────────────────────

function LessonEditor({
  modules,
  lessonId,
  initialData,
  courseId,
  onSave,
  onClose,
}: {
  modules: ModuleWithLessons[];
  lessonId: string | null;
  initialData: LessonFormData;
  courseId: string;
  onSave: (lesson: LMSLesson, isNew: boolean) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LessonFormData>(initialData);
  const [durationInput, setDurationInput] = useState(secondsToInput(initialData.duration_seconds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof LessonFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function addResource() {
    setForm((prev) => ({
      ...prev,
      resources: [...prev.resources, { title: "", url: "", type: "link" as const }],
    }));
  }

  function updateResource(index: number, field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  }

  function removeResource(index: number) {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Lesson title is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: LessonFormData = {
      ...form,
      video_url: form.video_url.trim() ? normalizeVimeoUrl(form.video_url.trim()) : "",
      duration_seconds: inputToSeconds(durationInput),
      resources: form.resources.filter((r) => r.title.trim() && r.url.trim()),
    };

    if (lessonId) {
      const { error: err } = await updateLesson(lessonId, payload);
      setSaving(false);
      if (err) { setError(err); return; }
      onSave({ id: lessonId, course_id: courseId, order_index: 0, ...payload } as LMSLesson, false);
    } else {
      const moduleTargetLessons = modules.find((m) => m.id === payload.module_id)?.lessons ?? [];
      const orderIndex = moduleTargetLessons.length;
      const { lesson, error: err } = await createLesson(courseId, payload, orderIndex);
      setSaving(false);
      if (err || !lesson) { setError(err ?? "Failed to save lesson"); return; }
      onSave(lesson, true);
    }
  }

  const vimeoId = form.video_url.trim() ? extractVimeoId(form.video_url) : null;

  const resourceTypeIcon = (type: string) => {
    if (type === "pdf") return <FileText className="size-3.5 text-zinc-400" />;
    if (type === "video") return <Video className="size-3.5 text-zinc-400" />;
    return <Link2 className="size-3.5 text-zinc-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.2 }}
      className="sticky top-5 space-y-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="font-heading text-base font-semibold text-zinc-950">
          {lessonId ? "Edit lesson" : "New lesson"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
        <div className="space-y-5 p-5">
          {/* Module assignment */}
          <Field label="Module">
            <select
              value={form.module_id ?? ""}
              onChange={(e) => set("module_id", e.target.value || null)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              <option value="">No module (standalone lesson)</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>

          {/* Title */}
          <Field label="Lesson title" required>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="The Call to Lead"
            />
          </Field>

          {/* Video URL */}
          <Field label="Vimeo URL" hint="Paste any Vimeo link — watch URL or embed URL, both work">
            <div className="relative">
              <Video className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={form.video_url}
                onChange={(e) => set("video_url", e.target.value)}
                placeholder="https://vimeo.com/123456789"
                className="pl-8"
              />
            </div>
          </Field>

          {/* Vimeo live preview */}
          {vimeoId && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
              <div className="relative aspect-video">
                <iframe
                  key={vimeoId}
                  src={vimeoEmbedUrl(vimeoId)}
                  className="h-full w-full"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Vimeo preview"
                />
              </div>
              <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
                <div className="size-1.5 rounded-full bg-emerald-400" />
                <p className="text-xs text-zinc-400">
                  Vimeo video · ID {vimeoId}
                </p>
                <p className="ml-auto text-xs text-zinc-500">Will be saved as embed URL</p>
              </div>
            </div>
          )}

          {/* Duration */}
          <Field label="Duration" hint='Enter as MM:SS (e.g. "18:30") or minutes (e.g. "18.5")'>
            <Input
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="18:30"
            />
          </Field>

          {/* Lesson notes */}
          <Field label="Lesson notes" hint="Teaching notes shown to learners alongside the video">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Key points, scripture references, reflection prompts, or teaching notes for this lesson..."
            />
          </Field>

          {/* Flags */}
          <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.is_preview}
                onChange={(e) => set("is_preview", e.target.checked)}
                className="size-4 rounded border-zinc-300"
              />
              <div>
                <span className="text-sm font-medium text-zinc-700">Preview lesson</span>
                <p className="text-xs text-zinc-400">Visible without enrollment</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.has_checkpoint}
                onChange={(e) => set("has_checkpoint", e.target.checked)}
                className="size-4 rounded border-zinc-300"
              />
              <div>
                <span className="text-sm font-medium text-zinc-700">AI checkpoint</span>
                <p className="text-xs text-zinc-400">Reflection question injected mid-lesson</p>
              </div>
            </label>
            <AnimatePresence>
              {form.has_checkpoint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Textarea
                    value={form.checkpoint_question}
                    onChange={(e) => set("checkpoint_question", e.target.value)}
                    rows={2}
                    placeholder="What leadership principle stood out most to you in this section?"
                    className="mt-2"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Downloads & Resources</p>
              <button
                type="button"
                onClick={addResource}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Plus className="size-3" />
                Add
              </button>
            </div>
            {form.resources.map((resource, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-1 gap-2">
                  <Input
                    value={resource.title}
                    onChange={(e) => updateResource(i, "title", e.target.value)}
                    placeholder="Resource title"
                    className="flex-1"
                  />
                  <Input
                    value={resource.url}
                    onChange={(e) => updateResource(i, "url", e.target.value)}
                    placeholder="URL"
                    className="flex-1"
                  />
                  <select
                    value={resource.type}
                    onChange={(e) => updateResource(i, "type", e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeResource(i)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Transcript */}
          <Field label="Video transcript" hint="Verbatim transcript — used for AI insights, search, and accessibility">
            <Textarea
              value={form.transcript}
              onChange={(e) => set("transcript", e.target.value)}
              rows={6}
              placeholder="Paste the lesson transcript here..."
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Panel footer */}
      <div className="flex gap-3 border-t border-zinc-100 px-5 py-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving..." : lessonId ? "Save changes" : "Add lesson"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Module card ───────────────────────────────────────────────

function ModuleCard({
  module,
  index,
  totalModules,
  isExpanded,
  isEditing,
  editForm,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onMoveLessonUp,
  onMoveLessonDown,
  editingLessonId,
}: {
  module: ModuleWithLessons;
  index: number;
  totalModules: number;
  isExpanded: boolean;
  isEditing: boolean;
  editForm: ModuleFormData;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (form: ModuleFormData) => Promise<void>;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: LMSLesson, moduleId: string) => void;
  onDeleteLesson: (lessonId: string, moduleId: string) => void;
  onMoveLessonUp: (lessonId: string, moduleId: string) => void;
  onMoveLessonDown: (lessonId: string, moduleId: string) => void;
  editingLessonId: string | null;
}) {
  const [localForm, setLocalForm] = useState(editForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalForm(editForm);
  }, [editForm]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Module header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={localForm.title}
              onChange={(e) => setLocalForm((f) => ({ ...f, title: e.target.value }))}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              placeholder="Module title"
            />
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await onSaveEdit(localForm);
                setSaving(false);
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex h-7 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-zinc-950">
                <span className="mr-2 text-zinc-400">M{index + 1}</span>
                {module.title}
              </p>
              {module.description && (
                <p className="mt-0.5 text-xs text-zinc-500 truncate">{module.description}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
            </span>
          </>
        )}

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalModules - 1}
              className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Lesson list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100">
              {module.lessons.length === 0 ? (
                <p className="px-5 py-4 text-xs text-zinc-400">No lessons yet. Add your first lesson below.</p>
              ) : (
                module.lessons.map((lesson, li) => (
                  <div
                    key={lesson.id}
                    className={cn(
                      "flex items-center gap-3 border-b border-zinc-50 px-5 py-3 transition-colors",
                      editingLessonId === lesson.id && "bg-zinc-50"
                    )}
                  >
                    <span className="font-heading flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600">
                      {String(li + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-950 truncate">{lesson.title}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-400">
                        {lesson.video_url ? (
                          <span className="flex items-center gap-1">
                            <Video className="size-3" />
                            Video
                          </span>
                        ) : (
                          <span className="text-zinc-300">No video</span>
                        )}
                        <span>{displayDuration(lesson.duration_seconds)}</span>
                        {lesson.is_preview && (
                          <span className="flex items-center gap-1 text-violet-500">
                            <Eye className="size-3" />
                            Preview
                          </span>
                        )}
                        {lesson.has_checkpoint && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <HelpCircle className="size-3" />
                            Checkpoint
                          </span>
                        )}
                        {lesson.resources.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="size-3" />
                            {lesson.resources.length} file{lesson.resources.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveLessonUp(lesson.id, module.id)}
                        disabled={li === 0}
                        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveLessonDown(lesson.id, module.id)}
                        disabled={li === module.lessons.length - 1}
                        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditLesson(lesson, module.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(lesson.id, module.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onAddLesson(module.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
                >
                  <Plus className="size-3.5" />
                  Add lesson
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

type EditingLesson = { lessonId: string | null; data: LessonFormData } | null;
type EditingModuleId = string | null;

export default function LessonsPage({ params }: PageProps) {
  const { id: courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [orphanLessons, setOrphanLessons] = useState<LMSLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModuleId, setEditingModuleId] = useState<EditingModuleId>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState<ModuleFormData>(EMPTY_MODULE);
  const [addingModuleBusy, setAddingModuleBusy] = useState(false);

  const [editingLesson, setEditingLesson] = useState<EditingLesson>(null);

  const load = useCallback(async () => {
    const [courseData, { modules: mods, orphanLessons: orphans }] = await Promise.all([
      fetchAdminCourseById(courseId),
      fetchModulesAndLessons(courseId),
    ]);
    setCourse(courseData);
    setModules(mods);
    setOrphanLessons(orphans);
    setLoading(false);
    // Auto-expand all modules
    setExpandedModules(new Set(mods.map((m) => m.id)));
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  // ── Module actions ──────────────────────────────────────────

  async function handleAddModule() {
    if (!newModuleForm.title.trim()) return;
    setAddingModuleBusy(true);
    const { module, error } = await createModule(courseId, newModuleForm, modules.length);
    setAddingModuleBusy(false);
    if (error || !module) return;
    const newMod: ModuleWithLessons = { ...module, lessons: [] };
    setModules((prev) => [...prev, newMod]);
    setExpandedModules((prev) => new Set([...prev, module.id]));
    setNewModuleForm(EMPTY_MODULE);
    setAddingModule(false);
  }

  async function handleSaveModuleEdit(moduleId: string, form: ModuleFormData) {
    await updateModule(moduleId, form);
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, ...form } : m))
    );
    setEditingModuleId(null);
  }

  async function handleDeleteModule(moduleId: string) {
    const mod = modules.find((m) => m.id === moduleId);
    if (!confirm(`Delete module "${mod?.title}"? All lessons inside will also be deleted.`)) return;
    await deleteModule(moduleId);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function handleMoveModule(index: number, direction: "up" | "down") {
    const newMods = [...modules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newMods[index], newMods[targetIndex]] = [newMods[targetIndex], newMods[index]];
    const updated = newMods.map((m, i) => ({ ...m, order_index: i }));
    setModules(updated);
    await reorderModules(updated.map((m) => ({ id: m.id, order_index: m.order_index })));
  }

  // ── Lesson actions ──────────────────────────────────────────

  function handleOpenNewLesson(moduleId: string) {
    setEditingLesson({
      lessonId: null,
      data: { ...EMPTY_LESSON, module_id: moduleId },
    });
    setExpandedModules((prev) => new Set([...prev, moduleId]));
  }

  function handleOpenEditLesson(lesson: LMSLesson) {
    setEditingLesson({
      lessonId: lesson.id,
      data: {
        title: lesson.title,
        description: lesson.description ?? "",
        video_url: lesson.video_url ?? "",
        duration_seconds: lesson.duration_seconds ?? 0,
        transcript: lesson.transcript ?? "",
        module_id: lesson.module_id ?? null,
        is_preview: lesson.is_preview,
        has_checkpoint: lesson.has_checkpoint,
        checkpoint_question: lesson.checkpoint_question ?? "",
        resources: lesson.resources ?? [],
      },
    });
  }

  function handleLessonSaved(lesson: LMSLesson, isNew: boolean) {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== lesson.module_id) {
          // Remove from old module if module_id changed
          return { ...m, lessons: m.lessons.filter((l) => l.id !== lesson.id) };
        }
        if (isNew) {
          return { ...m, lessons: [...m.lessons, lesson] };
        }
        return { ...m, lessons: m.lessons.map((l) => (l.id === lesson.id ? lesson : l)) };
      })
    );
    if (!lesson.module_id) {
      if (isNew) {
        setOrphanLessons((prev) => [...prev, lesson]);
      } else {
        setOrphanLessons((prev) => prev.map((l) => (l.id === lesson.id ? lesson : l)));
      }
    }
    setEditingLesson(null);
  }

  async function handleDeleteLesson(lessonId: string, moduleId: string) {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;
    await deleteLesson(lessonId);
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
      )
    );
    if (editingLesson?.lessonId === lessonId) setEditingLesson(null);
  }

  async function handleMoveLesson(lessonId: string, moduleId: string, direction: "up" | "down") {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;

    const newLessons = [...mod.lessons];
    [newLessons[idx], newLessons[targetIdx]] = [newLessons[targetIdx], newLessons[idx]];
    const updated = newLessons.map((l, i) => ({ ...l, order_index: i }));

    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: updated } : m))
    );
    await reorderLessons(updated.map((l) => ({ id: l.id, order_index: l.order_index })));
  }

  // ── Stats ───────────────────────────────────────────────────

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0) + orphanLessons.length;

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell showDate={false}>
      {/* Header */}
      <motion.div variants={shellItem} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/admin/courses/${courseId}/edit`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="size-4" />
            Edit course
          </Link>
          <div>
            <h1 className="font-heading text-xl font-semibold text-zinc-950 truncate max-w-md">
              {course?.title ?? "Course"}
            </h1>
            <p className="text-xs text-zinc-500">
              {modules.length} module{modules.length !== 1 ? "s" : ""} · {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/courses/${course?.slug ?? ""}`}
          target="_blank"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <Eye className="size-4" />
          Preview
        </Link>
      </motion.div>

      {/* Content grid */}
      <motion.div
        variants={shellItem}
        className={cn(
          "grid gap-5",
          editingLesson ? "lg:grid-cols-[1fr_440px]" : "grid-cols-1"
        )}
      >
        {/* Left: modules list */}
        <div className="space-y-4">
          {modules.length === 0 && orphanLessons.length === 0 && !addingModule && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16">
              <GraduationCap className="size-10 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-500">No modules yet</p>
              <p className="mt-1 text-xs text-zinc-400">Add your first module to start building the course</p>
              <button
                type="button"
                onClick={() => setAddingModule(true)}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                Add first module
              </button>
            </div>
          )}

          {modules.map((module, i) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={i}
              totalModules={modules.length}
              isExpanded={expandedModules.has(module.id)}
              isEditing={editingModuleId === module.id}
              editForm={{ title: module.title, description: module.description ?? "" }}
              editingLessonId={editingLesson?.lessonId ?? null}
              onToggle={() =>
                setExpandedModules((prev) => {
                  const next = new Set(prev);
                  next.has(module.id) ? next.delete(module.id) : next.add(module.id);
                  return next;
                })
              }
              onStartEdit={() => setEditingModuleId(module.id)}
              onCancelEdit={() => setEditingModuleId(null)}
              onSaveEdit={(form) => handleSaveModuleEdit(module.id, form)}
              onDelete={() => handleDeleteModule(module.id)}
              onMoveUp={() => handleMoveModule(i, "up")}
              onMoveDown={() => handleMoveModule(i, "down")}
              onAddLesson={handleOpenNewLesson}
              onEditLesson={(lesson) => handleOpenEditLesson(lesson)}
              onDeleteLesson={handleDeleteLesson}
              onMoveLessonUp={(lessonId) => handleMoveLesson(lessonId, module.id, "up")}
              onMoveLessonDown={(lessonId) => handleMoveLesson(lessonId, module.id, "down")}
            />
          ))}

          {/* Orphan lessons (no module) */}
          {orphanLessons.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-5 py-3">
                <p className="text-sm font-medium text-zinc-500">Standalone lessons (no module)</p>
              </div>
              {orphanLessons.map((lesson, li) => (
                <div key={lesson.id} className="flex items-center gap-3 border-b border-zinc-50 px-5 py-3">
                  <span className="font-heading flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600">
                    {String(li + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-950 truncate">{lesson.title}</p>
                    <p className="text-xs text-zinc-400">{displayDuration(lesson.duration_seconds)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLesson(lesson)}
                      className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this lesson?")) return;
                        await deleteLesson(lesson.id);
                        setOrphanLessons((prev) => prev.filter((l) => l.id !== lesson.id));
                      }}
                      className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add module */}
          {addingModule ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="space-y-3 p-4">
                <p className="text-sm font-semibold text-zinc-950">New module</p>
                <input
                  autoFocus
                  value={newModuleForm.title}
                  onChange={(e) => setNewModuleForm((f) => ({ ...f, title: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
                  placeholder="Module title (e.g. Introduction to Leadership)"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <input
                  value={newModuleForm.description}
                  onChange={(e) => setNewModuleForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description (optional)"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddModule}
                    disabled={addingModuleBusy || !newModuleForm.title.trim()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {addingModuleBusy ? <Loader2 className="size-3 animate-spin" /> : null}
                    Save module
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingModule(false); setNewModuleForm(EMPTY_MODULE); }}
                    className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            modules.length > 0 && (
              <button
                type="button"
                onClick={() => setAddingModule(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
              >
                <Plus className="size-4" />
                Add module
              </button>
            )
          )}
        </div>

        {/* Right: lesson editor */}
        <AnimatePresence>
          {editingLesson && (
            <LessonEditor
              modules={modules}
              lessonId={editingLesson.lessonId}
              initialData={editingLesson.data}
              courseId={courseId}
              onSave={handleLessonSaved}
              onClose={() => setEditingLesson(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardShell>
  );
}

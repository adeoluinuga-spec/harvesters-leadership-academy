"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2, Trash2, Video } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchAdminCourseById, updateCourse, deleteCourse } from "@/lib/course-management";
import { ThumbnailUpload } from "@/components/lms/thumbnail-upload";
import { LeadershipCadreSelect } from "@/components/lms/leadership-cadre-select";
import { COURSE_CATEGORIES, COURSE_DIFFICULTY_LEVELS, type CourseDifficulty, type CourseStatus } from "@/lib/lms-types";

type EditPageProps = { params: Promise<{ id: string }> };

const LEVELS = [
  "All leaders",
  "Senior leaders",
  "Directors",
  "Campus teams",
  "Team leads",
  "Coordinators",
  "Academy admins",
  "Cell leaders",
];

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

function Select({
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-base font-semibold text-zinc-950">{title}</CardTitle>
          {description ? <p className="text-sm text-zinc-500">{description}</p> : null}
        </CardHeader>
        <CardContent className="pt-5">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export default function EditCoursePage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [overview, setOverview] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorRole, setInstructorRole] = useState("");
  const [category, setCategory] = useState<string>(COURSE_CATEGORIES[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [leadershipTargets, setLeadershipTargets] = useState<string[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState<CourseDifficulty>("Foundational");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<CourseStatus>("draft");

  useEffect(() => {
    fetchAdminCourseById(id).then((course) => {
      if (!course) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTitle(course.title);
      setDescription(course.description ?? "");
      setOverview(course.overview ?? "");
      setThumbnailUrl(course.thumbnail_url ?? "");
      setVideoUrl(course.video_url ?? "");
      setInstructorName(course.instructor_name);
      setInstructorRole(course.instructor_role ?? course.instructor_title ?? "");
      setCategory(course.category);
      setLevel(course.level);
      setLeadershipTargets(course.leadership_targets ?? []);
      setDifficultyLevel(course.difficulty_level ?? "Foundational");
      setDurationMinutes(course.duration_minutes ? String(course.duration_minutes) : "");
      setIsRequired(course.is_required ?? false);
      setIsFeatured(course.is_featured ?? false);
      setStatus(course.status ?? (course.is_published ? "published" : "draft"));
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !instructorName.trim()) {
      setError("Course title and instructor name are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: saveError } = await updateCourse(id, {
      title,
      description,
      overview,
      thumbnail_url: thumbnailUrl,
      video_url: videoUrl,
      instructor_name: instructorName,
      instructor_role: instructorRole,
      category,
      level,
      leadership_targets: leadershipTargets,
      difficulty_level: difficultyLevel,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : 0,
      is_required: isRequired,
      is_featured: isFeatured,
      status,
    });

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    router.push("/dashboard/admin/courses");
  }

  async function handleDelete() {
    if (!confirm("Delete this course permanently? All lessons and progress data will be lost.")) return;
    setDeleting(true);
    await deleteCourse(id);
    router.push("/dashboard/admin/courses");
  }

  if (loading) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20">
          <p className="font-heading text-lg font-semibold text-zinc-950">Course not found</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/courses")}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Back to courses
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell searchPlaceholder="Edit course..." showDate={false}>
      <motion.div variants={shellItem} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/courses"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="size-4" />
            Back to courses
          </Link>
          <div>
            <h1 className="font-heading text-xl font-semibold text-zinc-950">Edit course</h1>
            <p className="text-xs text-zinc-500">Changes are saved when you click save</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/admin/courses/${id}/lessons`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <BookOpen className="size-4" />
            Manage lessons
          </Link>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete course
          </button>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thumbnail */}
        <SectionCard title="Course thumbnail">
          <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
        </SectionCard>

        {/* Vimeo video */}
        <SectionCard title="Course video" description="Paste any Vimeo link — watch URL or embed URL both work">
          <Field label="Vimeo URL" hint="e.g. https://vimeo.com/123456789">
            <div className="relative">
              <Video className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://vimeo.com/123456789"
                className="pl-8"
              />
            </div>
          </Field>
        </SectionCard>

        {/* Basic info */}
        <SectionCard title="Course details">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Course title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field label="Instructor name" required>
              <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
            </Field>

            <Field label="Instructor role / title">
              <Input value={instructorRole} onChange={(e) => setInstructorRole(e.target.value)} />
            </Field>

            <Field label="Estimated duration (minutes)">
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                min="0"
              />
            </Field>

            <Field label="Category" required>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Leadership level">
              <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Difficulty level" required>
              <Select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as CourseDifficulty)}
              >
                {COURSE_DIFFICULTY_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex flex-col justify-end gap-3 pb-1">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                <span className="text-sm font-medium text-zinc-700">Mandatory course</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                <span className="text-sm font-medium text-zinc-700">Feature on homepage</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <Field label="Short description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Full course overview">
                <Textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={6} />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Leadership targeting */}
        <SectionCard
          title="Leadership cadre targeting"
          description="Select which leadership roles this course is intended for"
        >
          <LeadershipCadreSelect value={leadershipTargets} onChange={setLeadershipTargets} />
        </SectionCard>

        {/* Lessons */}
        <SectionCard
          title="Course content"
          description="Add and organise modules and lessons for this course"
        >
          <Link
            href={`/dashboard/admin/courses/${id}/lessons`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <BookOpen className="size-4" />
            Open lesson builder
          </Link>
        </SectionCard>

        {/* Status */}
        <SectionCard title="Visibility">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus("draft")}
              className={cn(
                "flex-1 rounded-xl border p-4 text-left transition-colors",
                status === "draft"
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <p className="text-sm font-semibold">Draft</p>
              <p className={cn("mt-0.5 text-xs", status === "draft" ? "text-zinc-400" : "text-zinc-500")}>
                Only admins can see this course
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStatus("published")}
              className={cn(
                "flex-1 rounded-xl border p-4 text-left transition-colors",
                status === "published"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <p className="text-sm font-semibold">Published</p>
              <p
                className={cn("mt-0.5 text-xs", status === "published" ? "text-emerald-100" : "text-zinc-500")}
              >
                Visible to targeted leadership cadres
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStatus("archived")}
              className={cn(
                "flex-1 rounded-xl border p-4 text-left transition-colors",
                status === "archived"
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <p className="text-sm font-semibold">Archived</p>
              <p
                className={cn("mt-0.5 text-xs", status === "archived" ? "text-amber-700" : "text-zinc-500")}
              >
                Hidden from new enrollments
              </p>
            </button>
          </div>
        </SectionCard>

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <motion.div variants={shellItem} className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href="/dashboard/admin/courses"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </motion.div>
      </form>
    </DashboardShell>
  );
}

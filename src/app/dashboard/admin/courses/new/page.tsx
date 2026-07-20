"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardCheck, CheckCircle2, Lock, Loader2, Video, Sparkles } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { createCourse } from "@/lib/course-management";
import { ThumbnailUpload } from "@/components/lms/thumbnail-upload";
import { LeadershipCadreSelect } from "@/components/lms/leadership-cadre-select";
import { COURSE_CATEGORIES, type CourseStatus } from "@/lib/lms-types";

// All roles that can create courses — inclusive list covering renamed roles
const CREATOR_ROLES = [
  "Platform Super Admin",
  "Super Admin",
  "Admin",
  "Group Pastor",
  "Sub-Group Pastor",
  "Subgroup Pastor",
  "Sub-group Pastor",
  "Campus Pastor",
  "Campus Admin",
  "Group Admin",
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

export default function NewCoursePage() {
  const router = useRouter();

  // Auth check — runs in background, does NOT block form rendering
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const authCheckRan = useRef(false);

  useEffect(() => {
    if (authCheckRan.current) return;
    authCheckRan.current = true;

    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setAuthorized(false);
          setAuthChecked(true);
          return;
        }

        const { data, error: dbError } = await supabase
          .from("users")
          .select("role, group_id, campus_id")
          .eq("id", user.id)
          .maybeSingle();

        if (dbError) {
          // DB error — can't determine role, deny for safety
          setAuthorized(false);
          setAuthChecked(true);
          return;
        }

        const role = data?.role ?? "";
        setUserRole(role);
        setCreatorScope(role === "Group Admin" ? { management_scope: "group" as const, group_id: data?.group_id ?? null, campus_id: null } : role === "Campus Admin" ? { management_scope: "campus" as const, group_id: null, campus_id: data?.campus_id ?? null } : { management_scope: "platform" as const, group_id: null, campus_id: null });
        setAuthorized(CREATOR_ROLES.includes(role));
        setAuthChecked(true);
      } catch {
        // Network or unexpected error — deny for safety
        setAuthorized(false);
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [overview, setOverview] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [category, setCategory] = useState<string>(COURSE_CATEGORIES[0]);
  const [leadershipTargets, setLeadershipTargets] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [creatorScope, setCreatorScope] = useState<{ management_scope: "platform" | "group" | "campus"; group_id: string | null; campus_id: string | null }>({ management_scope: "platform", group_id: null, campus_id: null });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Auth check complete and unauthorized
    if (authChecked && !authorized) {
      setError(`Your role (${userRole || "unknown"}) does not have permission to create courses. Contact a Platform Super Admin.`);
      return;
    }

    if (!title.trim() || !instructorName.trim()) {
      setError("Course title and instructor name are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const { course, error: saveError } = await createCourse({
      title,
      description,
      overview,
      thumbnail_url: thumbnailUrl,
      video_url: videoUrl,
      instructor_name: instructorName,
      instructor_title: "",
      instructor_role: "",
      difficulty_level: "Foundational",
      category,
      leadership_targets: leadershipTargets,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : 0,
      is_required: isRequired,
      is_featured: isFeatured,
      status,
      ...creatorScope,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    if (course?.id) {
      setCreatedCourseId(course.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/dashboard/admin/courses");
    }
  }

  // Show access-denied state after auth check completes and user is not authorized
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
            Course creation is available to Platform Super Admins, Group Pastors, and Campus Pastors.
            {userRole ? (
              <>
                {" "}Your current role is{" "}
                <span className="font-medium text-zinc-700">{userRole}</span>.
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Contact your Platform Super Admin to request access.
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

  if (createdCourseId) {
    return (
      <DashboardShell showDate={false}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-20 px-8 text-center"
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-emerald-900">Course created!</h2>
          <p className="mt-2 max-w-sm text-sm text-emerald-700">
            Your course has been saved. Would you like to add an assessment before publishing?
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/dashboard/admin/courses/${createdCourseId}/assessment`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <ClipboardCheck className="size-4" />
              Add assessment (optional)
            </Link>
            <Link
              href={`/dashboard/admin/courses/${createdCourseId}/lessons`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
            >
              Add lessons
            </Link>
            <Link
              href="/dashboard/admin/courses"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back to courses
            </Link>
          </div>
        </motion.div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell searchPlaceholder="Create course..." showDate={false}>
      {/* Header row */}
      <motion.div variants={shellItem} className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/courses"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <ArrowLeft className="size-4" />
          Back to courses
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-semibold text-zinc-950">New course</h1>
          <p className="text-xs text-zinc-500">Fill in the details and save as draft or publish immediately</p>
        </div>
        <Link
          href="/dashboard/admin/ai-course-builder"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Sparkles className="size-4" />
          Develop with AI
        </Link>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thumbnail */}
        <SectionCard
          title="Course thumbnail"
          description="A compelling image helps leaders recognise this course at a glance"
        >
          <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
        </SectionCard>

        {/* Video */}
        <SectionCard title="Course video" description="Paste a YouTube link. Vimeo and direct video links still work.">
          <Field label="Video URL" hint="e.g. https://www.youtube.com/watch?v=...">
            <div className="relative">
              <Video className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="pl-8"
              />
            </div>
          </Field>
        </SectionCard>

        {/* Basic info */}
        <SectionCard title="Course details" description="Core information about this course">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Course title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Executive Ministry Leadership"
              />
            </Field>

            <Field label="Instructor name" required>
              <Input
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="Pastor Bolaji Idowu"
              />
            </Field>

            <Field
              label="Estimated duration (minutes)"
              hint="Leave blank to auto-calculate from lessons later"
            >
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="90"
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
              <Field label="Short description" hint="Shown on course cards and search results">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A focused journey through the principles of executive-level ministry oversight..."
                  rows={3}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field
                label="Full course overview"
                hint="Detailed description shown on the course detail page"
              >
                <Textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  placeholder="In this comprehensive course, leaders will explore the theological and practical dimensions of..."
                  rows={6}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Leadership targeting */}
        <SectionCard
          title="Course audience targeting"
          description="Select attendees, members, workers, or leadership cadres for this course. Leave empty to make it visible to all roles."
        >
          <LeadershipCadreSelect value={leadershipTargets} onChange={setLeadershipTargets} />
        </SectionCard>

        {/* Publish status */}
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
              <p className="text-sm font-semibold">Save as draft</p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  status === "draft" ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                Only you and admins can see this course
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
              <p className="text-sm font-semibold">Publish immediately</p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  status === "published" ? "text-emerald-100" : "text-zinc-500"
                )}
              >
                Visible to all targeted leadership cadres
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
            {saving
              ? "Creating course..."
              : status === "published"
                ? "Publish course"
                : "Save as draft"}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { createCourse } from "@/lib/course-management";
import { ThumbnailUpload } from "@/components/lms/thumbnail-upload";
import { LeadershipCadreSelect } from "@/components/lms/leadership-cadre-select";
import { COURSE_CATEGORIES, COURSE_DIFFICULTY_LEVELS, type CourseDifficulty, type CourseStatus } from "@/lib/lms-types";

const ALLOWED_ROLES = ["Platform Super Admin", "Group Pastor", "Sub-Group Pastor", "Subgroup Pastor", "Campus Pastor"];

const LEVELS = ["All leaders", "Senior leaders", "Directors", "Campus teams", "Team leads", "Coordinators", "Academy admins", "Cell leaders"];

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">
        {label}{required ? <span className="ml-0.5 text-red-500">*</span> : null}
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
      className={cn("w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300", className)}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn("w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none", className)}
    />
  );
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={cn("w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300", className)}
    >
      {children}
    </select>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [overview, setOverview] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
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
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthorized(false); return; }
      const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
      setAuthorized(ALLOWED_ROLES.includes(data?.role ?? ""));
    }
    checkAuth();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !instructorName.trim()) {
      setError("Course title and instructor name are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: saveError } = await createCourse({
      title,
      description,
      overview,
      thumbnail_url: thumbnailUrl,
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

  if (authorized === null) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </div>
      </DashboardShell>
    );
  }

  if (!authorized) {
    return (
      <DashboardShell showDate={false}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20">
          <p className="font-heading text-lg font-semibold text-zinc-950">Access restricted</p>
          <p className="mt-1 text-sm text-zinc-500">Only Platform Super Admins and Group Pastors can create courses.</p>
          <Button asChild className="mt-5 rounded-lg bg-black text-white hover:bg-zinc-800">
            <Link href="/dashboard/admin/courses">Back to courses</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell searchPlaceholder="Create course..." showDate={false}>
      <motion.div variants={shellItem} className="flex items-center gap-4">
        <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
          <Link href="/dashboard/admin/courses">
            <ArrowLeft className="size-4" />
            Back to courses
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold text-zinc-950">New course</h1>
          <p className="text-xs text-zinc-500">Fill in the details and save as draft or publish immediately</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thumbnail */}
        <SectionCard title="Course thumbnail" description="A compelling image helps leaders recognise this course at a glance">
          <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
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

            <Field label="Instructor role / title">
              <Input
                value={instructorRole}
                onChange={(e) => setInstructorRole(e.target.value)}
                placeholder="Senior Pastor, Harvesters International"
              />
            </Field>

            <Field label="Estimated duration (minutes)" hint="Leave blank to auto-calculate from lessons later">
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
                {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Leadership level">
              <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>

            <Field label="Difficulty level" required>
              <Select value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value as CourseDifficulty)}>
                {COURSE_DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>

            <div className="flex flex-col justify-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="size-4 rounded border-zinc-300" />
                <span className="text-sm font-medium text-zinc-700">Mandatory course</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 rounded border-zinc-300" />
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
              <Field label="Full course overview" hint="Detailed description shown on the course detail page">
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
          title="Leadership cadre targeting"
          description="Select which leadership roles this course is intended for. Leave empty to make it visible to all roles."
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
              <p className={cn("mt-0.5 text-xs", status === "draft" ? "text-zinc-400" : "text-zinc-500")}>
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
              <p className={cn("mt-0.5 text-xs", status === "published" ? "text-emerald-100" : "text-zinc-500")}>
                Visible to all targeted leadership cadres
              </p>
            </button>
          </div>
        </SectionCard>

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <motion.div variants={shellItem} className="flex gap-3 pb-6">
          <Button type="submit" disabled={saving} className="rounded-lg bg-black text-white hover:bg-zinc-800">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Creating course..." : status === "published" ? "Publish course" : "Save as draft"}
          </Button>
          <Button type="button" asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
            <Link href="/dashboard/admin/courses">Cancel</Link>
          </Button>
        </motion.div>
      </form>
    </DashboardShell>
  );
}

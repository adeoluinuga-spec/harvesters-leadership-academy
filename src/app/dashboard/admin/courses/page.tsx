"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ClipboardCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAdminCourses, changeCourseStatus, deleteCourse } from "@/lib/course-management";
import type { AdminCourse, CourseStatus } from "@/lib/lms-types";
import { formatDuration } from "@/lib/lms-types";

type FilterTab = "all" | "published" | "draft" | "required";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All courses" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "required", label: "Mandatory" },
];

function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide",
        status === "published" && "bg-emerald-50 text-emerald-700",
        status === "draft" && "bg-zinc-100 text-zinc-500",
        status === "archived" && "bg-amber-50 text-amber-700"
      )}
    >
      {status}
    </span>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Foundational: "bg-blue-50 text-blue-700",
    Intermediate: "bg-violet-50 text-violet-700",
    Advanced: "bg-orange-50 text-orange-700",
    Executive: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium", colors[level] ?? "bg-zinc-100 text-zinc-500")}>
      {level}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ElementType; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className={cn("flex size-10 items-center justify-center rounded-lg", accent)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-zinc-950">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function CourseCard({ course, onStatusChange, onDelete }: {
  course: AdminCourse;
  onStatusChange: (id: string, status: CourseStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    setBusy(true);
    setMenuOpen(false);
    const currentStatus: CourseStatus = course.status ?? (course.is_published ? "published" : "draft");
    const next: CourseStatus = currentStatus === "published" ? "draft" : "published";
    await changeCourseStatus(course.id, next);
    onStatusChange(course.id, next);
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    setMenuOpen(false);
    setBusy(true);
    await deleteCourse(course.id);
    onDelete(course.id);
    setBusy(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="size-10 text-zinc-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <StatusBadge status={course.status ?? (course.is_published ? "published" : "draft")} />
          {course.is_required && (
            <span className="inline-flex h-5 items-center rounded-full bg-rose-600 px-2 text-[10px] font-semibold uppercase tracking-wide text-white">
              Required
            </span>
          )}
          {course.is_featured && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-amber-400/90 px-1.5">
              <Star className="size-2.5 fill-white text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-zinc-400">{course.category}</p>
          <DifficultyBadge level={course.difficulty_level ?? "Foundational"} />
        </div>
        <h3 className="font-heading mb-1 line-clamp-2 text-sm font-semibold text-zinc-950">{course.title}</h3>
        <p className="mb-3 text-xs text-zinc-500">{course.instructor_name}</p>

        {/* Stats row */}
        <div className="mb-3 flex items-center gap-4 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <BookOpen className="size-3.5" />
            {course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Users className="size-3.5" />
            {course.enrollment_count} enrolled
          </div>
          {course.duration_minutes > 0 && (
            <div className="ml-auto text-xs text-zinc-400">{formatDuration(course.duration_minutes)}</div>
          )}
        </div>

        {/* Leadership targets */}
        {(course.leadership_targets ?? []).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {(course.leadership_targets ?? []).slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">{t}</span>
            ))}
            {(course.leadership_targets ?? []).length > 3 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">+{(course.leadership_targets ?? []).length - 3} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/admin/courses/${course.id}/edit`}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <Link
            href={`/dashboard/admin/courses/${course.id}/lessons`}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <BookOpen className="size-3.5" />
            Lessons
          </Link>
          <Link
            href={`/dashboard/admin/courses/${course.id}/assessment`}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ClipboardCheck className="size-3.5" />
            Assessment
          </Link>

          <div className="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg border-zinc-200 bg-white px-2.5"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-3.5" />}
            </Button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                >
                  <button
                    onClick={togglePublish}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    {(course.status ?? (course.is_published ? "published" : "draft")) === "published" ? (
                      <><EyeOff className="size-3.5" /> Unpublish</>
                    ) : (
                      <><Eye className="size-3.5" /> Publish</>
                    )}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" /> Delete course
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
      )}
    </motion.div>
  );
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    fetchAdminCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  function handleStatusChange(id: string, status: CourseStatus) {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status, is_published: status === "published" } : c));
  }

  function handleDelete(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = courses.filter((c) => {
    if (filter === "published") return c.status === "published";
    if (filter === "draft") return c.status === "draft";
    if (filter === "required") return c.is_required;
    return true;
  });

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === "published").length,
    drafts: courses.filter((c) => c.status === "draft").length,
    required: courses.filter((c) => c.is_required).length,
  };

  return (
    <DashboardShell searchPlaceholder="Search courses..." showDate={false}>
      {/* Header */}
      <motion.div variants={shellItem} className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-zinc-950">Course Management</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Create, manage, and publish courses for your leadership community</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/courses/new")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="size-4" />
          New course
        </button>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={shellItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total courses" value={stats.total} icon={GraduationCap} accent="bg-zinc-100 text-zinc-600" />
        <StatCard label="Published" value={stats.published} icon={Eye} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Drafts" value={stats.drafts} icon={BookOpen} accent="bg-blue-50 text-blue-600" />
        <StatCard label="Mandatory" value={stats.required} icon={Star} accent="bg-rose-50 text-rose-600" />
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={shellItem} className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              filter === tab.key
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Course grid */}
      <motion.div variants={shellItem}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-zinc-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20">
            <GraduationCap className="size-10 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-500">
              {filter === "all" ? "No courses yet" : `No ${filter} courses`}
            </p>
            {filter === "all" && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/courses/new")}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                Create your first course
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </DashboardShell>
  );
}

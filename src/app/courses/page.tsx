"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  EyeOff,
  Eye,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";

import {
  DashboardShell,
  shellContainer,
  shellItem,
} from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fetchCourseCatalog } from "@/lib/lms";
import type { CatalogCourses } from "@/lib/lms";
import type { CourseWithProgress } from "@/lib/lms-types";
import { formatDuration, LEADERSHIP_CADRES } from "@/lib/lms-types";

const ADMIN_ROLES = ["Platform Super Admin", "Super Admin", "Admin"];

type Tab = "all" | "in-progress" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All Courses" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

type AdminCallbacks = {
  onToggleVisibility: (course: CourseWithProgress) => void;
  onRestrictRequest: (course: CourseWithProgress) => void;
  onDeleteRequest: (course: CourseWithProgress) => void;
  confirmDeleteId: string | null;
  actionLoadingId: string | null;
};

function CourseCard({
  course,
  isAdmin,
  adminCb,
}: {
  course: CourseWithProgress;
  isAdmin: boolean;
  adminCb?: AdminCallbacks;
}) {
  const completed = Boolean(course.certificate);
  const inProgress = course.enrolled && !completed;
  const isHidden = course.status !== "published" && !course.is_published;

  const cta = completed ? "View Certificate" : inProgress ? "Continue" : "Enrol now";
  const ctaHref = completed
    ? `/courses/${course.slug}/certificate`
    : inProgress
    ? `/courses/${course.slug}/learn`
    : `/courses/${course.slug}`;

  const isConfirmingDelete = adminCb?.confirmDeleteId === course.id;
  const isActioning = adminCb?.actionLoadingId === course.id;

  return (
    <motion.article variants={shellItem} whileHover={{ y: -4 }} className="h-full">
      <div className={cn(
        "flex h-full flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-zinc-200/70",
        isHidden ? "border-zinc-300 opacity-75" : "border-zinc-200"
      )}>
        <Link
          href={`/courses/${course.slug}`}
          className="group relative block aspect-[16/10] overflow-hidden rounded-t-xl bg-zinc-900"
        >
          {course.thumbnail_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${course.thumbnail_url})` }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="size-12 text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <Badge className="absolute left-4 top-4 rounded-md border-white/15 bg-white/90 text-zinc-900 hover:bg-white">
            {course.category}
          </Badge>
          {isHidden ? (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs font-semibold text-white">
              <EyeOff className="size-3" />
              Hidden
            </div>
          ) : completed ? (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white">
              <CheckCircle2 className="size-3.5" />
              Completed
            </div>
          ) : course.is_required ? (
            <div className="absolute right-4 top-4 rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
              Required
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div>
              <p className="text-xs text-white/70">{course.level}</p>
              <p className="font-heading mt-1 line-clamp-2 text-lg font-semibold leading-snug">
                {course.title}
              </p>
            </div>
            <PlayCircle className="size-8 shrink-0 text-white/85" />
          </div>
        </Link>

        <CardContent className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-950">{course.instructor_name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {course.total_lessons > 0 ? `${course.total_lessons} lessons` : "—"}
              </span>
              <span className="flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {formatDuration(course.duration_minutes)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {course.enrolled ? "Enrolled" : "Open"}
              </span>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {!isAdmin && (
              course.enrolled ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Progress</span>
                    <span className="font-semibold text-zinc-900">{course.progress_percent}%</span>
                  </div>
                  <Progress
                    value={course.progress_percent}
                    className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  {(course.leadership_targets ?? []).length > 0
                    ? `For: ${(course.leadership_targets ?? []).slice(0, 2).join(", ")}${(course.leadership_targets ?? []).length > 2 ? ` +${(course.leadership_targets ?? []).length - 2} more` : ""}`
                    : "Available to all leaders"}
                </div>
              )
            )}

            {isAdmin && adminCb ? (
              <div className="space-y-2">
                {/* Leadership targets chip */}
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  {(course.leadership_targets ?? []).length > 0
                    ? `Restricted: ${(course.leadership_targets ?? []).slice(0, 2).join(", ")}${(course.leadership_targets ?? []).length > 2 ? ` +${(course.leadership_targets ?? []).length - 2}` : ""}`
                    : "Visible to all leaders"}
                </div>

                {/* Delete confirmation banner */}
                {isConfirmingDelete && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
                    <p className="font-medium text-rose-800">Delete this course?</p>
                    <p className="mt-0.5 text-rose-600">This cannot be undone.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => adminCb.onDeleteRequest(course)}
                        disabled={isActioning}
                        className="flex h-7 items-center gap-1 rounded-md bg-rose-600 px-3 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {isActioning ? <Loader2 className="size-3 animate-spin" /> : null}
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => adminCb.onDeleteRequest({ ...course, id: "" })}
                        className="flex h-7 items-center rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin CTA row */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/admin/courses/${course.id}/edit`}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    <Pencil className="size-3.5" />
                    Edit course
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => adminCb.onToggleVisibility(course)}
                        disabled={isActioning}
                        className="gap-2"
                      >
                        {isHidden ? (
                          <>
                            <Eye className="size-4 text-emerald-600" />
                            <span>Show course</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-4 text-zinc-500" />
                            <span>Hide course</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => adminCb.onRestrictRequest(course)}
                        className="gap-2"
                      >
                        <ShieldOff className="size-4 text-zinc-500" />
                        Restrict access
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => adminCb.onDeleteRequest(course)}
                        className="gap-2 text-rose-600 focus:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                        Delete course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <Link
                href={ctaHref}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  completed
                    ? "border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50"
                    : "bg-black text-white hover:bg-zinc-800"
                )}
              >
                {cta}
              </Link>
            )}
          </div>
        </CardContent>
      </div>
    </motion.article>
  );
}

function RequiredSection({
  courses,
  isAdmin,
  adminCb,
}: {
  courses: CourseWithProgress[];
  isAdmin: boolean;
  adminCb?: AdminCallbacks;
}) {
  if (!courses.length) return null;
  return (
    <motion.section variants={shellItem} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-rose-600" />
          <h2 className="font-heading text-lg font-semibold text-zinc-950">
            Required for your role
          </h2>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
          {courses.length} course{courses.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} isAdmin={isAdmin} adminCb={adminCb} />
        ))}
      </div>
    </motion.section>
  );
}

function PathwaySection({
  courses,
  userRole,
  isAdmin,
  adminCb,
}: {
  courses: CourseWithProgress[];
  userRole: string;
  isAdmin: boolean;
  adminCb?: AdminCallbacks;
}) {
  if (!courses.length) return null;
  return (
    <motion.section variants={shellItem} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-violet-600" />
          <h2 className="font-heading text-lg font-semibold text-zinc-950">
            Your Leadership Pathway
          </h2>
        </div>
        {userRole ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {userRole}
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} isAdmin={isAdmin} adminCb={adminCb} />
        ))}
      </div>
    </motion.section>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogCourses | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Admin action state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [restrictCourse, setRestrictCourse] = useState<CourseWithProgress | null>(null);
  const [restrictTargets, setRestrictTargets] = useState<string[]>([]);
  const [restrictSaving, setRestrictSaving] = useState(false);

  useEffect(() => {
    fetchCourseCatalog()
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isAdmin = ADMIN_ROLES.includes(catalog?.userRole ?? "");
  const allCourses = catalog?.all ?? [];
  const required = catalog?.required ?? [];
  const pathway = catalog?.pathway ?? [];

  const filtered = allCourses.filter((c) => {
    if (activeTab === "in-progress") return c.enrolled && !c.certificate;
    if (activeTab === "completed") return Boolean(c.certificate);
    return true;
  });

  const enrolledCount = allCourses.filter((c) => c.enrolled).length;
  const completedCount = allCourses.filter((c) => c.certificate).length;

  const stats = [
    { label: "Available courses", value: String(allCourses.length), detail: isAdmin ? "All courses" : "Filtered for your role" },
    { label: "Enrolled", value: String(enrolledCount), detail: "Active learning tracks" },
    { label: "Completed", value: String(completedCount), detail: "Certificates earned" },
  ];

  // --- Admin action handlers ---

  const handleToggleVisibility = useCallback(async (course: CourseWithProgress) => {
    setActionLoadingId(course.id);
    try {
      const res = await fetch("/api/lms/admin-course-actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id, action: "toggle-visibility" }),
      });
      if (res.ok) {
        const { status } = await res.json();
        setCatalog((prev) => {
          if (!prev) return prev;
          const update = (arr: CourseWithProgress[]) =>
            arr.map((c) =>
              c.id === course.id ? { ...c, status, is_published: status === "published" } : c
            );
          return { ...prev, all: update(prev.all), required: update(prev.required), pathway: update(prev.pathway) };
        });
      }
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const handleDeleteRequest = useCallback((course: CourseWithProgress) => {
    // Empty id = cancel
    if (!course.id) {
      setConfirmDeleteId(null);
      return;
    }
    // First click = ask for confirmation
    if (confirmDeleteId !== course.id) {
      setConfirmDeleteId(course.id);
      return;
    }
    // Second click = actually delete
    setActionLoadingId(course.id);
    fetch(`/api/lms/admin-course-actions?course_id=${course.id}`, { method: "DELETE" })
      .then((res) => {
        if (res.ok) {
          setCatalog((prev) => {
            if (!prev) return prev;
            const filter = (arr: CourseWithProgress[]) => arr.filter((c) => c.id !== course.id);
            return { ...prev, all: filter(prev.all), required: filter(prev.required), pathway: filter(prev.pathway) };
          });
          setConfirmDeleteId(null);
        }
      })
      .finally(() => setActionLoadingId(null));
  }, [confirmDeleteId]);

  const handleRestrictRequest = useCallback((course: CourseWithProgress) => {
    setRestrictCourse(course);
    setRestrictTargets(course.leadership_targets ?? []);
  }, []);

  const handleRestrictSave = useCallback(async () => {
    if (!restrictCourse) return;
    setRestrictSaving(true);
    try {
      const res = await fetch("/api/lms/admin-course-actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: restrictCourse.id, action: "restrict", leadership_targets: restrictTargets }),
      });
      if (res.ok) {
        setCatalog((prev) => {
          if (!prev) return prev;
          const update = (arr: CourseWithProgress[]) =>
            arr.map((c) =>
              c.id === restrictCourse.id ? { ...c, leadership_targets: restrictTargets } : c
            );
          return { ...prev, all: update(prev.all), required: update(prev.required), pathway: update(prev.pathway) };
        });
        setRestrictCourse(null);
      }
    } finally {
      setRestrictSaving(false);
    }
  }, [restrictCourse, restrictTargets]);

  const adminCb: AdminCallbacks = {
    onToggleVisibility: handleToggleVisibility,
    onRestrictRequest: handleRestrictRequest,
    onDeleteRequest: handleDeleteRequest,
    confirmDeleteId,
    actionLoadingId,
  };

  return (
    <DashboardShell searchPlaceholder="Search courses, tracks, instructors..." showDate={false}>
      {/* Hero */}
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              {isAdmin ? "Course management" : "Course library"}
            </Badge>
            <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Leadership Growth Tracks
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
              {isAdmin
                ? "Manage courses, visibility, access restrictions, and assessments."
                : "Equip leaders across Harvesters with world-class ministry intelligence."}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/courses/new")}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                New course
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
                    <div className="h-3 w-24 rounded bg-zinc-200" />
                    <div className="mt-3 h-7 w-12 rounded bg-zinc-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-zinc-200" />
                  </div>
                ))
              : stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                      {stat.label}
                    </p>
                    <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
                  </div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <motion.section variants={shellItem} className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "h-9 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.section>

      {/* Content */}
      {loading ? (
        <motion.div variants={shellItem} className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-zinc-300" />
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={shellItem}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20"
        >
          <GraduationCap className="size-10 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-500">
            {activeTab === "in-progress"
              ? "No courses in progress"
              : activeTab === "completed"
              ? "No completed courses yet"
              : "No courses available"}
          </p>
          {activeTab === "all" && isAdmin && (
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/courses/new")}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              Create your first course
            </button>
          )}
        </motion.div>
      ) : activeTab === "all" ? (
        <motion.div variants={shellContainer} className="space-y-8">
          <RequiredSection courses={required} isAdmin={isAdmin} adminCb={isAdmin ? adminCb : undefined} />
          <PathwaySection courses={pathway} userRole={catalog?.userRole ?? ""} isAdmin={isAdmin} adminCb={isAdmin ? adminCb : undefined} />
          {(required.length > 0 || pathway.length > 0) && (
            <motion.div variants={shellItem} className="space-y-3">
              <h2 className="font-heading text-lg font-semibold text-zinc-950">All Courses</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CourseCard key={c.id} course={c} isAdmin={isAdmin} adminCb={isAdmin ? adminCb : undefined} />
                ))}
              </div>
            </motion.div>
          )}
          {required.length === 0 && pathway.length === 0 && (
            <motion.div variants={shellContainer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard key={c.id} course={c} isAdmin={isAdmin} adminCb={isAdmin ? adminCb : undefined} />
              ))}
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={shellContainer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} isAdmin={isAdmin} adminCb={isAdmin ? adminCb : undefined} />
          ))}
        </motion.div>
      )}

      {/* Restrict access sheet */}
      <Sheet open={Boolean(restrictCourse)} onOpenChange={(open) => { if (!open) setRestrictCourse(null); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
            <SheetTitle className="font-heading text-lg font-semibold text-zinc-950">
              Restrict access
            </SheetTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Select which leadership cadres can see <span className="font-medium text-zinc-800">{restrictCourse?.title}</span>.
              Leave all unchecked to make it visible to everyone.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              {LEADERSHIP_CADRES.map((cadre) => {
                const checked = restrictTargets.includes(cadre);
                return (
                  <label
                    key={cadre}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setRestrictTargets((prev) =>
                          checked ? prev.filter((t) => t !== cadre) : [...prev, cadre]
                        )
                      }
                      className="size-4 rounded accent-zinc-950"
                    />
                    <span className="text-sm font-medium text-zinc-800">{cadre}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 border-t border-zinc-100 px-6 py-4">
            <Button
              onClick={handleRestrictSave}
              disabled={restrictSaving}
              className="flex-1 bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {restrictSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {restrictSaving ? "Saving..." : "Save restrictions"}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" className="border-zinc-200">
                Cancel
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardShell>
  );
}

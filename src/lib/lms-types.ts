export type CourseStatus = "draft" | "published" | "archived";
export type CourseDifficulty = "Foundational" | "Intermediate" | "Advanced" | "Executive";

export const LEADERSHIP_CADRES = [
  "Cell Leader",
  "Assistant HOD",
  "Zonal Leader",
  "HOD",
  "Community Leader",
  "Area Leader",
  "Directional Leader",
  "Campus Pastor",
  "Subgroup Pastor",
  "Sub-Group Pastor",
  "Group Pastor",
  "Campus Admin",
] as const;

export type LeadershipCadre = (typeof LEADERSHIP_CADRES)[number];

export const COURSE_CATEGORIES = [
  "Leadership",
  "Operations",
  "Discipleship",
  "Care",
  "Volunteer Growth",
  "Assessment",
  "Strategy",
  "Prayer",
  "Evangelism",
  "Finance",
  "General",
] as const;

export const COURSE_DIFFICULTY_LEVELS: CourseDifficulty[] = [
  "Foundational",
  "Intermediate",
  "Advanced",
  "Executive",
];

export type LMSCourse = {
  id: string;
  organization_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  overview: string | null;
  thumbnail_url: string | null;
  category: string;
  level: string;
  instructor_name: string;
  instructor_title: string | null;
  instructor_role: string | null;
  duration_minutes: number;
  leadership_targets: string[];
  difficulty_level: CourseDifficulty;
  is_required: boolean;
  is_published: boolean;
  is_featured: boolean;
  status: CourseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminCourse = LMSCourse & {
  lesson_count: number;
  enrollment_count: number;
};

export type LMSModule = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons?: LMSLesson[];
};

export type LMSResource = {
  title: string;
  url: string;
  type: "pdf" | "link" | "video";
};

export type LMSLesson = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  transcript: string | null;
  resources: LMSResource[];
  order_index: number;
  is_preview: boolean;
  has_checkpoint: boolean;
  checkpoint_question: string | null;
  completed?: boolean;
  watch_seconds?: number;
};

export type LMSEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
};

export type LMSLessonProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at: string | null;
  watch_seconds: number;
};

export type LMSAssessment = {
  id: string;
  course_id: string;
  title: string;
  passing_score: number;
  is_required: boolean;
  questions?: LMSQuestion[];
};

export type LMSQuestion = {
  id: string;
  assessment_id: string;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  order_index: number;
};

export type LMSAttempt = {
  id: string;
  user_id: string;
  assessment_id: string;
  course_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, number>;
  attempted_at: string;
};

export type LMSCertificate = {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_number: string;
  course?: Pick<LMSCourse, "slug" | "title" | "category" | "level" | "instructor_name" | "thumbnail_url">;
};

export type LMSNote = {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CourseWithProgress = LMSCourse & {
  lesson_count: number;
  enrolled: boolean;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  certificate: LMSCertificate | null;
  best_attempt: LMSAttempt | null;
};

export type CourseWithLessons = LMSCourse & {
  lessons: LMSLesson[];
  modules: LMSModule[];
  assessment: LMSAssessment | null;
  enrolled: boolean;
  progress_percent: number;
  completed_lesson_ids: Set<string>;
  certificate: LMSCertificate | null;
  best_attempt: LMSAttempt | null;
};

export function formatDuration(minutes: number): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type CourseStatus = "not-enrolled" | "in-progress" | "completed";

export type Course = {
  id: string;
  title: string;
  category: string;
  instructor: string;
  lessons: number;
  duration: string;
  enrolled: string;
  progress: number;
  status: CourseStatus;
  thumbnail: string;
  level: string;
  description: string;
};

export const courses: Course[] = [
  {
    id: "executive-ministry-leadership",
    title: "Executive Ministry Leadership",
    category: "Leadership",
    instructor: "Pastor Bolaji Idowu",
    lessons: 18,
    duration: "6h 40m",
    enrolled: "2,418",
    progress: 0,
    status: "not-enrolled",
    level: "Senior leaders",
    description:
      "A strategic leadership track for senior ministry leaders building clarity, culture, and execution across campuses.",
    thumbnail:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "culture-teams-stewardship",
    title: "Culture, Teams and Stewardship",
    category: "Operations",
    instructor: "Pastor Mayowa",
    lessons: 24,
    duration: "8h 15m",
    enrolled: "1,892",
    progress: 62,
    status: "in-progress",
    level: "Directors",
    description:
      "Build operating rhythms that help leaders steward people, systems, and ministry momentum with maturity.",
    thumbnail:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "discipleship-systems-masterclass",
    title: "Discipleship Systems Masterclass",
    category: "Discipleship",
    instructor: "Pastor Funke Adeyemi",
    lessons: 16,
    duration: "5h 25m",
    enrolled: "3,104",
    progress: 100,
    status: "completed",
    level: "Campus teams",
    description:
      "A practical framework for designing repeatable discipleship journeys that scale without losing pastoral care.",
    thumbnail:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "pastoral-care-intelligence",
    title: "Pastoral Care Intelligence",
    category: "Care",
    instructor: "Pastor Tola Martins",
    lessons: 14,
    duration: "4h 50m",
    enrolled: "968",
    progress: 38,
    status: "in-progress",
    level: "Team leads",
    description:
      "Equip care leaders with structured listening, escalation, and follow-up practices for healthier communities.",
    thumbnail:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "volunteer-excellence-framework",
    title: "Volunteer Excellence Framework",
    category: "Volunteer Growth",
    instructor: "Kemi Johnson",
    lessons: 20,
    duration: "7h 05m",
    enrolled: "2,760",
    progress: 0,
    status: "not-enrolled",
    level: "Coordinators",
    description:
      "Create a premium volunteer experience with onboarding, coaching, accountability, and meaningful service pathways.",
    thumbnail:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "assessment-design-for-leaders",
    title: "Assessment Design for Leaders",
    category: "Assessment",
    instructor: "Dr. Niyi Adebayo",
    lessons: 12,
    duration: "3h 45m",
    enrolled: "745",
    progress: 100,
    status: "completed",
    level: "Academy admins",
    description:
      "Design assessments that measure ministry readiness, leadership growth, and practical execution.",
    thumbnail:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  },
];

export const recommendedCourses = [
  {
    title: "Leading Through Multiplication",
    category: "Growth Track",
    duration: "4h 20m",
    thumbnail:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Next Gen Ministry Systems",
    category: "Strategy",
    duration: "5h 10m",
    thumbnail:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Data-Informed Discipleship",
    category: "Analytics",
    duration: "3h 35m",
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
  },
];

export const recentlyWatched = [
  { title: "Building healthy serving teams", progress: 72 },
  { title: "Measuring ministry outcomes", progress: 44 },
  { title: "Onboarding new campus leaders", progress: 28 },
  { title: "Coaching through feedback", progress: 86 },
];

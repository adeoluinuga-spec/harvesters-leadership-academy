export type HealthStatus = "Thriving" | "Stable" | "Needs Attention" | "Declining";

export type Campus = {
  id: string;
  name: string;
  group: string;
  groupPastor: string;
  subgroup: string;
  subgroupPastor: string;
  pastor: string;
  leaders: number;
  active: number;
  completion: number;
  engagement: number;
  inactive: number;
  status: HealthStatus;
  departments: Array<{ name: string; performance: number; leaders: number }>;
};

export type Leader = {
  id: string;
  name: string;
  initials: string;
  role: string;
  campus: string;
  subgroup: string;
  group: string;
  campusPastor: string;
  level: string;
  status: "Active" | "Inactive" | "Needs Follow-up" | "Not Enrolled";
  enrolled: boolean;
  engagement: number;
  completion: number;
  coursesCompleted: number;
  certificates: number;
  lastActive: string;
  issue?: string;
};

export const groupAlpha = {
  group: "Group Alpha",
  groupPastor: "Pastor Mayowa Agboade",
};

const departmentSet = [
  { name: "Discipleship", performance: 86, leaders: 48 },
  { name: "Pastoral Care", performance: 78, leaders: 36 },
  { name: "Operations", performance: 82, leaders: 29 },
];

function createCampus(
  id: string,
  name: string,
  subgroup: string,
  subgroupPastor: string,
  pastor: string,
  leaders: number,
  active: number,
  completion: number,
  engagement: number,
  inactive: number,
  status: HealthStatus
): Campus {
  return {
    id,
    name,
    group: groupAlpha.group,
    groupPastor: groupAlpha.groupPastor,
    subgroup,
    subgroupPastor,
    pastor,
    leaders,
    active,
    completion,
    engagement,
    inactive,
    status,
    departments: departmentSet.map((department, index) => ({
      ...department,
      performance: Math.max(48, Math.min(96, department.performance + completion - 78 - index * 2)),
    })),
  };
}

export const campuses: Campus[] = [
  createCampus("ikorodu", "Ikorodu Campus", "Gbagada Subgroup", "Pastor Smart", "Pastor Smart", 176, 143, 64, 69, 28, "Needs Attention"),
  createCampus("magodo", "Magodo Campus", "Magodo Subgroup", "Pastor Gbenga Agboola", "Pastor Emmanuel Onwuka", 224, 207, 88, 91, 7, "Thriving"),
  createCampus("ilupeju", "Ilupeju Campus", "Magodo Subgroup", "Pastor Gbenga Agboola", "Pastor Adeolu Osinuga", 198, 181, 84, 87, 9, "Thriving"),
  createCampus("new-lagos", "New Lagos Campus", "Magodo Subgroup", "Pastor Gbenga Agboola", "Pastor Abiola Adebayo", 186, 163, 76, 80, 14, "Stable"),
  createCampus("ogba", "Ogba Campus", "Magodo Subgroup", "Pastor Gbenga Agboola", "Pastor Bukola Agboola", 172, 151, 72, 77, 16, "Stable"),
  createCampus("jericho", "Jericho Campus", "Jericho Subgroup", "Pastor Lanre Ajala", "Pastor Femi Adetula", 206, 190, 86, 88, 8, "Thriving"),
  createCampus("akobo", "Akobo Campus", "Jericho Subgroup", "Pastor Lanre Ajala", "Pastor Toyosi Katti", 164, 144, 75, 79, 13, "Stable"),
  createCampus("port-harcourt", "Port Harcourt Campus", "Jericho Subgroup", "Pastor Lanre Ajala", "Pastor Daniel Inyang", 236, 219, 89, 92, 6, "Thriving"),
  createCampus("oluyole", "Oluyole Campus", "Jericho Subgroup", "Pastor Lanre Ajala", "Pastor Timothy Wesey", 154, 127, 62, 66, 21, "Needs Attention"),
  createCampus("abeokuta", "Abeokuta Campus", "Jericho Subgroup", "Pastor Lanre Ajala", "Pastor Adejoke", 141, 116, 59, 64, 24, "Needs Attention"),
  createCampus("yaba", "Yaba Campus", "Yaba Subgroup", "Pastor Olumide Aikulola", "Pastor Olawinmi Akinyemi", 228, 211, 87, 90, 7, "Thriving"),
  createCampus("surulere", "Surulere Campus", "Yaba Subgroup", "Pastor Olumide Aikulola", "Pastor Tolu Gbadamosi", 194, 161, 68, 71, 25, "Needs Attention"),
  createCampus("apapa", "Apapa Campus", "Yaba Subgroup", "Pastor Olumide Aikulola", 'Pastor Chucks "Wow" Aniebonam', 158, 132, 70, 74, 18, "Stable"),
];

export const subgroups = [
  { name: "Gbagada Subgroup", pastor: "Pastor Smart" },
  { name: "Magodo Subgroup", pastor: "Pastor Gbenga Agboola" },
  { name: "Jericho Subgroup", pastor: "Pastor Lanre Ajala" },
  { name: "Yaba Subgroup", pastor: "Pastor Olumide Aikulola" },
];

export function getCampusByName(name: string) {
  return campuses.find((campus) => campus.name === name);
}

export const leaders: Leader[] = [
  {
    id: "tomi-adebayo",
    name: "Tomi Adebayo",
    initials: "TA",
    role: "Small Group Coach",
    campus: "Ilupeju Campus",
    subgroup: "Magodo Subgroup",
    group: groupAlpha.group,
    campusPastor: "Pastor Adeolu Osinuga",
    level: "Team Lead",
    status: "Needs Follow-up",
    enrolled: true,
    engagement: 42,
    completion: 38,
    coursesCompleted: 3,
    certificates: 1,
    lastActive: "21 days ago",
    issue: "Inactive for 21 days",
  },
  {
    id: "nkechi-eze",
    name: "Nkechi Eze",
    initials: "NE",
    role: "Volunteer Coordinator",
    campus: "Oluyole Campus",
    subgroup: "Jericho Subgroup",
    group: groupAlpha.group,
    campusPastor: "Pastor Timothy Wesey",
    level: "Coordinator",
    status: "Needs Follow-up",
    enrolled: true,
    engagement: 56,
    completion: 41,
    coursesCompleted: 2,
    certificates: 0,
    lastActive: "6 days ago",
    issue: "Low completion pace",
  },
  {
    id: "david-okafor",
    name: "David Okafor",
    initials: "DO",
    role: "Campus Operations Lead",
    campus: "Magodo Campus",
    subgroup: "Magodo Subgroup",
    group: groupAlpha.group,
    campusPastor: "Pastor Emmanuel Onwuka",
    level: "Director",
    status: "Active",
    enrolled: true,
    engagement: 91,
    completion: 88,
    coursesCompleted: 9,
    certificates: 4,
    lastActive: "Today",
  },
  {
    id: "bisi-lawal",
    name: "Bisi Lawal",
    initials: "BL",
    role: "Pastoral Care Lead",
    campus: "Yaba Campus",
    subgroup: "Yaba Subgroup",
    group: groupAlpha.group,
    campusPastor: "Pastor Olawinmi Akinyemi",
    level: "Team Lead",
    status: "Active",
    enrolled: true,
    engagement: 84,
    completion: 79,
    coursesCompleted: 7,
    certificates: 3,
    lastActive: "Yesterday",
  },
  {
    id: "amara-okorie",
    name: "Amara Okorie",
    initials: "AO",
    role: "Worship Team Lead",
    campus: "Surulere Campus",
    subgroup: "Yaba Subgroup",
    group: groupAlpha.group,
    campusPastor: "Pastor Tolu Gbadamosi",
    level: "Emerging Leader",
    status: "Not Enrolled",
    enrolled: false,
    engagement: 0,
    completion: 0,
    coursesCompleted: 0,
    certificates: 0,
    lastActive: "Pending invite",
    issue: "Not enrolled",
  },
];

export const subgroupInsights = [
  "Leadership participation rate improved significantly this month.",
  "Multiple campuses require focused pastoral follow-up this week.",
  "Academy certificate counts are tracking ahead of quarterly targets.",
  "12 leaders across your subgroup qualify for a promotion review.",
];

export const activityItems = [
  "42 lessons completed across the subgroup this week.",
  "18 new certificates issued in the current cohort.",
  "24 leaders enrolled into Culture, Teams and Stewardship.",
  "11 mentorship notes submitted by campus teams.",
];

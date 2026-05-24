"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ============================================================
// Weekly Trend — enrollments vs certificates
// ============================================================

type TrendPoint = { week: string; enrollments: number; certificates: number };

export function WeeklyTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return <ChartEmpty label="No trend data yet" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
          labelStyle={{ fontWeight: 600, color: "#09090b" }}
        />
        <Line
          type="monotone"
          dataKey="enrollments"
          stroke="#09090b"
          strokeWidth={2}
          dot={false}
          name="Enrollments"
        />
        <Line
          type="monotone"
          dataKey="certificates"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          name="Certificates"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Campus Completion Bar Chart
// ============================================================

type CampusBar = { campusName: string; completionRate: number; enrolledLeaders: number };

export function CampusCompletionChart({ data }: { data: CampusBar[] }) {
  const trimmed = data.slice(0, 8).map((d) => ({
    ...d,
    campusName: d.campusName.replace(/^Harvesters\s+/i, "").replace(/\s+Campus$/i, ""),
  }));
  if (!trimmed.length) return <ChartEmpty label="No campus data yet" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trimmed} margin={{ top: 4, right: 8, left: -24, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="campusName"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
          formatter={(v) => [`${v}%`, "Completion"]}
        />
        <Bar dataKey="completionRate" fill="#09090b" radius={[4, 4, 0, 0]} name="Completion" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Enrollment vs Completion Donut
// ============================================================

type DonutProps = { enrolled: number; completed: number; total: number };

export function EnrollmentDonut({ enrolled, completed, total }: DonutProps) {
  const notEnrolled = Math.max(0, total - enrolled);
  const inProgress = Math.max(0, enrolled - completed);
  const data = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#09090b" },
    { name: "Not Enrolled", value: notEnrolled, color: "#f4f4f5" },
  ].filter((d) => d.value > 0);

  if (total === 0) return <ChartEmpty label="No leaders yet" />;

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="relative flex items-center justify-center">
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          cx={75}
          cy={75}
          innerRadius={50}
          outerRadius={72}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-2xl font-semibold text-zinc-950">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">Completed</span>
      </div>
    </div>
  );
}

// ============================================================
// Course Enrollment Horizontal Bar
// ============================================================

type CourseBar = { title: string; enrollments: number; completionRate: number };

export function CourseEnrollmentChart({ data }: { data: CourseBar[] }) {
  const trimmed = data.slice(0, 6).map((d) => ({
    ...d,
    title: d.title.length > 24 ? d.title.slice(0, 22) + "…" : d.title,
  }));
  if (!trimmed.length) return <ChartEmpty label="No course data yet" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        layout="vertical"
        data={trimmed}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="title"
          type="category"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
        />
        <Bar dataKey="enrollments" fill="#09090b" radius={[0, 4, 4, 0]} name="Enrollments" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Shared empty state
// ============================================================

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center">
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}

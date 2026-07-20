"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { ADMIN_COURSE_ROLES } from "@/lib/roles";

export default function AdminCoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...ADMIN_COURSE_ROLES]}>
      {children}
    </ProtectedRoute>
  );
}

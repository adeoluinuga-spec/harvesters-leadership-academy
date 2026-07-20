"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PLATFORM_ADMIN_ROLES } from "@/lib/roles";

export default function AdminAiCourseBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...PLATFORM_ADMIN_ROLES]}>
      {children}
    </ProtectedRoute>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AUTHENTICATED_ROLES } from "@/lib/roles";

export default function AiCourseIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...AUTHENTICATED_ROLES]}>
      {children}
    </ProtectedRoute>
  );
}

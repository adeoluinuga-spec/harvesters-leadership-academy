"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { OVERSIGHT_ROLES } from "@/lib/roles";

export default function LeadersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...OVERSIGHT_ROLES]}>
      {children}
    </ProtectedRoute>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { COMMUNICATION_ROLES } from "@/lib/roles";

export default function CommunicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[...COMMUNICATION_ROLES]}>
      {children}
    </ProtectedRoute>
  );
}

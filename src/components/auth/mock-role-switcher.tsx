"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { dashboardForRole, getMockRole, MockRole, mockRoles, setMockRole } from "@/lib/mock-auth";

export function MockRoleSwitcher() {
  const router = useRouter();
  const [role, setRole] = useState<MockRole>(() => getMockRole());

  useEffect(() => {
    function syncRole() {
      setRole(getMockRole());
    }

    window.addEventListener("harvesters-role-change", syncRole);
    window.addEventListener("storage", syncRole);

    return () => {
      window.removeEventListener("harvesters-role-change", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <label className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-500 xl:flex">
      <span>Mock role</span>
      <select
        value={role}
        onChange={(event) => {
          const nextRole = event.target.value as MockRole;
          setRole(nextRole);
          setMockRole(nextRole);
          router.push(dashboardForRole(nextRole));
        }}
        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-medium text-zinc-900 outline-none"
      >
        {mockRoles.map((mockRole) => (
          <option key={mockRole} value={mockRole}>
            {mockRole}
          </option>
        ))}
      </select>
    </label>
  );
}

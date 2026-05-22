"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";

export const shellContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const shellItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

type DashboardShellProps = {
  children: React.ReactNode;
  searchPlaceholder?: string;
  showDate?: boolean;
};

export function DashboardShell({
  children,
  searchPlaceholder,
  showDate = true,
}: DashboardShellProps) {
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    function syncProfileStatus() {
      setProfileIncomplete(window.localStorage.getItem("harvesters_profile_incomplete") === "true");
    }

    syncProfileStatus();
    window.addEventListener("harvesters-profile-change", syncProfileStatus);
    window.addEventListener("storage", syncProfileStatus);

    return () => {
      window.removeEventListener("harvesters-profile-change", syncProfileStatus);
      window.removeEventListener("storage", syncProfileStatus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Sidebar />
      <div className="min-h-screen md:pl-20 lg:pl-72">
        <TopNavbar searchPlaceholder={searchPlaceholder} showDate={showDate} />
        <motion.main
          initial="hidden"
          animate="visible"
          variants={shellContainer}
          className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-5 pb-24 pt-5 md:gap-5 md:pb-8 lg:px-8 lg:py-8"
        >
          {profileIncomplete ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Your leadership account is active. Complete or update your profile so reporting, avatar, and ministry hierarchy stay accurate.{" "}
              <Link href="/onboarding" className="font-semibold text-amber-950 underline-offset-4 hover:underline">
                Update profile
              </Link>
            </div>
          ) : null}
          {children}
        </motion.main>
      </div>
      <MobileNav />
    </div>
  );
}

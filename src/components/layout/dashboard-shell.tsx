"use client";

import { motion } from "framer-motion";

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
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Sidebar />
      <div className="min-h-screen pl-20 lg:pl-72">
        <TopNavbar searchPlaceholder={searchPlaceholder} showDate={showDate} />
        <motion.main
          initial="hidden"
          animate="visible"
          variants={shellContainer}
          className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 lg:px-8 lg:py-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

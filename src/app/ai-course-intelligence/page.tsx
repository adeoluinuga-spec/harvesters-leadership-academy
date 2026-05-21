"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, FileText, GraduationCap, Sparkles } from "lucide-react";

import { AiCourseIntelligenceSections } from "@/components/ai/ai-course-intelligence";
import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const heroStats = [
  { label: "Teaching analyzed", value: "58 min" },
  { label: "Lessons generated", value: "7" },
  { label: "Scriptures extracted", value: "6" },
  { label: "Reflection prompts", value: "12" },
];

export default function AiCourseIntelligencePage() {
  return (
    <DashboardShell searchPlaceholder="Search AI insights, transcripts, scriptures..." showDate={false}>
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
              AI Course Intelligence
            </Badge>
            <h1 className="font-heading max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Turn raw ministry teachings into leadership development experiences
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500">
              A calm AI-native layer for course generation, transcript intelligence, scripture extraction,
              reflection, and role-aware leadership pathways.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button className="h-10 rounded-lg bg-black px-4 text-white hover:bg-zinc-800">
                <Bot className="size-4" />
                Generate course
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-lg border-zinc-200 bg-white px-4">
                <Link href="/courses">
                  View course library
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-[#0b0b0b] p-5 text-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white text-black">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-heading font-semibold">Embedded intelligence</p>
                <p className="text-sm text-zinc-400">Premium, reflective, ministry-centered</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                  <p className="font-heading mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Transcript to course structure", icon: FileText },
                { label: "Learning pathway guidance", icon: GraduationCap },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                  <item.icon className="size-4 text-zinc-300" />
                  <p className="text-sm text-zinc-300">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <AiCourseIntelligenceSections />
    </DashboardShell>
  );
}

"use client";

import { Bot, Pause, Play, Radio } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { parseVideoUrl } from "@/lib/video";

type VideoPlayerProps = {
  videoUrl: string | null;
  lessonTitle: string;
  courseTitle: string;
  checkpointQuestion?: string | null;
  progress?: number;
  onCheckpointAnswer?: () => void;
};

export function VideoPlayer({
  videoUrl,
  lessonTitle,
  courseTitle,
  checkpointQuestion,
  progress = 0,
  onCheckpointAnswer,
}: VideoPlayerProps) {
  const embed = parseVideoUrl(videoUrl);

  if (!embed) {
    return (
      <PlaceholderPlayer
        lessonTitle={lessonTitle}
        courseTitle={courseTitle}
        checkpointQuestion={checkpointQuestion}
        progress={progress}
        onCheckpointAnswer={onCheckpointAnswer}
      />
    );
  }

  if (embed.provider === "direct") {
    return (
      <div className="relative aspect-video overflow-hidden bg-black">
        <video src={embed.embedUrl} controls className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      <iframe
        src={embed.embedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={lessonTitle}
      />
    </div>
  );
}

function PlaceholderPlayer({
  lessonTitle,
  courseTitle,
  checkpointQuestion,
  progress,
  onCheckpointAnswer,
}: {
  lessonTitle: string;
  courseTitle: string;
  checkpointQuestion?: string | null;
  progress: number;
  onCheckpointAnswer?: () => void;
}) {
  return (
    <div className="relative aspect-video overflow-hidden bg-[#070707]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#070707_0%,#171717_48%,#0b0b0b_100%)]" />
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="absolute left-8 top-8 max-w-md text-white">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
          {courseTitle}
        </p>
        <h1 className="font-heading mt-4 text-2xl font-semibold tracking-tight md:text-4xl">
          {lessonTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Video content will appear here once uploaded by the course instructor.
        </p>
      </div>

      <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-black/45 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="flex size-10 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105">
              <Play className="size-4 translate-x-0.5" />
            </button>
            <div>
              <p className="text-sm font-medium">Lesson in progress</p>
              <p className="text-xs text-zinc-400">Mark complete when done</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
            <Radio className="size-3.5 text-emerald-300" />
            Live learning telemetry
          </div>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-white" />
      </div>

      {checkpointQuestion ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="absolute right-6 top-6 hidden max-w-sm rounded-xl border border-white/15 bg-white/95 p-4 text-zinc-950 shadow-2xl lg:block"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-black text-white">
              <Bot className="size-4" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold">AI Reflection Checkpoint</p>
              <p className="text-xs text-zinc-500">Reflect before continuing</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-600">{checkpointQuestion}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="rounded-lg bg-black text-white hover:bg-zinc-800" onClick={onCheckpointAnswer}>
              Answer now
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg border-zinc-200 bg-white">
              Continue
            </Button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
